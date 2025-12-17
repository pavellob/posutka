import { createGraphQLLogger } from '@repo/shared-logger';
const logger = createGraphQLLogger('event-bus-service');
export class EventBusService {
    prisma;
    handlers = new Map();
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Регистрация обработчика событий
     */
    registerHandler(handler) {
        this.handlers.set(handler.type, handler);
        logger.info('Handler registered', { type: handler.type });
    }
    /**
     * Публикация события
     */
    async publishEvent(input) {
        try {
            logger.info('Publishing event', {
                type: input.type,
                entityType: input.entityType,
                entityId: input.entityId,
                targetUserIds: input.targetUserIds
            });
            // УБРАНА дедупликация - она блокировала нормальные события с данными
            // Проблема дублирования должна решаться на уровне публикации (не публиковать дважды)
            // 1. Сохраняем событие в БД
            const event = await this.prisma.event.create({
                data: {
                    type: input.type,
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
            logger.info('Event created in DB', {
                eventId: event.id,
                type: event.type,
                entityType: event.entityType,
                entityId: event.entityId,
                targetUserIdsCount: input.targetUserIds?.length || 0
            });
            // 2. Асинхронная обработка (не блокируем ответ)
            setImmediate(() => {
                logger.info('Scheduling event processing', { eventId: event.id, type: event.type });
                this.processEvent(event.id).catch((error) => {
                    logger.error('Failed to process event in setImmediate', {
                        eventId: event.id,
                        error: error.message
                    });
                });
            });
            return event;
        }
        catch (error) {
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
    async processEvent(eventId) {
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
            // Также проверяем все подписки для отладки
            const allSubscriptions = await this.prisma.eventSubscription.findMany({
                where: { isActive: true }
            });
            logger.info('Found subscriptions', {
                eventId: event.id,
                eventType: event.type,
                count: subscriptions.length,
                handlers: subscriptions.map((s) => s.handlerType),
                subscriptionIds: subscriptions.map((s) => s.id),
                allActiveSubscriptions: allSubscriptions.map((s) => ({
                    id: s.id,
                    handlerType: s.handlerType,
                    eventTypes: s.eventTypes,
                    hasEventType: s.eventTypes?.includes(event.type)
                }))
            });
            if (subscriptions.length === 0) {
                logger.warn('⚠️ No active subscriptions found for event type', {
                    eventId: event.id,
                    eventType: event.type,
                    allActiveSubscriptionsCount: allSubscriptions.length,
                    allActiveSubscriptions: allSubscriptions.map((s) => ({
                        id: s.id,
                        handlerType: s.handlerType,
                        eventTypesCount: s.eventTypes?.length || 0,
                        hasEventType: s.eventTypes?.includes(event.type)
                    })),
                    hint: 'Check if event type is in subscription eventTypes array and subscription is active'
                });
            }
            // Отправляем событие каждому подписчику
            const results = await Promise.allSettled(subscriptions.map((sub) => this.routeToHandler(sub, event)));
            // Проверяем результаты
            const failed = results.filter((r) => r.status === 'rejected');
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
            }
            else {
                // Есть ошибки
                await this.prisma.event.update({
                    where: { id: eventId },
                    data: {
                        status: 'FAILED',
                        processedAt: new Date(),
                        metadata: {
                            ...event.metadata,
                            errors: failed.map((f) => f.reason?.message)
                        }
                    }
                });
                logger.error('Event processing failed', {
                    eventId,
                    failedCount: failed.length,
                    errors: failed.map((f) => f.reason?.message)
                });
            }
        }
        catch (error) {
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
    async routeToHandler(subscription, event) {
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
    async getEvents(params) {
        const first = params.first || 10;
        const skip = params.after ? 1 : 0;
        const cursor = params.after ? { id: params.after } : undefined;
        const where = {};
        if (params.type)
            where.type = params.type;
        if (params.entityType)
            where.entityType = params.entityType;
        if (params.entityId)
            where.entityId = params.entityId;
        if (params.orgId)
            where.orgId = params.orgId;
        if (params.status)
            where.status = params.status;
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
            edges: edges.map((event) => ({
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
    async getStats(params) {
        const where = {};
        if (params.orgId)
            where.orgId = params.orgId;
        if (params.from || params.to) {
            where.createdAt = {};
            if (params.from)
                where.createdAt.gte = params.from;
            if (params.to)
                where.createdAt.lte = params.to;
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
            eventsByType: eventsByType.map((e) => ({
                type: e.type,
                count: e._count
            }))
        };
    }
}
