import type { Context } from '../context.js';
import { createGraphQLLogger } from '@repo/shared-logger';
import { notificationClient } from '../services/notification-client.js';

const logger = createGraphQLLogger('cleaning-subgraph-resolvers');

export const resolvers = {
  Query: {
    // Cleaner queries
    cleaner: (_: unknown, { id }: { id: string }, { dl }: Context) => 
      dl.getCleanerById(id),
    
    cleaners: (_: unknown, params: any, { dl }: Context) => 
      dl.listCleaners(params),
    
    // Cleaning template queries
    cleaningTemplate: (_: unknown, { id }: { id: string }, { dl }: Context) => 
      dl.getCleaningTemplateById(id),
    
    cleaningTemplates: (_: unknown, { unitId }: { unitId: string }, { dl }: Context) => 
      dl.getCleaningTemplatesByUnitId(unitId),
    
    // Cleaning queries
    cleaning: (_: unknown, { id }: { id: string }, { dl }: Context) => 
      dl.getCleaningById(id),
    
    cleaningByTask: (_: unknown, { taskId }: { taskId: string }, { dl }: Context) => 
      dl.getCleaningByTaskId(taskId),
    
    cleanings: (_: unknown, params: any, { dl }: Context) => 
      dl.listCleanings(params),
  },

  Mutation: {
    // Cleaner mutations
    createCleaner: async (_: unknown, { input }: { input: any }, { dl }: Context) => {
      logger.info('Creating cleaner', { input });
      return dl.createCleaner(input);
    },
    
    updateCleaner: async (_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) => {
      logger.info('Updating cleaner', { id, input });
      return dl.updateCleaner(id, input);
    },
    
    deactivateCleaner: async (_: unknown, { id }: { id: string }, { dl }: Context) => {
      logger.info('Deactivating cleaner', { id });
      return dl.deactivateCleaner(id);
    },
    
    activateCleaner: async (_: unknown, { id }: { id: string }, { dl }: Context) => {
      logger.info('Activating cleaner', { id });
      return dl.activateCleaner(id);
    },
    
    // Cleaning template mutations
    createCleaningTemplate: async (_: unknown, { input }: { input: any }, { dl }: Context) => {
      logger.info('Creating cleaning template', { input });
      return dl.createCleaningTemplate(input);
    },
    
    updateCleaningTemplate: async (_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) => {
      logger.info('Updating cleaning template', { id, input });
      return dl.updateCleaningTemplate(id, input);
    },
    
    deleteCleaningTemplate: async (_: unknown, { id }: { id: string }, { dl }: Context) => {
      logger.info('Deleting cleaning template', { id });
      return dl.deleteCleaningTemplate(id);
    },
    
    // Cleaning mutations
    scheduleCleaning: async (_: unknown, { input }: { input: any }, { dl, prisma }: Context) => {
      logger.info('Scheduling cleaning', { input });
      const cleaning = await dl.scheduleCleaning(input);
      
      // Отправляем уведомление уборщику
      try {
        logger.info('🔔 Starting notification flow for cleaning', { cleaningId: cleaning.id, cleanerId: cleaning.cleanerId });
        
        const cleaner = await prisma.cleaner.findUnique({
          where: { id: cleaning.cleanerId },
          include: { cleanings: false }
        });
        
        if (!cleaner) {
          logger.warn('❌ Cleaner not found', { cleanerId: cleaning.cleanerId });
          return cleaning;
        }
        
        logger.info('✅ Cleaner found', { 
          cleanerId: cleaner.id, 
          userId: cleaner.userId,
          type: cleaner.type,
          firstName: cleaner.firstName,
          lastName: cleaner.lastName 
        });
        
        const unit = await prisma.unit.findUnique({
          where: { id: cleaning.unitId },
          include: { property: true }
        });
        
        if (!unit) {
          logger.warn('❌ Unit not found', { unitId: cleaning.unitId });
          return cleaning;
        }
        
        logger.info('✅ Unit found', { unitId: unit.id, unitName: unit.name });
        
        // Получаем настройки уведомлений пользователя, ассоциированного с уборщиком
        // Для INTERNAL cleaner используем userId, для EXTERNAL - используем id уборщика как userId
        const targetUserId = cleaner.userId || cleaner.id;
        logger.info('🎯 Target userId determined', { targetUserId, cleanerUserId: cleaner.userId, cleanerId: cleaner.id });
        
        const settings = targetUserId 
          ? await prisma.userNotificationSettings.findUnique({
              where: { userId: targetUserId },
            }).catch((err) => {
              logger.error('❌ Error fetching notification settings', { error: err });
              return null;
            })
          : null;
        
        if (!settings) {
          logger.warn('⚠️ No notification settings found for user', { 
            targetUserId,
            hint: 'User needs to set up notification settings first. They can do this in /settings/notifications'
          });
          return cleaning;
        }
        
        logger.info('✅ Notification settings found', { 
          userId: settings.userId,
          enabled: settings.enabled,
          telegramChatId: settings.telegramChatId ? '***' + settings.telegramChatId.slice(-4) : null,
          enabledChannels: settings.enabledChannels,
          subscribedEvents: settings.subscribedEvents
        });
        
        if (!settings.enabled) {
          logger.warn('⚠️ Notifications disabled for user', { targetUserId });
          return cleaning;
        }
        
        if (!settings.telegramChatId) {
          logger.warn('⚠️ No Telegram chat ID configured', { 
            targetUserId,
            hint: 'User needs to connect Telegram bot via /start command'
          });
          return cleaning;
        }
        
        if (!settings.enabledChannels.includes('TELEGRAM')) {
          logger.warn('⚠️ Telegram channel not enabled', { 
            targetUserId,
            enabledChannels: settings.enabledChannels 
          });
          return cleaning;
        }
        
        if (!settings.subscribedEvents.includes('CLEANING_ASSIGNED')) {
          logger.warn('⚠️ User not subscribed to CLEANING_ASSIGNED events', { 
            targetUserId,
            subscribedEvents: settings.subscribedEvents 
          });
          return cleaning;
        }
        
        logger.info('📤 Sending notification...', { 
          cleaningId: cleaning.id,
          userId: targetUserId,
          telegramChatId: settings?.telegramChatId ? '***' + settings.telegramChatId.slice(-4) : 'none'
        });
        
        await notificationClient.notifyCleaningAssigned({
          userId: targetUserId,
          telegramChatId: settings?.telegramChatId,
          cleanerId: cleaning.cleanerId,
          cleaningId: cleaning.id,
          unitName: `${unit.property?.title || ''} - ${unit.name}`,
          scheduledAt: cleaning.scheduledAt,
          requiresLinenChange: cleaning.requiresLinenChange,
          orgId: cleaning.orgId,
        });
        
        logger.info('✅ Notification sent successfully!', { cleaningId: cleaning.id });
      } catch (error) {
        logger.error('❌ Failed to send notification for scheduled cleaning:', error);
        // Не прерываем основной flow
      }
      
      return cleaning;
    },
    
    startCleaning: async (_: unknown, { id }: { id: string }, { dl, prisma }: Context) => {
      logger.info('Starting cleaning', { id });
      const cleaning = await dl.startCleaning(id);
      
      // Отправляем уведомление менеджерам (опционально)
      try {
        const cleaner = await prisma.cleaner.findUnique({
          where: { id: cleaning.cleanerId }
        });
        
        const unit = await prisma.unit.findUnique({
          where: { id: cleaning.unitId },
          include: { property: true }
        });
        
        // TODO: Получить telegram ID менеджера организации
        // и отправить уведомление о начале уборки
        
        logger.info('Cleaning started, notification logic executed', { cleaningId: id });
      } catch (error) {
        logger.error('Failed to send start notification:', error);
      }
      
      return cleaning;
    },
    
    completeCleaning: async (_: unknown, { id, input }: { id: string; input: any }, { dl, prisma }: Context) => {
      logger.info('Completing cleaning', { id, input });
      const cleaning = await dl.completeCleaning(id, input);
      
      // Отправляем уведомление уборщику о завершении
      try {
        const cleaner = await prisma.cleaner.findUnique({
          where: { id: cleaning.cleanerId }
        });
        
        const unit = await prisma.unit.findUnique({
          where: { id: cleaning.unitId },
          include: { property: true }
        });
        
        const targetUserId = cleaner?.userId || cleaner?.id;
        const settings = targetUserId 
          ? await prisma.userNotificationSettings.findUnique({
              where: { userId: targetUserId },
            }).catch(() => null)
          : null;
        
        if (cleaner && unit) {
          // Вычисляем длительность
          const duration = cleaning.startedAt && cleaning.completedAt
            ? Math.floor((new Date(cleaning.completedAt).getTime() - new Date(cleaning.startedAt).getTime()) / 60000)
            : undefined;
          
          await notificationClient.notifyCleaningCompleted({
            userId: targetUserId!,
            telegramChatId: settings?.telegramChatId || undefined,
            cleaningId: cleaning.id,
            unitName: `${unit.property?.title || ''} - ${unit.name}`,
            cleanerName: `${cleaner.firstName} ${cleaner.lastName}`,
            duration,
          });
        }
      } catch (error) {
        logger.error('Failed to send completion notification:', error);
      }
      
      return cleaning;
    },
    
    cancelCleaning: async (_: unknown, { id, reason }: { id: string; reason?: string }, { dl, prisma }: Context) => {
      logger.info('Cancelling cleaning', { id, reason });
      const cleaning = await dl.cancelCleaning(id, reason);
      
      // Отправляем уведомление об отмене
      try {
        const cleaner = await prisma.cleaner.findUnique({
          where: { id: cleaning.cleanerId }
        });
        
        const unit = await prisma.unit.findUnique({
          where: { id: cleaning.unitId },
          include: { property: true }
        });
        
        const targetUserId = cleaner?.userId || cleaner?.id;
        const settings = targetUserId 
          ? await prisma.userNotificationSettings.findUnique({
              where: { userId: targetUserId },
            }).catch(() => null)
          : null;
        
        if (unit) {
          await notificationClient.notifyCleaningCancelled({
            userId: targetUserId!,
            telegramChatId: settings?.telegramChatId || undefined,
            cleaningId: cleaning.id,
            unitName: `${unit.property?.title || ''} - ${unit.name}`,
            reason,
          });
        }
      } catch (error) {
        logger.error('Failed to send cancellation notification:', error);
      }
      
      return cleaning;
    },
    
    updateCleaningChecklist: async (_: unknown, { id, items }: { id: string; items: any[] }, { dl }: Context) => {
      logger.info('Updating cleaning checklist', { id, itemsCount: items.length });
      return dl.updateCleaningChecklist(id, items);
    },
    
    // Cleaning document mutations
    createPreCleaningDocument: async (_: unknown, { cleaningId, input }: { cleaningId: string; input: any }, { dl }: Context) => {
      logger.info('Creating pre-cleaning document', { cleaningId });
      return dl.createPreCleaningDocument(cleaningId, input);
    },
    
    createPostCleaningDocument: async (_: unknown, { cleaningId, input }: { cleaningId: string; input: any }, { dl }: Context) => {
      logger.info('Creating post-cleaning document', { cleaningId });
      return dl.createPostCleaningDocument(cleaningId, input);
    },
    
    addPhotoToDocument: async (_: unknown, { documentId, input }: { documentId: string; input: any }, { dl }: Context) => {
      logger.info('Adding photo to document', { documentId });
      return dl.addPhotoToDocument(documentId, input);
    },
    
    deletePhotoFromDocument: async (_: unknown, { photoId }: { photoId: string }, { dl }: Context) => {
      logger.info('Deleting photo from document', { photoId });
      return dl.deletePhotoFromDocument(photoId);
    },
  },

  // Type resolvers for federation
  Cleaner: {
    user: (parent: any, _: unknown, { identityDL }: Context) => {
      return { id: parent.userId };
    },
    org: (parent: any, _: unknown, { identityDL }: Context) => {
      return { id: parent.orgId };
    },
    cleanings: async (parent: any, _: unknown, { dl }: Context) => {
      const result = await dl.listCleanings({
        cleanerId: parent.id,
        first: 100,
      });
      return result.edges.map((edge: any) => edge.node);
    },
  },

  CleaningTemplate: {
    unit: (parent: any, _: unknown, { inventoryDL }: Context) => {
      return { id: parent.unitId };
    },
  },

  Cleaning: {
    org: (parent: any, _: unknown, { identityDL }: Context) => {
      return { id: parent.orgId };
    },
    cleaner: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getCleanerById(parent.cleanerId);
    },
    unit: (parent: any, _: unknown, { inventoryDL }: Context) => {
      return { id: parent.unitId };
    },
    booking: (parent: any, _: unknown, { bookingsDL }: Context) => {
      if (!parent.bookingId) return null;
      return { id: parent.bookingId };
    },
    documents: async (parent: any, _: unknown, { prisma }: Context) => {
      // Get documents for this cleaning
      const documents = await prisma.cleaningDocument.findMany({
        where: { cleaningId: parent.id },
        include: { photos: true },
      });
      
      return documents.map((doc: any) => ({
        id: doc.id,
        cleaningId: doc.cleaningId,
        type: doc.type,
        notes: doc.notes,
        photos: doc.photos.map((photo: any) => ({
          id: photo.id,
          documentId: photo.documentId,
          url: photo.url,
          caption: photo.caption,
          order: photo.order,
          createdAt: photo.createdAt.toISOString(),
          updatedAt: photo.updatedAt.toISOString(),
        })),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }));
    },
  },

  CleaningDocument: {
    cleaning: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getCleaningById(parent.cleaningId);
    },
  },
};

