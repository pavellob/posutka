import type { Context } from '../context.js';
import type { IOpsDL } from '@repo/datalayer';
import { createGraphQLLogger } from '@repo/shared-logger';
import { createCleaningGrpcClient } from '@repo/grpc-sdk';

const logger = createGraphQLLogger('ops-subgraph-resolvers');

// gRPC клиент для field-service-subgraph
const cleaningGrpcClient = createCleaningGrpcClient({
  host: process.env.CLEANING_GRPC_HOST || 'localhost',
  port: parseInt(process.env.CLEANING_GRPC_PORT || '4110'),
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 10000,
});

// Подключаемся к field-service-subgraph
cleaningGrpcClient.connect().catch((error) => {
  logger.error('Failed to connect to Cleaning GRPC service', error);
});

// Shared resolver functions that can be used by both GraphQL and gRPC
export const sharedResolvers = {
  getTaskById: (dl: IOpsDL, id: string) => dl.getTaskById(id),
  
  listTasks: (dl: IOpsDL, params: any) => dl.listTasks(params),
  
  getServiceOrderById: (dl: IOpsDL, id: string) => dl.getServiceOrderById(id),
  
  getProviderById: (dl: IOpsDL, id: string) => dl.getProviderById(id),
  
  listProviders: (dl: IOpsDL, serviceTypes?: string[]) => dl.listProviders(serviceTypes),
  
  createTask: async (dl: IOpsDL, input: any) => {
    logger.info('Creating task', { input });
    const task = await dl.createTask(input);
    
    // Если задача типа CLEANING - создаем соответствующую уборку через gRPC
    if (input.type === 'CLEANING') {
      try {
        logger.info('Task is CLEANING type, creating Cleaning via gRPC', { taskId: task.id });
        
        // Вызываем field-service-subgraph через gRPC (cleanerId может быть undefined)
        const response = await cleaningGrpcClient.scheduleCleaning({
          orgId: input.orgId,
          unitId: input.unitId,
          bookingId: input.bookingId,
          taskId: task.id,  // Связываем с Task
          scheduledAt: input.dueAt ? new Date(input.dueAt) : new Date(),
          cleanerId: input.cleanerId, // Может быть undefined - система отправит уведомления всем привязанным уборщикам
          requiresLinenChange: false, // По умолчанию
          notes: input.note,
        });
        
        if (response.success) {
          logger.info('✅ Cleaning created for Task via gRPC', { 
            taskId: task.id,
            cleaningId: response.cleaning?.id 
          });
        } else {
          logger.error('Failed to create Cleaning for Task via gRPC', { 
            taskId: task.id,
            message: response.message 
          });
        }
      } catch (error) {
        logger.error('Error creating Cleaning for Task via gRPC', { 
          taskId: task.id,
          error: error instanceof Error ? error.message : String(error) 
        });
        // Не прерываем создание Task даже если Cleaning не создалась
      }
    }
    
    return task;
  },
  
  assignTask: async (dl: IOpsDL, input: any) => {
    logger.info('Assigning task', { input });
    // Validate assignment if provider is specified
    if (input.providerId) {
      const isValid = await dl.validateTaskAssignment(input.taskId, input.providerId);
      if (!isValid) {
        throw new Error('Provider cannot handle this type of task');
      }
    }
    
    const task = await dl.assignTask(input);
    
    // Если задача типа CLEANING и назначен уборщик - создаем уборку
    if (task.type === 'CLEANING' && input.cleanerId) {
      try {
        logger.info('Task is CLEANING type with cleaner assigned, creating Cleaning via gRPC', { 
          taskId: task.id,
          cleanerId: input.cleanerId 
        });
        
        // Вызываем field-service-subgraph через gRPC
        const response = await cleaningGrpcClient.scheduleCleaning({
          orgId: task.orgId!,
          unitId: task.unitId!,
          bookingId: task.bookingId,
          taskId: task.id,
          scheduledAt: task.dueAt ? new Date(task.dueAt) : new Date(),
          cleanerId: input.cleanerId,
          requiresLinenChange: false,
          notes: task.note || 'Создано автоматически при назначении уборщика',
        });
        
        if (response.success) {
          logger.info('✅ Cleaning created for Task via gRPC after assignment', { 
            taskId: task.id,
            cleaningId: response.cleaning?.id 
          });
        } else {
          logger.error('Failed to create Cleaning for Task via gRPC after assignment', { 
            taskId: task.id,
            message: response.message 
          });
        }
      } catch (error) {
        logger.error('Error creating Cleaning for Task via gRPC after assignment', { 
          taskId: task.id,
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    return task;
  },
  
  updateTaskStatus: (dl: IOpsDL, id: string, status: string) => {
    logger.info('Updating task status', { id, status });
    return dl.updateTaskStatus(id, status);
  },
  
  updateTask: (dl: IOpsDL, id: string, input: any) => {
    logger.info('Updating task', { id, input });
    return dl.updateTask(id, input);
  },
  
  createServiceOrder: (dl: IOpsDL, input: any) => {
    logger.info('Creating service order', { input });
    return dl.createServiceOrder(input);
  },
  
  updateServiceOrderStatus: (dl: IOpsDL, id: string, status: string) => {
    logger.info('Updating service order status', { id, status });
    return dl.updateServiceOrderStatus(id, status);
  },
  
  createServiceProvider: (dl: IOpsDL, input: any) => {
    logger.info('Creating service provider', { input });
    return dl.createProvider(input);
  },
  
  createTasksFromChecklist: async (dl: IOpsDL, input: any, prisma: any) => {
    logger.info('Creating tasks from checklist', { input, hasPrisma: !!prisma });
    
    if (!prisma) {
      logger.error('Prisma client is not available in context');
      throw new Error('Prisma client is not available in context');
    }
    
    if (!prisma.cleaning) {
      logger.error('Prisma cleaning model is not available', { prismaKeys: Object.keys(prisma) });
      throw new Error('Prisma cleaning model is not available');
    }
    
    // 1. Получить cleaning и проверить, что он существует
    const cleaning = await prisma.cleaning.findUnique({
      where: { id: input.cleaningId },
      include: {
        cleaner: true,
        checklistInstances: {
          where: {
            stage: 'CLEANING', // Берем чек-лист стадии CLEANING
          },
          include: {
            items: true,
            answers: true,
            attachments: true,
          },
        },
      },
    });
    
    if (!cleaning) {
      throw new Error(`Cleaning with id ${input.cleaningId} not found`);
    }
    
    // 2. Получить ChecklistInstance для этой уборки
    const checklistInstance = cleaning.checklistInstances?.[0];
    if (!checklistInstance) {
      throw new Error(`No checklist instance found for cleaning ${input.cleaningId}`);
    }
    
    // 3. Валидация: проверить, что все itemKey относятся к этому checklistInstance
    const validItemKeys = new Set(checklistInstance.items.map((item: any) => item.key));
    const invalidItems = input.items.filter(
      (item: any) => !validItemKeys.has(item.itemKey)
    );
    
    if (invalidItems.length > 0) {
      throw new Error(
        `Invalid itemKeys: ${invalidItems.map((i: any) => i.itemKey).join(', ')}. ` +
        `These items do not belong to cleaning ${input.cleaningId}`
      );
    }
    
    if (input.items.length === 0) {
      throw new Error('Items list cannot be empty');
    }
    
    // 4. Создать или найти Source для этого cleaning
    if (!prisma.source) {
      logger.error('Prisma source model is not available', { prismaKeys: Object.keys(prisma) });
      throw new Error('Prisma source model is not available. Make sure migration is applied and Prisma Client is regenerated.');
    }
    
    let source = await prisma.source.findUnique({
      where: {
        type_entityId: {
          type: 'CLEANING',
          entityId: cleaning.id,
        },
      },
    });
    
    if (!source) {
      logger.info('Creating new Source for cleaning', { cleaningId: cleaning.id });
      source = await prisma.source.create({
        data: {
          type: 'CLEANING',
          entityId: cleaning.id,
          orgId: cleaning.orgId,
        },
      });
      logger.info('Source created', { sourceId: source.id });
    } else {
      logger.info('Using existing Source', { sourceId: source.id });
    }
    
    // 5. Создать задачи в транзакции
    const tasks = await Promise.all(
      input.items.map(async (item: any) => {
        const checklistItem = checklistInstance.items.find(
          (i: any) => i.key === item.itemKey
        );
        
        if (!checklistItem) {
          throw new Error(`Checklist item with key ${item.itemKey} not found`);
        }
        
        // Определяем тип задачи - по умолчанию MAINTENANCE
        const taskType = 'MAINTENANCE';
        
        // Определяем assignee в зависимости от типа
        const taskInput: any = {
          orgId: cleaning.orgId,
          type: taskType,
          unitId: cleaning.unitId,
          bookingId: cleaning.bookingId,
          sourceId: source.id, // Используем sourceId вместо cleaningId
          checklistItemKey: item.itemKey,
          checklistItemInstanceId: checklistItem.id, // Связываем с конкретным пунктом чек-листа
          authorId: cleaning.cleanerId, // уборщик, который проходил чек-лист
          dueAt: item.dueAt,
          note: item.description,
        };
        
        // Назначаем исполнителя в зависимости от типа
        if (item.assigneeType === 'PROVIDER') {
          taskInput.assignedProviderId = item.assigneeId;
        } else if (item.assigneeType === 'CLEANER') {
          taskInput.assignedCleanerId = item.assigneeId;
        } else if (item.assigneeType === 'MASTER') {
          taskInput.assignedMasterId = item.assigneeId;
        }
        
        return dl.createTask(taskInput);
      })
    );
    
    logger.info('Tasks created from checklist', {
      cleaningId: input.cleaningId,
      tasksCount: tasks.length,
    });
    
    return tasks;
  },
};

// GraphQL resolvers that use shared resolver functions
export const resolvers = {
  Query: {
    task: (_: unknown, { id }: { id: string }, { dl }: Context) => 
      sharedResolvers.getTaskById(dl, id),
    tasks: (_: unknown, params: any, { dl }: Context) => 
      sharedResolvers.listTasks(dl, params),
    serviceOrder: (_: unknown, { id }: { id: string }, { dl }: Context) => 
      sharedResolvers.getServiceOrderById(dl, id),
    serviceProvider: (_: unknown, { id }: { id: string }, { dl }: Context) => 
      sharedResolvers.getProviderById(dl, id),
    serviceProviders: (_: unknown, { serviceTypes }: { serviceTypes?: string[] }, { dl }: Context) => 
      sharedResolvers.listProviders(dl, serviceTypes),
  },
  Mutation: {
    createTask: (_: unknown, { input }: { input: any }, { dl }: Context) => 
      sharedResolvers.createTask(dl, input),
    createTasksFromChecklist: async (_: unknown, { input }: { input: any }, { dl, prisma }: Context) => {
      if (!prisma) {
        throw new Error('Prisma client is not available in context');
      }
      return sharedResolvers.createTasksFromChecklist(dl, input, prisma);
    },
    createTaskForNextChecklist: async (_: unknown, { input }: { input: any }, { dl, prisma }: Context) => {
      logger.info('Creating task for next checklist', { input });
      
      if (!prisma?.task) {
        throw new Error('Prisma client is not available');
      }
      
      // Создаем задачу с флагом plannedForNextChecklist
      const taskInput = {
        ...input,
        plannedForNextChecklist: true,
      };
      
      const task = await sharedResolvers.createTask(dl, taskInput);
      
      logger.info('Task created for next checklist', {
        taskId: task.id,
        unitId: input.unitId,
        sourceCleaningId: input.sourceCleaningId,
      });
      
      return task;
    },
    assignTask: (_: unknown, { input }: { input: any }, { dl }: Context) => 
      sharedResolvers.assignTask(dl, input),
    updateTaskStatus: (_: unknown, { id, status }: { id: string; status: string }, { dl }: Context) => 
      sharedResolvers.updateTaskStatus(dl, id, status),
    updateTask: (_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) => 
      sharedResolvers.updateTask(dl, id, input),
    createServiceOrder: (_: unknown, { input }: { input: any }, { dl }: Context) => 
      sharedResolvers.createServiceOrder(dl, input),
    updateServiceOrderStatus: (_: unknown, { id, status }: { id: string; status: string }, { dl }: Context) => 
      sharedResolvers.updateServiceOrderStatus(dl, id, status),
    createServiceProvider: (_: unknown, { input }: { input: any }, { dl }: Context) => 
      sharedResolvers.createServiceProvider(dl, input),
  },
  // Field resolvers для связанных типов
  Task: {
    org: (parent: any) => ({ id: parent.orgId }),
    unit: (parent: any) => parent.unitId ? { id: parent.unitId } : null,
    booking: (parent: any) => parent.bookingId ? { id: parent.bookingId } : null,
    source: async (parent: any, _: unknown, { prisma }: Context) => {
      if (!parent.sourceId || !prisma) return null;
      return prisma.source.findUnique({ where: { id: parent.sourceId } });
    },
    assignedTo: async (parent: any, _: unknown, { dl }: Context) => {
      if (!parent.assignedProviderId) return null;
      return dl.getProviderById(parent.assignedProviderId);
    },
    assignedCleaner: (parent: any) => {
      // Возвращаем ссылку на уборщика для федерации с field-service-subgraph
      return parent.assignedCleanerId ? { id: parent.assignedCleanerId } : null;
    },
    assignedMaster: (parent: any) => {
      // Возвращаем ссылку на мастера для федерации с field-service-subgraph
      return parent.assignedMasterId ? { id: parent.assignedMasterId } : null;
    },
  },
  Source: {
    org: (parent: any) => ({ id: parent.orgId }),
    cleaning: (parent: any) => {
      // Возвращаем ссылку на уборку для федерации с field-service-subgraph
      // Federation автоматически получит данные из field-service-subgraph по id
      if (parent.type === 'CLEANING' && parent.entityId) {
        return { id: parent.entityId };
      }
      return null;
    },
  },
  ServiceOrder: {
    org: (parent: any) => ({ id: parent.orgId }),
    task: async (parent: any, _: unknown, { dl }: Context) => {
      return dl.getTaskById(parent.taskId);
    },
    provider: async (parent: any, _: unknown, { dl }: Context) => {
      if (!parent.providerId) return null;
      return dl.getProviderById(parent.providerId);
    },
    invoice: (parent: any) => parent.invoiceId ? { id: parent.invoiceId } : null,
  },
};
