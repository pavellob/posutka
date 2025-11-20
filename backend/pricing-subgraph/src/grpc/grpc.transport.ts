import { createServer } from 'nice-grpc';
import { createGraphQLLogger } from '@repo/shared-logger';
import { PricingServiceDefinition } from '@repo/grpc-sdk';
import { PricingGrpcService } from './pricing.grpc.service.js';
import type { PricingService } from '../services/pricing.service.js';

const logger = createGraphQLLogger('pricing-grpc-transport');

export class GrpcTransport {
  private server: ReturnType<typeof createServer> | null = null;
  private host: string;
  private port: number;

  constructor(
    private readonly pricingService: PricingService,
    host: string = 'localhost',
    port: number = 4112
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

      const grpcService = new PricingGrpcService(this.pricingService);

      this.server = createServer();
      this.server.add(PricingServiceDefinition as any, grpcService as any);

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

