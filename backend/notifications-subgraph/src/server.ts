// ❌ НЕ ЗАГРУЖАЕМ dotenv в runtime!
// Prisma автоматически читает .env для CLI команд (migrate, generate)
// Но в runtime приложения используем ТОЛЬКО process.env (установленные Docker/Northflank)
// 
// Если нужно локально - создайте .env в ЭТОЙ директории (backend/notifications-subgraph/.env)
// и установите переменные через export перед запуском:
// export DATABASE_URL=postgresql://...
// pnpm dev

import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { resolvers } from './resolvers/index.js';
import { createGraphQLLogger } from '@repo/shared-logger';
import type { Context } from './context.js';
import gql from 'graphql-tag';

// Providers
import { ProviderManager, TelegramProvider, WebSocketProvider } from './providers/index.js';
import { NotificationService } from './services/notification.service.js';
import { GrpcTransport } from './transport/grpc.transport.js';
import { DailyNotificationSchedulerService } from './services/daily-notification-scheduler.service.js';

const logger = createGraphQLLogger('notifications-subgraph');

// Отладка переменных окружения при старте
const rawDbUrl = process.env.DATABASE_URL || '';
logger.info('🔍 Environment variables check:', {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL || '❌ NOT SET',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? '✅ SET' : '❌ NOT SET',
  TELEGRAM_USE_MINIAPP: process.env.TELEGRAM_USE_MINIAPP || 'false (default)',
  TELEGRAM_POLLING: process.env.TELEGRAM_POLLING || 'false (default)',
  DATABASE_URL: rawDbUrl ? '✅ SET' : '❌ NOT SET',
  DATABASE_URL_RAW: rawDbUrl.substring(0, 70),
  DATABASE_URL_HOST: rawDbUrl.split('@')[1]?.split('/')[0] || 'NO HOST',
  PORT: process.env.PORT || '4011 (default)',
  GRPC_PORT: process.env.GRPC_PORT || '4111 (default)',
  WS_PORT: process.env.WS_PORT || '4020 (default)',
});

// Явное логирование критических переменных
if (!process.env.FRONTEND_URL) {
  logger.error('❌ CRITICAL: FRONTEND_URL is not set!');
  logger.error('💡 Set FRONTEND_URL in .env file');
} else {
  logger.info('✅ FRONTEND_URL configured:', process.env.FRONTEND_URL);
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
  logger.warn('⚠️  TELEGRAM_BOT_TOKEN is not set - Telegram notifications will not work');
  logger.warn('💡 Set TELEGRAM_BOT_TOKEN in .env file');
}

// Проверяем, ожидается ли Docker окружение
const actualHost = rawDbUrl.split('@')[1]?.split('/')[0];
if (actualHost && actualHost.includes('localhost')) {
  logger.warn('⚠️  WARNING: DATABASE_URL uses localhost instead of Docker host!');
  logger.warn('⚠️  Expected: db:5432, Got: ' + actualHost);
  logger.warn('⚠️  This usually means .env file is being loaded instead of Docker environment');
  logger.warn('💡 Check: Is .env file copied into Docker image?');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем схему
const schemaString = readFileSync(
  resolve(__dirname, './schema/index.gql'),
  'utf-8'
);
const typeDefs = gql(schemaString);

// Запускаем сервер
async function start() {
  // ✅ Инициализируем Prisma ВНУТРИ функции, после загрузки переменных
  const dbUrl = process.env.DATABASE_URL || '';
  logger.info('🔍 Creating PrismaClient:', {
    hasUrl: !!dbUrl,
    connectionString: dbUrl ? `${dbUrl.split('@')[0].split('://')[0]}://***@${dbUrl.split('@')[1] || 'NO_HOST'}` : '❌ NOT SET',
    fullUrl: dbUrl.substring(0, 50) + '...',
  });
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl, // Явно передаем URL из process.env, игнорируя .env файлы
      },
    },
    log: ['error', 'warn'],
  });
  
  // Логируем реальный URL который использует Prisma
  logger.info('🔍 PrismaClient datasource URL:', {
    fromEnv: dbUrl.substring(0, 60) + '...',
    host: dbUrl.split('@')[1]?.split('/')[0] || 'UNKNOWN',
  });
  
  // Проверяем подключение к БД
  try {
    await prisma.$connect();
    logger.info('✅ Successfully connected to database');
  } catch (error) {
    logger.error('❌ Failed to connect to database:', {
      error: error instanceof Error ? error.message : String(error),
      url: dbUrl ? `${dbUrl.split('@')[0].split('://')[0]}://***@${dbUrl.split('@')[1] || 'NO_HOST'}` : 'NOT SET',
    });
    throw error;
  }
  
  // Инициализируем ProviderManager
  const providerManager = new ProviderManager();
  
  // Инициализируем NotificationService
  const notificationService = new NotificationService(prisma);
  
  // Регистрируем провайдеры
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  let telegramProvider: TelegramProvider | null = null;
  
  if (telegramToken) {
    telegramProvider = new TelegramProvider(telegramToken);
    providerManager.registerProvider(telegramProvider);
    logger.info('Telegram provider registered');
  } else {
    logger.warn('TELEGRAM_BOT_TOKEN not set, Telegram notifications disabled');
  }
  
  // Регистрируем WebSocket провайдер
  const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 4020;
  const websocketProvider = new WebSocketProvider(wsPort);
  providerManager.registerProvider(websocketProvider);
  logger.info(`WebSocket provider registered (port: ${wsPort})`);
  
  // Создаем сервис для автопривязки (настроим после инициализации)
  const { TelegramLinkService } = await import('./services/telegram-link.service.js');
  const telegramLinkService = new TelegramLinkService(prisma);
  
  // Создаем схему
  const schema = buildSubgraphSchema([
    {
      typeDefs,
      resolvers,
    },
  ]);
  
  // Создаем Yoga сервер
  const yoga = createYoga<Context>({
    schema,
    context: async () => ({
      prisma,
      providerManager,
      notificationService,
    }),
    graphiql: {
      title: 'Notifications Subgraph',
    },
    maskedErrors: false,
    logging: {
      debug: (...args) => logger.debug(args.join(' ')),
      info: (...args) => logger.info(args.join(' ')),
      warn: (...args) => logger.warn(args.join(' ')),
      error: (...args) => logger.error(args.join(' ')),
    },
  });
  
  // Создаем HTTP сервер
  const server = createServer(yoga);
  
  const PORT = process.env.PORT || 4011;
  const GRPC_PORT = parseInt(process.env.GRPC_PORT || '4111');
  const GRPC_HOST = process.env.GRPC_HOST || 'localhost';
  
  // Создаем gRPC транспорт
  const grpcTransport = new GrpcTransport(
    GRPC_HOST,
    GRPC_PORT,
    providerManager,
    notificationService
  );
  try {
    // Инициализируем провайдеры
    logger.info('Initializing notification providers...');
    await providerManager.initialize();
    logger.info('All providers initialized successfully');
    
    // Настраиваем автопривязку пользователей через Telegram ПОСЛЕ инициализации
    if (telegramProvider) {
      telegramProvider.setupCommandHandlers(async (username, chatId, firstName, lastName) => {
        if (username) {
          const linked = await telegramLinkService.linkUserByChatId(username, chatId);
          if (linked) {
            logger.info(`✅ Successfully linked user with username @${username} to chat ID ${chatId}`);
          } else {
            logger.info(`ℹ️ No user found with Telegram username @${username}`);
          }
        }
      });
      logger.info('Telegram command handlers configured for auto-linking users');
    }
    
    // Запускаем HTTP/GraphQL сервер
    server.listen(PORT, () => {
      logger.info(`🚀 Notifications Subgraph GraphQL server ready at http://localhost:${PORT}/graphql`);
    });
    
    // Запускаем gRPC сервер
    await grpcTransport.start();
    logger.info(`📡 Notifications gRPC service ready at ${GRPC_HOST}:${GRPC_PORT}`);
    
    // Запускаем cron job для ежедневных уведомлений
    const dailyNotificationScheduler = new DailyNotificationSchedulerService(prisma);
    dailyNotificationScheduler.start();
    logger.info('📅 Daily notification scheduler started');
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      
      await grpcTransport.stop();
      await providerManager.shutdown();
      await prisma.$disconnect();
      
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

