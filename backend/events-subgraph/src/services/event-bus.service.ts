// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import type { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('event-bus-service');

export interface PublishEventInput {
  type: string;
  sourceSubgraph: string;
  entityType: string;
  entityId: string;
  orgId?: string;
  actorUserId?: string;
  targetUserIds: string[];
  payload: any;
  metadata?: any;
}

export interface EventSubscriptionHandler {
  type: string; // 'NOTIFICATION', 'ANALYTICS', 'AUDIT', 'WEBHOOK'
  handle: (event: any) => Promise<void>;
}

export class EventBusService {
  private handlers: Map<string, EventSubscriptionHandler> = new Map();
  
  constructor(private readonly prisma: PrismaClient) {}
  
  /**
   * Регистрация обработчика событий
   */
  registerHandler(handler: EventSubscriptionHandler) {
    this.handlers.set(handler.type, handler);
    logger.info('Handler registered', { type: handler.type });
  }
  
  /**
   * Публикация события
   */
  async publishEvent(input: PublishEventInput): Promise<any> {
    try {
      logger.info('Publishing event', { 
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        targetUserIds: input.targetUserIds
      });
      
      // 1. Сохраняем событие в БД
      const event = await this.prisma.event.create({
        data: {
          type: input.type as any,
          sourceSubgraph: input.sourceSubgraph,
          entityType: input.entityType,
          entityId: input.entityId,
          orgId: input.orgId || null,
          actorUserId: input.actorUserId || null,
          targetUserIds: input.targetUserIds,
          payload: input.payload,
          metadata: input.metadata || null,
          status: 'PENDING'
        }
      });
      
      logger.info('Event created in DB', { eventId: event.id });
      
      // 2. Асинхронная обработка (не блокируем ответ)
      setImmediate(() => this.processEvent(event.id));
      
      return event;
    } catch (error: any) {
      logger.error('Failed to publish event', { 
        error: error.message,
        input 
      });
      throw error;
    }
  }
  
  /**
   * Обработка события
   */
  private async processEvent(eventId: string): Promise<void> {
    try {
      // Обновляем статус → PROCESSING
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: 'PROCESSING' }
      });
      
      const event = await this.prisma.event.findUnique({
        where: { id: eventId }
      });
      
      if (!event) {
        throw new Error(`Event ${eventId} not found`);
      }
      
      logger.info('Processing event', { 
        eventId: event.id,
        type: event.type 
      });
      
      // Находим активные подписки для этого типа события
      const subscriptions = await this.prisma.eventSubscription.findMany({
        where: {
          isActive: true,
          eventTypes: {
            has: event.type
          }
        }
      });
      
      logger.info('Found subscriptions', { 
        eventId: event.id,
        count: subscriptions.length,
        handlers: subscriptions.map((s: { handlerType: string }) => s.handlerType)
      });
      
      // Отправляем событие каждому подписчику
      const results = await Promise.allSettled(
        subscriptions.map((sub: any) => this.routeToHandler(sub, event))
      );
      
      // Проверяем результаты
      const failed = results.filter((r: PromiseSettledResult<void>) => r.status === 'rejected');
      
      if (failed.length === 0) {
        // Все обработчики успешны
        await this.prisma.event.update({
          where: { id: eventId },
          data: { 
            status: 'PROCESSED',
            processedAt: new Date()
          }
        });
        
        logger.info('Event processed successfully', { eventId });
      } else {
        // Есть ошибки
        await this.prisma.event.update({
          where: { id: eventId },
          data: { 
            status: 'FAILED',
            processedAt: new Date(),
            metadata: {
              ...event.metadata as any,
              errors: failed.map((f: PromiseRejectedResult) => f.reason?.message)
            }
          }
        });
        
        logger.error('Event processing failed', { 
          eventId,
          failedCount: failed.length,
          errors: failed.map((f: PromiseRejectedResult) => f.reason?.message)
        });
      }
    } catch (error: any) {
      logger.error('Failed to process event', { 
        eventId,
        error: error.message 
      });
      
      await this.prisma.event.update({
        where: { id: eventId },
        data: { 
          status: 'FAILED',
          processedAt: new Date()
        }
      });
    }
  }
  
  /**
   * Маршрутизация события к обработчику
   */
  private async routeToHandler(subscription: any, event: any): Promise<void> {
    const handler = this.handlers.get(subscription.handlerType);
    
    if (!handler) {
      logger.warn('No handler registered', { 
        handlerType: subscription.handlerType 
      });
      return;
    }
    
    logger.info('Routing event to handler', { 
      eventId: event.id,
      handlerType: subscription.handlerType 
    });
    
    await handler.handle(event);
  }
  
  /**
   * Получить события с фильтрацией
   */
  async getEvents(params: {
    type?: string;
    entityType?: string;
    entityId?: string;
    orgId?: string;
    userId?: string;
    status?: string;
    first?: number;
    after?: string;
  }): Promise<any> {
    const first = params.first || 10;
    const skip = params.after ? 1 : 0;
    const cursor = params.after ? { id: params.after } : undefined;
    
    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.orgId) where.orgId = params.orgId;
    if (params.status) where.status = params.status;
    if (params.userId) {
      where.OR = [
        { actorUserId: params.userId },
        { targetUserIds: { has: params.userId } }
      ];
    }
    
    const events = await this.prisma.event.findMany({
      where,
      take: first + 1,
      skip,
      cursor,
      orderBy: { createdAt: 'desc' }
    });
    
    const hasNextPage = events.length > first;
    const edges = hasNextPage ? events.slice(0, -1) : events;
    const totalCount = await this.prisma.event.count({ where });
    
    return {
      edges: edges.map((event: any) => ({
        node: event,
        cursor: event.id
      })),
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!params.after,
        startCursor: edges[0]?.id,
        endCursor: edges[edges.length - 1]?.id,
        totalCount
      }
    };
  }
  
  /**
   * Статистика событий
   */
  async getStats(params: {
    from?: Date;
    to?: Date;
    orgId?: string;
  }): Promise<any> {
    const where: any = {};
    if (params.orgId) where.orgId = params.orgId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }
    
    const totalEvents = await this.prisma.event.count({ where });
    const processedEvents = await this.prisma.event.count({ 
      where: { ...where, status: 'PROCESSED' } 
    });
    const failedEvents = await this.prisma.event.count({ 
      where: { ...where, status: 'FAILED' } 
    });
    
    // Группировка по типам
    const eventsByType = await this.prisma.event.groupBy({
      by: ['type'],
      where,
      _count: true
    });
    
    return {
      totalEvents,
      processedEvents,
      failedEvents,
      eventsByType: eventsByType.map((e: { type: string; _count: number }) => ({
        type: e.type,
        count: e._count
      }))
    };
  }
}

