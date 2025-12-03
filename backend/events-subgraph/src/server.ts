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

// Увеличиваем лимит слушателей событий для процесса
// Это необходимо, так как PrismaClient и gRPC клиенты регистрируют обработчики exit
process.setMaxListeners(20);

// Инициализация Prisma
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Инициализация Event Bus
const eventBus = new EventBusService(prisma);

// Инициализация handlers
const notificationHandler = new NotificationEventHandler(prisma, eventBus);

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
    // Проверяем все подписки (включая неактивные)
    const allSubscriptions = await (prisma as any).eventSubscription.findMany({
      where: {
        handlerType: 'NOTIFICATION'
      }
    });
    
    // Деактивируем дублирующиеся подписки, оставляем только одну активную
    if (allSubscriptions.length > 1) {
      logger.warn('⚠️ Found multiple NOTIFICATION subscriptions, deactivating duplicates', {
        count: allSubscriptions.length,
        ids: allSubscriptions.map((s: any) => s.id)
      });
      
      // Оставляем первую активной, остальные деактивируем
      for (let i = 1; i < allSubscriptions.length; i++) {
        await (prisma as any).eventSubscription.update({
          where: { id: allSubscriptions[i].id },
          data: { isActive: false }
        });
      }
    }
    
    const existing = allSubscriptions.find((s: any) => s.isActive) || allSubscriptions[0];

    const allEventTypes = [
      // Booking events
      'BOOKING_CREATED',
      'BOOKING_CONFIRMED',
      'BOOKING_CANCELLED',
      'BOOKING_CHECKIN',
      'BOOKING_CHECKOUT',
      // Cleaning events
      'CLEANING_AVAILABLE',
      'CLEANING_ASSIGNED',
      'CLEANING_STARTED',
      'CLEANING_COMPLETED',
      'CLEANING_READY_FOR_REVIEW',
      'CLEANING_CANCELLED',
      'CLEANING_PRECHECK_COMPLETED',
      'CLEANING_DIFFICULTY_SET',
      'CLEANING_APPROVED',
      // Task events
      'TASK_CREATED',
      'TASK_ASSIGNED',
      'TASK_STATUS_CHANGED',
      'TASK_COMPLETED',
      // Payment events
      'PAYMENT_RECEIVED',
      'PAYMENT_FAILED',
      'INVOICE_CREATED',
      'INVOICE_OVERDUE',
      // System events
      'USER_REGISTERED',
      'USER_LOGIN',
      'SYSTEM_ALERT'
    ];

    if (!existing) {
      logger.info('Creating NOTIFICATION subscription', {
        eventTypesCount: allEventTypes.length,
        includesCLEANING_AVAILABLE: allEventTypes.includes('CLEANING_AVAILABLE')
      });
      
      try {
        const subscription = await (prisma as any).eventSubscription.create({
          data: {
            handlerType: 'NOTIFICATION' as any, // Приводим к типу HandlerType enum
            eventTypes: allEventTypes,
            isActive: true
          }
        });
        logger.info('✅ Notification subscription created', {
          subscriptionId: subscription.id,
          eventTypesCount: allEventTypes.length,
          includesCLEANING_AVAILABLE: allEventTypes.includes('CLEANING_AVAILABLE'),
          handlerType: subscription.handlerType,
          isActive: subscription.isActive
        });
      } catch (createError: any) {
        logger.error('❌ Failed to create NOTIFICATION subscription', { 
          error: createError.message,
          stack: createError.stack,
          errorCode: createError.code,
          errorMeta: createError.meta
        });
        throw createError; // Пробрасываем ошибку дальше
      }
    } else {
      logger.info('Updating existing NOTIFICATION subscription', {
        subscriptionId: existing.id,
        currentIsActive: existing.isActive,
        currentEventTypesCount: existing.eventTypes?.length || 0
      });
      
      // Обновляем список eventTypes на случай если были добавлены новые типы
      try {
        await (prisma as any).eventSubscription.update({
          where: { id: existing.id },
          data: { 
            eventTypes: allEventTypes,
            isActive: true // Убеждаемся, что подписка активна
          }
        });
        logger.info('✅ Notification subscription updated', {
          subscriptionId: existing.id,
          eventTypesCount: allEventTypes.length,
          includesCLEANING_AVAILABLE: allEventTypes.includes('CLEANING_AVAILABLE'),
          previousEventTypesCount: existing.eventTypes?.length || 0
        });
      } catch (updateError: any) {
        logger.error('❌ Failed to update NOTIFICATION subscription', { 
          subscriptionId: existing.id,
          error: updateError.message,
          stack: updateError.stack,
          errorCode: updateError.code
        });
        throw updateError; // Пробрасываем ошибку дальше
      }
    }
  } catch (error: any) {
    logger.error('❌ Failed to ensure notification subscription', { 
      error: error.message,
      stack: error.stack,
      errorCode: error.code,
      errorMeta: error.meta
    });
    // НЕ пробрасываем ошибку дальше, чтобы сервер мог запуститься
    // Но логируем детально для диагностики
  }
}

// Инициализируем подписку
await ensureNotificationSubscription();

// Проверяем, что подписка создана и активна
try {
  const verification = await (prisma as any).eventSubscription.findFirst({
    where: {
      handlerType: 'NOTIFICATION' as any,
      isActive: true
    }
  });

  if (verification) {
    logger.info('✅ NOTIFICATION subscription verified', {
      subscriptionId: verification.id,
      eventTypesCount: verification.eventTypes?.length || 0,
      includesCLEANING_AVAILABLE: verification.eventTypes?.includes('CLEANING_AVAILABLE'),
      handlerType: verification.handlerType,
      isActive: verification.isActive,
      eventTypes: verification.eventTypes
    });
  } else {
    // Проверяем все подписки для диагностики
    const allSubs = await (prisma as any).eventSubscription.findMany({});
    logger.error('❌ NOTIFICATION subscription NOT FOUND after initialization!', {
      allSubscriptionsCount: allSubs.length,
      allSubscriptions: allSubs.map((s: any) => ({
        id: s.id,
        handlerType: s.handlerType,
        isActive: s.isActive,
        eventTypesCount: s.eventTypes?.length || 0
      }))
    });
  }
} catch (verifyError: any) {
  logger.error('❌ Failed to verify NOTIFICATION subscription', {
    error: verifyError.message,
    stack: verifyError.stack
  });
}

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

const port = parseInt(process.env.PORT || '4015');
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
// Используем once вместо on, чтобы обработчики не накапливались при hot reload
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  try {
    await grpcTransport.stop();
    await prisma.$disconnect();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } catch (error: any) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

