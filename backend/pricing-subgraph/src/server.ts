import { readFileSync } from 'fs';
import path from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { PricingDLPrisma } from '@repo/datalayer-prisma';
import { createGraphQLLogger } from '@repo/shared-logger';
import { resolvers } from './resolvers/index.js';
import { PricingService } from './services/pricing.service.js';
import { GrpcTransport } from './grpc/grpc.transport.js';

const logger = createGraphQLLogger('pricing-subgraph');

async function startServer() {
  try {
    logger.info('Starting Pricing Subgraph');

    // Initialize Prisma and datalayer
    const dbUrl = process.env.DATABASE_URL || '';
    logger.info('🔍 Creating PrismaClient:', {
      hasUrl: !!dbUrl,
      connectionString: dbUrl ? `${dbUrl.split('@')[0].split('://')[0]}://***@${dbUrl.split('@')[1] || 'NO_HOST'}` : '❌ NOT SET',
    });
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
      log: ['error', 'warn'],
    });
    
    // Проверяем подключение к БД
    try {
      await prisma.$connect();
      logger.info('✅ Successfully connected to database');
    } catch (error) {
      logger.error('❌ Failed to connect to database:', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    const dl = new PricingDLPrisma(prisma);
    const pricingService = new PricingService(dl, prisma);

    // Create GraphQL schema
    const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    const context = { dl, pricingService, prisma };

    const yoga = createYoga({
      schema,
      context: () => context,
    });

    // Start GraphQL server
    const PORT = process.env.PORT || 4012;
    const graphqlServer = createServer(yoga);
    graphqlServer.listen(PORT, () => {
      logger.info(`Pricing Subgraph server started on port ${PORT}`);
      logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    });

    // Start gRPC server
    const GRPC_PORT = parseInt(process.env.GRPC_PORT || '4112');
    const GRPC_HOST = process.env.GRPC_HOST || 'localhost';
    const grpcTransport = new GrpcTransport(pricingService, GRPC_HOST, GRPC_PORT);
    await grpcTransport.start();

    logger.info('✅ Pricing Subgraph started successfully');
    logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    logger.info(`GRPC endpoint: ${GRPC_HOST}:${GRPC_PORT}`);

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
    logger.error('Failed to start Pricing Subgraph', { error: error.message });
    process.exit(1);
  }
}

startServer();

