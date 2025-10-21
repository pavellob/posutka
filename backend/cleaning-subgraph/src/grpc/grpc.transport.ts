import { createServer } from 'nice-grpc';
import { createGraphQLLogger } from '@repo/shared-logger';
import { CleaningServiceDefinition } from '@repo/grpc-sdk';
import type { ICleaningDL } from '@repo/datalayer';
import type { PrismaClient } from '@prisma/client';
import { CleaningGrpcService } from './cleaning.grpc.service.js';

const logger = createGraphQLLogger('grpc-transport');

export class GrpcTransport {
  private server: ReturnType<typeof createServer> | null = null;
  private host: string;
  private port: number;

  constructor(
    private readonly dl: ICleaningDL,
    private readonly prisma: PrismaClient,
    host: string = 'localhost',
    port: number = 4110
  ) {
    this.host = host;
    this.port = port;
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting GRPC transport with nice-grpc', {
        host: this.host,
        port: this.port,
      });

      const cleaningService = new CleaningGrpcService(this.dl, this.prisma);

      this.server = createServer();
      this.server.add(CleaningServiceDefinition as any, cleaningService as any);

      await this.server.listen(`${this.host}:${this.port}`);

      logger.info('✅ GRPC transport started successfully', {
        host: this.host,
        port: this.port,
      });
    } catch (error) {
      logger.error('Failed to start GRPC transport', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.shutdown();
      this.server = null;
      logger.info('GRPC transport stopped');
    }
  }
}

