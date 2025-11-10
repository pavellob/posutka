import type { PrismaClient } from '@prisma/client';
import type { Context } from '../context.js';
import { createGraphQLLogger } from '@repo/shared-logger';
import { getEventsClient } from '../services/events-client.js';

const logger = createGraphQLLogger('cleaning-subgraph-resolvers');

async function resolveManagerUserIds(prisma: PrismaClient, orgId?: string | null) {
  const managerIds = new Set<string>();

  if (orgId) {
    const orgManagers = await prisma.user.findMany({
      where: {
        systemRoles: {
          has: 'MANAGER',
        },
        memberships: {
          some: {
            orgId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    orgManagers.forEach((user) => managerIds.add(user.id));

    if (managerIds.size === 0) {
      logger.info('No manager users linked to organization via membership', {
        orgId,
      });
    }
  }

  if (managerIds.size === 0) {
    const globalManagers = await prisma.user.findMany({
      where: {
        systemRoles: {
          has: 'MANAGER',
        },
      },
      select: {
        id: true,
      },
    });

    globalManagers.forEach((user) => managerIds.add(user.id));

    if (orgId && globalManagers.length > 0) {
      logger.info('Falling back to global MANAGER system role users for organization notifications', {
        orgId,
        count: globalManagers.length,
      });
    }
  }

  return Array.from(managerIds);
}

export const resolvers: any = {
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
          logger.info('Determined targetUserId for cleaner', {
            cleanerId: cleaning.cleanerId,
            cleanerUserId: cleaner?.userId,
            cleanerType: cleaner?.type,
            targetUserId
          });
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
        
        // Публикуем событие через Event Bus (gRPC)
        const eventsClient = getEventsClient();
        
        if (cleaning.cleanerId) {
          // Если уборщик назначен - публикуем CLEANING_ASSIGNED
          await eventsClient.publishCleaningAssigned({
            cleaningId: cleaning.id,
            cleanerId: cleaning.cleanerId,
            targetUserId: targetUserIds[0], // Используем вычисленный targetUserId
            unitId: cleaning.unitId,
            unitName,
            scheduledAt: cleaning.scheduledAt, // Уже строка из datalayer
            requiresLinenChange: cleaning.requiresLinenChange,
            orgId: cleaning.orgId || undefined,
            actorUserId: undefined, // TODO: получить из context
          });
          
          logger.info('✅ CLEANING_ASSIGNED event published', { 
            cleaningId: cleaning.id,
            cleanerId: cleaning.cleanerId,
            targetUserId: targetUserIds[0]
          });
        } else if (targetUserIds.length > 0) {
          // Если уборщик НЕ назначен, но есть предпочитаемые - публикуем AVAILABLE
          await eventsClient.publishCleaningAvailable({
            cleaningId: cleaning.id,
            unitId: cleaning.unitId,
            unitName,
            scheduledAt: cleaning.scheduledAt, // Уже строка из datalayer
            requiresLinenChange: cleaning.requiresLinenChange,
            targetUserIds,
            orgId: cleaning.orgId || undefined,
          });
          
          logger.info('✅ CLEANING_AVAILABLE event published', { 
            cleaningId: cleaning.id,
            targetUserIdsCount: targetUserIds.length
          });
        }
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
      
      // Публикуем событие CLEANING_STARTED через Event Bus
      try {
        if (cleaning.cleanerId) {
          const cleaner = await prisma.cleaner.findUnique({
            where: { id: cleaning.cleanerId }
          });
          
          const unit = await prisma.unit.findUnique({
            where: { id: cleaning.unitId },
            include: { property: true }
          });
          
          if (cleaner && unit) {
            const eventsClient = getEventsClient();
            const targetUserId = cleaner.userId || cleaner.id;
            await eventsClient.publishCleaningStarted({
              cleaningId: cleaning.id,
              cleanerId: cleaning.cleanerId,
              targetUserId,
              unitName: `${unit.property?.title || ''} - ${unit.name}`,
              orgId: cleaning.orgId || undefined,
            });
            logger.info('✅ CLEANING_STARTED event published', { cleaningId: id });
          }
        }
      } catch (error) {
        logger.error('Failed to publish CLEANING_STARTED event:', error);
        // Не прерываем основной flow
      }
      
      return cleaning;
    },
    
    completeCleaning: async (_: unknown, { id, input }: { id: string; input: any }, { dl, prisma }: Context) => {
      logger.info('Completing cleaning', { id, input });
      const cleaning = await dl.completeCleaning(id, input);
      
      // Публикуем событие CLEANING_COMPLETED через Event Bus
      try {
        if (cleaning.cleanerId) {
          const cleaner = await prisma.cleaner.findUnique({
            where: { id: cleaning.cleanerId }
          });
          
          const unit = await prisma.unit.findUnique({
            where: { id: cleaning.unitId },
            include: { property: true }
          });
          
          if (cleaner && unit) {
            const eventsClient = getEventsClient();
            const cleanerTargetIds: string[] = [];
            const managerTargetIds: string[] = [];
            const cleanerTarget = cleaner.userId || cleaner.id;
            if (cleanerTarget) {
              cleanerTargetIds.push(cleanerTarget);
            }

            const managerIds = await resolveManagerUserIds(prisma, cleaning.orgId);
            if (managerIds.length === 0) {
              logger.info('No users with MANAGER system role available for notifications', {
                cleaningId: cleaning.id,
                orgId: cleaning.orgId,
              });
            } else {
              managerTargetIds.push(...managerIds);
            }

            if (cleanerTargetIds.length > 0) {
              logger.info('Publishing CLEANING_COMPLETED for cleaner', {
                cleaningId: cleaning.id,
                cleanerId: cleaning.cleanerId,
                cleanerUserId: cleaner.userId,
                targetUserIds: cleanerTargetIds,
              });
              await eventsClient.publishCleaningCompleted({
                cleaningId: cleaning.id,
                cleanerId: cleaning.cleanerId,
                targetUserIds: cleanerTargetIds,
                unitName: `${unit.property?.title || ''} - ${unit.name}`,
                completedAt: cleaning.completedAt || new Date().toISOString(),
                orgId: cleaning.orgId || undefined,
              });
              logger.info('✅ CLEANING_COMPLETED event published', { cleaningId: id });
            }

            if (managerTargetIds.length > 0) {
              await eventsClient.publishCleaningReadyForReview({
                cleaningId: cleaning.id,
                managerIds: managerTargetIds,
                unitName: `${unit.property?.title || ''} - ${unit.name}`,
                completedAt: cleaning.completedAt || new Date().toISOString(),
                orgId: cleaning.orgId || undefined,
              });
            }
          }
        }
      } catch (error) {
        logger.error('Failed to publish CLEANING_COMPLETED event:', error);
        // Не прерываем основной flow
      }
      
      return cleaning;
    },
    
    approveCleaning: async (
      _: unknown,
      { id, managerId, comment }: { id: string; managerId: string; comment?: string },
      { dl }: Context
    ) => {
      logger.info('Approving cleaning', { id, managerId });
      return dl.approveCleaning(id, managerId, comment);
    },
    
    assignCleaningToMe: async (_: unknown, { cleaningId }: { cleaningId: string }, { prisma, dl }: Context) => {
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
      await prisma.cleaning.update({
        where: { id: cleaningId },
        data: {
          cleanerId: currentCleaner.id,
        },
      });
      const cleaning = await dl.getCleaningById(cleaningId);
      if (!cleaning) {
        throw new Error('Cleaning not found after assignment');
      }
      
      logger.info('✅ Cleaning assigned to cleaner', { 
        cleaningId, 
        cleanerId: currentCleaner.id,
        cleanerName: `${currentCleaner.firstName} ${currentCleaner.lastName}`
      });
      
      // Публикуем событие CLEANING_ASSIGNED через Event Bus
      try {
        const unit = await prisma.unit.findUnique({
          where: { id: cleaning.unitId },
          include: { property: true }
        });
        
        if (unit) {
          const eventsClient = getEventsClient();
          await eventsClient.publishCleaningAssigned({
            cleaningId: cleaning.id,
            cleanerId: currentCleaner.id,
            unitId: cleaning.unitId,
            unitName: `${unit.property?.title || ''} - ${unit.name}`,
            scheduledAt: cleaning.scheduledAt,
            requiresLinenChange: cleaning.requiresLinenChange,
            orgId: cleaning.orgId || undefined,
            actorUserId: undefined, // TODO: получить из context
            targetUserId: currentCleaner.userId || currentCleaner.id,
          });
          logger.info('✅ CLEANING_ASSIGNED event published', { cleaningId });
        }
      } catch (error) {
        logger.error('Failed to publish CLEANING_ASSIGNED event:', error);
        // Не прерываем основной flow
      }
      
      return cleaning;
    },
    
    updateCleaningChecklist: async (_: unknown, { id, items }: { id: string; items: any[] }, { dl }: Context) => {
      logger.info('Updating cleaning checklist', { id, itemsCount: items.length });
      return dl.updateCleaningChecklist(id, items);
    },
    
    cancelCleaning: async (_: unknown, { id, reason }: { id: string; reason?: string }, { dl, prisma }: Context) => {
      logger.info('Cancelling cleaning', { id, reason });
      const cleaning = await dl.cancelCleaning(id, reason);
      
      // Публикуем событие CLEANING_CANCELLED через Event Bus
      try {
        if (cleaning.cleanerId) {
          const cleaner = await prisma.cleaner.findUnique({
            where: { id: cleaning.cleanerId }
          });
          
          const unit = await prisma.unit.findUnique({
            where: { id: cleaning.unitId },
            include: { property: true }
          });
          
          if (cleaner && unit) {
            const eventsClient = getEventsClient();
            const targetUserId = cleaner.userId || cleaner.id;
            await eventsClient.publishCleaningCancelled({
              cleaningId: cleaning.id,
              cleanerId: cleaning.cleanerId,
              targetUserId,
              unitName: `${unit.property?.title || ''} - ${unit.name}`,
              reason,
              orgId: cleaning.orgId || undefined,
            });
            logger.info('✅ CLEANING_CANCELLED event published', { cleaningId: id });
          }
        }
      } catch (error) {
        logger.error('Failed to publish CLEANING_CANCELLED event:', error);
        // Не прерываем основной flow
      }
      
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
    reviews: (parent: any) => parent.reviews ?? [],
  },

  CleaningDocument: {
    cleaning: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getCleaningById(parent.cleaningId);
    },
  },

  // Старые резолверы удалены - используем новую модель
  
  // Резолвер для обратной совместимости со старым типом ChecklistItem
  ChecklistItem: {
    templateMedia: (_parent: any, _: unknown, _context: Context) => {
      // В новой модели нет templateMedia для items, возвращаем пустой массив
      return [];
    },
  },
  
  // ===== Новая модель чек-листов (Template → Instance → Promote) =====
  
  ChecklistTemplate: {
    unit: (parent: any, _: unknown, { inventoryDL }: Context) => {
      return { id: parent.unitId };
    },
  },
  
  ChecklistItemTemplate: {
    exampleMedia: (parent: any, _: unknown, { prisma }: Context) => {
      // Если exampleMedia уже загружен (из include), возвращаем его
      if (parent.exampleMedia) {
        return parent.exampleMedia;
      }
      // Иначе загружаем из БД
      return prisma.checklistItemTemplateMedia.findMany({
        where: {
          templateId: parent.templateId || parent.template?.id || parent.templateId,
          itemKey: parent.key
        },
        orderBy: { order: 'asc' }
      });
    },
  },
  
  ChecklistInstance: {
    unit: (parent: any, _: unknown, { inventoryDL }: Context) => {
      return { id: parent.unitId };
    },
    cleaning: (parent: any, _: unknown, { dl }: Context) => {
      if (!parent.cleaningId) return null;
      return dl.getCleaningById(parent.cleaningId);
    },
    template: async (parent: any, _: unknown, { checklistInstanceService }: Context) => {
      return checklistInstanceService.getChecklistTemplate(parent.unitId, parent.templateVersion);
    },
    parentInstance: async (parent: any, _: unknown, { checklistInstanceService }: Context) => {
      if (!parent.parentInstanceId) return null;
      return checklistInstanceService.getChecklistInstance(parent.parentInstanceId);
    },
  },
};

// Extend existing resolvers
Object.assign(resolvers.Query, {
  // Старые запросы для CleaningRun удалены - используем новую модель
  checklistsByUnit: async (
    _: unknown,
    { unitId }: { unitId: string },
    { checklistInstanceService }: Context
  ) => {
    try {
      logger.info('Getting checklists by unit', { unitId });
      // Возвращаем шаблоны чек-листов для юнита (новая модель)
      const template = await checklistInstanceService.getChecklistTemplate(unitId);
      if (!template) {
        logger.info('No template found for unit', { unitId });
        return [];
      }
      logger.info('Template found', { templateId: template.id, unitId, itemsCount: template.items?.length || 0 });
      // Возвращаем шаблон в формате новой модели
      return [template];
    } catch (error: any) {
      logger.error('Error getting checklists by unit', { unitId, error: error.message, stack: error.stack });
      throw error;
    }
  },
  
  // ===== Новая модель чек-листов (Template → Instance → Promote) =====
  
  checklistInstance: async (
    _: unknown,
    { id }: { id: string },
    { checklistInstanceService }: Context
  ) => {
    return checklistInstanceService.getChecklistInstance(id);
  },
  
  checklistByUnitAndStage: async (
    _: unknown,
    { unitId, stage }: { unitId: string; stage: string },
    { checklistInstanceService }: Context
  ) => {
    return checklistInstanceService.getChecklistByUnitAndStage(unitId, stage as any);
  },

  checklistByCleaning: async (
    _: unknown,
    { cleaningId, stage }: { cleaningId: string; stage: string },
    { checklistInstanceService }: Context
  ) => {
    return checklistInstanceService.getChecklistByCleaningAndStage(cleaningId, stage as any);
  },
  
  checklistTemplate: async (
    _: unknown,
    { unitId, version }: { unitId: string; version?: number },
    { checklistInstanceService }: Context
  ) => {
    return checklistInstanceService.getChecklistTemplate(unitId, version);
  },
});

// Добавляем новые мутации, сохраняя старые
Object.assign(resolvers.Mutation, {
    // ===== Новая модель чек-листов (Template → Instance → Promote) =====
    
    createChecklistInstance: async (
      _: unknown,
      { unitId, stage, cleaningId }: { unitId: string; stage: string; cleaningId?: string },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Creating checklist instance', { unitId, stage, cleaningId });
      return checklistInstanceService.createChecklistInstance(unitId, stage as any, cleaningId);
    },
    
    addItem: async (
      _: unknown,
      { input }: { input: any },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Adding item to checklist instance', { instanceId: input.instanceId, key: input.key });
      return checklistInstanceService.addItem(input);
    },
    
    updateItem: async (
      _: unknown,
      { input }: { input: any },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Updating item in checklist instance', { instanceId: input.instanceId, itemKey: input.itemKey });
      return checklistInstanceService.updateItem(input);
    },
    
    removeItem: async (
      _: unknown,
      { instanceId, itemKey }: { instanceId: string; itemKey: string },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Removing item from checklist instance', { instanceId, itemKey });
      return checklistInstanceService.removeItem({ instanceId, itemKey });
    },
    
    promoteChecklist: async (
      _: unknown,
      { fromInstanceId, toStage }: { fromInstanceId: string; toStage: string },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Promoting checklist', { fromInstanceId, toStage });
      return checklistInstanceService.promoteChecklist(fromInstanceId, toStage as any);
    },
    
    submitChecklist: async (
      _: unknown,
      { id }: { id: string },
      { checklistInstanceService, prisma }: Context
    ) => {
      logger.info('Submitting checklist', { id });
      try {
        const submitted = await checklistInstanceService.submitChecklist(id);

        if (submitted?.stage === 'PRE_CLEANING' && submitted.cleaningId) {
          try {
            const cleaning = await prisma.cleaning.findUnique({
              where: { id: submitted.cleaningId },
              include: { cleaner: true },
            });

            if (!cleaning) {
              logger.warn('Cleaning not found while publishing CLEANING_PRECHECK_COMPLETED', {
                checklistId: id,
                cleaningId: submitted.cleaningId,
              });
              return submitted;
            }

            const unit = await prisma.unit.findUnique({
              where: { id: cleaning.unitId },
              include: { property: true },
            });

            const managerIds = await resolveManagerUserIds(prisma, cleaning.orgId);
            const eventsClient = getEventsClient();

            if (managerIds.length > 0) {
              const unitNameParts = [
                unit?.property?.title ?? '',
                unit?.name ?? '',
              ].filter(Boolean);

              await eventsClient.publishCleaningPrecheckCompleted({
                cleaningId: cleaning.id,
                managerIds,
                unitName: unitNameParts.length > 0 ? unitNameParts.join(' - ') : 'квартире',
                submittedAt: new Date().toISOString(),
                orgId: cleaning.orgId || undefined,
                cleanerId: cleaning.cleanerId ?? null,
              });
            } else {
              logger.info('No users with MANAGER system role available for precheck completed notifications', {
                cleaningId: cleaning.id,
                orgId: cleaning.orgId,
              });
            }
          } catch (eventError: any) {
            logger.error('Failed to publish CLEANING_PRECHECK_COMPLETED event', {
              checklistId: id,
              error: eventError?.message ?? eventError,
            });
          }
        }

        return submitted;
      } catch (error: any) {
        logger.error('Failed to submit checklist', { id, error: error.message });
        throw error;
      }
    },
    
    lockChecklist: async (
      _: unknown,
      { id }: { id: string },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Locking checklist', { id });
      return checklistInstanceService.lockChecklist(id);
    },
    
    answer: async (
      _: unknown,
      { input }: { input: any },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Adding answer to checklist item', { instanceId: input.instanceId, itemKey: input.itemKey });
      return checklistInstanceService.answer(input);
    },
    
    attach: async (
      _: unknown,
      { input }: { input: any },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Adding attachment to checklist item', { instanceId: input.instanceId, itemKey: input.itemKey });
      return checklistInstanceService.attach(input);
    },
    
    getChecklistAttachmentUploadUrls: async (
      _: unknown,
      { input }: { input: { instanceId: string; itemKey: string; count: number; mimeTypes?: string[] } },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Getting attachment upload URLs for checklist item', { instanceId: input.instanceId, itemKey: input.itemKey });
      return checklistInstanceService.getAttachmentUploadUrls(input);
    },
    
    removeChecklistAttachment: async (
      _: unknown,
      { attachmentId }: { attachmentId: string },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Removing checklist attachment', { attachmentId });
      return checklistInstanceService.removeAttachment(attachmentId);
    },
    
    // ===== Редактирование шаблона =====
    
    addTemplateItem: async (
      _: unknown,
      { input }: { input: any },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Adding item to checklist template', { templateId: input.templateId, key: input.key });
      return checklistInstanceService.addTemplateItem(input);
    },
    
    updateTemplateItem: async (
      _: unknown,
      { input }: { input: any },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Updating item in checklist template', { templateId: input.templateId, itemKey: input.itemKey });
      return checklistInstanceService.updateTemplateItem(input);
    },
    
    removeTemplateItem: async (
      _: unknown,
      { templateId, itemKey }: { templateId: string; itemKey: string },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Removing item from checklist template', { templateId, itemKey });
      return checklistInstanceService.removeTemplateItem({ templateId, itemKey });
    },
    
    updateTemplateItemOrder: async (
      _: unknown,
      { templateId, itemKeys }: { templateId: string; itemKeys: string[] },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Updating item order in checklist template', { templateId, itemCount: itemKeys.length });
      return checklistInstanceService.updateTemplateItemOrder({ templateId, itemKeys });
    },
    
    addTemplateItemExampleMedia: async (
      _: unknown,
      { input }: { input: any },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Adding example media to template item', { templateId: input.templateId, itemKey: input.itemKey });
      return checklistInstanceService.addTemplateItemExampleMedia(input);
    },
    
    removeTemplateItemExampleMedia: async (
      _: unknown,
      { mediaId }: { mediaId: string },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Removing example media from template item', { mediaId });
      return checklistInstanceService.removeTemplateItemExampleMedia(mediaId);
    },
    
    getTemplateItemExampleMediaUploadUrls: async (
      _: unknown,
      { input }: { input: { templateId: string; itemKey: string; count: number; mimeTypes?: string[] } },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Getting example media upload URLs for template item', { templateId: input.templateId, itemKey: input.itemKey });
      return checklistInstanceService.getTemplateItemExampleMediaUploadUrls(input);
    },
});

