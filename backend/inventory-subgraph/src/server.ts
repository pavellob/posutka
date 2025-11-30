import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import path from 'path';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { InventoryDLPrisma } from '@repo/datalayer-prisma';
// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';
import { GrpcTransport } from './transport/grpc.transport.js';

const logger = createGraphQLLogger('inventory-subgraph');

logger.info('Inventory Subgraph server starting');
logger.debug('Resolvers imported', { 
  resolversImported: !!resolvers,
  queryExists: !!resolvers.Query,
  propertiesByOrgIdExists: !!resolvers.Query?.propertiesByOrgId,
  resolverKeys: Object.keys(resolvers),
  queryKeys: Object.keys(resolvers.Query || {})
});

const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

logger.info('Initializing Prisma client');
const prisma = new PrismaClient();
logger.info('Initializing DataLayer');
const dl = new InventoryDLPrisma(prisma);
logger.info('DataLayer initialized', { 
  dataLayerInitialized: !!dl,
  getPropertiesByOrgIdType: typeof dl.getPropertiesByOrgId
});

const yoga = createYoga({
  schema,
  context: () => {
    logger.debug('Context function called', { dataLayerAvailable: !!dl });
    return { dl };
  }, // здесь легко подменить реализацию на другую (e.g. blockchain-DL)
});

const graphqlServer = createServer(yoga);
const GRPC_PORT = parseInt(process.env.GRPC_PORT || '4101');
const GRPC_HOST = process.env.GRPC_HOST || 'localhost';

// Запускаем GraphQL сервер
graphqlServer.listen(4001, () => {
  logger.info('Inventory Subgraph GraphQL server started on port 4001');
});

// Запускаем GRPC сервер
async function startGrpcServer() {
  try {
    const grpcTransport = new GrpcTransport(GRPC_HOST, GRPC_PORT, dl, prisma);
    await grpcTransport.start();
    logger.info(`Inventory gRPC service ready at ${GRPC_HOST}:${GRPC_PORT}`);
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await grpcTransport.stop();
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error: any) {
    logger.error('Failed to start gRPC server', { error: error.message });
  }
}

startGrpcServer();
