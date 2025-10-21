// ❌ НЕ ЗАГРУЖАЕМ dotenv в runtime!
// В Docker переменные передаются через docker-compose.yml environment
// В Northflank через Environment Variables
// Локально экспортируйте переменные: export DATABASE_URL=postgresql://...

import { readFileSync } from 'fs';
import path from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { 
  CleaningDLPrisma, 
  IdentityDLPrisma, 
  InventoryDLPrisma as InventoryDL,
  BookingsDLPrisma 
} from '@repo/datalayer-prisma';
// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';

import { createGraphQLLogger } from '@repo/shared-logger';
import { GrpcTransport } from './grpc/grpc.transport.js';

const logger = createGraphQLLogger('cleaning-subgraph');

// Отладка переменных окружения при старте
const rawDbUrl = process.env.DATABASE_URL || '';
logger.info('🔍 Environment variables check:', {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL || '❌ NOT SET',
  NOTIFICATIONS_GRPC_HOST: process.env.NOTIFICATIONS_GRPC_HOST || 'localhost (default)',
  NOTIFICATIONS_GRPC_PORT: process.env.NOTIFICATIONS_GRPC_PORT || '4111 (default)',
  DATABASE_URL: rawDbUrl ? '✅ SET' : '❌ NOT SET',
  DATABASE_URL_RAW: rawDbUrl.substring(0, 70),
  DATABASE_URL_HOST: rawDbUrl.split('@')[1]?.split('/')[0] || 'NO HOST',
});

// Явное логирование критических переменных
if (!process.env.FRONTEND_URL) {
  logger.error('❌ CRITICAL: FRONTEND_URL is not set!');
  logger.error('💡 Set FRONTEND_URL in .env file');
} else {
  logger.info('✅ FRONTEND_URL configured:', process.env.FRONTEND_URL);
}

// Проверяем, ожидается ли Docker окружение
const expectedDockerHost = 'db:5432';
const actualHost = rawDbUrl.split('@')[1]?.split('/')[0];
if (actualHost && actualHost.includes('localhost')) {
  logger.warn('⚠️  WARNING: DATABASE_URL uses localhost instead of Docker host!');
  logger.warn('⚠️  Expected: db:5432, Got: ' + actualHost);
  logger.warn('⚠️  This usually means .env file is being loaded instead of Docker environment');
  logger.warn('💡 Check: Is .env file copied into Docker image?');
}

async function startServer() {
  try {
    logger.info('Starting Cleaning Subgraph');

    // Initialize Prisma and data layers
    const dbUrl = process.env.DATABASE_URL || '';
    logger.info('🔍 Creating PrismaClient:', {
      hasUrl: !!dbUrl,
      connectionString: dbUrl ? `${dbUrl.split('@')[0].split('://')[0]}://***@${dbUrl.split('@')[1] || 'NO_HOST'}` : '❌ NOT SET',
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
    const dl = new CleaningDLPrisma(prisma);
    const identityDL = new IdentityDLPrisma(prisma);
    const inventoryDL = new InventoryDL(prisma);
    const bookingsDL = new BookingsDLPrisma(prisma);

    // Create GraphQL schema
    const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    const context = { dl, identityDL, inventoryDL, bookingsDL, prisma };
    
    logger.info('🔍 Context created:', {
      hasDl: !!context.dl,
      hasIdentityDL: !!context.identityDL,
      hasInventoryDL: !!context.inventoryDL,
      hasBookingsDL: !!context.bookingsDL,
      hasPrisma: !!context.prisma,
    });
    
    const yoga = createYoga({
      schema,
      context: () => context,
    });

    // Start GraphQL server
    const PORT = process.env.PORT || 4010;
    const graphqlServer = createServer(yoga);
    graphqlServer.listen(PORT, () => {
      logger.info(`Cleaning Subgraph server started on port ${PORT}`);
      logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    });

    // Start gRPC server
    const GRPC_PORT = parseInt(process.env.GRPC_PORT || '4110');
    const GRPC_HOST = process.env.GRPC_HOST || 'localhost';
    const grpcTransport = new GrpcTransport(dl, prisma, GRPC_HOST, GRPC_PORT);
    await grpcTransport.start();

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
    logger.error('Failed to start Cleaning Subgraph', { error: error.message });
    process.exit(1);
  }
}

startServer();

