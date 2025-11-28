import { readFileSync } from 'fs';
import path from 'path';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { OpsDLPrisma } from '@repo/datalayer-prisma';
// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';

import { createGraphQLLogger } from '@repo/shared-logger';
import { GrpcTransport } from './transport/grpc.transport.js';

const logger = createGraphQLLogger('ops-subgraph');

async function startServer() {
  try {
    logger.info('Starting Ops Subgraph with dual transport');

    // Инициализируем datalayer
    const prisma = new PrismaClient();
    const dl = new OpsDLPrisma(prisma);

    // Создаем GraphQL схему
    const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    const yoga = createYoga({
      schema,
      context: () => ({ dl, prisma }),
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
