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

const logger = createGraphQLLogger('cleaning-subgraph');

async function startServer() {
  try {
    logger.info('Starting Cleaning Subgraph');

    // Initialize Prisma and data layers
    const prisma = new PrismaClient();
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

    const yoga = createYoga({
      schema,
      context: () => ({ dl, identityDL, inventoryDL, bookingsDL, prisma }),
    });

    // Start GraphQL server
    const PORT = process.env.PORT || 4010;
    const graphqlServer = createServer(yoga);
    graphqlServer.listen(PORT, () => {
      logger.info(`Cleaning Subgraph server started on port ${PORT}`);
      logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await prisma.$disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await prisma.$disconnect();
      process.exit(0);
    });

  } catch (error: any) {
    logger.error('Failed to start Cleaning Subgraph', { error: error.message });
    process.exit(1);
  }
}

startServer();

