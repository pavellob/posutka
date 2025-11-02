import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';
import { resolvers } from './resolvers/index.js';
import { EventBusService } from './services/event-bus.service.js';
import { NotificationEventHandler } from './handlers/notification-event-handler.js';
import { GrpcTransport } from './transport/grpc.transport.js';
import type { Context } from './context.js';

const logger = createGraphQLLogger('events-subgraph');

// Инициализация Prisma
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Инициализация Event Bus
const eventBus = new EventBusService(prisma);

// Инициализация handlers
const notificationHandler = new NotificationEventHandler(prisma);

// Регистрируем обработчики событий
logger.info('Registering event handlers...');

// NOTIFICATION handler - создает Notification записи
eventBus.registerHandler({
  type: 'NOTIFICATION',
  handle: notificationHandler.handle.bind(notificationHandler)
});

// AUDIT handler - просто логирует (заглушка)
eventBus.registerHandler({
  type: 'AUDIT',
  handle: async (event: any) => {
    logger.info('AUDIT event logged', { 
      eventId: event.id,
      type: event.type,
      actorUserId: event.actorUserId,
      entityType: event.entityType,
      entityId: event.entityId
    });
  }
});

// ANALYTICS handler - заглушка
eventBus.registerHandler({
  type: 'ANALYTICS',
  handle: async (event: any) => {
    logger.info('ANALYTICS event tracked', { 
      eventId: event.id,
      type: event.type 
    });
  }
});

logger.info('✅ Event handlers registered');

// Создаем подписку на события для уведомлений (если еще не существует)
async function ensureNotificationSubscription() {
  try {
    const existing = await prisma.eventSubscription.findFirst({
      where: {
        handlerType: 'NOTIFICATION',
        isActive: true
      }
    });

    if (!existing) {
      await prisma.eventSubscription.create({
        data: {
          handlerType: 'NOTIFICATION',
          eventTypes: [
            'CLEANING_AVAILABLE',
            'CLEANING_ASSIGNED',
            'CLEANING_STARTED',
            'CLEANING_COMPLETED',
            'CLEANING_CANCELLED',
            'BOOKING_CREATED',
            'BOOKING_CONFIRMED',
            'BOOKING_CANCELLED',
            'TASK_CREATED',
            'TASK_ASSIGNED',
            'TASK_COMPLETED'
          ],
          isActive: true
        }
      });
      logger.info('✅ Notification subscription created');
    } else {
      logger.info('✅ Notification subscription already exists');
    }
  } catch (error: any) {
    logger.error('Failed to ensure notification subscription', { error: error.message });
  }
}

// Инициализируем подписку
await ensureNotificationSubscription();

// Читаем схему
const typeDefs = readFileSync(join(process.cwd(), 'src/schema/index.gql'), 'utf-8');

// Создаем схему
const schema = makeExecutableSchema({
  typeDefs,
  resolvers: resolvers as any,
});

// Создаем Yoga сервер
const yoga = createYoga<Context>({
  schema,
  context: async () => ({
    prisma,
    eventBus,
  }),
  graphiql: {
    title: 'Events Subgraph',
  },
  logging: {
    debug: (...args) => logger.debug(args.join(' ')),
    info: (...args) => logger.info(args.join(' ')),
    warn: (...args) => logger.warn(args.join(' ')),
    error: (...args) => logger.error(args.join(' ')),
  },
});

const port = parseInt(process.env.PORT || '4013');
const grpcHost = process.env.GRPC_HOST || 'localhost';
const grpcPort = parseInt(process.env.GRPC_PORT || '4113');

// Запускаем HTTP сервер
const server = createServer(yoga);

server.listen(port, () => {
  logger.info(`🚀 Events Subgraph running on http://localhost:${port}/graphql`);
  logger.info(`📊 GraphiQL available at http://localhost:${port}/graphql`);
});

// Запускаем GRPC сервер
const grpcTransport = new GrpcTransport(eventBus, prisma, grpcHost, grpcPort);
grpcTransport.start().then(() => {
  logger.info(`✅ GRPC server started on ${grpcHost}:${grpcPort}`);
}).catch((error) => {
  logger.error('Failed to start GRPC server', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await grpcTransport.stop();
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await grpcTransport.stop();
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

