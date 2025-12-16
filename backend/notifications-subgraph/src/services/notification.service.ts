import { createGraphQLLogger } from '@repo/shared-logger';
import type { PrismaClient } from '@prisma/client';

const logger = createGraphQLLogger('notification-service');

export interface DeliveryTarget {
  channel: string;
  recipientType: string;
  recipientId: string;
}

export interface CreateNotificationInput {
  orgId?: string;
  userId?: string;
  eventType: string;
  deliveryTargets: DeliveryTarget[];
  priority: string;
  title: string;
  message: string;
  metadata?: string;
  actionUrl?: string;
  actionText?: string;
  scheduledAt?: Date;
}

/**
 * Сервис для работы с уведомлениями.
 * Управляет хранением и получением уведомлений из БД.
 */
export class NotificationService {
  constructor(private readonly prisma: PrismaClient) {}
  
  /**
   * Создать новое уведомление.
   */
  async createNotification(input: CreateNotificationInput): Promise<any> {
    try {
      logger.info('Creating notification in DB', { 
        eventType: input.eventType,
        deliveryTargetsCount: input.deliveryTargets.length,
        channels: input.deliveryTargets.map(dt => dt.channel)
      });
      
      // Создаем уведомление в БД вместе с записями доставки
      const notification = await this.prisma.notification.create({
        data: {
          orgId: input.orgId || null,
          userId: input.userId || null,
          eventType: input.eventType,
          priority: input.priority as any,
          status: input.scheduledAt ? 'SCHEDULED' : 'PENDING',
          title: input.title,
          message: input.message,
          metadata: input.metadata || null,
          actionUrl: input.actionUrl || null,
          actionText: input.actionText || null,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          deliveryStatuses: {
            create: input.deliveryTargets.map(target => ({
              channel: target.channel as any,
              recipientType: target.recipientType as any,
              recipientId: target.recipientId,
              status: 'PENDING' as any,
            })),
          },
        },
        include: {
          deliveryStatuses: true,
        },
      });
      
      logger.info('✅ Notification created in DB', { 
        notificationId: notification.id,
        status: notification.status,
        deliveriesCount: notification.deliveryStatuses.length
      });
      
      return {
        id: notification.id,
        orgId: notification.orgId,
        userId: notification.userId,
        eventType: notification.eventType,
        priority: notification.priority,
        status: notification.status,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        scheduledAt: notification.scheduledAt?.toISOString(),
        createdAt: notification.createdAt.toISOString(),
        updatedAt: notification.updatedAt.toISOString(),
        deliveryStatuses: notification.deliveryStatuses.map(ds => ({
          id: ds.id,
          channel: ds.channel,
          recipientType: ds.recipientType,
          recipientId: ds.recipientId,
          status: ds.status,
          error: ds.error,
          deliveredAt: ds.deliveredAt?.toISOString(),
        })),
      };
    } catch (error) {
      logger.error('❌ Failed to create notification:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        input: {
          eventType: input.eventType,
          deliveryTargetsCount: input.deliveryTargets.length,
        }
      });
      throw error;
    }
  }
  
  /**
   * Получить уведомление по ID.
   */
  async getNotificationById(id: string): Promise<any | null> {
    try {
      // Пока возвращаем mock
      // В будущем: return await this.prisma.notification.findUnique({ where: { id } });
      
      logger.info('Getting notification by ID', { id });
      return null;
    } catch (error) {
      logger.error('Failed to get notification:', error);
      throw error;
    }
  }
  
  /**
   * Отметить уведомление как отправленное.
   */
  async markAsSent(id: string): Promise<void> {
    try {
      logger.info('Marking notification as sent', { id });
      
      await this.prisma.notification.update({
        where: { id },
        data: { 
          status: 'SENT', 
          sentAt: new Date() 
        }
      });
      
      logger.info('✅ Notification marked as sent', { id });
    } catch (error) {
      logger.error('❌ Failed to mark as sent:', error);
    }
  }
  
  /**
   * Отметить уведомление как неудачное.
   */
  async markAsFailed(id: string, errorMessage: string): Promise<void> {
    try {
      logger.error('Marking notification as failed', { id, error: errorMessage });
      
      await this.prisma.notification.update({
        where: { id },
        data: { 
          status: 'FAILED', 
          error: errorMessage 
        }
      });
      
      logger.info('Notification marked as failed', { id });
    } catch (err) {
      logger.error('❌ Failed to mark as failed:', err);
    }
  }
  
  /**
   * Получить список уведомлений с фильтрацией.
   */
  async getNotifications(params: any): Promise<any> {
    try {
      logger.info('Getting notifications list', params);
      
      // Построение where условия
      const where: any = {};
      
      if (params.userId) {
        where.userId = params.userId;
      }
      
      if (params.orgId) {
        where.orgId = params.orgId;
      }
      
      if (params.status) {
        where.status = params.status;
      }
      
      if (params.eventType) {
        where.eventType = params.eventType;
      }
      
      if (params.unreadOnly) {
        where.readAt = null;
      }
      
      // Получаем уведомления из БД
      const notifications = await this.prisma.notification.findMany({
        where,
        take: params.first || 50,
        orderBy: { createdAt: 'desc' },
        include: {
          deliveryStatuses: true,
        },
      });
      
      // Подсчитываем общее количество
      const totalCount = await this.prisma.notification.count({ where });
      
      // Формируем edges
      const edges = notifications.map((notif) => ({
        node: {
          id: notif.id,
          orgId: notif.orgId,
          userId: notif.userId,
          eventType: notif.eventType,
          priority: notif.priority,
          status: notif.status,
          title: notif.title,
          message: notif.message,
          metadata: notif.metadata,
          actionUrl: notif.actionUrl,
          actionText: notif.actionText,
          scheduledAt: notif.scheduledAt?.toISOString(),
          sentAt: notif.sentAt?.toISOString(),
          deliveredAt: notif.deliveredAt?.toISOString(),
          readAt: notif.readAt?.toISOString(),
          createdAt: notif.createdAt.toISOString(),
          updatedAt: notif.updatedAt.toISOString(),
          deliveryStatuses: notif.deliveryStatuses.map(ds => ({
            id: ds.id,
            channel: ds.channel,
            recipientType: ds.recipientType,
            recipientId: ds.recipientId,
            status: ds.status,
            error: ds.error,
            deliveredAt: ds.deliveredAt?.toISOString(),
          })),
        },
        cursor: notif.id,
      }));
      
      return {
        edges,
        pageInfo: {
          hasNextPage: notifications.length === (params.first || 50),
          hasPreviousPage: false,
          startCursor: edges.length > 0 ? edges[0].cursor : undefined,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
          totalCount,
        },
      };
    } catch (error) {
      logger.error('Failed to get notifications:', error);
      throw error;
    }
  }
  
  /**
   * Получить настройки уведомлений пользователя.
   */
  async getUserSettings(userId: string): Promise<any | null> {
    try {
      logger.info('Getting user notification settings', { userId });
      
      // Получаем настройки из БД
      const settings = await this.prisma.userNotificationSettings.findUnique({
        where: { userId },
      });
      
      // Если настроек нет, возвращаем дефолтные
      if (!settings) {
        return {
          userId,
          enabled: true,
          enabledChannels: ['TELEGRAM', 'WEBSOCKET'],
          subscribedEvents: [],
          telegramChatId: null,
          telegramUsername: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      
      return {
        userId: settings.userId,
        telegramChatId: settings.telegramChatId,
        telegramUsername: settings.telegramUsername,
        email: settings.email,
        phone: settings.phone,
        enabled: settings.enabled,
        enabledChannels: settings.enabledChannels,
        subscribedEvents: settings.subscribedEvents,
        createdAt: settings.createdAt.toISOString(),
        updatedAt: settings.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get user settings:', error);
      throw error;
    }
  }
  
  /**
   * Обновить настройки уведомлений пользователя.
   */
  async updateUserSettings(userId: string, settings: any): Promise<any> {
    try {
      logger.info('Updating user notification settings', { userId, settings });
      
      // Подготавливаем данные для обновления
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      // Нормализуем telegramUsername (убираем @ и приводим к нижнему регистру)
      const normalizedUsername = settings.telegramUsername
        ? String(settings.telegramUsername).replace('@', '').toLowerCase()
        : undefined;
      
      // Добавляем только те поля, которые переданы
      if (settings.telegramChatId !== undefined) updateData.telegramChatId = settings.telegramChatId;
      if (normalizedUsername !== undefined) updateData.telegramUsername = normalizedUsername;
      if (settings.email !== undefined) updateData.email = settings.email;
      if (settings.phone !== undefined) updateData.phone = settings.phone;
      if (settings.enabled !== undefined) updateData.enabled = settings.enabled;
      if (settings.enabledChannels !== undefined) updateData.enabledChannels = settings.enabledChannels;
      if (settings.subscribedEvents !== undefined) updateData.subscribedEvents = settings.subscribedEvents;
      
      // Обновляем или создаем настройки
      const result = await this.prisma.userNotificationSettings.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          telegramChatId: settings.telegramChatId || null,
          telegramUsername: normalizedUsername || null,
          email: settings.email || null,
          phone: settings.phone || null,
          enabled: settings.enabled !== undefined ? settings.enabled : true,
          enabledChannels: settings.enabledChannels || ['TELEGRAM', 'WEBSOCKET'],
          subscribedEvents: settings.subscribedEvents || [],
        },
      });
      
      return {
        userId: result.userId,
        telegramChatId: result.telegramChatId,
        telegramUsername: result.telegramUsername,
        email: result.email,
        phone: result.phone,
        enabled: result.enabled,
        enabledChannels: result.enabledChannels,
        subscribedEvents: result.subscribedEvents,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('Failed to update user settings:', error);
      throw error;
    }
  }
  
  /**
   * Получить настройки уведомлений организации.
   */
  async getOrganizationSettings(orgId: string): Promise<any | null> {
    try {
      logger.info('Getting organization notification settings', { orgId });
      
      // Получаем настройки из БД
      const settings = await this.prisma.organizationNotificationSettings.findUnique({
        where: { orgId },
      });
      
      // Если настроек нет, возвращаем дефолтные
      if (!settings) {
        return {
          orgId,
          dailyCleaningNotificationEnabled: false,
          dailyCleaningNotificationTime: null,
          dailyRepairNotificationEnabled: false,
          dailyRepairNotificationTime: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      
      return {
        orgId: settings.orgId,
        dailyCleaningNotificationEnabled: settings.dailyCleaningNotificationEnabled ?? false,
        dailyCleaningNotificationTime: settings.dailyCleaningNotificationTime,
        dailyRepairNotificationEnabled: settings.dailyRepairNotificationEnabled ?? false,
        dailyRepairNotificationTime: settings.dailyRepairNotificationTime,
        createdAt: settings.createdAt.toISOString(),
        updatedAt: settings.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get organization settings:', error);
      throw error;
    }
  }
  
  /**
   * Обновить настройки уведомлений организации.
   */
  async updateOrganizationSettings(orgId: string, settings: any): Promise<any> {
    try {
      logger.info('Updating organization notification settings', { orgId, settings });
      
      // Подготавливаем данные для обновления
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      // Добавляем только те поля, которые переданы
      if (settings.dailyCleaningNotificationEnabled !== undefined) updateData.dailyCleaningNotificationEnabled = settings.dailyCleaningNotificationEnabled;
      if (settings.dailyCleaningNotificationTime !== undefined) updateData.dailyCleaningNotificationTime = settings.dailyCleaningNotificationTime;
      if (settings.dailyRepairNotificationEnabled !== undefined) updateData.dailyRepairNotificationEnabled = settings.dailyRepairNotificationEnabled;
      if (settings.dailyRepairNotificationTime !== undefined) updateData.dailyRepairNotificationTime = settings.dailyRepairNotificationTime;
      
      // Обновляем или создаем настройки
      const result = await this.prisma.organizationNotificationSettings.upsert({
        where: { orgId },
        update: updateData,
        create: {
          orgId,
          dailyCleaningNotificationEnabled: settings.dailyCleaningNotificationEnabled ?? false,
          dailyCleaningNotificationTime: settings.dailyCleaningNotificationTime || null,
          dailyRepairNotificationEnabled: settings.dailyRepairNotificationEnabled ?? false,
          dailyRepairNotificationTime: settings.dailyRepairNotificationTime || null,
        },
      });
      
      return {
        orgId: result.orgId,
        dailyCleaningNotificationEnabled: result.dailyCleaningNotificationEnabled ?? false,
        dailyCleaningNotificationTime: result.dailyCleaningNotificationTime,
        dailyRepairNotificationEnabled: result.dailyRepairNotificationEnabled ?? false,
        dailyRepairNotificationTime: result.dailyRepairNotificationTime,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('Failed to update organization settings:', error);
      throw error;
    }
  }
}

