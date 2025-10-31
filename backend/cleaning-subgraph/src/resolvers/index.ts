import type { Context } from '../context.js';
import { createGraphQLLogger } from '@repo/shared-logger';
// import { notificationClient } from '../services/notification-client.js'; // 🔴 ОТКЛЮЧЕНО - используем Event Bus

const logger = createGraphQLLogger('cleaning-subgraph-resolvers');

export const resolvers = {
  Query: {
    // Unit preferred cleaners query
    unitPreferredCleaners: async (_: unknown, { unitId }: { unitId: string }, context: Context) => {
      const { prisma } = context;
      
      if (!prisma) {
        logger.error('❌ prisma is undefined in context!');
        throw new Error('Prisma client not available in context');
      }
      
      const preferences = await prisma.unitPreferredCleaner.findMany({
        where: { unitId },
        include: { cleaner: true },
        orderBy: { createdAt: 'desc' },
      });
      
      return preferences.map(pref => ({
        id: pref.id,
        cleaner: pref.cleaner,
        createdAt: pref.createdAt,
      }));
    },
    
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
      
      const unit = await prisma.unit.findUnique({
        where: { id: cleaning.unitId },
        include: { property: true, preferredCleaners: { include: { cleaner: true } } }
      });
      
      if (!unit) {
        logger.warn('❌ Unit not found', { unitId: cleaning.unitId });
        return cleaning;
      }
      
      logger.info('✅ Unit found', { unitId: unit.id, unitName: unit.name, preferredCleanersCount: unit.preferredCleaners.length });
      
      // 🎯 НОВАЯ ЛОГИКА: Публикуем событие вместо прямого вызова
      try {
        const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();
        const targetUserIds: string[] = [];
        
        if (cleaning.cleanerId) {
          // Если уборщик назначен
          const cleaner = await prisma.cleaner.findUnique({
            where: { id: cleaning.cleanerId }
          });
          const targetUserId = cleaner?.userId || cleaner?.id;
          if (targetUserId) {
            targetUserIds.push(targetUserId);
          }
        } else {
          // Если уборщик НЕ назначен - уведомляем всех preferred cleaners
          for (const pref of unit.preferredCleaners) {
            const targetUserId = pref.cleaner.userId || pref.cleaner.id;
            if (targetUserId) {
              targetUserIds.push(targetUserId);
            }
          }
        }
        
        // Публикуем событие в Event Bus
        await prisma.event.create({
          data: {
            type: cleaning.cleanerId ? 'CLEANING_ASSIGNED' : 'CLEANING_SCHEDULED',
            sourceSubgraph: 'cleaning-subgraph',
            entityType: 'Cleaning',
            entityId: cleaning.id,
            orgId: cleaning.orgId || null,
            actorUserId: null, // TODO: получить из context
            targetUserIds,
            payload: {
              cleaningId: cleaning.id,
              unitId: cleaning.unitId,
              unitName,
              scheduledAt: cleaning.scheduledAt,
              cleanerId: cleaning.cleanerId || null,
              requiresLinenChange: cleaning.requiresLinenChange
            },
            status: 'PENDING'
          }
        });
        
        logger.info('✅ Event published', { 
          cleaningId: cleaning.id,
          eventType: cleaning.cleanerId ? 'CLEANING_ASSIGNED' : 'CLEANING_SCHEDULED',
          targetUserIds
        });
      } catch (error: any) {
        logger.error('❌ Failed to publish event', { error: error.message });
        // Не прерываем основной flow
      }
      
      // 🔴 СТАРАЯ ЛОГИКА - ОТКЛЮЧЕНА (используем Event Bus)
      /*
      if (cleaning.cleanerId) {
        try {
          logger.info('🔔 Sending ASSIGNED notification to specific cleaner', { cleanerId: cleaning.cleanerId });
          
          const cleaner = await prisma.cleaner.findUnique({
            where: { id: cleaning.cleanerId },
            include: { cleanings: false }
          });
          
          if (!cleaner) {
            logger.warn('❌ Cleaner not found', { cleanerId: cleaning.cleanerId });
            return cleaning;
          }
          
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
        
          logger.info('✅ ASSIGNED notification sent successfully!', { cleaningId: cleaning.id });
        } catch (error) {
          logger.error('❌ Failed to send ASSIGNED notification:', error);
          // Не прерываем основной flow
        }
      } else {
        // Уборщик НЕ назначен - отправляем уведомления ВСЕМ привязанным уборщикам
        logger.info('🔔 No cleaner assigned, sending AVAILABLE notifications to preferred cleaners', { 
          cleaningId: cleaning.id,
          preferredCleanersCount: unit.preferredCleaners.length 
        });
        
        if (unit.preferredCleaners.length === 0) {
          logger.warn('⚠️ No preferred cleaners for this unit', { unitId: unit.id });
          return cleaning;
        }
        
        // Отправляем уведомления всем привязанным уборщикам
        for (const preferredCleaner of unit.preferredCleaners) {
          try {
            const cleaner = preferredCleaner.cleaner;
            
            if (!cleaner.isActive) {
              logger.info('⏭️ Skipping inactive cleaner', { cleanerId: cleaner.id });
              continue;
            }
            
            const targetUserId = cleaner.userId || cleaner.id;
            const settings = await prisma.userNotificationSettings.findUnique({
              where: { userId: targetUserId },
            }).catch(() => null);
            
            if (!settings || !settings.enabled || !settings.telegramChatId) {
              logger.info('⏭️ Skipping cleaner without notification settings', { cleanerId: cleaner.id });
              continue;
            }
            
            await notificationClient.notifyCleaningAvailable({
              userId: targetUserId,
              telegramChatId: settings.telegramChatId,
              cleaningId: cleaning.id,
              unitName: `${unit.property?.title || ''} - ${unit.name}`,
              scheduledAt: cleaning.scheduledAt,
              requiresLinenChange: cleaning.requiresLinenChange,
              orgId: cleaning.orgId,
            });
            
            logger.info('✅ AVAILABLE notification sent to preferred cleaner', { 
              cleanerId: cleaner.id,
              cleanerName: `${cleaner.firstName} ${cleaner.lastName}`
            });
          } catch (error) {
            logger.error('❌ Failed to send AVAILABLE notification to cleaner:', error);
            // Продолжаем отправлять остальным
          }
        }
        
        logger.info('✅ All AVAILABLE notifications sent', { 
          cleaningId: cleaning.id,
          sentTo: unit.preferredCleaners.length 
        });
      }
      */
      
      return cleaning;
    },
    
    startCleaning: async (_: unknown, { id }: { id: string }, { dl, prisma }: Context) => {
      logger.info('Starting cleaning', { id });
      const cleaning = await dl.startCleaning(id);
      
      // 🔴 СТАРАЯ ЛОГИКА - ОТКЛЮЧЕНА (используем Event Bus)
      /*
      // Отправляем уведомление уборщику о начале
      try {
        if (!cleaning.cleanerId) {
          logger.warn('No cleaner assigned to send notification', { cleaningId: id });
          return cleaning;
        }

        const cleaner = await prisma.cleaner.findUnique({
          where: { id: cleaning.cleanerId }
        });
        
        if (!cleaner) {
          logger.warn('Cleaner not found', { cleanerId: cleaning.cleanerId });
          return cleaning;
        }
        
        const unit = await prisma.unit.findUnique({
          where: { id: cleaning.unitId },
          include: { property: true }
        });
        
        if (!unit) {
          logger.warn('Unit not found', { unitId: cleaning.unitId });
          return cleaning;
        }
        
        const targetUserId = cleaner.userId || cleaner.id;
        const settings = await prisma.userNotificationSettings.findUnique({
          where: { userId: targetUserId },
        }).catch(() => null);
        
        if (settings?.telegramChatId) {
          await notificationClient.notifyCleaningStarted({
            userId: targetUserId,
            telegramChatId: settings.telegramChatId,
            cleaningId: cleaning.id,
            unitName: `${unit.property?.title || ''} - ${unit.name}`,
            cleanerName: `${cleaner.firstName} ${cleaner.lastName}`,
          });
          
          logger.info('✅ STARTED notification sent', { cleaningId: id });
        }
      } catch (error) {
        logger.error('Failed to send start notification:', error);
      }
      */
      
      return cleaning;
    },
    
    completeCleaning: async (_: unknown, { id, input }: { id: string; input: any }, { dl, prisma }: Context) => {
      logger.info('Completing cleaning', { id, input });
      const cleaning = await dl.completeCleaning(id, input);
      
      // 🔴 СТАРАЯ ЛОГИКА - ОТКЛЮЧЕНА (используем Event Bus)
      /*
      // Отправляем уведомление уборщику о завершении
      try {
        if (!cleaning.cleanerId) {
          logger.warn('No cleaner assigned to cleaning, skipping completion notification', { cleaningId: id });
          return cleaning;
        }
        
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
      */
      
      return cleaning;
    },
    
    assignCleaningToMe: async (_: unknown, { cleaningId }: { cleaningId: string }, { prisma }: Context) => {
      logger.info('🎯 Assigning cleaning to current user', { cleaningId });
      
      // TODO: Получить текущего пользователя из context/JWT
      // Сейчас для примера используем первого активного уборщика
      const currentCleaner = await prisma.cleaner.findFirst({
        where: { isActive: true }
      });
      
      if (!currentCleaner) {
        throw new Error('Cleaner not found');
      }
      
      // Обновляем уборку - назначаем уборщика
      const cleaning = await prisma.cleaning.update({
        where: { id: cleaningId },
        data: {
          cleanerId: currentCleaner.id,
          status: 'SCHEDULED', // Подтверждаем назначение
        },
      });
      
      logger.info('✅ Cleaning assigned to cleaner', { 
        cleaningId, 
        cleanerId: currentCleaner.id,
        cleanerName: `${currentCleaner.firstName} ${currentCleaner.lastName}`
      });
      
      // 🔴 СТАРАЯ ЛОГИКА - ОТКЛЮЧЕНА (используем Event Bus)
      /*
      // Отправляем подтверждающее уведомление
      try {
        const unit = await prisma.unit.findUnique({
          where: { id: cleaning.unitId },
          include: { property: true }
        });
        
        const targetUserId = currentCleaner.userId || currentCleaner.id;
        const settings = await prisma.userNotificationSettings.findUnique({
          where: { userId: targetUserId },
        }).catch(() => null);
        
        if (settings?.telegramChatId && unit) {
          await notificationClient.notifyCleaningAssigned({
            userId: targetUserId,
            telegramChatId: settings.telegramChatId,
            cleanerId: currentCleaner.id,
            cleaningId: cleaning.id,
            unitName: `${unit.property?.title || ''} - ${unit.name}`,
            scheduledAt: cleaning.scheduledAt.toISOString(),
            requiresLinenChange: cleaning.requiresLinenChange,
            orgId: cleaning.orgId,
          });
          
          logger.info('✅ Assignment confirmation sent', { cleaningId });
        }
      } catch (error) {
        logger.error('Failed to send assignment confirmation:', error);
      }
      */
      
      return cleaning;
    },
    
    updateCleaningChecklist: async (_: unknown, { id, items }: { id: string; items: any[] }, { dl }: Context) => {
      logger.info('Updating cleaning checklist', { id, itemsCount: items.length });
      return dl.updateCleaningChecklist(id, items);
    },
    
    cancelCleaning: async (_: unknown, { id, reason }: { id: string; reason?: string }, { dl, prisma }: Context) => {
      logger.info('Cancelling cleaning', { id, reason });
      const cleaning = await dl.cancelCleaning(id, reason);
      
      // 🔴 СТАРАЯ ЛОГИКА - ОТКЛЮЧЕНА (используем Event Bus)
      /*
      // Отправляем уведомление об отмене
      try {
        if (!cleaning.cleanerId) {
          logger.warn('No cleaner assigned to cleaning, skipping cancellation notification', { cleaningId: id });
          return cleaning;
        }
        
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
      */
      
      return cleaning;
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
    
    // Управление привязкой уборщиков к квартирам
    addPreferredCleaner: async (_: unknown, { unitId, cleanerId }: { unitId: string; cleanerId: string }, context: Context) => {
      logger.info('Adding preferred cleaner to unit', { unitId, cleanerId });
      
      const { prisma } = context;
      
      if (!prisma) {
        logger.error('❌ prisma is undefined in context!', { 
          contextKeys: Object.keys(context),
          hasContext: !!context 
        });
        throw new Error('Prisma client not available in context');
      }
      
      // Проверяем, что связь еще не существует
      const existing = await prisma.unitPreferredCleaner.findUnique({
        where: {
          unitId_cleanerId: {
            unitId,
            cleanerId,
          },
        },
      });
      
      if (existing) {
        logger.warn('Preferred cleaner already added', { unitId, cleanerId });
        // Возвращаем unit без создания дубликата
        return prisma.unit.findUnique({ where: { id: unitId } });
      }
      
      // Создаем связь
      await prisma.unitPreferredCleaner.create({
        data: {
          unitId,
          cleanerId,
        },
      });
      
      logger.info('✅ Preferred cleaner added', { unitId, cleanerId });
      
      // Возвращаем обновленный unit
      return prisma.unit.findUnique({
        where: { id: unitId },
        include: { preferredCleaners: { include: { cleaner: true } } },
      });
    },
    
    removePreferredCleaner: async (_: unknown, { unitId, cleanerId }: { unitId: string; cleanerId: string }, context: Context) => {
      logger.info('Removing preferred cleaner from unit', { unitId, cleanerId });
      
      const { prisma } = context;
      
      if (!prisma) {
        logger.error('❌ prisma is undefined in context!');
        throw new Error('Prisma client not available in context');
      }
      
      // Удаляем связь
      await prisma.unitPreferredCleaner.deleteMany({
        where: {
          unitId,
          cleanerId,
        },
      });
      
      logger.info('✅ Preferred cleaner removed', { unitId, cleanerId });
      
      // Возвращаем обновленный unit
      return prisma.unit.findUnique({
        where: { id: unitId },
        include: { preferredCleaners: { include: { cleaner: true } } },
      });
    },
  },

  // Type resolvers
  Cleaner: {
    user: (parent: any, _: unknown, { identityDL }: Context) => {
      return { id: parent.userId };
    },
    org: (parent: any, _: unknown, { identityDL }: Context) => {
      return { id: parent.orgId };
    },
    preferredUnits: async (parent: any, _: unknown, { prisma }: Context) => {
      try {
        const preferences = await prisma.unitPreferredCleaner.findMany({
          where: { cleanerId: parent.id },
          include: { unit: true },
          orderBy: { createdAt: 'desc' },
        });
        
        return preferences.map(pref => ({
          id: pref.id,
          unit: pref.unit,
          createdAt: pref.createdAt,
        }));
      } catch (error) {
        logger.error('Error fetching preferredUnits', { cleanerId: parent.id, error });
        return []; // Возвращаем пустой массив в случае ошибки
      }
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
      if (!parent.cleanerId) return null;  // ✅ Проверка на null
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

