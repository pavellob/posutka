import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';
import { resolvers } from './resolvers/index.js';
import { EventBusService } from './services/event-bus.service.js';
import { NotificationEventHandler } from './handlers/notification-event-handler.js';
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

// Читаем схему
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const typeDefs = readFileSync(join(__dirname, 'schema/index.gql'), 'utf-8');

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

// Запускаем HTTP сервер
const server = createServer(yoga);

server.listen(port, () => {
  logger.info(`🚀 Events Subgraph running on http://localhost:${port}/graphql`);
  logger.info(`📊 GraphiQL available at http://localhost:${port}/graphql`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

