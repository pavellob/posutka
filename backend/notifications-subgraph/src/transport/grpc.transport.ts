import { createServer } from 'nice-grpc';
import { NotificationsServiceDefinition } from '@repo/grpc-sdk';
import { NotificationsGrpcService } from '../grpc/notifications.grpc.service.js';
import { createGraphQLLogger } from '@repo/shared-logger';
import type { ProviderManager } from '../providers/provider-manager.js';
import type { NotificationService } from '../services/notification.service.js';

const logger = createGraphQLLogger('notifications-grpc-transport');

/**
 * gRPC транспорт для notifications-subgraph.
 * Принимает запросы от других субграфов через gRPC.
 */
export class GrpcTransport {
  private server: any = null;
  private isServerRunning = false;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly providerManager: ProviderManager,
    private readonly notificationService: NotificationService
  ) {}

  async start(): Promise<void> {
    try {
      logger.info('Starting Notifications GRPC transport with nice-grpc', { 
        host: this.host, 
        port: this.port 
      });

      // Создаем GRPC сервис
      const grpcService = new NotificationsGrpcService(
        this.providerManager,
        this.notificationService
      );
      
      // Создаем GRPC сервер с использованием сгенерированного определения сервиса
      this.server = createServer();
      
      // Регистрируем сервис с методами
      this.server.add(NotificationsServiceDefinition, {
        sendNotification: grpcService.SendNotification.bind(grpcService),
        sendBulkNotifications: grpcService.SendBulkNotifications.bind(grpcService),
        getNotificationStatus: grpcService.GetNotificationStatus.bind(grpcService),
      });
      
      // Запускаем сервер
      await this.server.listen(`${this.host}:${this.port}`);
      
      this.isServerRunning = true;
      logger.info(`✅ Notifications GRPC server started on ${this.host}:${this.port}`);
    } catch (error: any) {
      logger.error('❌ Failed to start Notifications GRPC transport', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.server && this.isServerRunning) {
      logger.info('Stopping Notifications GRPC transport');
      
      await this.server.shutdown();
      this.isServerRunning = false;
      this.server = null;
      logger.info('Notifications GRPC transport stopped');
    }
  }

  isRunning(): boolean {
    return this.isServerRunning;
  }
}

