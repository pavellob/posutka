// Загружаем .env только для локальной разработки
// В Docker/production переменные уже в process.env через docker-compose.yml или Northflank
if (process.env.NODE_ENV !== 'production') {
  try {
    await import('dotenv/config');
  } catch (error) {
    // .env файл не найден - используем переменные из process.env
    console.log('ℹ️  dotenv not loaded, using environment variables from process.env');
  }
}

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

const logger = createGraphQLLogger('notifications-subgraph');

// Отладка переменных окружения при старте
logger.info('🔍 Environment variables check:', {
  NODE_ENV: process.env.NODE_ENV,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? '✅ SET' : '❌ NOT SET',
  TELEGRAM_USE_MINIAPP: process.env.TELEGRAM_USE_MINIAPP,
  TELEGRAM_POLLING: process.env.TELEGRAM_POLLING,
  FRONTEND_URL: process.env.FRONTEND_URL,
  DATABASE_URL: process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET',
  PORT: process.env.PORT || '4011 (default)',
  GRPC_PORT: process.env.GRPC_PORT || '4111 (default)',
  WS_PORT: process.env.WS_PORT || '4020 (default)',
});

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
  logger.info('🔍 Creating PrismaClient with DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');
  const prisma = new PrismaClient();
  
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

