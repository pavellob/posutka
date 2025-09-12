export const resolvers = {
    Query: {
        task: (_, { id }, { dl }) => dl.getTaskById(id),
        tasks: (_, params, { dl }) => dl.listTasks(params),
        serviceOrder: (_, { id }, { dl }) => dl.getServiceOrderById(id),
        serviceProvider: (_, { id }, { dl }) => dl.getProviderById(id),
        serviceProviders: (_, { serviceTypes }, { dl }) => dl.listProviders(serviceTypes),
    },
    Mutation: {
        createTask: (_, { input }, { dl }) => dl.createTask(input),
        assignTask: async (_, { input }, { dl }) => {
            // Validate assignment if provider is specified
            if (input.providerId) {
                const isValid = await dl.validateTaskAssignment(input.taskId, input.providerId);
                if (!isValid) {
                    throw new Error('Provider cannot handle this type of task');
                }
            }
            return dl.assignTask(input);
        },
        updateTaskStatus: (_, { id, status }, { dl }) => dl.updateTaskStatus(id, status),
        createServiceOrder: (_, { input }, { dl }) => dl.createServiceOrder(input),
        updateServiceOrderStatus: (_, { id, status }, { dl }) => dl.updateServiceOrderStatus(id, status),
        createServiceProvider: (_, { input }, { dl }) => dl.createProvider(input),
    },
    // Все связи между типами будут решаться на уровне mesh через base-schema.gql
    // Здесь оставляем только прямые запросы к данным
};
