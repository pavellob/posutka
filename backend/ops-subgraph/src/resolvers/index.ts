import type { Context } from '../context.js';
import type { IOpsDL } from '@repo/datalayer';
import { createGraphQLLogger } from '@repo/shared-logger';
import { createCleaningGrpcClient } from '@repo/grpc-sdk';

const logger = createGraphQLLogger('ops-subgraph-resolvers');

// gRPC клиент для cleaning-subgraph
const cleaningGrpcClient = createCleaningGrpcClient({
  host: process.env.CLEANING_GRPC_HOST || 'localhost',
  port: parseInt(process.env.CLEANING_GRPC_PORT || '4110'),
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 10000,
});

// Подключаемся к cleaning-subgraph
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
        
        // Вызываем cleaning-subgraph через gRPC (cleanerId может быть undefined)
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
        
        // Вызываем cleaning-subgraph через gRPC
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
    assignedTo: async (parent: any, _: unknown, { dl }: Context) => {
      if (!parent.assignedProviderId) return null;
      return dl.getProviderById(parent.assignedProviderId);
    },
    assignedCleaner: (parent: any) => {
      // Возвращаем ссылку на уборщика для федерации с cleaning-subgraph
      return parent.assignedCleanerId ? { id: parent.assignedCleanerId } : null;
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
