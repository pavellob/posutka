import { createChannel, createClient, type Channel } from 'nice-grpc';
import { createGraphQLLogger } from '@repo/shared-logger';
import {
  EventsServiceDefinition,
  type EventsServiceClient as GeneratedEventsServiceClient,
  type PublishEventRequest,
  type PublishEventResponse,
  EventType,
  EventStatus,
} from '../generated/events.js';

const logger = createGraphQLLogger('grpc-events-client');

export { EventType, EventStatus };
export type { PublishEventRequest, PublishEventResponse };

export interface EventsGrpcClientConfig {
  host: string;
  port: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface PublishEventParams {
  eventType: EventType;
  sourceSubgraph: string;
  entityType: string;
  entityId: string;
  orgId?: string;
  actorUserId?: string;
  targetUserIds: string[];
  payload: any; // JSON-объект, будет сериализован
  metadata?: any; // JSON-объект, будет сериализован
}

export class EventsGrpcClient {
  private client: GeneratedEventsServiceClient | null = null;
  private channel: Channel | null = null;
  private isConnected = false;
  private retryAttempts: number;
  private retryDelay: number;
  private timeout: number;

  constructor(private readonly config: EventsGrpcClientConfig) {
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.timeout = config.timeout || 10000;
  }

  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Events GRPC service', {
        host: this.config.host,
        port: this.config.port,
      });

      this.channel = createChannel(`${this.config.host}:${this.config.port}`);
      this.client = createClient(EventsServiceDefinition, this.channel);

      this.isConnected = true;
      logger.info('Connected to Events GRPC service');
    } catch (error: any) {
      logger.error('Failed to connect to Events GRPC service', {
        error: error.message,
      });
      throw error;
    }
  }

  async publishEvent(params: PublishEventParams): Promise<PublishEventResponse> {
    if (!this.isConnected || !this.client) {
      throw new Error('GRPC client is not connected. Call connect() first.');
    }

    return this.executeWithRetry(async () => {
      logger.info('Publishing event via GRPC', {
        eventType: EventType[params.eventType],
        entityType: params.entityType,
        entityId: params.entityId,
        targetUserIdsCount: params.targetUserIds.length,
      });

      const request: PublishEventRequest = {
        eventType: params.eventType,
        sourceSubgraph: params.sourceSubgraph,
        entityType: params.entityType,
        entityId: params.entityId,
        orgId: params.orgId || undefined,
        actorUserId: params.actorUserId || undefined,
        targetUserIds: params.targetUserIds,
        payloadJson: JSON.stringify(params.payload),
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : undefined,
      };

      const response = await this.client!.publishEvent(request);

      logger.info('Event published successfully', {
        eventId: response.eventId,
        status: EventStatus[response.status],
        createdAt: response.createdAt,
      });

      return response;
    });
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        logger.debug(`Executing GRPC operation, attempt ${attempt}`);

        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
          ),
        ]);

        return result;
      } catch (error: any) {
        lastError = error;
        logger.warn(
          `GRPC operation failed, attempt ${attempt}/${this.retryAttempts}`,
          {
            error: error.message,
            willRetry: attempt < this.retryAttempts,
          }
        );

        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    logger.error(`GRPC operation failed after ${this.retryAttempts} attempts`, {
      error: lastError?.message,
    });

    throw lastError || new Error('Operation failed');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.client = null;
    this.isConnected = false;
    logger.info('Disconnected from Events GRPC service');
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

// Экспорт фабрики для создания клиента
export function createEventsGrpcClient(
  config: EventsGrpcClientConfig
): EventsGrpcClient {
  return new EventsGrpcClient(config);
}

