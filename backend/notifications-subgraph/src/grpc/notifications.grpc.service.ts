import { createGraphQLLogger } from '@repo/shared-logger';
import type { NotificationsService } from './types.js';
import type { 
  NotificationRequest, 
  NotificationResponse,
  BulkNotificationRequest,
  BulkNotificationResponse,
  NotificationStatusRequest,
  NotificationStatusResponse
} from '@repo/grpc-sdk';
import { ProviderManager } from '../providers/provider-manager.js';
import { Channel, Priority } from '../providers/base-provider.js';
import { NotificationService } from '../services/notification.service.js';

const logger = createGraphQLLogger('notifications-grpc');

/**
 * gRPC сервис для приема событий от других subgraphs.
 */
export class NotificationsGrpcService implements NotificationsService {
  constructor(
    private readonly providerManager: ProviderManager,
    private readonly notificationService: NotificationService
  ) {}
  
  /**
   * Обработать входящее событие и отправить уведомление.
   */
  async SendNotification(request: NotificationRequest): Promise<NotificationResponse> {
    try {
      logger.info('Received notification request via gRPC', {
        eventType: request.eventType,
        recipients: request.recipientIds,
        channels: request.channels,
      });
      
      // Маппим gRPC типы в наши внутренние типы
      let parsedMetadata;
      try {
        parsedMetadata = request.metadata && request.metadata.trim() !== '' 
          ? JSON.parse(request.metadata) 
          : undefined;
      } catch (e) {
        logger.warn('Failed to parse metadata JSON, using as string', { 
          metadata: request.metadata,
          error: e instanceof Error ? e.message : String(e)
        });
        parsedMetadata = undefined;
      }
      
      // Извлекаем actionButtons из запроса
      // nice-grpc автоматически конвертирует snake_case в camelCase
      const requestAny = request as any;
      
      // Проверяем оба варианта имени поля (на случай если конвертация не сработала)
      // TypeScript тип может не включать actionButtons, поэтому используем any cast
      const rawActionButtons = 
        requestAny.actionButtons || 
        requestAny.action_buttons || 
        [];
      
      // Детальное логирование для диагностики
      logger.info('Received notification request - full inspection', {
        eventType: request.eventType,
        // Проверяем через any cast
        hasActionButtonsAny: !!requestAny.actionButtons,
        actionButtonsAny: requestAny.actionButtons,
        // Проверяем snake_case вариант
        hasActionButtonsSnake: !!requestAny.action_buttons,
        actionButtonsSnake: requestAny.action_buttons,
        // Финальный результат
        rawActionButtons: rawActionButtons,
        rawActionButtonsLength: rawActionButtons?.length || 0,
        // Все ключи запроса
        requestKeys: Object.keys(request),
        requestAnyKeys: Object.keys(requestAny),
        // Другие поля для проверки
        actionUrl: request.actionUrl,
        actionText: request.actionText,
        // Строковое представление для отладки
        requestStringified: JSON.stringify(request).substring(0, 500),
      });
      
      const actionButtons = rawActionButtons && Array.isArray(rawActionButtons) && rawActionButtons.length > 0
        ? rawActionButtons.map((btn: any) => {
            const mapped = {
              text: btn.text || btn.Text || '',
              url: btn.url || btn.Url || '',
              useWebApp: btn.useWebApp ?? (btn.use_web_app ?? false),
            };
            logger.debug('Mapping actionButton', { 
              originalBtn: btn, 
              mappedBtn: mapped 
            });
            return mapped;
          })
        : undefined;
      
      logger.info('Processed actionButtons', {
        hasActionButtons: !!actionButtons,
        actionButtonsCount: actionButtons?.length || 0,
        actionButtons: actionButtons,
      });
      
      // Базовый объект сообщения (recipientId будет установлен отдельно для каждого канала)
      const message = {
        id: this.generateId(),
        recipientId: '', // Будет установлен для каждого deliveryTarget отдельно
        title: request.title,
        message: request.message,
        priority: this.mapPriority(request.priority),
        metadata: parsedMetadata,
        actionUrl: actionButtons ? undefined : (request.actionUrl || undefined),
        actionText: actionButtons ? undefined : (request.actionText || undefined),
        actionButtons: actionButtons,
        scheduledAt: request.scheduledAt ? new Date(request.scheduledAt * 1000) : undefined,
      };
      
      const channels = request.channels.map((c: number) => this.mapChannel(c));
      
      // Создаем deliveryTargets с правильной логикой:
      // - recipientIds содержат только userId
      // - Для TELEGRAM канала находим telegramChatId из настроек пользователя
      // - Для WEBSOCKET используем userId напрямую
      const deliveryTargets = [];
      
      for (const userId of request.recipientIds) {
        // Находим настройки пользователя для получения telegramChatId
        const userSettings = await this.notificationService.getUserSettings(userId).catch(() => null);
        
        for (const channel of channels) {
          if (channel === 'TELEGRAM') {
            // Для Telegram нужен telegramChatId из настроек
            if (userSettings?.telegramChatId) {
              deliveryTargets.push({
                channel: 'TELEGRAM',
                recipientType: 'TELEGRAM_CHAT_ID',
                recipientId: userSettings.telegramChatId,
              });
              logger.info('Added TELEGRAM delivery target', { 
                userId, 
                telegramChatId: '***' + userSettings.telegramChatId.slice(-4) 
              });
            } else {
              logger.warn('Skipping TELEGRAM channel - no telegramChatId in user settings', { userId });
            }
          } else if (channel === 'WEBSOCKET') {
            // Для WebSocket используем userId
            deliveryTargets.push({
              channel: 'WEBSOCKET',
              recipientType: 'USER_ID',
              recipientId: userId,
            });
            logger.info('Added WEBSOCKET delivery target', { userId });
          } else {
            // Другие каналы - используем userId
            deliveryTargets.push({
              channel: channel,
              recipientType: 'USER_ID',
              recipientId: userId,
            });
          }
        }
      }
      
      // Сохраняем уведомление в БД
      logger.info('Creating notification in DB via gRPC', {
        orgId: request.orgId,
        recipientIds: request.recipientIds,
        eventType: this.mapEventType(request.eventType),
        deliveryTargetsCount: deliveryTargets.length,
      });
      
      const notification = await this.notificationService.createNotification({
        orgId: request.orgId || undefined,
        userId: undefined, // userId не передается в gRPC, используем recipientIds
        eventType: this.mapEventType(request.eventType),
        deliveryTargets,
        priority: message.priority,
        title: message.title,
        message: message.message,
        metadata: message.metadata ? JSON.stringify(message.metadata) : undefined,
        actionUrl: message.actionUrl,
        actionText: message.actionText,
        scheduledAt: message.scheduledAt,
      });
      
      logger.info('Notification created, sending through providers', {
        notificationId: notification.id,
        deliveryTargetsCount: deliveryTargets.length,
        hasActionButtons: !!message.actionButtons,
        actionButtonsCount: message.actionButtons?.length || 0,
        actionButtons: message.actionButtons,
      });
      
      // Отправляем через провайдеры для каждого deliveryTarget
      // (каждый deliveryTarget = канал + правильный recipientId для этого канала)
      let sentCount = 0;
      let failedCount = 0;
      
      for (const target of deliveryTargets) {
        try {
          logger.info('Sending via provider', {
            channel: target.channel,
            recipientType: target.recipientType,
            recipientId: target.recipientId.substring(0, 20) + '...',
            hasActionButtons: !!message.actionButtons,
            actionButtonsCount: message.actionButtons?.length || 0,
          });
          
          // Создаем сообщение с правильным recipientId для этого канала
          const channelMessage = {
            ...message,
            recipientId: target.recipientId, // ✅ Для Telegram - telegramChatId, для WebSocket - userId
            // Явно убеждаемся, что actionButtons передаются
            actionButtons: message.actionButtons,
          };
          
          logger.debug('Channel message prepared', {
            channel: target.channel,
            hasActionButtons: !!channelMessage.actionButtons,
            actionButtonsCount: channelMessage.actionButtons?.length || 0,
          });
          
          const results = await this.providerManager.sendNotification(
            channelMessage, 
            [target.channel as any]
          );
          
          const result = results.get(target.channel as any);
          if (result?.success) {
            sentCount++;
            logger.info('✅ Sent successfully via ' + target.channel);
          } else {
            failedCount++;
            logger.warn('❌ Failed to send via ' + target.channel, { error: result?.error });
          }
        } catch (error) {
          failedCount++;
          logger.error('❌ Error sending via ' + target.channel, error);
        }
      }
      
      // Обновляем статус в БД
      if (sentCount > 0) {
        await this.notificationService.markAsSent(notification.id);
      } else {
        await this.notificationService.markAsFailed(notification.id, 'All channels failed');
      }
      
      logger.info('Notification processed', {
        notificationId: notification.id,
        sentCount,
        failedCount,
      });
      
      return {
        notificationId: notification.id,
        status: sentCount > 0 ? 'sent' : 'failed',
        error: sentCount === 0 ? 'All channels failed' : '',
        sentCount: sentCount,
        failedCount: failedCount,
      };
    } catch (error) {
      logger.error('Failed to process notification request:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        request: {
          eventType: request.eventType,
          recipientIds: request.recipientIds,
          channels: request.channels,
        }
      });
      
      return {
        notificationId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        sentCount: 0,
        failedCount: request.channels?.length || 0,
      };
    }
  }
  
  /**
   * Массовая отправка уведомлений.
   */
  async SendBulkNotifications(request: BulkNotificationRequest): Promise<BulkNotificationResponse> {
    const responses = await Promise.all(
      request.notifications.map((notif) => this.SendNotification(notif))
    );
    
    const totalSent = responses.reduce((sum: number, r) => sum + r.sentCount, 0);
    const totalFailed = responses.reduce((sum: number, r) => sum + r.failedCount, 0);
    
    return {
      responses,
      totalSent: totalSent,
      totalFailed: totalFailed,
    };
  }
  
  /**
   * Получить статус уведомления.
   */
  async GetNotificationStatus(request: NotificationStatusRequest): Promise<NotificationStatusResponse> {
    try {
      const notification = await this.notificationService.getNotificationById(request.notificationId);
      
      if (!notification) {
        return {
          notificationId: request.notificationId,
          status: 'not_found',
          createdAt: 0,
          sentAt: 0,
          error: 'Notification not found',
          deliveryStatuses: [],
        };
      }
      
      return {
        notificationId: notification.id,
        status: notification.status.toLowerCase(),
        createdAt: Math.floor(new Date(notification.createdAt).getTime() / 1000),
        sentAt: notification.sentAt ? Math.floor(new Date(notification.sentAt).getTime() / 1000) : 0,
        error: notification.error || '',
        deliveryStatuses: notification.deliveryStatuses.map((ds: any) => ({
          channel: this.reverseMapChannel(ds.channel),
          status: ds.status,
          deliveredAt: ds.deliveredAt ? Math.floor(new Date(ds.deliveredAt).getTime() / 1000) : 0,
          error: ds.error || '',
        })),
      };
    } catch (error) {
      logger.error('Failed to get notification status:', error);
      
      return {
        notificationId: request.notificationId,
        status: 'error',
        createdAt: 0,
        sentAt: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatuses: [],
      };
    }
  }
  
  // Helper methods для маппинга типов
  
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  
  private mapChannel(channel: number): Channel {
    const channelMap: Record<number, Channel> = {
      0: Channel.TELEGRAM,
      1: Channel.EMAIL,
      2: Channel.SMS,
      3: Channel.PUSH,
      4: Channel.WEBSOCKET,
      5: Channel.IN_APP,
    };
    return channelMap[channel] || Channel.IN_APP;
  }
  
  private reverseMapChannel(channel: string): number {
    const channelMap: Record<string, number> = {
      TELEGRAM: 0,
      EMAIL: 1,
      SMS: 2,
      PUSH: 3,
      WEBSOCKET: 4,
      IN_APP: 5,
    };
    return channelMap[channel] || 5;
  }
  
  private mapPriority(priority: number): Priority {
    const priorityMap: Record<number, Priority> = {
      0: Priority.LOW,
      1: Priority.NORMAL,
      2: Priority.HIGH,
      3: Priority.URGENT,
    };
    return priorityMap[priority] || Priority.NORMAL;
  }
  
  private mapEventType(eventType: number): string {
    const eventTypeMap: Record<number, string> = {
      1: 'BOOKING_CREATED',
      2: 'BOOKING_CONFIRMED',
      3: 'BOOKING_CANCELLED',
      4: 'BOOKING_CHECKIN',
      5: 'BOOKING_CHECKOUT',
      10: 'CLEANING_AVAILABLE',
      11: 'CLEANING_ASSIGNED',
      12: 'CLEANING_STARTED',
      13: 'CLEANING_COMPLETED',
      14: 'CLEANING_CANCELLED',
      15: 'CLEANING_READY_FOR_REVIEW',
      16: 'CLEANING_PRECHECK_COMPLETED',
      20: 'TASK_CREATED',
      21: 'TASK_ASSIGNED',
      22: 'TASK_STATUS_CHANGED',
      23: 'TASK_COMPLETED',
      30: 'PAYMENT_RECEIVED',
      31: 'PAYMENT_FAILED',
      32: 'INVOICE_CREATED',
      33: 'INVOICE_OVERDUE',
      40: 'USER_REGISTERED',
      41: 'USER_LOGIN',
      42: 'SYSTEM_ALERT',
    };
    return eventTypeMap[eventType] || 'SYSTEM_ALERT';
  }
}

