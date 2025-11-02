import { createServer } from 'nice-grpc';
import { createGraphQLLogger } from '@repo/shared-logger';
import { EventsServiceDefinition } from '@repo/grpc-sdk';
import type { EventBusService } from '../services/event-bus.service.js';
import type { PrismaClient } from '@prisma/client';
import { EventsGrpcService } from '../grpc/events.grpc.service.js';

const logger = createGraphQLLogger('events-grpc-transport');

export class GrpcTransport {
  private server: ReturnType<typeof createServer> | null = null;
  private host: string;
  private port: number;

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaClient,
    host: string = 'localhost',
    port: number = 4113
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

      const eventsService = new EventsGrpcService(this.prisma, this.eventBus);

      this.server = createServer();
      this.server.add(EventsServiceDefinition as any, {
        publishEvent: eventsService.PublishEvent.bind(eventsService),
        publishBulkEvents: eventsService.PublishBulkEvents.bind(eventsService),
        getEventStatus: eventsService.GetEventStatus.bind(eventsService),
      });

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

