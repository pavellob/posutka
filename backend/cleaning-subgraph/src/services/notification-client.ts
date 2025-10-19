// Загружаем переменные окружения
import dotenv from 'dotenv';
dotenv.config();

import { createGraphQLLogger } from '@repo/shared-logger';
import {
  createNotificationsGrpcClient,
  type NotificationsGrpcClient,
  EventType,
  Priority,
  NotificationChannel,
} from '@repo/grpc-sdk';

const logger = createGraphQLLogger('cleaning-notification-client');

/**
 * Клиент для отправки уведомлений в notifications-subgraph через gRPC.
 */
export class NotificationClient {
  private readonly grpcClient: NotificationsGrpcClient;
  private readonly frontendUrl: string;
  private connected = false;
  
  constructor(
    grpcHost: string = process.env.NOTIFICATIONS_GRPC_HOST || 'localhost',
    grpcPort: number = parseInt(process.env.NOTIFICATIONS_GRPC_PORT || '4111'),
    frontendUrl?: string
  ) {
    this.frontendUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
    
    this.grpcClient = createNotificationsGrpcClient({
      host: grpcHost,
      port: grpcPort,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
    });
    
    // Подключаемся к gRPC серверу
    this.connect();
    
    // Логируем для отладки
    logger.info('NotificationClient initialized (gRPC)', {
      grpcHost,
      grpcPort,
      frontendUrl: this.frontendUrl,
      envFrontendUrl: process.env.FRONTEND_URL,
    });
  }
  
  private async connect(): Promise<void> {
    try {
      await this.grpcClient.connect();
      this.connected = true;
      logger.info('NotificationClient connected to gRPC server');
    } catch (error) {
      logger.error('Failed to connect NotificationClient to gRPC server', error);
    }
  }
  
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }
  
  /**
   * Получить URL фронтенда для ссылок в уведомлениях.
   */
  private getFrontendUrl(path: string): string {
    return `${this.frontendUrl}${path}`;
  }
  
  /**
   * Отправить уведомление о назначении уборки.
   */
  async notifyCleaningAssigned(params: {
    userId: string;
    telegramChatId?: string;
    cleanerId: string;
    cleaningId: string;
    unitName: string;
    scheduledAt: string;
    requiresLinenChange: boolean;
    orgId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      
      const { userId, telegramChatId, unitName, scheduledAt, requiresLinenChange, cleaningId, orgId } = params;
      
      const scheduledDate = new Date(scheduledAt);
      const formattedDate = scheduledDate.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      
      // Определяем получателей и каналы
      const recipientIds = telegramChatId ? [telegramChatId, userId] : [userId];
      const channels = telegramChatId 
        ? [NotificationChannel.CHANNEL_TELEGRAM, NotificationChannel.CHANNEL_WEBSOCKET]
        : [NotificationChannel.CHANNEL_WEBSOCKET];
      
      const response = await this.grpcClient.sendNotification({
        eventType: EventType.EVENT_TYPE_CLEANING_ASSIGNED,
        orgId,
        recipientIds,
        channels,
        priority: Priority.PRIORITY_HIGH,
        title: '🧹 Новая уборка назначена!',
        message: `Вам назначена уборка в квартире "${unitName}"\n\nДата: ${formattedDate}${requiresLinenChange ? '\n\n⚠️ Требуется смена постельного белья' : ''}`,
        metadata: JSON.stringify({
          cleaningId,
          unitName,
          scheduledAt,
          requiresLinenChange,
        }),
        actionUrl: this.getFrontendUrl(`/cleanings?id=${cleaningId}`),
        actionText: 'Открыть детали уборки →',
      });
      
      logger.info('Cleaning assigned notification sent via gRPC', { 
        cleaningId, 
        userId, 
        hasTelegram: !!telegramChatId,
        notificationId: response.notificationId,
        status: response.status,
        actionUrl: this.getFrontendUrl(`/cleanings?id=${cleaningId}`)
      });
    } catch (error) {
      logger.error('Failed to send cleaning assigned notification:', error);
      // Не выбрасываем ошибку, чтобы не прервать основной flow
    }
  }
  
  /**
   * Отправить уведомление о начале уборки.
   */
  async notifyCleaningStarted(params: {
    userId: string;
    telegramChatId?: string;
    cleaningId: string;
    unitName: string;
    cleanerName: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      
      const { userId, telegramChatId, cleaningId, unitName, cleanerName } = params;
      
      const recipientIds = telegramChatId ? [telegramChatId, userId] : [userId];
      const channels = telegramChatId 
        ? [NotificationChannel.CHANNEL_TELEGRAM, NotificationChannel.CHANNEL_WEBSOCKET]
        : [NotificationChannel.CHANNEL_WEBSOCKET];
      
      const response = await this.grpcClient.sendNotification({
        eventType: EventType.EVENT_TYPE_CLEANING_STARTED,
        recipientIds,
        channels,
        priority: Priority.PRIORITY_NORMAL,
        title: '▶️ Уборка начата',
        message: `Уборщик ${cleanerName} начал уборку в "${unitName}"`,
        metadata: JSON.stringify({
          cleaningId,
          startedAt: new Date().toISOString(),
        }),
        actionUrl: this.getFrontendUrl(`/cleanings?id=${cleaningId}`),
        actionText: 'Посмотреть прогресс →',
      });
      
      logger.info('Cleaning started notification sent via gRPC', { 
        cleaningId, 
        userId,
        notificationId: response.notificationId
      });
    } catch (error) {
      logger.error('Failed to send cleaning started notification:', error);
    }
  }
  
  /**
   * Отправить уведомление о завершении уборки.
   */
  async notifyCleaningCompleted(params: {
    userId: string;
    telegramChatId?: string;
    cleaningId: string;
    unitName: string;
    cleanerName: string;
    duration?: number; // в минутах
  }): Promise<void> {
    try {
      await this.ensureConnected();
      
      const { userId, telegramChatId, cleaningId, unitName, cleanerName, duration } = params;
      
      let message = `Уборщик ${cleanerName} завершил уборку в "${unitName}"`;
      
      if (duration) {
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        message += `\n\n⏱️ Длительность: ${hours > 0 ? `${hours}ч ` : ''}${minutes}мин`;
      }
      
      message += '\n\n✅ Все пункты чеклиста выполнены';
      
      const recipientIds = telegramChatId ? [telegramChatId, userId] : [userId];
      const channels = telegramChatId 
        ? [NotificationChannel.CHANNEL_TELEGRAM, NotificationChannel.CHANNEL_WEBSOCKET]
        : [NotificationChannel.CHANNEL_WEBSOCKET];
      
      const response = await this.grpcClient.sendNotification({
        eventType: EventType.EVENT_TYPE_CLEANING_COMPLETED,
        recipientIds,
        channels,
        priority: Priority.PRIORITY_NORMAL,
        title: '✅ Уборка завершена!',
        message,
        metadata: JSON.stringify({
          cleaningId,
          completedAt: new Date().toISOString(),
          duration,
        }),
        actionUrl: this.getFrontendUrl(`/cleanings?id=${cleaningId}`),
        actionText: 'Посмотреть отчет →',
      });
      
      logger.info('Cleaning completed notification sent via gRPC', { 
        cleaningId, 
        userId,
        notificationId: response.notificationId
      });
    } catch (error) {
      logger.error('Failed to send cleaning completed notification:', error);
    }
  }
  
  /**
   * Отправить уведомление об отмене уборки.
   */
  async notifyCleaningCancelled(params: {
    userId: string;
    telegramChatId?: string;
    cleaningId: string;
    unitName: string;
    reason?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      
      const { userId, telegramChatId, cleaningId, unitName, reason } = params;
      
      let message = `Уборка в "${unitName}" отменена`;
      
      if (reason) {
        message += `\n\nПричина: ${reason}`;
      }
      
      const recipientIds = telegramChatId ? [telegramChatId, userId] : [userId];
      const channels = telegramChatId 
        ? [NotificationChannel.CHANNEL_TELEGRAM, NotificationChannel.CHANNEL_WEBSOCKET]
        : [NotificationChannel.CHANNEL_WEBSOCKET];
      
      const response = await this.grpcClient.sendNotification({
        eventType: EventType.EVENT_TYPE_CLEANING_CANCELLED,
        recipientIds,
        channels,
        priority: Priority.PRIORITY_NORMAL,
        title: '❌ Уборка отменена',
        message,
        metadata: JSON.stringify({
          cleaningId,
          reason,
          cancelledAt: new Date().toISOString(),
        }),
      });
      
      logger.info('Cleaning cancelled notification sent via gRPC', { 
        cleaningId, 
        userId,
        notificationId: response.notificationId
      });
    } catch (error) {
      logger.error('Failed to send cleaning cancelled notification:', error);
    }
  }
  
  /**
   * Отключиться от gRPC сервера.
   */
  async disconnect(): Promise<void> {
    try {
      await this.grpcClient.disconnect();
      this.connected = false;
      logger.info('NotificationClient disconnected from gRPC server');
    } catch (error) {
      logger.error('Failed to disconnect NotificationClient', error);
    }
  }
}

// Singleton instance
export const notificationClient = new NotificationClient();
