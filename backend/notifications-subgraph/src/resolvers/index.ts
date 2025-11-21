import type { Context } from '../context.js';
import { createGraphQLLogger } from '@repo/shared-logger';
import { Channel } from '../providers/base-provider.js';

const logger = createGraphQLLogger('notifications-resolvers');

export const resolvers = {
  Query: {
    notification: async (_: unknown, { id }: { id: string }, { notificationService }: Context) => {
      return notificationService.getNotificationById(id);
    },
    
    notifications: async (_: unknown, params: any, { notificationService }: Context) => {
      return notificationService.getNotifications(params);
    },
    
    userNotificationSettings: async (_: unknown, { userId }: { userId: string }, { notificationService }: Context) => {
      return notificationService.getUserSettings(userId);
    },
    
    notificationTemplate: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
      return prisma.notificationTemplate.findUnique({
        where: { id },
      });
    },
    
    notificationTemplates: async (_: unknown, { eventType }: { eventType?: string }, { prisma }: Context) => {
      return prisma.notificationTemplate.findMany({
        where: eventType ? { eventType } : undefined,
        orderBy: { updatedAt: 'desc' },
      });
    },
  },
  
  Mutation: {
    sendNotification: async (_: unknown, { input }: { input: any }, { providerManager, notificationService, prisma }: Context) => {
      logger.info('📤 Sending notification via GraphQL', { input });
      
      // Преобразуем старый формат в новый (для обратной совместимости)
      const deliveryTargets = [];
      
      if (input.recipientIds && input.channels) {
        // Старый формат: создаем deliveryTargets
        for (const channel of input.channels) {
          for (const recipientId of input.recipientIds) {
            deliveryTargets.push({
              channel,
              recipientType: channel === 'TELEGRAM' ? 'TELEGRAM_CHAT_ID' : 'USER_ID',
              recipientId,
            });
          }
        }
      } else if (input.deliveryTargets) {
        // Новый формат
        deliveryTargets.push(...input.deliveryTargets);
      }
      
      // Создаем уведомление с deliveryTargets
      const notification = await notificationService.createNotification({
        ...input,
        deliveryTargets,
      });
      
      logger.info('✅ Notification created in DB', { 
        id: notification.id,
        deliveriesCount: notification.deliveryStatuses.length
      });
      
      // Отправляем через провайдеры для каждой доставки
      for (const delivery of notification.deliveryStatuses) {
        try {
          const message = {
            id: notification.id,
            recipientId: delivery.recipientId,
            title: input.title,
            message: input.message,
            priority: input.priority,
            metadata: input.metadata ? JSON.parse(input.metadata) : undefined,
            actionUrl: input.actionUrl,
            actionText: input.actionText,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          };
          
          const channelEnum = delivery.channel as Channel;
          
          logger.info('📡 Sending through provider', { 
            channel: delivery.channel,
            recipientType: delivery.recipientType,
            recipientId: delivery.recipientId,
            deliveryId: delivery.id
          });
          
          const result = await providerManager.sendNotification(message, [channelEnum]);
          const channelResult = result.get(channelEnum);
          
          // Обновляем статус доставки
          if (channelResult?.success) {
            await prisma.notificationDelivery.update({
              where: { id: delivery.id },
              data: {
                status: 'SENT' as any,
                externalId: channelResult.externalId,
                deliveredAt: channelResult.deliveredAt,
              },
            });
            logger.info(`✅ Delivery ${delivery.id} sent via ${delivery.channel}`);
          } else {
            await prisma.notificationDelivery.update({
              where: { id: delivery.id },
              data: {
                status: 'FAILED' as any,
                error: channelResult?.error || 'Unknown error',
              },
            });
            logger.error(`❌ Delivery ${delivery.id} failed via ${delivery.channel}`, { 
              error: channelResult?.error 
            });
          }
        } catch (error) {
          logger.error(`❌ Error processing delivery ${delivery.id}`, { error });
          await prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'FAILED' as any,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      }
      
      // Обновляем общий статус уведомления
      const allDeliveries = await prisma.notificationDelivery.findMany({
        where: { notificationId: notification.id },
      });
      
      const allSent = allDeliveries.every(d => d.status === 'SENT' || d.status === 'DELIVERED');
      const allFailed = allDeliveries.every(d => d.status === 'FAILED');
      const someSent = allDeliveries.some(d => d.status === 'SENT' || d.status === 'DELIVERED');
      
      if (allSent) {
        await notificationService.markAsSent(notification.id);
      } else if (allFailed) {
        await notificationService.markAsFailed(notification.id, 'All deliveries failed');
      } else if (someSent) {
        await notificationService.markAsSent(notification.id);
      }
      
      return notification;
    },
    
    markAsRead: async (_: unknown, { id }: { id: string }, _ctx: Context) => {
      logger.info('Marking notification as read', { id });
      // TODO: implement
      return { id, status: 'READ' };
    },
    
    markAllAsRead: async (_: unknown, { userId }: { userId: string }, _ctx: Context) => {
      logger.info('Marking all notifications as read for user', { userId });
      // TODO: implement
      return true;
    },
    
    deleteNotification: async (_: unknown, { id }: { id: string }, _ctx: Context) => {
      logger.info('Deleting notification', { id });
      // TODO: implement
      return true;
    },
    
    updateNotificationSettings: async (_: unknown, { input }: { input: any }, { notificationService }: Context) => {
      return notificationService.updateUserSettings(input.userId, input);
    },
    
    upsertNotificationTemplate: async (_: unknown, { input }: { input: any }, { prisma }: Context) => {
      logger.info('Upserting notification template', { input });
      
      // Маппим defaultNotificationChannels на defaultChannels для Prisma
      const defaultChannels = input.defaultNotificationChannels || input.defaultChannels || [];
      
      if (input.id) {
        // Обновление существующего шаблона
        return prisma.notificationTemplate.update({
          where: { id: input.id },
          data: {
            name: input.name,
            titleTemplate: input.titleTemplate,
            messageTemplate: input.messageTemplate,
            defaultChannels: defaultChannels,
            defaultPriority: input.defaultPriority || 'NORMAL',
          },
        });
      } else {
        // Создание нового шаблона
        return prisma.notificationTemplate.create({
          data: {
            eventType: input.eventType,
            name: input.name,
            titleTemplate: input.titleTemplate,
            messageTemplate: input.messageTemplate,
            defaultChannels: defaultChannels,
            defaultPriority: input.defaultPriority || 'NORMAL',
          },
        });
      }
    },
    
    deleteNotificationTemplate: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
      logger.info('Deleting notification template', { id });
      await prisma.notificationTemplate.delete({
        where: { id },
      });
      return true;
    },
  },
  
  Subscription: {
    notificationReceived: {
      subscribe: async function* (_: unknown, { userId }: { userId: string }, { providerManager }: Context) {
        logger.info('Client subscribed to notifications', { userId });
        
        // Получаем WebSocket провайдер
        const wsProvider = providerManager.getProvider(Channel.WEBSOCKET);
        
        if (!wsProvider) {
          throw new Error('WebSocket provider not available');
        }
        
        // Создаем async generator для subscription
        // Это будет отправлять уведомления клиенту через GraphQL subscriptions
        yield {
          notificationReceived: {
            id: 'test',
            title: 'Subscription active',
            message: 'You are now subscribed to notifications',
          },
        };
      },
    },
  },
  
  // Field resolvers
  Notification: {
    org: (parent: any) => parent.orgId ? { id: parent.orgId } : null,
    user: (parent: any) => parent.userId ? { id: parent.userId } : null,
  },
};

