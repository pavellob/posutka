import type { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';
import type { EventBusService } from '../services/event-bus.service.js';

const logger = createGraphQLLogger('events-resolvers');

interface Context {
  prisma: PrismaClient;
  eventBus: EventBusService;
}

export const resolvers = {
  Query: {
    event: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
      return await prisma.event.findUnique({ where: { id } });
    },
    
    events: async (_: unknown, params: any, { eventBus }: Context) => {
      return await eventBus.getEvents(params);
    },
    
    eventStats: async (_: unknown, params: any, { eventBus }: Context) => {
      return await eventBus.getStats(params);
    },
    
    subscription: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
      return await prisma.eventSubscription.findUnique({ where: { id } });
    },
    
    subscriptions: async (_: unknown, params: any, { prisma }: Context) => {
      const where: any = {};
      if (params.handlerType) where.handlerType = params.handlerType;
      if (params.isActive !== undefined) where.isActive = params.isActive;
      
      return await prisma.eventSubscription.findMany({ where });
    },
  },
  
  Mutation: {
    publishEvent: async (_: unknown, { input }: { input: any }, { eventBus }: Context) => {
      logger.info('Publishing event via GraphQL', { input });
      return await eventBus.publishEvent(input);
    },
    
    createSubscription: async (_: unknown, { input }: { input: any }, { prisma }: Context) => {
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
    
    updateSubscription: async (_: unknown, { id, input }: { id: string; input: any }, { prisma }: Context) => {
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
    
    deleteSubscription: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
      logger.info('Deleting event subscription', { id });
      
      await prisma.eventSubscription.delete({ where: { id } });
      return true;
    },
    
    replayEvent: async (_: unknown, { id }: { id: string }, { prisma, eventBus }: Context) => {
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
      setImmediate(() => (eventBus as any).processEvent(id));
      
      return updated;
    },
  },
  
  Event: {
    notifications: async (parent: any, _: unknown, { prisma }: Context) => {
      return await prisma.eventNotification.findMany({
        where: { eventId: parent.id }
      });
    },
  },
};

