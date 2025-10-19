import { createChannel, createClient, type Channel } from 'nice-grpc';
import { createGraphQLLogger } from '@repo/shared-logger';
import {
  NotificationsServiceDefinition,
  type NotificationsServiceClient as GeneratedNotificationsServiceClient,
  type NotificationRequest,
  type NotificationResponse,
  EventType,
  Priority,
  Channel as NotificationChannel,
} from '../generated/notifications.js';

const logger = createGraphQLLogger('grpc-notifications-client');

export { EventType, Priority, NotificationChannel };
export type { NotificationRequest, NotificationResponse };

export interface NotificationsGrpcClientConfig {
  host: string;
  port: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface SendNotificationParams {
  eventType: EventType;
  orgId?: string;
  recipientIds: string[];
  channels: NotificationChannel[];
  priority: Priority;
  title: string;
  message: string;
  metadata?: string;
  scheduledAt?: number;
  actionUrl?: string;
  actionText?: string;
}

export class NotificationsGrpcClient {
  private client: GeneratedNotificationsServiceClient | null = null;
  private channel: Channel | null = null;
  private isConnected = false;
  private retryAttempts: number;
  private retryDelay: number;
  private timeout: number;

  constructor(private readonly config: NotificationsGrpcClientConfig) {
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.timeout = config.timeout || 10000; // 10 секунд для notifications
  }

  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Notifications GRPC service', {
        host: this.config.host,
        port: this.config.port,
      });

      this.channel = createChannel(`${this.config.host}:${this.config.port}`);
      this.client = createClient(NotificationsServiceDefinition, this.channel);

      this.isConnected = true;
      logger.info('Connected to Notifications GRPC service');
    } catch (error: any) {
      logger.error('Failed to connect to Notifications GRPC service', {
        error: error.message,
      });
      throw error;
    }
  }

  async sendNotification(params: SendNotificationParams): Promise<NotificationResponse> {
    if (!this.isConnected || !this.client) {
      throw new Error('GRPC client is not connected. Call connect() first.');
    }

    return this.executeWithRetry(async () => {
      logger.info('Sending notification via GRPC', {
        eventType: EventType[params.eventType],
        recipientCount: params.recipientIds.length,
        channels: params.channels.map((c) => NotificationChannel[c]),
        priority: Priority[params.priority],
      });

      const request: NotificationRequest = {
        eventType: params.eventType,
        orgId: params.orgId || '',
        recipientIds: params.recipientIds,
        channels: params.channels,
        priority: params.priority,
        title: params.title,
        message: params.message,
        metadata: params.metadata || '',
        scheduledAt: params.scheduledAt || 0,
        actionUrl: params.actionUrl || '',
        actionText: params.actionText || '',
      };

      const response = await this.client!.sendNotification(request);

      logger.info('Notification sent successfully', {
        notificationId: response.notificationId,
        status: response.status,
        sentCount: response.sentCount,
        failedCount: response.failedCount,
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
    logger.info('Disconnected from Notifications GRPC service');
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

// Экспорт фабрики для создания клиента
export function createNotificationsGrpcClient(
  config: NotificationsGrpcClientConfig
): NotificationsGrpcClient {
  return new NotificationsGrpcClient(config);
}


