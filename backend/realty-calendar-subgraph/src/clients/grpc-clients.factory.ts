import { 
  createBookingsGrpcClient, 
  BookingsGrpcClient 
} from '@repo/grpc-sdk';
import { createInventoryGrpcClient, InventoryGrpcClient } from '@repo/grpc-sdk';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('grpc-clients-factory');

export interface GrpcClients {
  bookings: BookingsGrpcClient;
  inventory: InventoryGrpcClient;
  disconnect(): Promise<void>;
}

export class GrpcClientsFactory {
  static async create(): Promise<GrpcClients> {
    const config = {
      bookingsGrpcHost: process.env.BOOKINGS_GRPC_HOST || 'localhost',
      bookingsGrpcPort: parseInt(process.env.BOOKINGS_GRPC_PORT || '4102'),
      inventoryGrpcHost: process.env.INVENTORY_GRPC_HOST || 'localhost',
      inventoryGrpcPort: parseInt(process.env.INVENTORY_GRPC_PORT || '4101'),
      grpcTimeout: parseInt(process.env.GRPC_TIMEOUT || '5000'),
      grpcRetryAttempts: parseInt(process.env.GRPC_RETRY_ATTEMPTS || '3'),
      grpcRetryDelay: parseInt(process.env.GRPC_RETRY_DELAY || '1000'),
    };

    logger.info('Creating gRPC clients', config);

    // Создаем Bookings клиент
    const bookingsClient = createBookingsGrpcClient({
      host: config.bookingsGrpcHost,
      port: config.bookingsGrpcPort,
      timeout: config.grpcTimeout,
      retryAttempts: config.grpcRetryAttempts,
      retryDelay: config.grpcRetryDelay,
    });
    await bookingsClient.connect();
    logger.info('Bookings gRPC client connected');

    // Создаем Inventory клиент
    const inventoryClient = createInventoryGrpcClient({
      host: config.inventoryGrpcHost,
      port: config.inventoryGrpcPort,
      timeout: config.grpcTimeout,
      retryAttempts: config.grpcRetryAttempts,
      retryDelay: config.grpcRetryDelay,
    });
    await inventoryClient.connect();
    logger.info('Inventory gRPC client connected');

    return {
      bookings: bookingsClient,
      inventory: inventoryClient,
      async disconnect() {
        await bookingsClient.disconnect();
        await inventoryClient.disconnect();
        logger.info('All gRPC clients disconnected');
      },
    };
  }
}


