import { readFileSync } from 'fs';
import path from 'path';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { BookingsDLPrisma, IdentityDLPrisma, InventoryDLPrisma } from '@repo/datalayer-prisma';
// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';

import { createGraphQLLogger } from '@repo/shared-logger';
import { BookingService } from './services/booking.service.js';
import { GrpcTransport } from './transport/grpc.transport.js';

const logger = createGraphQLLogger('bookings-subgraph');

async function startServer() {
  try {
    logger.info('Starting Bookings Subgraph with GRPC integration');

    // Инициализируем сервисы
    const prisma = new PrismaClient();
    const dl = new BookingsDLPrisma(prisma);
    const identityDL = new IdentityDLPrisma(prisma);
    const inventoryDL = new InventoryDLPrisma(prisma);

    // Создаем сервис бронирования с GRPC клиентом
    const eventsGrpcHost = process.env.EVENTS_GRPC_HOST || 'localhost';
    const eventsGrpcPort = parseInt(process.env.EVENTS_GRPC_PORT || '4113');
    const bookingService = new BookingService(
      dl,
      inventoryDL,
      'localhost',
      4103,
      eventsGrpcHost,
      eventsGrpcPort,
      identityDL,
      prisma
    );
    await bookingService.initialize();

    // Создаем GraphQL схему
    const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    const yoga = createYoga({
      schema,
      context: () => ({ dl, identityDL, inventoryDL, bookingService }),
    });

    // Запускаем GraphQL сервер
    const graphqlServer = createServer(yoga);
    graphqlServer.listen(4002, () => {
      logger.info('Bookings Subgraph server started on port 4002');
    });

    // Запускаем GRPC сервер
    const grpcTransport = new GrpcTransport('localhost', 4102, bookingService);
    await grpcTransport.start();

    logger.info('Bookings Subgraph started successfully');
    logger.info('GraphQL endpoint: http://localhost:4002/graphql');
    logger.info('GRPC endpoint: localhost:4102');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await grpcTransport.stop();
      await bookingService.cleanup();
      await prisma.$disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await grpcTransport.stop();
      await bookingService.cleanup();
      await prisma.$disconnect();
      process.exit(0);
    });

  } catch (error: any) {
    logger.error('Failed to start Bookings Subgraph', { error: error.message });
    process.exit(1);
  }
}

startServer();
