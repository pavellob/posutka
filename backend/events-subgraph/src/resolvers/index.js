import { createGraphQLLogger } from '@repo/shared-logger';
const logger = createGraphQLLogger('events-resolvers');
export const resolvers = {
    Query: {
        event: async (_, { id }, { prisma }) => {
            return await prisma.event.findUnique({ where: { id } });
        },
        events: async (_, params, { eventBus }) => {
            return await eventBus.getEvents(params);
        },
        eventStats: async (_, params, { eventBus }) => {
            return await eventBus.getStats(params);
        },
        subscription: async (_, { id }, { prisma }) => {
            return await prisma.eventSubscription.findUnique({ where: { id } });
        },
        subscriptions: async (_, params, { prisma }) => {
            const where = {};
            if (params.handlerType)
                where.handlerType = params.handlerType;
            if (params.isActive !== undefined)
                where.isActive = params.isActive;
            return await prisma.eventSubscription.findMany({ where });
        },
    },
    Mutation: {
        publishEvent: async (_, { input }, { eventBus }) => {
            logger.info('Publishing event via GraphQL', { input });
            return await eventBus.publishEvent(input);
        },
        createSubscription: async (_, { input }, { prisma }) => {
            logger.info('Creating event subscription', { input });
            return await prisma.eventSubscription.create({
                data: {
                    handlerType: input.handlerType,
                    eventTypes: input.eventTypes,
                    targetUrl: input.targetUrl || null,
                    isActive: true,
                    config: input.config || null
                }
            });
        },
        updateSubscription: async (_, { id, input }, { prisma }) => {
            logger.info('Updating event subscription', { id, input });
            return await prisma.eventSubscription.update({
                where: { id },
                data: {
                    handlerType: input.handlerType,
                    eventTypes: input.eventTypes,
                    targetUrl: input.targetUrl || null,
                    config: input.config || null
                }
            });
        },
        deleteSubscription: async (_, { id }, { prisma }) => {
            logger.info('Deleting event subscription', { id });
            await prisma.eventSubscription.delete({ where: { id } });
            return true;
        },
        replayEvent: async (_, { id }, { prisma, eventBus }) => {
            logger.info('Replaying event', { id });
            const event = await prisma.event.findUnique({ where: { id } });
            if (!event) {
                throw new Error(`Event ${id} not found`);
            }
            // Сбрасываем статус и переобрабатываем
            const updated = await prisma.event.update({
                where: { id },
                data: {
                    status: 'PENDING',
                    processedAt: null
                }
            });
            // Запускаем обработку
            setImmediate(() => eventBus.processEvent(id));
            return updated;
        },
    },
    Event: {
        notifications: async (parent, _, { prisma }) => {
            return await prisma.eventNotification.findMany({
                where: { eventId: parent.id }
            });
        },
    },
};
