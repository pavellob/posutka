import type { Context } from '../context.js';

export const resolvers = {
  Query: {
    task: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getTaskById(id),
    tasks: (_: unknown, params: any, { dl }: Context) => dl.listTasks(params),
    serviceOrder: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getServiceOrderById(id),
    serviceProvider: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getProviderById(id),
    serviceProviders: (_: unknown, { serviceTypes }: { serviceTypes?: string[] }, { dl }: Context) => 
      dl.listProviders(serviceTypes),
  },
  Mutation: {
    createTask: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.createTask(input),
    assignTask: async (_: unknown, { input }: { input: any }, { dl }: Context) => {
      // Validate assignment if provider is specified
      if (input.providerId) {
        const isValid = await dl.validateTaskAssignment(input.taskId, input.providerId);
        if (!isValid) {
          throw new Error('Provider cannot handle this type of task');
        }
      }
      return dl.assignTask(input);
    },
    updateTaskStatus: (_: unknown, { id, status }: { id: string; status: string }, { dl }: Context) => 
      dl.updateTaskStatus(id, status),
    createServiceOrder: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.createServiceOrder(input),
    updateServiceOrderStatus: (_: unknown, { id, status }: { id: string; status: string }, { dl }: Context) => 
      dl.updateServiceOrderStatus(id, status),
    createServiceProvider: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.createProvider(input),
  },
  // Все связи между типами будут решаться на уровне mesh через base-schema.gql
  // Здесь оставляем только прямые запросы к данным
};
