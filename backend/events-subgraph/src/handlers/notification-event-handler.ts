// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import type { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('notification-event-handler');

/**
 * Handler для создания уведомлений из событий.
 * Создает только Notification записи (без deliveries).
 * Deliveries и отправка обрабатываются отдельным процессом в notifications-subgraph.
 */
export class NotificationEventHandler {
  constructor(private readonly prisma: PrismaClient) {}
  
  async handle(event: any): Promise<void> {
    try {
      logger.info('Creating notifications for event', { 
        eventId: event.id,
        type: event.type,
        targetUserIds: event.targetUserIds 
      });
      
      // Для каждого затронутого пользователя
      for (const userId of event.targetUserIds || []) {
        await this.createNotificationForUser(event, userId);
      }
      
      logger.info('Notifications created for event', { eventId: event.id });
    } catch (error: any) {
      logger.error('Failed to create notifications', { 
        eventId: event.id,
        error: error.message 
      });
      throw error;
    }
  }
  
  private async createNotificationForUser(event: any, userId: string): Promise<void> {
    try {
      // Загружаем настройки
      const settings = await this.prisma.userNotificationSettings.findUnique({
        where: { userId }
      });
      
      if (!settings?.enabled) {
        logger.debug('Notifications disabled', { userId });
        return;
      }
      
      if (!settings.subscribedEvents.includes(event.type)) {
        logger.debug('User not subscribed to event', { userId, eventType: event.type });
        return;
      }
      
      // Рендерим сообщение
      const { title, message, actionUrl } = this.renderNotification(event);
      
      // Создаем Notification + Deliveries в одной транзакции
      const notification = await this.prisma.notification.create({
        data: {
          eventId: event.id,
          userId,
          orgId: event.orgId,
          eventType: event.type,
          title,
          message,
          actionUrl,
          actionText: 'Открыть',
          priority: this.determinePriority(event.type) as any,
          status: 'PENDING',
          metadata: JSON.stringify(event.payload),
          
          // Создаем deliveries сразу
          deliveryStatuses: {
            create: this.createDeliveries(settings, userId)
          }
        },
        include: {
          deliveryStatuses: true
        }
      });
      
      logger.info('Notification created with deliveries', { 
        notificationId: notification.id,
        userId,
        eventType: event.type,
        deliveriesCount: notification.deliveryStatuses.length
      });
      
      // Создаем связь Event ← → Notification
      await this.prisma.eventNotification.create({
        data: {
          eventId: event.id,
          notificationId: notification.id
        }
      });
      
      logger.info('✅ Event-Notification link created', { 
        eventId: event.id,
        notificationId: notification.id 
      });
      
    } catch (error: any) {
      logger.error('Failed to create notification for user', { 
        userId,
        error: error.message 
      });
    }
  }
  
  /**
   * Создать deliveries на основе настроек пользователя
   */
  private createDeliveries(settings: any, userId: string): any[] {
    const deliveries = [];
    
    if (settings.enabledChannels.includes('TELEGRAM') && settings.telegramChatId) {
      deliveries.push({
        channel: 'TELEGRAM',
        recipientType: 'TELEGRAM_CHAT_ID',
        recipientId: settings.telegramChatId,
        status: 'PENDING'
      });
    }
    
    if (settings.enabledChannels.includes('WEBSOCKET')) {
      deliveries.push({
        channel: 'WEBSOCKET',
        recipientType: 'USER_ID',
        recipientId: userId,
        status: 'PENDING'
      });
    }
    
    return deliveries;
  }
  
  private renderNotification(event: any): { title: string; message: string; actionUrl: string } {
    const payload = event.payload;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    switch (event.type) {
      case 'CLEANING_ASSIGNED':
        return {
          title: '🧹 Новая уборка назначена!',
          message: `Вам назначена уборка в ${payload.unitName || 'квартире'}`,
          actionUrl: `${frontendUrl}/cleanings?cleaning=${payload.cleaningId}`
        };
      
      case 'CLEANING_SCHEDULED':
        return {
          title: '📋 Доступна новая уборка',
          message: `Уборка в ${payload.unitName || 'квартире'} ждет исполнителя`,
          actionUrl: `${frontendUrl}/cleanings`
        };
      
      default:
        return {
          title: event.type.replace(/_/g, ' '),
          message: `Событие: ${event.type}`,
          actionUrl: frontendUrl
        };
    }
  }
  
  private determinePriority(eventType: string): string {
    switch (eventType) {
      case 'CLEANING_ASSIGNED':
        return 'HIGH';
      case 'CLEANING_STARTED':
        return 'NORMAL';
      case 'CLEANING_COMPLETED':
        return 'LOW';
      default:
        return 'NORMAL';
    }
  }
}

