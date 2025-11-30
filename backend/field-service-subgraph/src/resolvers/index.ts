import type { PrismaClient } from '@prisma/client';
import type { Context } from '../context.js';
import { createGraphQLLogger } from '@repo/shared-logger';
import { getEventsClient } from '../services/events-client.js';
import { createPricingGrpcClient } from '@repo/grpc-sdk';

const logger = createGraphQLLogger('field-service-subgraph-resolvers');

/**
 * Подтягивает задачи для следующего чек-листа и привязывает их к ChecklistInstance уборки
 */
async function attachNextChecklistTasksToCleaning(
  cleaningId: string,
  unitId: string,
  prisma: PrismaClient
): Promise<void> {
  // 1. Найти все задачи для этого unit с plannedForNextChecklist = true
  const tasks = await (prisma.task as any).findMany({
    where: {
      unitId,
      plannedForNextChecklist: true,
      status: {
        in: ['TODO', 'IN_PROGRESS'],
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (tasks.length === 0) {
    logger.debug('No tasks for next checklist found', { cleaningId, unitId });
    return;
  }

  logger.info('Found tasks for next checklist', {
    cleaningId,
    unitId,
    tasksCount: tasks.length,
  });

  // 2. Найти ChecklistInstance для этой уборки (стадия CLEANING)
  const checklistInstance = await prisma.checklistInstance.findFirst({
    where: {
      cleaningId,
      stage: 'CLEANING',
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!checklistInstance) {
    logger.warn('No ChecklistInstance found for cleaning, tasks will be attached later', {
      cleaningId,
    });
    // Задачи останутся с plannedForNextChecklist = true, будут подтянуты позже
    return;
  }

  // 3. Для каждой задачи создать пункт чек-листа или привязать к существующему
  for (const task of tasks) {
    try {
      // Создаем или находим пункт чек-листа для задачи
      const itemKey = `task-${task.id}`;
      let checklistItem = checklistInstance.items.find((item: any) => item.key === itemKey);

      if (!checklistItem) {
        // Создаем новый пункт чек-листа из задачи
        checklistItem = await prisma.checklistInstanceItem.create({
          data: {
            instanceId: checklistInstance.id,
            key: itemKey,
            title: task.note || `Задача #${task.id}`,
            description: `Задача создана из предыдущей уборки`,
            type: 'BOOL',
            required: false,
            requiresPhoto: false,
            order: checklistInstance.items.length + 1,
          },
        });
      }

      // 4. Привязать задачу к пункту чек-листа и сбросить флаг
      await (prisma.task as any).update({
        where: { id: task.id },
        data: {
          checklistItemInstanceId: checklistItem.id,
          plannedForNextChecklist: false,
        },
      });

      logger.info('Task attached to checklist item', {
        taskId: task.id,
        checklistItemId: checklistItem.id,
        cleaningId,
      });
    } catch (error) {
      logger.error('Failed to attach task to checklist', {
        taskId: task.id,
        cleaningId,
        error,
      });
      // Продолжаем с другими задачами
    }
  }
}

async function resolveManagerUserIds(prisma: PrismaClient, orgId?: string | null) {
  const managerIds = new Set<string>();

  if (orgId) {
    const orgManagers = await prisma.membership.findMany({
      where: {
        orgId,
        role: 'MANAGER',
      },
      select: { userId: true },
    });

    orgManagers.forEach((membership) => managerIds.add(membership.userId));

    if (managerIds.size === 0) {
      logger.info('No managers found via membership for organization', {
        orgId,
      });
    }
  }

  if (managerIds.size === 0) {
    const globalManagers = await prisma.membership.findMany({
      where: {
        role: 'MANAGER',
      },
      select: { userId: true },
    });

    globalManagers.forEach((membership) => managerIds.add(membership.userId));

    if (orgId && globalManagers.length > 0) {
      logger.info('Falling back to MANAGER memberships without organization match', {
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
    
    // Repair template queries
    repairTemplate: (_: unknown, { id }: { id: string }, { dl }: Context) => 
      dl.getRepairTemplateById(id),
    
    repairTemplates: (_: unknown, { unitId }: { unitId: string }, { dl }: Context) => 
      dl.getRepairTemplatesByUnitId(unitId),
    
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
    
    // Repair template mutations
    createRepairTemplate: async (_: unknown, { input }: { input: any }, { dl }: Context) => {
      logger.info('Creating repair template', { input });
      return dl.createRepairTemplate(input);
    },
    
    updateRepairTemplate: async (_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) => {
      logger.info('Updating repair template', { id, input });
      return dl.updateRepairTemplate(id, input);
    },
    
    deleteRepairTemplate: async (_: unknown, { id }: { id: string }, { dl }: Context) => {
      logger.info('Deleting repair template', { id });
      return dl.deleteRepairTemplate(id);
    },
    
    // Cleaning mutations
    scheduleCleaning: async (_: unknown, { input }: { input: any }, { cleaningService, prisma }: Context) => {
      logger.info('Scheduling cleaning via GraphQL', { 
        input,
        hasCleaningService: !!cleaningService,
        cleaningServiceType: cleaningService ? typeof cleaningService : 'undefined',
      });
      
      if (!cleaningService) {
        logger.error('❌ cleaningService is null or undefined in GraphQL resolver!', {
          hint: 'Check that cleaningService is passed to context',
        });
        throw new Error('CleaningService is not initialized');
      }
      
      logger.info('📞 About to call cleaningService.scheduleCleaning from GraphQL', {
        orgId: input.orgId,
        unitId: input.unitId,
      });
      
      // Используем единый сервис для создания уборки и публикации событий
      const result = await cleaningService.scheduleCleaning(input);
      const cleaning = result.cleaning;
      
      // Подтягиваем задачи для следующего чек-листа
      try {
        await attachNextChecklistTasksToCleaning(cleaning.id, cleaning.unitId, prisma);
      } catch (error) {
        logger.error('Failed to attach next checklist tasks to cleaning', {
          cleaningId: cleaning.id,
          unitId: cleaning.unitId,
          error,
        });
        // Не прерываем создание уборки, если не удалось подтянуть задачи
      }
      
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
            const cleanerName = `${cleaner.firstName || ''} ${cleaner.lastName || ''}`.trim();
            const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();
            const unitAddress = unit.property?.address;
            
            await eventsClient.publishCleaningStarted({
              cleaningId: cleaning.id,
              cleanerId: cleaning.cleanerId,
              targetUserId,
              unitName,
              unitAddress,
              cleanerName,
              scheduledAt: cleaning.scheduledAt,
              notes: cleaning.notes || undefined,
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
            const cleanerTarget = cleaner.userId || cleaner.id;
            
            if (cleanerTarget) {
              const cleanerName = `${cleaner.firstName || ''} ${cleaner.lastName || ''}`.trim();
              const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();
              const unitAddress = unit.property?.address;
              
              // Получаем чеклист стадии CLEANING
              const cleaningChecklistInstance = await prisma.checklistInstance.findFirst({
                where: {
                cleaningId: cleaning.id,
                  stage: 'CLEANING',
                },
                include: {
                  items: { orderBy: { order: 'asc' } },
                  answers: true,
                  attachments: true,
                },
                orderBy: { createdAt: 'desc' }
              });
              
              // Подсчитываем статистику чеклиста
              let checklistStats: any = undefined;
              if (cleaningChecklistInstance) {
                const totalItems = cleaningChecklistInstance.items?.length || 0;
                const completedItems = cleaningChecklistInstance.items?.filter((item: any) => {
                  if (item.requiresPhoto) {
                    const itemAttachments = cleaningChecklistInstance.attachments?.filter((a: any) => a.itemKey === item.key) || [];
                    return itemAttachments.length >= (item.photoMin || 1);
            } else {
                    // Проверяем, что есть положительный ответ (true, "yes", положительное число и т.д.)
                    const answer = cleaningChecklistInstance.answers?.find((a: any) => a.itemKey === item.key);
                    if (!answer || !answer.value) {
                      return false;
                    }
                    // Проверяем, что значение положительное
                    const value = answer.value;
                    if (typeof value === 'boolean') {
                      return value === true;
                    }
                    if (typeof value === 'number') {
                      return value > 0;
                    }
                    if (typeof value === 'string') {
                      const lowerValue = value.toLowerCase();
                      return lowerValue === 'true' || lowerValue === 'yes' || lowerValue === 'да' || lowerValue === '1';
                    }
                    // Для других типов считаем положительным, если значение не null/undefined
                    return value !== null && value !== undefined;
                  }
                }) || [];
                const completedCount = completedItems.length;
                const incompleteCount = totalItems - completedCount;
                
                // Список неотмеченных пунктов (без положительного ответа)
                const incompleteItems = cleaningChecklistInstance.items
                  ?.filter((item: any) => {
                    if (item.requiresPhoto) {
                      const itemAttachments = cleaningChecklistInstance.attachments?.filter((a: any) => a.itemKey === item.key) || [];
                      return itemAttachments.length < (item.photoMin || 1);
                    } else {
                      // Проверяем, что нет положительного ответа
                      const answer = cleaningChecklistInstance.answers?.find((a: any) => a.itemKey === item.key);
                      if (!answer || !answer.value) {
                        return true; // Нет ответа - неполный
                      }
                      // Проверяем, что значение не положительное
                      const value = answer.value;
                      if (typeof value === 'boolean') {
                        return value !== true; // false или null - неполный
                      }
                      if (typeof value === 'number') {
                        return value <= 0; // 0 или отрицательное - неполный
                      }
                      if (typeof value === 'string') {
                        const lowerValue = value.toLowerCase();
                        return !(lowerValue === 'true' || lowerValue === 'yes' || lowerValue === 'да' || lowerValue === '1');
                      }
                      // Для других типов считаем неполным, если значение null/undefined
                      return value === null || value === undefined;
                    }
                  })
                  .map((item: any) => ({ title: item.title, key: item.key })) || [];
                
                checklistStats = {
                  total: totalItems,
                  completed: completedCount,
                  incomplete: incompleteCount,
                  incompleteItems: incompleteItems.length > 0 ? incompleteItems : undefined,
                };
              }
              
              // Получаем фото из документов POST_CLEANING_HANDOVER
              const cleaningWithDocs = await prisma.cleaning.findUnique({
                where: { id: cleaning.id },
                include: {
                  documents: {
                    where: { type: 'POST_CLEANING_HANDOVER' },
                    include: { photos: { orderBy: { order: 'asc' } } }
                  }
                }
              });
              
              const photoUrls = cleaningWithDocs?.documents
                ?.flatMap((doc: any) => (doc.photos || []).map((photo: any) => ({
                  url: photo.url,
                  caption: photo.caption || undefined
                }))) || [];
              
              logger.info('Publishing CLEANING_COMPLETED for cleaner', {
                cleaningId: cleaning.id,
                cleanerId: cleaning.cleanerId,
                cleanerUserId: cleaner.userId,
                targetUserId: cleanerTarget,
                checklistStats,
                photoCount: photoUrls?.length || 0,
              });
              
              // Публикуем CLEANING_COMPLETED только для уборщика
              // CLEANING_READY_FOR_REVIEW будет опубликовано автоматически после указания сложности (CLEANING_DIFFICULTY_SET)
              await eventsClient.publishCleaningCompleted({
                cleaningId: cleaning.id,
                cleanerId: cleaning.cleanerId,
                targetUserIds: [cleanerTarget],
                unitName,
                unitAddress,
                cleanerName,
                scheduledAt: cleaning.scheduledAt,
                startedAt: cleaning.startedAt,
                completedAt: cleaning.completedAt || new Date().toISOString(),
                notes: cleaning.notes || undefined,
                orgId: cleaning.orgId || undefined,
                checklistStats,
                photoUrls: photoUrls && photoUrls.length > 0 ? photoUrls : undefined,
              });
              
              logger.info('✅ CLEANING_COMPLETED event published', { cleaningId: id });
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
      { dl, prisma }: Context
    ) => {
      logger.info('Approving cleaning', { id, managerId });
      const cleaning = await dl.approveCleaning(id, managerId, comment);
      
      // Публикуем событие CLEANING_APPROVED через Event Bus
      try {
        const cleaningAfterApprove = await dl.getCleaningById(id);
        if (cleaningAfterApprove) {
          const cleaner = cleaningAfterApprove.cleanerId 
            ? await prisma.cleaner.findUnique({ where: { id: cleaningAfterApprove.cleanerId } })
            : null;
          
          const unit = await prisma.unit.findUnique({
            where: { id: cleaningAfterApprove.unitId },
            include: { property: true }
          });
          
          if (unit) {
            const eventsClient = getEventsClient();
            const cleanerName = cleaner ? `${cleaner.firstName || ''} ${cleaner.lastName || ''}`.trim() : undefined;
              const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();
              const unitAddress = unit.property?.address;
              
            // Уведомляем менеджера и уборщика
            const targetUserIds: string[] = [];
            
            // Менеджер, который одобрил
            if (managerId) {
              targetUserIds.push(managerId);
            }
            
            // Уборщик
            if (cleaner) {
              const cleanerUserId = cleaner.userId || cleaner.id;
              if (cleanerUserId) {
                targetUserIds.push(cleanerUserId);
              }
            }
            
            if (targetUserIds.length > 0) {
              await eventsClient.publishCleaningApproved({
                cleaningId: cleaningAfterApprove.id,
                managerId,
                cleanerId: cleaningAfterApprove.cleanerId || undefined,
                unitName,
                unitAddress,
                cleanerName,
                comment: comment || undefined,
                scheduledAt: cleaningAfterApprove.scheduledAt,
                completedAt: cleaningAfterApprove.completedAt || undefined,
                orgId: cleaningAfterApprove.orgId || undefined,
                targetUserIds,
              });
              
              logger.info('✅ CLEANING_APPROVED event published', {
                cleaningId: id,
                targetUserIdsCount: targetUserIds.length
              });
            }
          }
        }
      } catch (error: any) {
        logger.error('Failed to publish CLEANING_APPROVED event:', error);
        // Не прерываем основной flow
      }
      
      return cleaning;
    },
    
    assignCleaningToMe: async (_: unknown, { cleaningId }: { cleaningId: string }, { prisma, dl, inventoryDL }: Context) => {
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
          const cleanerName = `${currentCleaner.firstName || ''} ${currentCleaner.lastName || ''}`.trim();
          const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();
          let unitAddress = unit.property?.address;
          
          // Получаем дополнительные данные о unit (grade, cleaningDifficulty, price)
          let unitGrade: number | undefined;
          let cleaningDifficulty: string | undefined;
          let priceAmount: number | undefined;
          let priceCurrency: string | undefined;
          
          if (inventoryDL) {
            try {
              const unitData = await inventoryDL.getUnitById(cleaning.unitId);
              
              if (unitData) {
                unitAddress = unitData.property?.address || unitAddress;
                
                if (unitData.grade !== null && unitData.grade !== undefined) {
                  unitGrade = unitData.grade;
                }
                
                if (unitData.cleaningDifficulty !== null && unitData.cleaningDifficulty !== undefined) {
                  cleaningDifficulty = `D${unitData.cleaningDifficulty}`;
                }
                
                // Рассчитываем стоимость уборки
                try {
                  const pricingClient = createPricingGrpcClient({
                    host: process.env.PRICING_GRPC_HOST || 'localhost',
                    port: parseInt(process.env.PRICING_GRPC_PORT || '4112'),
                  });
                  const defaultDifficulty = unitData.cleaningDifficulty ?? 1;
                  
                  const priceResponse = await pricingClient.CalculateCleaningCost({
                    unitId: cleaning.unitId,
                    difficulty: defaultDifficulty,
                    mode: 'BASIC'
                  });
                  
                  if (priceResponse.quote?.totalAmount && priceResponse.quote?.totalCurrency) {
                    priceAmount = Number(priceResponse.quote.totalAmount);
                    priceCurrency = priceResponse.quote.totalCurrency;
                  }
                } catch (priceError: any) {
                  logger.warn('Failed to calculate cleaning price in assignCleaningToMe', {
                    cleaningId,
                    error: priceError.message,
                  });
                }
              }
            } catch (error: any) {
              logger.warn('Failed to get unit data in assignCleaningToMe', {
                cleaningId,
                error: error.message,
              });
            }
          }
          
          await eventsClient.publishCleaningAssigned({
            cleaningId: cleaning.id,
            cleanerId: currentCleaner.id,
            unitId: cleaning.unitId,
            unitName,
            unitAddress,
            cleanerName,
            scheduledAt: cleaning.scheduledAt,
            requiresLinenChange: cleaning.requiresLinenChange,
            notes: cleaning.notes || undefined,
            orgId: cleaning.orgId || undefined,
            actorUserId: undefined, // TODO: получить из context
            targetUserId: currentCleaner.userId || currentCleaner.id,
            unitGrade,
            cleaningDifficulty,
            priceAmount,
            priceCurrency,
          });
          logger.info('✅ CLEANING_ASSIGNED event published', { 
            cleaningId,
            hasUnitGrade: unitGrade !== undefined,
            hasCleaningDifficulty: cleaningDifficulty !== undefined,
            hasPriceAmount: priceAmount !== undefined,
          });
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
    
    setCleaningDifficulty: async (
      _: unknown,
      { input }: { input: { cleaningId: string; difficulty: string; checklistInstanceId?: string } },
      { dl, prisma, inventoryDL }: Context
    ) => {
      const { cleaningId, difficulty, checklistInstanceId } = input;
      logger.info('Setting cleaning difficulty', { cleaningId, difficulty, checklistInstanceId });
      
      // Проверка прав: назначенный уборщик или менеджер
      const cleaning = await dl.getCleaningById(cleaningId);
      if (!cleaning) {
        throw new Error(`Cleaning ${cleaningId} not found`);
      }

      // Проверка статуса
      if (!['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(cleaning.status)) {
        throw new Error('Can only set difficulty for SCHEDULED, IN_PROGRESS or COMPLETED cleanings');
      }

      // Проверка наличия PRE_CLEANING чек-листа (если передан checklistInstanceId)
      if (checklistInstanceId) {
        const instance = await prisma.checklistInstance.findUnique({
          where: { id: checklistInstanceId },
          include: { template: true },
        });
        
        if (!instance || instance.stage !== 'PRE_CLEANING' || instance.status !== 'SUBMITTED') {
          throw new Error('PRE_CLEANING checklist must be submitted');
        }
      }

      // Конвертируем enum в число
      const difficultyValue = parseInt(difficulty.replace('D', ''), 10);
      
      // Сохраняем assessedDifficulty
      const updated = await prisma.cleaning.update({
        where: { id: cleaningId },
        data: {
          assessedDifficulty: difficultyValue,
          assessedAt: new Date(),
        } as any, // Временное решение, пока Prisma клиент не обновлен
      });

      logger.info('✅ Cleaning difficulty set', { 
        cleaningId, 
        difficulty: difficultyValue,
        updatedCleanerId: updated.cleanerId,
        hasCleanerId: !!updated.cleanerId
      });

      // Публикуем событие CLEANING_DIFFICULTY_SET через Event Bus
      logger.info('🔍 About to enter event publication block', { cleaningId });
      try {
        logger.info('🔍 Preparing to publish CLEANING_DIFFICULTY_SET event', { cleaningId });
        
        // Используем datalayer для получения данных
        // Небольшая задержка, чтобы убедиться, что транзакция завершена
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const cleaningAfterUpdate = await dl.getCleaningById(cleaningId);
        
        logger.info('🔍 Cleaning data from datalayer after update', {
          cleaningId,
          hasCleaning: !!cleaningAfterUpdate,
          cleanerId: cleaningAfterUpdate?.cleanerId,
          cleanerIdType: typeof cleaningAfterUpdate?.cleanerId,
          cleanerIdValue: cleaningAfterUpdate?.cleanerId,
          status: cleaningAfterUpdate?.status,
          orgId: cleaningAfterUpdate?.orgId,
          unitId: cleaningAfterUpdate?.unitId,
          // Сравниваем с данными из Prisma напрямую для диагностики
          prismaCleanerId: updated.cleanerId
        });
        
        if (!cleaningAfterUpdate) {
          logger.warn('⚠️ Cleaning not found after update, skipping event publication', { cleaningId });
        } else if (!cleaningAfterUpdate.cleanerId) {
          logger.warn('⚠️ Cleaning has no cleanerId from datalayer, skipping event publication', { 
            cleaningId,
            cleaningData: {
              id: cleaningAfterUpdate.id,
              status: cleaningAfterUpdate.status,
              orgId: cleaningAfterUpdate.orgId,
              unitId: cleaningAfterUpdate.unitId,
              cleanerId: cleaningAfterUpdate.cleanerId
            }
          });
        } else {
          // Получаем уборщика через datalayer
          const cleaner = await dl.getCleanerById(cleaningAfterUpdate.cleanerId);
          
          if (!cleaner) {
            logger.warn('⚠️ Cleaner not found via datalayer, skipping event publication', { 
              cleaningId, 
              cleanerId: cleaningAfterUpdate.cleanerId 
            });
          } else {
            // Получаем квартиру через inventory datalayer
            const unit = await inventoryDL.getUnitById(cleaningAfterUpdate.unitId);
            
            if (!unit) {
              logger.warn('⚠️ Unit not found via datalayer, skipping event publication', { 
                cleaningId, 
                unitId: cleaningAfterUpdate.unitId 
              });
            } else {
              const eventsClient = getEventsClient();
              const managerIds = await resolveManagerUserIds(prisma, cleaningAfterUpdate.orgId);
              
              logger.info('📊 Manager IDs resolved', {
                cleaningId,
                orgId: cleaningAfterUpdate.orgId,
                managerIdsCount: managerIds.length,
                managerIds: managerIds
              });
              
              if (managerIds.length > 0) {
              const cleanerName = `${cleaner.firstName || ''} ${cleaner.lastName || ''}`.trim();
              const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();
              const unitAddress = unit.property?.address;
              
              // Получаем цену уборки из pricing service
              let priceAmount: number | undefined;
              let priceCurrency: string | undefined;
              try {
                const pricingClient = createPricingGrpcClient({
                  host: process.env.PRICING_GRPC_HOST || 'localhost',
                  port: parseInt(process.env.PRICING_GRPC_PORT || '4112'),
                });
                const priceResponse = await pricingClient.CalculateCleaningCost({
                  unitId: cleaningAfterUpdate.unitId,
                  difficulty: difficultyValue,
                  mode: 'BASIC'
                });
                if (priceResponse.quote?.totalAmount && priceResponse.quote?.totalCurrency) {
                  priceAmount = Number(priceResponse.quote.totalAmount);
                  priceCurrency = priceResponse.quote.totalCurrency;
                  logger.info('✅ Cleaning price calculated', {
                    cleaningId: cleaningAfterUpdate.id,
                    priceAmount,
                    priceCurrency
                  });
                }
              } catch (priceError: any) {
                logger.warn('Failed to calculate cleaning price', {
                  cleaningId: cleaningAfterUpdate.id,
                  error: priceError.message
                });
                // Не прерываем основной flow, продолжаем без цены
              }
              
              await eventsClient.publishCleaningDifficultySet({
                cleaningId: cleaningAfterUpdate.id,
                difficulty: difficultyValue,
                managerIds: managerIds,
                unitName,
                unitAddress,
                cleanerName,
                scheduledAt: cleaningAfterUpdate.scheduledAt,
                startedAt: cleaningAfterUpdate.startedAt || undefined,
                notes: cleaningAfterUpdate.notes || undefined,
                orgId: cleaningAfterUpdate.orgId || undefined,
                priceAmount,
                priceCurrency,
              });
              
              logger.info('✅ CLEANING_DIFFICULTY_SET event published', { 
                cleaningId, 
                managerIdsCount: managerIds.length 
              });
              } else {
                logger.warn('⚠️ No managers to notify for CLEANING_DIFFICULTY_SET', {
                  cleaningId,
                  orgId: cleaningAfterUpdate.orgId,
                  hint: 'Event will not be published - no managers found'
                });
              }
            }
          }
        }
      } catch (error: any) {
        logger.error('❌ Failed to publish CLEANING_DIFFICULTY_SET event', {
          cleaningId,
          error: error.message,
          stack: error.stack,
          errorName: error.name,
          errorCode: error.code
        });
        // Не прерываем основной flow
      }

      logger.info('🔍 Event publication block completed', { cleaningId });

      // Возвращаем обновленную уборку
      const result = await dl.getCleaningById(cleaningId);
      logger.info('🔍 Returning updated cleaning', { cleaningId, hasResult: !!result });
      return result;
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
            const cleanerName = `${cleaner.firstName || ''} ${cleaner.lastName || ''}`.trim();
            const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();
            const unitAddress = unit.property?.address;
            
            await eventsClient.publishCleaningCancelled({
              cleaningId: cleaning.id,
              cleanerId: cleaning.cleanerId,
              targetUserId,
              unitName,
              unitAddress,
              cleanerName,
              scheduledAt: cleaning.scheduledAt,
              reason,
              notes: cleaning.notes || undefined,
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

  RepairTemplate: {
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
    assessedDifficulty: (parent: any) => {
      // Datalayer уже возвращает значение в формате "D{number}", просто возвращаем как есть
      return parent.assessedDifficulty;
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
    exampleMedia: async (parent: any, _: unknown, { prisma }: Context) => {
      // Если exampleMedia уже загружен (из include), возвращаем его
      if (parent.exampleMedia && Array.isArray(parent.exampleMedia)) {
        return parent.exampleMedia;
      }
      
      // Иначе загружаем из БД
      const templateId = parent.templateId;
      const itemKey = parent.key;
      
      if (!templateId || !itemKey) {
        logger.warn('Missing templateId or itemKey for ChecklistItemTemplate.exampleMedia', {
          templateId,
          itemKey,
          parentKeys: Object.keys(parent)
        });
        return [];
      }
      
      try {
        const exampleMedia = await prisma.checklistItemTemplateMedia.findMany({
          where: {
            templateId,
            itemKey
          },
          orderBy: { order: 'asc' }
        });
        return exampleMedia;
      } catch (error) {
        logger.error('Failed to load exampleMedia for ChecklistItemTemplate', {
          templateId,
          itemKey,
          error
        });
        return [];
      }
    },
  },
  
  ChecklistInstanceItem: {
    tasks: async (parent: any, _: unknown, { prisma }: Context) => {
      if (!prisma?.task) {
        logger.warn('Prisma task model not available for ChecklistInstanceItem.tasks');
        return [];
      }
      try {
        // Используем any для обхода проверки типов до применения миграции
        const tasks = await (prisma.task as any).findMany({
          where: {
            checklistItemInstanceId: parent.id,
          },
          include: {
            assignedProvider: true,
            assignedCleaner: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        return tasks.map((task: any) => ({ id: task.id }));
      } catch (error) {
        logger.error('Failed to load tasks for checklist item', {
          itemId: parent.id,
          error,
        });
        return [];
      }
    },
    exampleMedia: async (parent: any, _: unknown, { prisma }: Context) => {
      // Получаем templateId из parent (добавлен в резолвере ChecklistInstance.items)
      const templateId = parent.templateId;
      const itemKey = parent.key;
      
      if (!templateId || !itemKey) {
        logger.warn('No templateId or itemKey for ChecklistInstanceItem.exampleMedia', { 
          itemKey,
          templateId,
          instanceId: parent.instanceId,
          parentKeys: Object.keys(parent)
        });
        return [];
      }
      
      try {
        // Загружаем примеры фото из шаблона
        const exampleMedia = await prisma.checklistItemTemplateMedia.findMany({
          where: {
            templateId,
            itemKey
          },
          orderBy: { order: 'asc' }
        });
        
        return exampleMedia;
      } catch (error) {
        logger.error('Failed to load example media for checklist item', { 
          templateId,
          itemKey, 
          error 
        });
        return [];
      }
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
      if (!parent.templateId || !parent.templateVersion) return null;
      return checklistInstanceService.getChecklistTemplate(parent.unitId, parent.templateVersion);
    },
    parentInstance: async (parent: any, _: unknown, { checklistInstanceService }: Context) => {
      if (!parent.parentInstanceId) return null;
      return checklistInstanceService.getChecklistInstance(parent.parentInstanceId);
    },
    items: (parent: any) => {
      // Добавляем templateId в каждый item для доступа в резолвере exampleMedia
      if (parent.items && Array.isArray(parent.items)) {
        const itemsWithTemplateId = parent.items.map((item: any) => ({
          ...item,
          templateId: parent.templateId,
          instanceId: parent.id
        }));
        logger.debug('ChecklistInstance.items resolver', {
          instanceId: parent.id,
          templateId: parent.templateId,
          itemsCount: itemsWithTemplateId.length,
          firstItemHasTemplateId: itemsWithTemplateId[0]?.templateId
        });
        return itemsWithTemplateId;
      }
      return parent.items || [];
    },
    repair: (parent: any, _: unknown, { prisma }: Context) => {
      if (!parent.repairId) return null;
      // Базовый resolver - будет расширен позже
      return { id: parent.repairId };
    },
  },
  
  Repair: {
    org: (parent: any) => ({ id: parent.orgId }),
    unit: (parent: any, _: unknown, { inventoryDL }: Context) => {
      return { id: parent.unitId };
    },
    master: async (parent: any, _: unknown, { prisma }: Context) => {
      if (!parent.masterId) {
        logger.debug('Repair has no masterId', { repairId: parent.id });
        return null;
      }
      try {
        logger.debug('Loading master for repair', { repairId: parent.id, masterId: parent.masterId });
        const master = await (prisma.master as any).findUnique({
          where: { id: parent.masterId },
        });
        if (!master) {
          logger.warn('Master not found', { repairId: parent.id, masterId: parent.masterId });
          return null;
        }
        logger.debug('Master loaded successfully', { repairId: parent.id, masterId: master.id, firstName: master.firstName });
        return master;
      } catch (error: any) {
        logger.error('Error loading master for repair', { repairId: parent.id, masterId: parent.masterId, error: error.message });
        return null;
      }
    },
    shoppingItems: (parent: any) => {
      // shoppingItems уже загружены через include в getRepairById
      return parent.shoppingItems || [];
    },
    booking: (parent: any) => parent.bookingId ? { id: parent.bookingId } : null,
    checklistInstances: async (parent: any, _: unknown, { prisma }: Context) => {
      try {
        const instances = await (prisma.checklistInstance as any).findMany({
          where: { repairId: parent.id },
          include: {
            items: true,
            answers: true,
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        });
        return instances || [];
      } catch (error) {
        logger.error('Failed to load checklist instances for repair', { repairId: parent.id, error });
        return [];
      }
    },
  },
  
  Master: {
    org: (parent: any) => ({ id: parent.orgId }),
    user: (parent: any) => parent.userId ? { id: parent.userId } : null,
    repairs: async (parent: any, _: unknown, { prisma }: Context) => {
      try {
        const repairs = await (prisma.repair as any).findMany({
          where: { masterId: parent.id },
          orderBy: { createdAt: 'desc' },
        });
        return repairs || [];
      } catch (error) {
        logger.error('Failed to load repairs for master', { masterId: parent.id, error });
        return [];
      }
    },
  },
  
  RepairShoppingItem: {
    repair: (parent: any) => ({ id: parent.repairId }),
    photos: (parent: any) => parent.photos || [],
  },
  
  RepairShoppingItemPhoto: {
    item: (parent: any) => ({ id: parent.itemId }),
  },
};

// Extend existing resolvers
Object.assign(resolvers.Query, {
  // ===== Repair Queries =====
  
  repair: async (_: unknown, { id }: { id: string }, { dl }: Context) => {
    return dl.getRepairById(id);
  },
  
  repairs: async (
    _: unknown,
    params: {
      orgId?: string;
      unitId?: string;
      masterId?: string;
      status?: string;
      from?: string;
      to?: string;
      first?: number;
      after?: string;
    },
    { dl }: Context
  ) => {
    return dl.listRepairs({
      orgId: params.orgId,
      unitId: params.unitId,
      masterId: params.masterId,
      status: params.status as any,
      from: params.from,
      to: params.to,
      first: params.first,
      after: params.after,
    });
  },
  
  master: async (_: unknown, { id }: { id: string }, { dl }: Context) => {
    return dl.getMasterById(id);
  },
  
  masters: async (
    _: unknown,
    params: {
      orgId: string;
      isActive?: boolean;
      first?: number;
      after?: string;
    },
    { dl }: Context
  ) => {
    return dl.listMasters({
      orgId: params.orgId,
      isActive: params.isActive,
      first: params.first,
      after: params.after,
    });
  },
  
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
  
  checklistByRepair: async (
    _: unknown,
    { repairId, stage }: { repairId: string; stage: string },
    { checklistInstanceService }: Context
  ) => {
    return checklistInstanceService.getChecklistByRepairAndStage(repairId, stage as any);
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
      { unitId, stage, cleaningId, repairId }: { unitId: string; stage: string; cleaningId?: string; repairId?: string },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Creating checklist instance', { unitId, stage, cleaningId, repairId });
      return checklistInstanceService.createChecklistInstance(unitId, stage as any, cleaningId, repairId);
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
              include: { 
                cleaner: true,
                documents: {
                  where: { type: 'PRE_CLEANING_ACCEPTANCE' },
                  include: { photos: { orderBy: { order: 'asc' } } }
                }
              },
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

            // Получаем полный инстанс чеклиста с items, answers, attachments
            const fullInstance = await checklistInstanceService.getChecklistInstance(id);
            
            // Подсчитываем статистику чеклиста
            const totalItems = fullInstance.items?.length || 0;
            const completedItems = fullInstance.items?.filter((item: any) => {
              if (item.requiresPhoto) {
                const itemAttachments = fullInstance.attachments?.filter((a: any) => a.itemKey === item.key) || [];
                return itemAttachments.length >= (item.photoMin || 1);
              } else {
                // Проверяем, что есть положительный ответ (true, "yes", положительное число и т.д.)
                const answer = fullInstance.answers?.find((a: any) => a.itemKey === item.key);
                if (!answer || !answer.value) {
                  return false;
                }
                // Проверяем, что значение положительное
                const value = answer.value;
                if (typeof value === 'boolean') {
                  return value === true;
                }
                if (typeof value === 'number') {
                  return value > 0;
                }
                if (typeof value === 'string') {
                  const lowerValue = value.toLowerCase();
                  return lowerValue === 'true' || lowerValue === 'yes' || lowerValue === 'да' || lowerValue === '1';
                }
                // Для других типов считаем положительным, если значение не null/undefined
                return value !== null && value !== undefined;
              }
            }) || [];
            const completedCount = completedItems.length;
            const incompleteCount = totalItems - completedCount;
            
            // Список неотмеченных пунктов (без положительного ответа)
            const incompleteItems = fullInstance.items
              ?.filter((item: any) => {
                if (item.requiresPhoto) {
                  const itemAttachments = fullInstance.attachments?.filter((a: any) => a.itemKey === item.key) || [];
                  return itemAttachments.length < (item.photoMin || 1);
                } else {
                  // Проверяем, что нет положительного ответа
                  const answer = fullInstance.answers?.find((a: any) => a.itemKey === item.key);
                  if (!answer || !answer.value) {
                    return true; // Нет ответа - неполный
                  }
                  // Проверяем, что значение не положительное
                  const value = answer.value;
                  if (typeof value === 'boolean') {
                    return value !== true; // false или null - неполный
                  }
                  if (typeof value === 'number') {
                    return value <= 0; // 0 или отрицательное - неполный
                  }
                  if (typeof value === 'string') {
                    const lowerValue = value.toLowerCase();
                    return !(lowerValue === 'true' || lowerValue === 'yes' || lowerValue === 'да' || lowerValue === '1');
                  }
                  // Для других типов считаем неполным, если значение null/undefined
                  return value === null || value === undefined;
                }
              })
              .map((item: any) => ({ title: item.title, key: item.key })) || [];

            // Собираем фото из документов
            const photoUrls = cleaning.documents
              ?.flatMap((doc: any) => (doc.photos || []).map((photo: any) => ({
                url: photo.url,
                caption: photo.caption || undefined
              }))) || [];

            const managerIds = await resolveManagerUserIds(prisma, cleaning.orgId);
            const eventsClient = getEventsClient();

            if (managerIds.length > 0) {
              const unitNameParts = [
                unit?.property?.title ?? '',
                unit?.name ?? '',
              ].filter(Boolean);
              const unitName = unitNameParts.length > 0 ? unitNameParts.join(' - ') : 'квартире';
              const unitAddress = unit?.property?.address;
              const cleanerName = cleaning.cleaner 
                ? `${cleaning.cleaner.firstName || ''} ${cleaning.cleaner.lastName || ''}`.trim()
                : undefined;

              await eventsClient.publishCleaningPrecheckCompleted({
                cleaningId: cleaning.id,
                managerIds,
                unitName,
                unitAddress,
                cleanerName,
                scheduledAt: cleaning.scheduledAt instanceof Date ? cleaning.scheduledAt.toISOString() : cleaning.scheduledAt,
                submittedAt: new Date().toISOString(),
                notes: cleaning.notes || undefined,
                orgId: cleaning.orgId || undefined,
                cleanerId: cleaning.cleanerId ?? null,
                checklistStats: {
                  total: totalItems,
                  completed: completedCount,
                  incomplete: incompleteCount,
                  incompleteItems: incompleteItems.length > 0 ? incompleteItems : undefined,
                },
                photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
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

        // Публикуем событие REPAIR_INSPECTION_COMPLETED при завершении осмотра ремонта
        if (submitted?.stage === 'REPAIR_INSPECTION' && submitted.repairId) {
          try {
            const repair = await (prisma.repair as any).findUnique({
              where: { id: submitted.repairId },
              include: { 
                master: true
              },
            });

            if (!repair) {
              logger.warn('Repair not found while publishing REPAIR_INSPECTION_COMPLETED', {
                checklistId: id,
                repairId: submitted.repairId,
              });
              return submitted;
            }

            const unit = await prisma.unit.findUnique({
              where: { id: repair.unitId },
              include: { property: true },
            });

            // Получаем полный инстанс чеклиста с items, answers, attachments
            const fullInstance = await checklistInstanceService.getChecklistInstance(id);
            
            // Подсчитываем статистику чеклиста
            const totalItems = fullInstance.items?.length || 0;
            const completedItems = fullInstance.items?.filter((item: any) => {
              if (item.requiresPhoto) {
                const itemAttachments = fullInstance.attachments?.filter((a: any) => a.itemKey === item.key) || [];
                return itemAttachments.length >= (item.photoMin || 1);
              } else {
                const answer = fullInstance.answers?.find((a: any) => a.itemKey === item.key);
                if (!answer || !answer.value) {
                  return false;
                }
                const value = answer.value;
                if (typeof value === 'boolean') {
                  return value === true;
                }
                if (typeof value === 'number') {
                  return value > 0;
                }
                if (typeof value === 'string') {
                  const lowerValue = value.toLowerCase();
                  return lowerValue === 'true' || lowerValue === 'yes' || lowerValue === 'да' || lowerValue === '1';
                }
                return value !== null && value !== undefined;
              }
            }) || [];
            const completedCount = completedItems.length;
            const incompleteCount = totalItems - completedCount;
            
            const incompleteItems = fullInstance.items
              ?.filter((item: any) => {
                if (item.requiresPhoto) {
                  const itemAttachments = fullInstance.attachments?.filter((a: any) => a.itemKey === item.key) || [];
                  return itemAttachments.length < (item.photoMin || 1);
                } else {
                  const answer = fullInstance.answers?.find((a: any) => a.itemKey === item.key);
                  if (!answer || !answer.value) {
                    return true;
                  }
                  const value = answer.value;
                  if (typeof value === 'boolean') {
                    return value !== true;
                  }
                  if (typeof value === 'number') {
                    return value <= 0;
                  }
                  if (typeof value === 'string') {
                    const lowerValue = value.toLowerCase();
                    return !(lowerValue === 'true' || lowerValue === 'yes' || lowerValue === 'да' || lowerValue === '1');
                  }
                  return value === null || value === undefined;
                }
              })
              .map((item: any) => ({ title: item.title, key: item.key })) || [];

            // Собираем фото из attachments
            const photoUrls = fullInstance.attachments
              ?.filter((a: any) => a.url)
              .map((a: any) => ({
                url: a.url,
                caption: a.caption || undefined
              })) || [];

            const managerIds = await resolveManagerUserIds(prisma, repair.orgId);
            const eventsClient = getEventsClient();

            if (managerIds.length > 0) {
              const unitNameParts = [
                unit?.property?.title ?? '',
                unit?.name ?? '',
              ].filter(Boolean);
              const unitName = unitNameParts.length > 0 ? unitNameParts.join(' - ') : 'квартире';
              const unitAddress = unit?.property?.address;
              const masterName = repair.master 
                ? `${repair.master.firstName || ''} ${repair.master.lastName || ''}`.trim()
                : undefined;

              await eventsClient.publishRepairInspectionCompleted({
                repairId: repair.id,
                masterId: repair.masterId ?? undefined,
                masterName,
                unitName,
                unitAddress,
                submittedAt: new Date().toISOString(),
                scheduledAt: repair.scheduledAt instanceof Date ? repair.scheduledAt.toISOString() : repair.scheduledAt,
                notes: repair.notes || undefined,
                orgId: repair.orgId || undefined,
                managerIds,
                checklistStats: {
                  total: totalItems,
                  completed: completedCount,
                  incomplete: incompleteCount,
                  incompleteItems: incompleteItems.length > 0 ? incompleteItems : undefined,
                },
                photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
              });
            } else {
              logger.info('No users with MANAGER system role available for repair inspection completed notifications', {
                repairId: repair.id,
                orgId: repair.orgId,
              });
            }
          } catch (eventError: any) {
            logger.error('Failed to publish REPAIR_INSPECTION_COMPLETED event', {
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
    
    createChecklistTemplate: async (
      _: unknown,
      { unitId }: { unitId: string },
      { checklistInstanceService }: Context
    ) => {
      logger.info('Creating checklist template', { unitId });
      return checklistInstanceService.createChecklistTemplate(unitId);
    },
    
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
    
    // ===== Repair Mutations =====
    
    createMaster: async (
      _: unknown,
      { input }: { input: any },
      { dl }: Context
    ) => {
      logger.info('Creating master', { input });
      return dl.createMaster(input);
    },
    
    updateMaster: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      { dl }: Context
    ) => {
      logger.info('Updating master', { id, input });
      return dl.updateMaster(id, input);
    },
    
    scheduleRepair: async (
      _: unknown,
      { input }: { input: any },
      { dl, prisma }: Context
    ) => {
      logger.info('Scheduling repair', { input });
      
      // Проверяем, что мастер существует, если masterId передан
      if (input.masterId) {
        const master = await (prisma.master as any).findUnique({
          where: { id: input.masterId },
        });
        if (!master) {
          throw new Error(`Master with id ${input.masterId} not found`);
        }
        if (!master.firstName) {
          throw new Error(`Master with id ${input.masterId} has no firstName`);
        }
      }
      
      const repair = await dl.scheduleRepair(input);
      
      // Публикуем событие REPAIR_ASSIGNED через Event Bus
      try {
        if (repair.masterId) {
          const master = await (prisma.master as any).findUnique({
            where: { id: repair.masterId }
          });
          
          const unit = await prisma.unit.findUnique({
            where: { id: repair.unitId },
            include: { property: true }
          });
          
          if (master && unit) {
            const eventsClient = getEventsClient();
            const targetUserId = master.userId || master.id;
            const masterName = `${master.firstName || ''} ${master.lastName || ''}`.trim();
            const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();
            const unitAddress = unit.property?.address;
            
            await eventsClient.publishRepairAssigned({
              repairId: repair.id,
              masterId: repair.masterId,
              unitId: repair.unitId,
              unitName,
              unitAddress,
              scheduledAt: repair.scheduledAt,
              masterName,
              notes: repair.notes || undefined,
              orgId: repair.orgId || undefined,
              targetUserId,
            });
            
            logger.info('✅ REPAIR_ASSIGNED event published', { repairId: repair.id });
          }
        }
      } catch (error: any) {
        logger.error('Failed to publish REPAIR_ASSIGNED event:', error);
        // Не прерываем основной flow
      }
      
      return repair;
    },
    
    startRepair: async (
      _: unknown,
      { id }: { id: string },
      { dl, prisma, checklistInstanceService }: Context
    ) => {
      logger.info('Starting repair', { id });
      
      const repair = await dl.getRepairById(id);
      if (!repair) {
        throw new Error(`Repair with id ${id} not found`);
      }
      
      // Начинаем ремонт (берем в работу)
      const startedRepair = await dl.startRepair(id);
      
      // После начала работ создаем чеклист осмотра, если его еще нет
      const inspectionInstance = await prisma.checklistInstance.findFirst({
        where: {
          repairId: id,
          stage: 'REPAIR_INSPECTION'
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Если чеклист осмотра не существует, создаем его автоматически после начала работ
      if (!inspectionInstance) {
        logger.info('Creating inspection checklist after repair start', { repairId: id, unitId: repair.unitId });
        try {
          await checklistInstanceService.createChecklistInstance(
            repair.unitId,
            'REPAIR_INSPECTION',
            undefined, // cleaningId
            id, // repairId
            false // isPlannedInspection - создаем кастомный чеклист
          );
          logger.info('Inspection checklist created automatically after repair start', { 
            repairId: id
          });
        } catch (error: any) {
          logger.error('Failed to create inspection checklist automatically', { 
            repairId: id, 
            error: error.message 
          });
          // Не прерываем процесс, так как ремонт уже начат
          // Чеклист можно создать вручную позже
        }
      }
      
      // Публикуем событие REPAIR_STARTED через Event Bus
      try {
        if (startedRepair.masterId) {
          const master = await (prisma.master as any).findUnique({
            where: { id: startedRepair.masterId }
          });
          
          const unit = await prisma.unit.findUnique({
            where: { id: startedRepair.unitId },
            include: { property: true }
          });
          
          if (master && unit) {
            const eventsClient = getEventsClient();
            const targetUserId = master.userId || master.id;
            const masterName = `${master.firstName || ''} ${master.lastName || ''}`.trim();
            const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();
            const unitAddress = unit.property?.address;
            
            await eventsClient.publishRepairStarted({
              repairId: startedRepair.id,
              masterId: startedRepair.masterId,
              unitName,
              unitAddress,
              masterName,
              scheduledAt: startedRepair.scheduledAt,
              notes: startedRepair.notes || undefined,
              orgId: startedRepair.orgId || undefined,
              targetUserId,
            });
            
            logger.info('✅ REPAIR_STARTED event published', { repairId: id });
          }
        }
      } catch (error: any) {
        logger.error('Failed to publish REPAIR_STARTED event:', error);
        // Не прерываем основной flow
      }
      
      return startedRepair;
    },
    
    completeRepair: async (
      _: unknown,
      { id }: { id: string },
      { dl, prisma }: Context
    ) => {
      logger.info('Completing repair', { id });
      const repair = await dl.completeRepair(id);
      
      // Публикуем событие REPAIR_COMPLETED через Event Bus
      try {
        if (repair.masterId) {
          const master = await (prisma.master as any).findUnique({
            where: { id: repair.masterId }
          });
          
          const unit = await prisma.unit.findUnique({
            where: { id: repair.unitId },
            include: { property: true }
          });
          
          if (master && unit) {
            const eventsClient = getEventsClient();
            const targetUserId = master.userId || master.id;
            const masterName = `${master.firstName || ''} ${master.lastName || ''}`.trim();
            const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();
            const unitAddress = unit.property?.address;
            
            // Получаем статистику чеклиста результата
            const resultInstance = await prisma.checklistInstance.findFirst({
              where: {
                repairId: id,
                stage: 'REPAIR_RESULT'
              },
              include: {
                items: true,
                answers: true,
                attachments: true
              },
              orderBy: { createdAt: 'desc' }
            });
            
            let checklistStats;
            if (resultInstance) {
              const totalItems = resultInstance.items.length;
              const completedCount = resultInstance.items.filter((item: any) => {
                const answer = resultInstance.answers.find((a: any) => a.itemKey === item.key);
                if (item.requiresPhoto) {
                  const itemAttachments = resultInstance.attachments.filter((a: any) => a.itemKey === item.key);
                  return itemAttachments.length >= (item.photoMin || 1);
                }
                return answer && answer.value;
              }).length;
              const incompleteCount = totalItems - completedCount;
              
              checklistStats = {
                total: totalItems,
                completed: completedCount,
                incomplete: incompleteCount
              };
            }
            
            // Получаем фото из attachments
            const photoUrls = resultInstance?.attachments
              ?.filter((a: any) => a.url)
              .map((a: any) => ({
                url: a.url,
                caption: a.caption || undefined
              })) || [];
            
            await eventsClient.publishRepairCompleted({
              repairId: repair.id,
              masterId: repair.masterId,
              unitName,
              unitAddress,
              masterName,
              completedAt: repair.completedAt || new Date().toISOString(),
              scheduledAt: repair.scheduledAt,
              startedAt: repair.startedAt || undefined,
              notes: repair.notes || undefined,
              orgId: repair.orgId || undefined,
              targetUserId,
              checklistStats,
              photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
            });
            
            logger.info('✅ REPAIR_COMPLETED event published', { repairId: id });
          }
        }
      } catch (error: any) {
        logger.error('Failed to publish REPAIR_COMPLETED event:', error);
        // Не прерываем основной flow
      }
      
      return repair;
    },
    
    cancelRepair: async (
      _: unknown,
      { id, reason }: { id: string; reason?: string },
      { dl, prisma }: Context
    ) => {
      logger.info('Cancelling repair', { id, reason });
      const repair = await dl.cancelRepair(id, reason);
      
      // Публикуем событие REPAIR_CANCELLED через Event Bus
      try {
        if (repair.masterId) {
          const master = await (prisma.master as any).findUnique({
            where: { id: repair.masterId }
          });
          
          const unit = await prisma.unit.findUnique({
            where: { id: repair.unitId },
            include: { property: true }
          });
          
          if (master && unit) {
            const eventsClient = getEventsClient();
            const targetUserId = master.userId || master.id;
            const masterName = `${master.firstName || ''} ${master.lastName || ''}`.trim();
            const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();
            const unitAddress = unit.property?.address;
            
            await eventsClient.publishRepairCancelled({
              repairId: repair.id,
              masterId: repair.masterId,
              masterName,
              unitName,
              unitAddress,
              scheduledAt: repair.scheduledAt,
              reason: reason || undefined,
              notes: repair.notes || undefined,
              orgId: repair.orgId || undefined,
              targetUserId,
            });
            
            logger.info('✅ REPAIR_CANCELLED event published', { repairId: id });
          }
        }
      } catch (error: any) {
        logger.error('Failed to publish REPAIR_CANCELLED event:', error);
        // Не прерываем основной flow
      }
      
      return repair;
    },
    
    assessRepair: async (
      _: unknown,
      { id, input }: { id: string; input: { difficulty: number; size: number } },
      { dl }: Context
    ) => {
      logger.info('Assessing repair', { id, input });
      return dl.assessRepair(id, input);
    },
    
    createRepairShoppingItem: async (
      _: unknown,
      { repairId, input }: { repairId: string; input: any },
      { dl }: Context
    ) => {
      logger.info('Creating repair shopping item', { repairId, input });
      return dl.createRepairShoppingItem(repairId, input);
    },
    
    updateRepairShoppingItem: async (
      _: unknown,
      { itemId, input }: { itemId: string; input: any },
      { dl }: Context
    ) => {
      logger.info('Updating repair shopping item', { itemId, input });
      return dl.updateRepairShoppingItem(itemId, input);
    },
    
    deleteRepairShoppingItem: async (
      _: unknown,
      { itemId }: { itemId: string },
      { dl }: Context
    ) => {
      logger.info('Deleting repair shopping item', { itemId });
      return dl.deleteRepairShoppingItem(itemId);
    },
    
    addPhotoToRepairShoppingItem: async (
      _: unknown,
      { itemId, url, caption, order }: { itemId: string; url: string; caption?: string; order?: number },
      { dl }: Context
    ) => {
      logger.info('Adding photo to repair shopping item', { itemId, url });
      return dl.addPhotoToShoppingItem(itemId, url, caption, order);
    },
    
    deletePhotoFromRepairShoppingItem: async (
      _: unknown,
      { photoId }: { photoId: string },
      { dl }: Context
    ) => {
      logger.info('Deleting photo from repair shopping item', { photoId });
      return dl.deletePhotoFromShoppingItem(photoId);
    },
});

