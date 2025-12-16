import { readFileSync } from 'fs';
import path from 'path';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';

import { resolvers } from './resolvers/index.js';
import { OpsDLPrisma, CleaningDLPrisma, InventoryDLPrisma } from '@repo/datalayer-prisma';
// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';

import { createGraphQLLogger } from '@repo/shared-logger';
import { GrpcTransport } from './transport/grpc.transport.js';
import { createInventoryGrpcClient, createEventsGrpcClient } from '@repo/grpc-sdk';
import { DailyNotificationTaskService } from './services/daily-notification-task.service.js';

const logger = createGraphQLLogger('ops-subgraph');

// JWT конфигурация
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Функция для извлечения userId из JWT токена
function extractUserIdFromToken(authorization?: string | null): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authorization.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId;
  } catch (error: any) {
    logger.error('JWT verification failed', { error: error.message });
    return null;
  }
}

// Функция для извлечения orgId из JWT токена
function extractOrgIdFromToken(authorization?: string | null): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authorization.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.orgId;
  } catch (error: any) {
    logger.error('JWT verification failed', { error: error.message });
    return null;
  }
}

async function startServer() {
  try {
    logger.info('Starting Ops Subgraph with dual transport');

    // Инициализируем datalayer
    const prisma = new PrismaClient();
    const dl = new OpsDLPrisma(prisma);
    const cleaningDL = new CleaningDLPrisma(prisma);
    const inventoryDL = new InventoryDLPrisma(prisma);

    // Создаем gRPC клиенты
    const inventoryGrpcClient = createInventoryGrpcClient({
      host: process.env.INVENTORY_GRPC_HOST || 'localhost',
      port: parseInt(process.env.INVENTORY_GRPC_PORT || '4112'),
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
    });
    await inventoryGrpcClient.connect().catch((error) => {
      logger.error('Failed to connect to Inventory GRPC service', error);
    });

    const eventsGrpcClient = createEventsGrpcClient({
      host: process.env.EVENTS_GRPC_HOST || 'localhost',
      port: parseInt(process.env.EVENTS_GRPC_PORT || '4113'),
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
    });
    await eventsGrpcClient.connect().catch((error) => {
      logger.error('Failed to connect to Events GRPC service', error);
    });

    // Создаем сервис
    const dailyNotificationTaskService = new DailyNotificationTaskService(
      dl,
      cleaningDL,
      prisma,
      inventoryDL,
      inventoryGrpcClient,
      eventsGrpcClient
    );

    // Создаем GraphQL схему
    const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    const yoga = createYoga({
      schema,
      context: ({ request }) => {
        // Извлекаем заголовки из запроса
        const headers = request.headers || {};
        const authorization = headers.get('authorization') || headers.get('Authorization') || null;
        
        // Извлекаем userId и orgId из JWT токена
        const userId = extractUserIdFromToken(authorization);
        const orgId = extractOrgIdFromToken(authorization);
        
        return {
          dl,
          cleaningDL,
          prisma,
          dailyNotificationTaskService,
          inventoryGrpcClient,
          eventsGrpcClient,
          userId: userId || undefined,
          orgId: orgId || undefined,
        };
      },
      logging: {
        debug: (...args) => logger.debug(args.join(' ')),
        info: (...args) => logger.info(args.join(' ')),
        warn: (...args) => logger.warn(args.join(' ')),
        error: (...args) => logger.error(args.join(' ')),
      },
      maskedErrors: false, // Показываем полные ошибки для отладки
    });

    // Запускаем GraphQL сервер
    const graphqlServer = createServer(yoga);
    graphqlServer.listen(4003, () => {
      logger.info('GraphQL server started on port 4003');
    });

    // Запускаем GRPC сервер с datalayer
    const grpcTransport = new GrpcTransport('localhost', 4103, dl);
    await grpcTransport.start();

    logger.info('Ops Subgraph started successfully');
    logger.info('GraphQL endpoint: http://localhost:4003/graphql');
    logger.info('GRPC endpoint: localhost:4103');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await grpcTransport.stop();
      await prisma.$disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await grpcTransport.stop();
      await prisma.$disconnect();
      process.exit(0);
    });

  } catch (error: any) {
    logger.error('Failed to start Ops Subgraph', { error: error.message });
    process.exit(1);
  }
}

startServer();
