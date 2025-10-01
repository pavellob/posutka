import type { Context } from '../context.js';
import type { IOpsDL } from '@repo/datalayer';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('ops-subgraph-resolvers');

// Shared resolver functions that can be used by both GraphQL and gRPC
export const sharedResolvers = {
  getTaskById: (dl: IOpsDL, id: string) => dl.getTaskById(id),
  
  listTasks: (dl: IOpsDL, params: any) => dl.listTasks(params),
  
  getServiceOrderById: (dl: IOpsDL, id: string) => dl.getServiceOrderById(id),
  
  getProviderById: (dl: IOpsDL, id: string) => dl.getProviderById(id),
  
  listProviders: (dl: IOpsDL, serviceTypes?: string[]) => dl.listProviders(serviceTypes),
  
  createTask: (dl: IOpsDL, input: any) => {
    logger.info('Creating task', { input });
    return dl.createTask(input);
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
    return dl.assignTask(input);
  },
  
  updateTaskStatus: (dl: IOpsDL, id: string, status: string) => {
    logger.info('Updating task status', { id, status });
    return dl.updateTaskStatus(id, status);
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
