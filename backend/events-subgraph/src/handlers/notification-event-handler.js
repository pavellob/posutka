import { createGraphQLLogger } from '@repo/shared-logger';
import { createNotificationsGrpcClient, EventType as NotificationEventType, NotificationChannel, Priority as NotificationPriority } from '@repo/grpc-sdk';
import { TemplateRenderer } from '../utils/template-renderer.js';
const logger = createGraphQLLogger('notification-event-handler');
/**
 * Handler для создания уведомлений из событий.
 * Создает Notification записи и отправляет их через notifications-subgraph.
 */
export class NotificationEventHandler {
    prisma;
    bookingsDL;
    notificationsClient = null;
    eventBusService = null;
    constructor(prisma, bookingsDL, eventBusService) {
        this.prisma = prisma;
        this.bookingsDL = bookingsDL;
        this.eventBusService = eventBusService;
        // Инициализируем gRPC клиент для notifications-subgraph
        const grpcHost = process.env.NOTIFICATIONS_GRPC_HOST || 'localhost';
        const grpcPort = parseInt(process.env.NOTIFICATIONS_GRPC_PORT || '4111');
        this.notificationsClient = createNotificationsGrpcClient({
            host: grpcHost,
            port: grpcPort,
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 10000,
        });
        // Подключаемся асинхронно (не блокируем старт)
        this.notificationsClient.connect().catch((error) => {
            logger.warn('Failed to connect to notifications-subgraph gRPC', { error });
        });
    }
    async handle(event) {
        try {
            logger.info('📨 Creating notifications for event', {
                eventId: event.id,
                type: event.type,
                targetUserIds: event.targetUserIds,
                targetUserIdsCount: event.targetUserIds?.length || 0,
                entityType: event.entityType,
                entityId: event.entityId,
                orgId: event.orgId
            });
            // Специальное логирование для BOOKING_CREATED
            if (event.type === 'BOOKING_CREATED') {
                logger.info('🔔 BOOKING_CREATED event received in notification handler', {
                    eventId: event.id,
                    bookingId: event.payload?.bookingId,
                    guestName: event.payload?.guestName,
                    guestEmail: event.payload?.guestEmail,
                    targetUserIds: event.targetUserIds,
                    targetUserIdsCount: event.targetUserIds?.length || 0,
                    payloadKeys: Object.keys(event.payload || {}),
                    hasCheckIn: !!event.payload?.checkIn,
                    hasCheckOut: !!event.payload?.checkOut,
                    hasLockCode: !!event.payload?.lockCode,
                    lockCode: event.payload?.lockCode,
                    fullPayload: JSON.stringify(event.payload, null, 2),
                });
            }
            // Специальное логирование для CLEANING_AVAILABLE - проверяем наличие сложности и стоимости
            if (event.type === 'CLEANING_AVAILABLE') {
                logger.info('🔔 CLEANING_AVAILABLE payload check', {
                    eventId: event.id,
                    cleaningId: event.payload?.cleaningId,
                    hasCleaningDifficulty: event.payload?.cleaningDifficulty !== undefined && event.payload?.cleaningDifficulty !== null,
                    cleaningDifficulty: event.payload?.cleaningDifficulty,
                    hasPriceAmount: event.payload?.priceAmount !== undefined && event.payload?.priceAmount !== null,
                    priceAmount: event.payload?.priceAmount,
                    hasPriceCurrency: event.payload?.priceCurrency !== undefined && event.payload?.priceCurrency !== null,
                    priceCurrency: event.payload?.priceCurrency,
                    payloadKeys: Object.keys(event.payload || {}),
                    fullPayload: JSON.stringify(event.payload, null, 2),
                });
            }
            // Специальное логирование для CLEANING_AVAILABLE
            if (event.type === 'CLEANING_AVAILABLE') {
                logger.info('🔔 CLEANING_AVAILABLE event received in notification handler', {
                    eventId: event.id,
                    cleaningId: event.payload?.cleaningId,
                    targetUserIds: event.targetUserIds,
                    targetUserIdsCount: event.targetUserIds?.length || 0,
                    payloadKeys: Object.keys(event.payload || {}),
                    hasUnitAddress: !!event.payload?.unitAddress,
                    hasUnitGrade: event.payload?.unitGrade !== undefined,
                    unitGrade: event.payload?.unitGrade,
                    hasCleaningDifficulty: !!event.payload?.cleaningDifficulty,
                    cleaningDifficulty: event.payload?.cleaningDifficulty,
                    hasPriceAmount: event.payload?.priceAmount !== undefined,
                    priceAmount: event.payload?.priceAmount,
                    hasPriceCurrency: !!event.payload?.priceCurrency,
                    priceCurrency: event.payload?.priceCurrency,
                    fullPayload: JSON.stringify(event.payload, null, 2)
                });
            }
            // Специальная обработка: CLEANING_DIFFICULTY_SET → публикуем CLEANING_READY_FOR_REVIEW
            if (event.type === 'CLEANING_DIFFICULTY_SET' && this.eventBusService) {
                try {
                    const payload = event.payload;
                    logger.info('🔄 Processing CLEANING_DIFFICULTY_SET event, will publish CLEANING_READY_FOR_REVIEW', {
                        eventId: event.id,
                        cleaningId: payload.cleaningId,
                        targetUserIds: event.targetUserIds,
                        targetUserIdsCount: event.targetUserIds?.length || 0,
                        hasEventBusService: !!this.eventBusService
                    });
                    if (!event.targetUserIds || event.targetUserIds.length === 0) {
                        logger.warn('⚠️ No targetUserIds in CLEANING_DIFFICULTY_SET event, cannot publish CLEANING_READY_FOR_REVIEW', {
                            eventId: event.id,
                            cleaningId: payload.cleaningId
                        });
                    }
                    else {
                        await this.eventBusService.publishEvent({
                            type: 'CLEANING_READY_FOR_REVIEW',
                            sourceSubgraph: 'events-subgraph',
                            entityType: 'Cleaning',
                            entityId: payload.cleaningId,
                            orgId: event.orgId,
                            targetUserIds: event.targetUserIds,
                            payload: {
                                cleaningId: payload.cleaningId,
                                cleanerName: payload.cleanerName,
                                unitName: payload.unitName,
                                unitAddress: payload.unitAddress,
                                scheduledAt: payload.scheduledAt,
                                startedAt: payload.startedAt,
                                notes: payload.notes,
                                difficulty: payload.difficulty,
                                priceAmount: payload.priceAmount,
                                priceCurrency: payload.priceCurrency
                            }
                        });
                        logger.info('✅ CLEANING_READY_FOR_REVIEW event published from CLEANING_DIFFICULTY_SET', {
                            cleaningId: payload.cleaningId,
                            targetUserIds: event.targetUserIds
                        });
                    }
                }
                catch (error) {
                    logger.error('❌ Failed to publish CLEANING_READY_FOR_REVIEW from CLEANING_DIFFICULTY_SET', {
                        error: error.message,
                        stack: error.stack,
                        eventId: event.id
                    });
                    // Не прерываем обработку, продолжаем создавать уведомления для CLEANING_DIFFICULTY_SET
                }
            }
            if (!event.targetUserIds || event.targetUserIds.length === 0) {
                logger.warn('⚠️ No target user IDs in event', { eventId: event.id });
                return;
            }
            // Для каждого затронутого пользователя
            let createdCount = 0;
            let skippedCount = 0;
            for (const userId of event.targetUserIds || []) {
                try {
                    const created = await this.createNotificationForUser(event, userId);
                    if (created) {
                        createdCount++;
                    }
                    else {
                        skippedCount++;
                    }
                }
                catch (error) {
                    logger.error('❌ Failed to create notification for user', {
                        userId,
                        error: error.message
                    });
                }
            }
            logger.info('✅ Notifications processing completed', {
                eventId: event.id,
                created: createdCount,
                skipped: skippedCount,
                total: event.targetUserIds.length
            });
        }
        catch (error) {
            logger.error('❌ Failed to create notifications', {
                eventId: event.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    async createNotificationForUser(event, userId) {
        try {
            logger.info('🔍 Processing notification for user', { userId, eventType: event.type });
            // Загружаем настройки
            let settings = await this.prisma.userNotificationSettings.findUnique({
                where: { userId }
            });
            // Если настроек нет, создаем настройки по умолчанию
            // Особенно важно для ежедневных уведомлений, которые должны работать автоматически
            if (!settings) {
                logger.info('No notification settings found for user, creating default settings', { userId });
                settings = await this.prisma.userNotificationSettings.create({
                    data: {
                        userId,
                        enabled: true,
                        enabledChannels: ['TELEGRAM', 'WEBSOCKET'],
                        subscribedEvents: [],
                    },
                });
                logger.info('✅ Default notification settings created for user', { userId });
            }
            logger.info('📋 User settings found', {
                userId,
                enabled: settings.enabled,
                subscribedEvents: settings.subscribedEvents,
                enabledChannels: settings.enabledChannels,
                hasTelegramChatId: !!settings.telegramChatId
            });
            if (!settings.enabled) {
                logger.warn('⚠️ Notifications disabled for user', { userId });
                return false;
            }
            if (!settings.subscribedEvents || !Array.isArray(settings.subscribedEvents)) {
                logger.warn('⚠️ No subscribed events array for user', { userId });
                return false;
            }
            // Автоподписка на важные события уборок
            if (event.type === 'CLEANING_AVAILABLE' && !settings.subscribedEvents.includes('CLEANING_AVAILABLE')) {
                const updatedEvents = [...settings.subscribedEvents, 'CLEANING_AVAILABLE'];
                await this.prisma.userNotificationSettings.update({
                    where: { userId },
                    data: { subscribedEvents: updatedEvents },
                });
                settings.subscribedEvents = updatedEvents;
                logger.info('Auto-subscribed user to CLEANING_AVAILABLE', { userId });
            }
            if (event.type === 'CLEANING_READY_FOR_REVIEW' && !settings.subscribedEvents.includes('CLEANING_READY_FOR_REVIEW')) {
                const updatedEvents = [...settings.subscribedEvents, 'CLEANING_READY_FOR_REVIEW'];
                await this.prisma.userNotificationSettings.update({
                    where: { userId },
                    data: { subscribedEvents: updatedEvents },
                });
                settings.subscribedEvents = updatedEvents;
                logger.info('Auto-subscribed user to CLEANING_READY_FOR_REVIEW', { userId });
            }
            if (event.type === 'CLEANING_PRECHECK_COMPLETED' && !settings.subscribedEvents.includes('CLEANING_PRECHECK_COMPLETED')) {
                const updatedEvents = [...settings.subscribedEvents, 'CLEANING_PRECHECK_COMPLETED'];
                await this.prisma.userNotificationSettings.update({
                    where: { userId },
                    data: { subscribedEvents: updatedEvents },
                });
                settings.subscribedEvents = updatedEvents;
                logger.info('Auto-subscribed user to CLEANING_PRECHECK_COMPLETED', { userId });
            }
            if (event.type === 'CLEANING_STARTED' && !settings.subscribedEvents.includes('CLEANING_STARTED')) {
                const updatedEvents = [...settings.subscribedEvents, 'CLEANING_STARTED'];
                await this.prisma.userNotificationSettings.update({
                    where: { userId },
                    data: { subscribedEvents: updatedEvents },
                });
                settings.subscribedEvents = updatedEvents;
                logger.info('Auto-subscribed user to CLEANING_STARTED', { userId });
            }
            if (event.type === 'CLEANING_COMPLETED' && !settings.subscribedEvents.includes('CLEANING_COMPLETED')) {
                const updatedEvents = [...settings.subscribedEvents, 'CLEANING_COMPLETED'];
                await this.prisma.userNotificationSettings.update({
                    where: { userId },
                    data: { subscribedEvents: updatedEvents },
                });
                settings.subscribedEvents = updatedEvents;
                logger.info('Auto-subscribed user to CLEANING_COMPLETED', { userId });
            }
            // Автоподписка на события бронирований
            if (event.type === 'BOOKING_CREATED' && !settings.subscribedEvents.includes('BOOKING_CREATED')) {
                const updatedEvents = [...settings.subscribedEvents, 'BOOKING_CREATED'];
                await this.prisma.userNotificationSettings.update({
                    where: { userId },
                    data: { subscribedEvents: updatedEvents },
                });
                settings.subscribedEvents = updatedEvents;
                logger.info('Auto-subscribed user to BOOKING_CREATED', { userId });
            }
            // Автоподписка на события ремонта
            if (event.type === 'REPAIR_ASSIGNED' && !settings.subscribedEvents.includes('REPAIR_ASSIGNED')) {
                const updatedEvents = [...settings.subscribedEvents, 'REPAIR_ASSIGNED'];
                await this.prisma.userNotificationSettings.update({
                    where: { userId },
                    data: { subscribedEvents: updatedEvents },
                });
                settings.subscribedEvents = updatedEvents;
                logger.info('Auto-subscribed user to REPAIR_ASSIGNED', { userId });
            }
            if (event.type === 'REPAIR_INSPECTION_COMPLETED' && !settings.subscribedEvents.includes('REPAIR_INSPECTION_COMPLETED')) {
                const updatedEvents = [...settings.subscribedEvents, 'REPAIR_INSPECTION_COMPLETED'];
                await this.prisma.userNotificationSettings.update({
                    where: { userId },
                    data: { subscribedEvents: updatedEvents },
                });
                settings.subscribedEvents = updatedEvents;
                logger.info('Auto-subscribed user to REPAIR_INSPECTION_COMPLETED', { userId });
            }
            if (event.type === 'REPAIR_STARTED' && !settings.subscribedEvents.includes('REPAIR_STARTED')) {
                const updatedEvents = [...settings.subscribedEvents, 'REPAIR_STARTED'];
                await this.prisma.userNotificationSettings.update({
                    where: { userId },
                    data: { subscribedEvents: updatedEvents },
                });
                settings.subscribedEvents = updatedEvents;
                logger.info('Auto-subscribed user to REPAIR_STARTED', { userId });
            }
            if (event.type === 'REPAIR_COMPLETED' && !settings.subscribedEvents.includes('REPAIR_COMPLETED')) {
                const updatedEvents = [...settings.subscribedEvents, 'REPAIR_COMPLETED'];
                await this.prisma.userNotificationSettings.update({
                    where: { userId },
                    data: { subscribedEvents: updatedEvents },
                });
                settings.subscribedEvents = updatedEvents;
                logger.info('Auto-subscribed user to REPAIR_COMPLETED', { userId });
            }
            // Автоподписка на TASK_CREATED для ежедневных уведомлений
            // Важно: делаем это ДО проверки подписки, чтобы пользователь автоматически получал ежедневные уведомления
            if (event.type === 'TASK_CREATED' && event.payload?.taskType) {
                const taskType = event.payload.taskType;
                if ((taskType === 'DAILY_CLEANING_NOTIFICATION' || taskType === 'DAILY_REPAIR_NOTIFICATION')
                    && !settings.subscribedEvents.includes('TASK_CREATED')) {
                    const updatedEvents = [...settings.subscribedEvents, 'TASK_CREATED'];
                    await this.prisma.userNotificationSettings.update({
                        where: { userId },
                        data: { subscribedEvents: updatedEvents },
                    });
                    settings.subscribedEvents = updatedEvents;
                    logger.info('✅ Auto-subscribed user to TASK_CREATED for daily notifications', {
                        userId,
                        taskType,
                        previousEvents: settings.subscribedEvents.length,
                        newEvents: updatedEvents.length
                    });
                }
            }
            // Проверяем подписку на событие
            // Для CLEANING_AVAILABLE, CLEANING_READY_FOR_REVIEW, CLEANING_PRECHECK_COMPLETED, CLEANING_STARTED, CLEANING_COMPLETED уже сделана автоподписка выше
            if (!settings.subscribedEvents.includes(event.type)) {
                logger.warn('⚠️ User not subscribed to event type', {
                    userId,
                    eventType: event.type,
                    userSubscribedEvents: settings.subscribedEvents,
                    hint: 'User needs to subscribe to this event type via UI'
                });
                return false;
            }
            logger.info('✅ User is subscribed to event type', {
                userId,
                eventType: event.type
            });
            // Защита от дублирования: проверяем, не создано ли уже уведомление для этого события и пользователя
            // Делаем это ПОСЛЕ проверки подписки, чтобы не блокировать уведомления для пользователей, которые только что подписались
            logger.info('🔍 Checking for duplicate notification', {
                userId,
                eventType: event.type,
                eventId: event.id
            });
            const existingNotification = await this.prisma.notification.findFirst({
                where: {
                    userId,
                    eventType: event.type,
                    eventLinks: {
                        some: {
                            eventId: event.id
                        }
                    }
                }
            });
            if (existingNotification) {
                logger.warn('⚠️ Notification already exists for this event and user, skipping', {
                    userId,
                    eventType: event.type,
                    eventId: event.id,
                    existingNotificationId: existingNotification.id,
                    existingNotificationCreatedAt: existingNotification.createdAt
                });
                return false;
            }
            logger.info('✅ No duplicate notification found, proceeding with creation', {
                userId,
                eventType: event.type,
                eventId: event.id
            });
            // Рендерим сообщение
            const rendered = await this.renderNotification(event);
            // Если рендеринг вернул null, пропускаем создание уведомления
            if (!rendered) {
                logger.info('Notification rendering returned null, skipping notification creation', {
                    eventType: event.type,
                    userId,
                });
                return false;
            }
            const { title, message, actionUrl, actionButtons } = rendered;
            logger.info('Rendered notification', {
                eventType: event.type,
                hasActionButtons: !!actionButtons,
                actionButtonsCount: actionButtons?.length || 0,
                actionButtons: actionButtons,
                actionUrl: actionUrl,
            });
            // Создаем Notification + Deliveries в одной транзакции
            // Сохраняем actionButtons в metadata для последующего использования
            const metadataWithButtons = {
                ...event.payload,
                ...(actionButtons && actionButtons.length > 0 ? { actionButtons } : {})
            };
            const metadataString = JSON.stringify(metadataWithButtons);
            logger.info('Creating notification with metadata', {
                eventType: event.type,
                hasActionButtons: !!actionButtons,
                actionButtonsCount: actionButtons?.length || 0,
                metadataKeys: Object.keys(metadataWithButtons),
                metadataString: metadataString.substring(0, 200), // Первые 200 символов для проверки
            });
            const notification = await this.prisma.notification.create({
                data: {
                    userId,
                    orgId: event.orgId || null,
                    eventType: event.type,
                    title,
                    message,
                    actionUrl: actionUrl || (actionButtons && actionButtons.length > 0 ? actionButtons[0].url : null),
                    actionText: actionButtons && actionButtons.length > 0 ? actionButtons[0].text : 'Открыть',
                    priority: this.determinePriority(event.type),
                    status: 'PENDING',
                    metadata: metadataString,
                    // Создаем deliveries сразу
                    deliveryStatuses: {
                        create: this.createDeliveries(settings, userId)
                    },
                    // Создаем связь с событием сразу
                    eventLinks: {
                        create: {
                            eventId: event.id
                        }
                    }
                },
                include: {
                    deliveryStatuses: true,
                    eventLinks: true
                }
            });
            logger.info('✅ Notification created with deliveries and event link', {
                notificationId: notification.id,
                userId,
                eventType: event.type,
                deliveriesCount: notification.deliveryStatuses?.length || 0,
                eventLinksCount: notification.eventLinks?.length || 0
            });
            // Отправляем уведомление через notifications-subgraph gRPC
            // notifications-subgraph создаст свое уведомление и отправит через провайдеры
            await this.sendNotificationToProviders(event, notification, settings, userId);
            return true;
        }
        catch (error) {
            logger.error('❌ Failed to create notification for user', {
                userId,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }
    /**
     * Отправить уведомление через notifications-subgraph gRPC
     */
    async sendNotificationToProviders(event, notification, settings, userId) {
        if (!this.notificationsClient) {
            logger.warn('Notifications gRPC client not initialized');
            return;
        }
        try {
            // Маппинг типов событий из events в notifications
            const eventTypeMap = {
                // Booking events
                'BOOKING_CREATED': NotificationEventType.EVENT_TYPE_BOOKING_CREATED,
                'BOOKING_CONFIRMED': NotificationEventType.EVENT_TYPE_BOOKING_CONFIRMED,
                'BOOKING_CANCELLED': NotificationEventType.EVENT_TYPE_BOOKING_CANCELLED,
                'BOOKING_CHECKIN': NotificationEventType.EVENT_TYPE_BOOKING_CHECKIN,
                'BOOKING_CHECKOUT': NotificationEventType.EVENT_TYPE_BOOKING_CHECKOUT,
                // Cleaning events
                'CLEANING_AVAILABLE': NotificationEventType.EVENT_TYPE_CLEANING_AVAILABLE,
                'CLEANING_ASSIGNED': NotificationEventType.EVENT_TYPE_CLEANING_ASSIGNED,
                'CLEANING_STARTED': NotificationEventType.EVENT_TYPE_CLEANING_STARTED,
                'CLEANING_COMPLETED': NotificationEventType.EVENT_TYPE_CLEANING_COMPLETED,
                'CLEANING_READY_FOR_REVIEW': NotificationEventType.EVENT_TYPE_CLEANING_READY_FOR_REVIEW,
                'CLEANING_CANCELLED': NotificationEventType.EVENT_TYPE_CLEANING_CANCELLED,
                'CLEANING_PRECHECK_COMPLETED': NotificationEventType.EVENT_TYPE_CLEANING_PRECHECK_COMPLETED,
                'CLEANING_DIFFICULTY_SET': NotificationEventType.EVENT_TYPE_CLEANING_DIFFICULTY_SET ?? 17,
                'CLEANING_APPROVED': NotificationEventType.EVENT_TYPE_CLEANING_APPROVED ?? 18,
                // Repair events
                'REPAIR_CREATED': NotificationEventType.EVENT_TYPE_REPAIR_CREATED ?? 14,
                'REPAIR_ASSIGNED': NotificationEventType.EVENT_TYPE_REPAIR_ASSIGNED ?? 15,
                'REPAIR_INSPECTION_COMPLETED': NotificationEventType.EVENT_TYPE_REPAIR_INSPECTION_COMPLETED ?? 16,
                'REPAIR_STARTED': NotificationEventType.EVENT_TYPE_REPAIR_STARTED ?? 17,
                'REPAIR_COMPLETED': NotificationEventType.EVENT_TYPE_REPAIR_COMPLETED ?? 18,
                'REPAIR_CANCELLED': NotificationEventType.EVENT_TYPE_REPAIR_CANCELLED ?? 19,
                // Task events
                'TASK_CREATED': NotificationEventType.EVENT_TYPE_TASK_CREATED,
                'TASK_ASSIGNED': NotificationEventType.EVENT_TYPE_TASK_ASSIGNED,
                'TASK_STATUS_CHANGED': NotificationEventType.EVENT_TYPE_TASK_STATUS_CHANGED,
                'TASK_COMPLETED': NotificationEventType.EVENT_TYPE_TASK_COMPLETED,
                // Payment events
                'PAYMENT_RECEIVED': NotificationEventType.EVENT_TYPE_PAYMENT_RECEIVED,
                'PAYMENT_FAILED': NotificationEventType.EVENT_TYPE_PAYMENT_FAILED,
                'INVOICE_CREATED': NotificationEventType.EVENT_TYPE_INVOICE_CREATED,
                'INVOICE_OVERDUE': NotificationEventType.EVENT_TYPE_INVOICE_OVERDUE,
                // System events
                'USER_REGISTERED': NotificationEventType.EVENT_TYPE_USER_REGISTERED,
                'USER_LOGIN': NotificationEventType.EVENT_TYPE_USER_LOGIN,
                'SYSTEM_ALERT': NotificationEventType.EVENT_TYPE_SYSTEM_ALERT,
            };
            // Маппинг приоритетов
            const priorityMap = {
                'LOW': NotificationPriority.PRIORITY_LOW,
                'NORMAL': NotificationPriority.PRIORITY_NORMAL,
                'HIGH': NotificationPriority.PRIORITY_HIGH,
                'URGENT': NotificationPriority.PRIORITY_URGENT,
            };
            // Маппинг каналов
            // Важно: notifications-subgraph сам найдет telegramChatId по userId, поэтому добавляем TELEGRAM
            // если он включен в enabledChannels, даже если telegramChatId еще не установлен
            const channels = [];
            if (settings.enabledChannels.includes('TELEGRAM')) {
                channels.push(NotificationChannel.CHANNEL_TELEGRAM);
                logger.info('Adding TELEGRAM channel', {
                    userId,
                    hasTelegramChatId: !!settings.telegramChatId,
                    note: settings.telegramChatId ? 'Will use existing chatId' : 'notifications-subgraph will find chatId'
                });
            }
            if (settings.enabledChannels.includes('WEBSOCKET')) {
                channels.push(NotificationChannel.CHANNEL_WEBSOCKET);
            }
            if (channels.length === 0) {
                logger.info('No enabled channels for notification', { userId });
                return;
            }
            const grpcEventType = eventTypeMap[notification.eventType];
            // Пропускаем события, которых нет в маппинге
            if (!grpcEventType) {
                logger.info('⏭️ Skipping notification - event type not mapped', {
                    notificationId: notification.id,
                    eventType: notification.eventType,
                    hint: 'This event type is no longer supported or has been replaced'
                });
                return;
            }
            const grpcPriority = priorityMap[notification.priority] || NotificationPriority.PRIORITY_NORMAL;
            // Извлекаем actionButtons из metadata если они есть
            let parsedMetadata = {};
            let actionButtons = undefined;
            logger.info('Parsing notification metadata', {
                notificationId: notification.id,
                metadata: notification.metadata,
                metadataType: typeof notification.metadata,
            });
            try {
                parsedMetadata = JSON.parse(notification.metadata || '{}');
                actionButtons = parsedMetadata.actionButtons;
                logger.info('Parsed metadata successfully', {
                    notificationId: notification.id,
                    parsedMetadataKeys: Object.keys(parsedMetadata),
                    hasActionButtons: !!parsedMetadata.actionButtons,
                    actionButtonsCount: parsedMetadata.actionButtons?.length || 0,
                    actionButtons: parsedMetadata.actionButtons,
                });
            }
            catch (e) {
                logger.error('Failed to parse metadata', {
                    notificationId: notification.id,
                    error: e instanceof Error ? e.message : String(e),
                    metadata: notification.metadata,
                });
                // metadata уже в виде строки
            }
            logger.info('Extracted actionButtons from notification', {
                notificationId: notification.id,
                hasActionButtons: !!actionButtons,
                actionButtonsCount: actionButtons?.length || 0,
                actionButtons: actionButtons,
                parsedMetadata: parsedMetadata,
            });
            // Для обратной совместимости используем actionUrl/actionText если нет actionButtons
            const hasActionButtons = actionButtons && actionButtons.length > 0;
            logger.info('📤 Sending notification via gRPC', {
                notificationId: notification.id,
                userId,
                eventType: notification.eventType,
                channels: channels.map(c => NotificationChannel[c]),
                hasActionButtons: hasActionButtons,
                actionButtonsCount: actionButtons?.length || 0,
                actionButtons: actionButtons,
            });
            // Формируем параметры для sendNotification
            const sendParams = {
                eventType: grpcEventType,
                orgId: notification.orgId || undefined,
                recipientIds: [userId], // notifications-subgraph сам найдет telegramChatId
                channels,
                priority: grpcPriority,
                title: notification.title,
                message: notification.message,
                metadata: notification.metadata || undefined,
            };
            // Используем actionButtons если есть, иначе actionUrl/actionText для обратной совместимости
            if (hasActionButtons && actionButtons) {
                sendParams.actionButtons = actionButtons.map(btn => ({
                    text: btn.text,
                    url: btn.url,
                    useWebApp: btn.useWebApp ?? false
                }));
            }
            else {
                sendParams.actionUrl = notification.actionUrl || undefined;
                sendParams.actionText = notification.actionText || undefined;
            }
            await this.notificationsClient.sendNotification(sendParams);
            logger.info('✅ Notification sent via gRPC', { notificationId: notification.id });
        }
        catch (error) {
            logger.error('❌ Failed to send notification via gRPC', {
                notificationId: notification.id,
                error: error.message,
            });
            // Не прерываем основной flow - уведомление уже создано в БД
        }
    }
    /**
     * Создать deliveries на основе настроек пользователя
     */
    createDeliveries(settings, userId) {
        const deliveries = [];
        if (settings.enabledChannels.includes('TELEGRAM') && settings.telegramChatId) {
            deliveries.push({
                channel: 'TELEGRAM',
                recipientType: 'TELEGRAM_CHAT_ID',
                recipientId: settings.telegramChatId,
                status: 'PENDING'
            });
        }
        if (settings.enabledChannels.includes('WEBSOCKET')) {
            deliveries.push({
                channel: 'WEBSOCKET',
                recipientType: 'USER_ID',
                recipientId: userId,
                status: 'PENDING'
            });
        }
        return deliveries;
    }
    async renderNotification(event) {
        // Попытаться загрузить шаблон из БД
        const template = await this.getTemplateForEvent(event.type);
        if (template) {
            try {
                const context = {
                    payload: event.payload,
                    event: {
                        type: event.type,
                        orgId: event.orgId,
                        entityId: event.entityId,
                        entityType: event.entityType,
                    }
                };
                logger.info('📝 Rendering notification from template', {
                    eventType: event.type,
                    templateId: template.id,
                    templateName: template.name,
                    hasTitleTemplate: !!template.titleTemplate,
                    hasMessageTemplate: !!template.messageTemplate,
                    payloadKeys: Object.keys(event.payload || {}),
                    contextPayloadKeys: Object.keys(context.payload || {}),
                    payloadData: event.type === 'CLEANING_ASSIGNED' ? {
                        hasUnitGrade: event.payload?.unitGrade !== undefined && event.payload?.unitGrade !== null,
                        unitGrade: event.payload?.unitGrade,
                        hasCleaningDifficulty: !!event.payload?.cleaningDifficulty,
                        cleaningDifficulty: event.payload?.cleaningDifficulty,
                        hasPriceAmount: event.payload?.priceAmount !== undefined && event.payload?.priceAmount !== null,
                        priceAmount: event.payload?.priceAmount,
                        hasPriceCurrency: !!event.payload?.priceCurrency,
                        priceCurrency: event.payload?.priceCurrency,
                        requiresLinenChange: event.payload?.requiresLinenChange,
                        fullPayload: JSON.stringify(event.payload, null, 2),
                    } : undefined,
                });
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const useWebApp = process.env.TELEGRAM_USE_MINIAPP === 'true';
                const rendered = {
                    title: TemplateRenderer.render(template.titleTemplate, context),
                    message: TemplateRenderer.render(template.messageTemplate, context),
                    actionUrl: this.getActionUrl(event),
                    actionButtons: this.getActionButtons(event, useWebApp),
                };
                logger.info('✅ Rendered notification from template successfully', {
                    eventType: event.type,
                    templateId: template.id,
                    templateName: template.name,
                    renderedTitleLength: rendered.title.length,
                    renderedMessageLength: rendered.message.length,
                    renderedTitle: rendered.title.substring(0, 100),
                    renderedMessagePreview: rendered.message.substring(0, 200),
                });
                return rendered;
            }
            catch (error) {
                logger.error('❌ Failed to render template, falling back to default', {
                    eventType: event.type,
                    templateId: template.id,
                    templateName: template.name,
                    error: error.message,
                    stack: error.stack,
                });
                // Fallback на захардкоженный шаблон
            }
        }
        else {
            logger.info('⚠️ No template found for event type, using fallback', {
                eventType: event.type,
            });
        }
        // Fallback на захардкоженные шаблоны
        return await this.renderNotificationFallback(event);
    }
    /**
     * Загружает шаблон для события из БД
     */
    async getTemplateForEvent(eventType) {
        try {
            const template = await this.prisma.notificationTemplate.findFirst({
                where: {
                    eventType: eventType,
                },
                orderBy: { updatedAt: 'desc' }
            });
            if (template) {
                logger.info('✅ Template found for event type', {
                    eventType,
                    templateId: template.id,
                    templateName: template.name,
                    hasTitleTemplate: !!template.titleTemplate,
                    hasMessageTemplate: !!template.messageTemplate,
                });
            }
            else {
                logger.info('⚠️ No template found for event type', {
                    eventType,
                });
            }
            return template;
        }
        catch (error) {
            logger.error('❌ Failed to load notification template', {
                eventType,
                error: error.message,
                stack: error.stack,
            });
            return null;
        }
    }
    /**
     * Получает URL для действия
     */
    getActionUrl(event) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const payload = event.payload;
        if (payload.cleaningId) {
            return `${frontendUrl}/cleanings/${payload.cleaningId}`;
        }
        if (payload.repairId) {
            return `${frontendUrl}/repairs/${payload.repairId}`;
        }
        if (payload.bookingId) {
            return `${frontendUrl}/bookings/${payload.bookingId}`;
        }
        if (payload.taskId) {
            return `${frontendUrl}/tasks/${payload.taskId}`;
        }
        if (payload.invoiceId) {
            return `${frontendUrl}/invoices/${payload.invoiceId}`;
        }
        return frontendUrl;
    }
    /**
     * Получает кнопки действий для уведомления
     */
    getActionButtons(event, useWebApp) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const payload = event.payload;
        // Для CLEANING_AVAILABLE - две кнопки
        if (event.type === 'CLEANING_AVAILABLE' && payload.cleaningId) {
            return [
                {
                    text: '✅ Взять уборку',
                    url: `${frontendUrl}/cleanings/${payload.cleaningId}?action=assign`,
                    useWebApp
                },
                {
                    text: '👀 Посмотреть уборку',
                    url: `${frontendUrl}/cleanings/${payload.cleaningId}`,
                    useWebApp
                }
            ];
        }
        return undefined;
    }
    /**
     * Fallback метод с захардкоженными шаблонами (для обратной совместимости)
     */
    async renderNotificationFallback(event) {
        const payload = event.payload;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const useWebApp = process.env.TELEGRAM_USE_MINIAPP === 'true';
        switch (event.type) {
            case 'CLEANING_ASSIGNED':
                // Форматируем дату для красивого отображения
                const assignedScheduledDate = payload.scheduledAt
                    ? new Date(payload.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                let assignedMessage = `Вам назначена уборка в "${payload.unitName || 'квартире'}"`;
                // Метаинформация
                if (payload.scheduledAt) {
                    assignedMessage += `\n\n📅 Дата и время: ${assignedScheduledDate}`;
                }
                if (payload.unitAddress) {
                    assignedMessage += `\n📍 Адрес: ${payload.unitAddress}`;
                }
                if (payload.cleanerName) {
                    assignedMessage += `\n👤 Уборщик: ${payload.cleanerName}`;
                }
                // Информация о размере объекта
                if (payload.unitGrade !== undefined && payload.unitGrade !== null) {
                    const gradeLabels = {
                        0: 'Маленькая комната',
                        1: 'Большая комната',
                        2: 'Студия',
                        3: 'Большая студия',
                        4: 'Однушка',
                        5: 'Большая однушка',
                        6: 'Двушка',
                        7: 'Большая двушка',
                        8: 'Трешка',
                        9: 'Большая трешка',
                        10: '4+ комнат',
                    };
                    const gradeLabel = gradeLabels[payload.unitGrade] || `Размер ${payload.unitGrade}`;
                    assignedMessage += `\n🏠 Размер объекта: ${gradeLabel} (Grade ${payload.unitGrade})`;
                }
                // Информация о сложности уборки
                if (payload.cleaningDifficulty) {
                    const difficultyLabels = {
                        'D0': 'D0 - элементарная',
                        'D1': 'D1 - поддерживающая',
                        'D2': 'D2 - стандартная',
                        'D3': 'D3 - расширенная',
                        'D4': 'D4 - сложная',
                        'D5': 'D5 - капитальная',
                    };
                    const difficultyStr = String(payload.cleaningDifficulty).trim().toUpperCase();
                    const difficultyLabel = difficultyLabels[difficultyStr] || payload.cleaningDifficulty;
                    assignedMessage += `\n📊 Сложность уборки: ${difficultyLabel}`;
                }
                // Информация о стоимости
                if (payload.priceAmount && payload.priceCurrency) {
                    const formattedPrice = new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: payload.priceCurrency || 'RUB',
                        minimumFractionDigits: 0
                    }).format(payload.priceAmount / 100); // Предполагаем, что цена в копейках
                    assignedMessage += `\n💰 Стоимость: ${formattedPrice}`;
                }
                // Информация о смене белья
                if (payload.requiresLinenChange) {
                    assignedMessage += `\n\n⚠️ Требуется смена постельного белья и полотенец`;
                }
                assignedMessage += `\n\n💡 Подготовьтесь к уборке и не забудьте взять все необходимое`;
                return {
                    title: '🧹 Новая уборка назначена!',
                    message: assignedMessage,
                    actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
                };
            case 'CLEANING_AVAILABLE':
                // Форматируем дату для красивого отображения
                const scheduledDate = payload.scheduledAt
                    ? new Date(payload.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                let availableMessage = `Запланирована уборка в квартире "${payload.unitName || 'квартире'}"`;
                // Метаинформация
                if (payload.scheduledAt) {
                    availableMessage += `\n\n📅 Дата и время: ${scheduledDate}`;
                }
                if (payload.unitAddress) {
                    availableMessage += `\n📍 Адрес: ${payload.unitAddress}`;
                }
                // Информация о размере объекта
                if (payload.unitGrade !== undefined && payload.unitGrade !== null) {
                    const gradeLabels = {
                        0: 'Маленькая комната',
                        1: 'Большая комната',
                        2: 'Студия',
                        3: 'Большая студия',
                        4: 'Однушка',
                        5: 'Большая однушка',
                        6: 'Двушка',
                        7: 'Большая двушка',
                        8: 'Трешка',
                        9: 'Большая трешка',
                        10: '4+ комнат',
                    };
                    const gradeLabel = gradeLabels[payload.unitGrade] || `Размер ${payload.unitGrade}`;
                    availableMessage += `\n🏠 Размер объекта: ${gradeLabel} (Grade ${payload.unitGrade})`;
                }
                // Информация о сложности уборки
                if (payload.cleaningDifficulty) {
                    const difficultyLabels = {
                        'D0': 'D0 - элементарная',
                        'D1': 'D1 - поддерживающая',
                        'D2': 'D2 - стандартная',
                        'D3': 'D3 - расширенная',
                        'D4': 'D4 - сложная',
                        'D5': 'D5 - капитальная',
                    };
                    const difficultyStr = String(payload.cleaningDifficulty).trim().toUpperCase();
                    const difficultyLabel = difficultyLabels[difficultyStr] || payload.cleaningDifficulty;
                    availableMessage += `\n📊 Сложность уборки: ${difficultyLabel}`;
                }
                // Информация о стоимости
                if (payload.priceAmount && payload.priceCurrency) {
                    const formattedPrice = new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: payload.priceCurrency || 'RUB',
                        minimumFractionDigits: 0
                    }).format(payload.priceAmount / 100); // Предполагаем, что цена в копейках
                    availableMessage += `\n💰 Стоимость: ${formattedPrice}`;
                }
                // Информация о смене белья
                if (payload.requiresLinenChange) {
                    availableMessage += `\n\n⚠️ Требуется смена постельного белья и полотенец`;
                }
                availableMessage += `\n\n💡 Нажмите кнопку ниже, чтобы взять уборку в работу`;
                // Если уборка доступна (не назначена) - две кнопки: "Взять уборку" и "Посмотреть уборку"
                return {
                    title: '📋 Доступна уборка!',
                    message: availableMessage,
                    actionButtons: [
                        {
                            text: '✅ Взять уборку',
                            url: `${frontendUrl}/cleanings/${payload.cleaningId}?action=assign`,
                            useWebApp
                        },
                        {
                            text: '👀 Посмотреть уборку',
                            url: `${frontendUrl}/cleanings/${payload.cleaningId}`,
                            useWebApp
                        }
                    ]
                };
            case 'CLEANING_STARTED':
                return {
                    title: '▶️ Уборка началась',
                    message: `Уборка в ${payload.unitName || 'квартире'} начата`,
                    actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
                };
            case 'CLEANING_COMPLETED':
                // Форматируем даты
                const completedScheduledDate = payload.scheduledAt
                    ? new Date(payload.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                const completedStartedDate = payload.startedAt
                    ? new Date(payload.startedAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : null;
                const completedFinishedDate = payload.completedAt
                    ? new Date(payload.completedAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                // Вычисляем длительность
                let durationText = '';
                if (payload.startedAt && payload.completedAt) {
                    const start = new Date(payload.startedAt);
                    const end = new Date(payload.completedAt);
                    const durationMs = end.getTime() - start.getTime();
                    const durationMinutes = Math.floor(durationMs / 60000);
                    const hours = Math.floor(durationMinutes / 60);
                    const minutes = durationMinutes % 60;
                    durationText = hours > 0 ? `${hours}ч ${minutes}мин` : `${minutes}мин`;
                }
                let completedMessage = `Уборка в "${payload.unitName || 'квартире'}" успешно завершена`;
                // Метаинформация
                if (payload.cleanerName) {
                    completedMessage += `\n\n👤 Уборщик: ${payload.cleanerName}`;
                }
                if (payload.scheduledAt) {
                    completedMessage += `\n📅 Запланировано: ${completedScheduledDate}`;
                }
                if (payload.startedAt) {
                    completedMessage += `\n▶️ Начато: ${completedStartedDate}`;
                }
                completedMessage += `\n✅ Завершено: ${completedFinishedDate}`;
                if (durationText) {
                    completedMessage += `\n⏱️ Длительность: ${durationText}`;
                }
                if (payload.unitAddress) {
                    completedMessage += `\n📍 Адрес: ${payload.unitAddress}`;
                }
                // Статистика чеклиста
                if (payload.checklistStats) {
                    const { total, completed, incomplete } = payload.checklistStats;
                    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
                    completedMessage += `\n\n📋 Чеклист: ${completed}/${total} выполнено (${completionPercent}%)`;
                    if (incomplete > 0 && payload.checklistStats.incompleteItems && payload.checklistStats.incompleteItems.length > 0) {
                        completedMessage += `\n\n⚠️ Не выполнено (${incomplete}):`;
                        payload.checklistStats.incompleteItems.slice(0, 5).forEach((item, index) => {
                            completedMessage += `\n   ${index + 1}. ${item.title}`;
                        });
                        if (incomplete > 5) {
                            completedMessage += `\n   ... и ещё ${incomplete - 5}`;
                        }
                    }
                    else if (incomplete === 0) {
                        completedMessage += `\n✅ Все пункты выполнены`;
                    }
                }
                // Фото
                if (payload.photoUrls && payload.photoUrls.length > 0) {
                    completedMessage += `\n\n📸 Фотографии (${payload.photoUrls.length}):`;
                    payload.photoUrls.slice(0, 3).forEach((photo, index) => {
                        const caption = photo.caption ? ` - ${photo.caption}` : '';
                        completedMessage += `\n   ${index + 1}. ${photo.url}${caption}`;
                    });
                    if (payload.photoUrls.length > 3) {
                        completedMessage += `\n   ... и ещё ${payload.photoUrls.length - 3}`;
                    }
                }
                completedMessage += `\n\n🎉 Спасибо за качественную работу!`;
                return {
                    title: '✅ Уборка завершена',
                    message: completedMessage,
                    actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
                };
            case 'CLEANING_PRECHECK_COMPLETED':
                // Форматируем дату
                const precheckScheduledDate = payload.scheduledAt
                    ? new Date(payload.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                const precheckSubmittedDate = payload.submittedAt
                    ? new Date(payload.submittedAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                let precheckMessage = `Приёмка уборки в "${payload.unitName || 'квартире'}" завершена`;
                // Метаинформация
                if (payload.cleanerName) {
                    precheckMessage += `\n\n👤 Уборщик: ${payload.cleanerName}`;
                }
                if (payload.scheduledAt) {
                    precheckMessage += `\n📅 Запланировано: ${precheckScheduledDate}`;
                }
                if (payload.unitAddress) {
                    precheckMessage += `\n📍 Адрес: ${payload.unitAddress}`;
                }
                precheckMessage += `\n⏰ Приёмка завершена: ${precheckSubmittedDate}`;
                // Статистика чеклиста
                if (payload.checklistStats) {
                    const { total, completed, incomplete } = payload.checklistStats;
                    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
                    precheckMessage += `\n\n📋 Чеклист: ${completed}/${total} выполнено (${completionPercent}%)`;
                    if (incomplete > 0 && payload.checklistStats.incompleteItems && payload.checklistStats.incompleteItems.length > 0) {
                        precheckMessage += `\n\n⚠️ Не выполнено (${incomplete}):`;
                        payload.checklistStats.incompleteItems.slice(0, 5).forEach((item, index) => {
                            precheckMessage += `\n   ${index + 1}. ${item.title}`;
                        });
                        if (incomplete > 5) {
                            precheckMessage += `\n   ... и ещё ${incomplete - 5}`;
                        }
                    }
                    else if (incomplete === 0) {
                        precheckMessage += `\n✅ Все пункты выполнены`;
                    }
                }
                // Фото
                if (payload.photoUrls && payload.photoUrls.length > 0) {
                    precheckMessage += `\n\n📸 Фотографии (${payload.photoUrls.length}):`;
                    payload.photoUrls.slice(0, 3).forEach((photo, index) => {
                        const caption = photo.caption ? ` - ${photo.caption}` : '';
                        precheckMessage += `\n   ${index + 1}. ${photo.url}${caption}`;
                    });
                    if (payload.photoUrls.length > 3) {
                        precheckMessage += `\n   ... и ещё ${payload.photoUrls.length - 3}`;
                    }
                }
                return {
                    title: '🧾 Приёмка завершена',
                    message: precheckMessage,
                    actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
                };
            case 'CLEANING_READY_FOR_REVIEW':
                // Форматируем дату для красивого отображения
                const reviewScheduledDate = payload.scheduledAt
                    ? new Date(payload.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                let reviewMessage = `Уборка в "${payload.unitName || 'квартире'}" готова к проверке`;
                if (payload.cleanerName) {
                    reviewMessage += `\n\n👤 Уборщик: ${payload.cleanerName}`;
                }
                if (payload.scheduledAt) {
                    reviewMessage += `\n📅 Дата: ${reviewScheduledDate}`;
                }
                if (payload.unitAddress) {
                    reviewMessage += `\n📍 Адрес: ${payload.unitAddress}`;
                }
                // Добавляем сложность уборки
                if (payload.difficulty !== undefined && payload.difficulty !== null) {
                    reviewMessage += `\n📊 Сложность: ${payload.difficulty}/5`;
                }
                // Добавляем стоимость уборки
                if (payload.priceAmount && payload.priceCurrency) {
                    const formattedPrice = new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: payload.priceCurrency || 'RUB',
                        minimumFractionDigits: 0
                    }).format(payload.priceAmount / 100); // Предполагаем, что цена в копейках
                    reviewMessage += `\n💰 Стоимость: ${formattedPrice}`;
                }
                reviewMessage += `\n\n💡 Проверьте качество уборки и подтвердите выполнение`;
                return {
                    title: '✅ Уборка готова к проверке',
                    message: reviewMessage,
                    actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
                };
            case 'CLEANING_DIFFICULTY_SET':
                // Форматируем цену, если она есть
                let priceText = '';
                if (payload.priceAmount && payload.priceCurrency) {
                    const formattedPrice = new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: payload.priceCurrency || 'RUB',
                        minimumFractionDigits: 0
                    }).format(payload.priceAmount / 100); // Предполагаем, что цена в копейках
                    priceText = `\n💰 Стоимость: ${formattedPrice}`;
                }
                return {
                    title: '📊 Сложность уборки указана',
                    message: `Сложность уборки в "${payload.unitName || 'квартире'}" установлена: ${payload.difficulty || 'N/A'}/5${priceText}`,
                    actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
                };
            case 'CLEANING_APPROVED':
                let approvedMessage = `Уборка в "${payload.unitName || 'квартире'}" одобрена менеджером`;
                if (payload.cleanerName) {
                    approvedMessage += `\n\n👤 Уборщик: ${payload.cleanerName}`;
                }
                if (payload.comment) {
                    approvedMessage += `\n\n💬 Комментарий: ${payload.comment}`;
                }
                approvedMessage += `\n\n✅ Спасибо за качественную работу!`;
                return {
                    title: '✅ Уборка одобрена',
                    message: approvedMessage,
                    actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
                };
            case 'CLEANING_CANCELLED':
                return {
                    title: '❌ Уборка отменена',
                    message: `Уборка в ${payload.unitName || 'квартире'} была отменена`,
                    actionUrl: `${frontendUrl}/cleanings`
                };
            // Booking events
            case 'BOOKING_CREATED':
                // Форматируем даты заезда и выезда
                const checkInDate = payload.checkIn
                    ? new Date(payload.checkIn).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                const checkOutDate = payload.checkOut
                    ? new Date(payload.checkOut).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                // Форматируем только время заезда
                const checkInTime = payload.checkIn
                    ? new Date(payload.checkIn).toLocaleString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указано';
                // Формируем сообщение для гостя
                let bookingMessage = '';
                if (payload.guestName) {
                    bookingMessage += `Уважаемый(ая) ${payload.guestName}!\n\n`;
                }
                else {
                    bookingMessage += `Уважаемый гость!\n\n`;
                }
                bookingMessage += `Ваш заезд:\n`;
                if (payload.unitAddress) {
                    bookingMessage += `📍 Адрес: ${payload.unitAddress}\n`;
                }
                bookingMessage += `📅 Дата и время заезда: ${checkInDate}\n`;
                bookingMessage += `📅 Дата и время выезда: ${checkOutDate}\n`;
                if (payload.lockCode) {
                    bookingMessage += `🔑 Код от замка: ${payload.lockCode}\n`;
                    bookingMessage += `(последние 4 цифры вашего телефона)\n`;
                }
                if (payload.houseRules) {
                    bookingMessage += `\n📋 Правила проживания:\n${payload.houseRules}\n`;
                }
                else {
                    bookingMessage += `\n📋 Пожалуйста, соблюдайте правила проживания в объекте.\n`;
                }
                bookingMessage += `\nЖелаем приятного отдыха! 🏠`;
                return {
                    title: '📅 Бронирование создано',
                    message: bookingMessage,
                    actionUrl: `${frontendUrl}/bookings/${payload.bookingId}`
                };
            case 'BOOKING_CONFIRMED': {
                const guestName = payload.guestName || 'Гость';
                const unitName = payload.unitName || 'квартире';
                const unitAddress = payload.unitAddress;
                const checkInDate = payload.checkIn
                    ? new Date(payload.checkIn).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : '';
                const checkOutDate = payload.checkOut
                    ? new Date(payload.checkOut).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : '';
                const status = payload.status ? `\n📊 Статус: ${payload.status}` : '';
                let message = `Бронирование для "${guestName}" обновлено`;
                if (unitAddress) {
                    message += `\n📍 Адрес: ${unitAddress}`;
                }
                message += `\n🏠 Квартира: ${unitName}`;
                if (checkInDate) {
                    message += `\n📅 Заселение: ${checkInDate}`;
                }
                if (checkOutDate) {
                    message += `\n📅 Выселение: ${checkOutDate}`;
                }
                message += status;
                return {
                    title: '✏️ Бронирование обновлено',
                    message,
                    actionUrl: `${frontendUrl}/bookings/${payload.bookingId}`
                };
            }
            case 'BOOKING_CANCELLED':
                return {
                    title: '❌ Бронирование отменено',
                    message: `Бронирование #${payload.bookingId || 'N/A'} отменено`,
                    actionUrl: `${frontendUrl}/bookings/${payload.bookingId}`
                };
            case 'BOOKING_CHECKIN':
                return {
                    title: '🏠 Гость заселился',
                    message: `Заселение гостя в ${payload.unitName || 'квартире'}`,
                    actionUrl: `${frontendUrl}/bookings/${payload.bookingId}`
                };
            case 'BOOKING_CHECKOUT':
                return {
                    title: '🚪 Гость выселился',
                    message: `Выселение гостя из ${payload.unitName || 'квартиры'}`,
                    actionUrl: `${frontendUrl}/bookings/${payload.bookingId}`
                };
            // Task events
            case 'TASK_CREATED': {
                // Специальная обработка для ежедневных уведомлений
                const taskType = payload.taskType;
                if (taskType === 'DAILY_CLEANING_NOTIFICATION' || taskType === 'DAILY_REPAIR_NOTIFICATION') {
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                    const tasks = payload.tasks || [];
                    logger.info('Processing daily notification task', {
                        taskType,
                        tasksCount: tasks.length,
                        taskId: payload.taskId,
                        targetDate: payload.targetDate,
                    });
                    // Форматируем дату
                    const formattedDate = payload.targetDate
                        ? new Date(payload.targetDate).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })
                        : 'не указана';
                    const isCleaning = taskType === 'DAILY_CLEANING_NOTIFICATION';
                    // Если нет задач, отправляем информационное сообщение
                    if (tasks.length === 0) {
                        logger.info('No tasks found for daily notification, sending informational message', {
                            taskType,
                            taskId: payload.taskId,
                            targetDate: payload.targetDate,
                        });
                        return {
                            title: isCleaning
                                ? `📋 Уборки на ${formattedDate}`
                                : `🔧 Ремонты на ${formattedDate}`,
                            message: `${isCleaning ? '📋' : '🔧'} На ${formattedDate} ${isCleaning ? 'уборок' : 'ремонтов'} не запланировано.`,
                            actionUrl: `${frontendUrl}/tasks`
                        };
                    }
                    // Если есть задачи, формируем список
                    const title = isCleaning
                        ? `📋 Уборки на ${formattedDate}`
                        : `🔧 Ремонты на ${formattedDate}`;
                    let message = `${isCleaning ? '📋' : '🔧'} ${isCleaning ? 'Уборки' : 'Ремонты'} на ${formattedDate}:\n\n`;
                    // Получаем все templateId из задач для предзагрузки шаблонов
                    const templateIds = tasks
                        .filter((t) => t.templateId)
                        .map((t) => t.templateId);
                    // Предзагружаем шаблоны
                    const templatesMap = new Map();
                    if (templateIds.length > 0) {
                        try {
                            const templates = await this.prisma.checklistTemplate.findMany({
                                where: { id: { in: templateIds } },
                            });
                            for (const template of templates) {
                                templatesMap.set(template.id, template.name || 'Без названия');
                            }
                        }
                        catch (error) {
                            logger.warn('Failed to load checklist templates', {
                                error: error instanceof Error ? error.message : String(error),
                                templateIds,
                            });
                        }
                    }
                    for (let index = 0; index < tasks.length; index++) {
                        const task = tasks[index];
                        logger.info('Processing task for notification', {
                            index,
                            taskId: task.cleaningId || task.repairId,
                            unitName: task.unitName,
                            unitAddress: task.unitAddress,
                            scheduledAt: task.scheduledAt,
                            scheduledAtType: typeof task.scheduledAt,
                            executorName: task.executorName,
                            fullTask: task,
                        });
                        const unitName = task.unitName || 'Неизвестная квартира';
                        message += `${index + 1}. ${unitName}\n`;
                        if (task.unitAddress) {
                            message += `📍 Адрес: ${task.unitAddress}\n`;
                        }
                        else {
                            logger.warn('No unitAddress for task', {
                                taskId: task.cleaningId || task.repairId,
                                unitName: task.unitName,
                            });
                        }
                        let time = 'не указано';
                        if (task.scheduledAt) {
                            try {
                                const scheduledDate = new Date(task.scheduledAt);
                                if (!isNaN(scheduledDate.getTime())) {
                                    time = scheduledDate.toLocaleTimeString('ru-RU', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'Europe/Moscow',
                                    });
                                    logger.info('Time formatted successfully', {
                                        taskId: task.cleaningId || task.repairId,
                                        original: task.scheduledAt,
                                        formatted: time,
                                        iso: scheduledDate.toISOString(),
                                    });
                                }
                                else {
                                    logger.warn('Invalid scheduledAt date', {
                                        taskId: task.cleaningId || task.repairId,
                                        scheduledAt: task.scheduledAt,
                                    });
                                }
                            }
                            catch (error) {
                                logger.error('Failed to format time', {
                                    taskId: task.cleaningId || task.repairId,
                                    scheduledAt: task.scheduledAt,
                                    error: error instanceof Error ? error.message : String(error),
                                });
                            }
                        }
                        else {
                            logger.warn('No scheduledAt for task', {
                                taskId: task.cleaningId || task.repairId,
                                unitName: task.unitName,
                            });
                        }
                        message += `📅 Время: ${time}\n`;
                        if (task.executorName) {
                            message += `👤 Исполнитель: ${task.executorName}\n`;
                        }
                        else {
                            logger.warn('No executorName for task', {
                                taskId: task.cleaningId || task.repairId,
                                unitName: task.unitName,
                            });
                        }
                        // Добавляем сложность для уборок
                        if (isCleaning && task.difficulty !== undefined && task.difficulty !== null) {
                            const difficultyText = task.difficulty === 0 ? 'Очень легко' :
                                task.difficulty === 1 ? 'Легко' :
                                    task.difficulty === 2 ? 'Средне' :
                                        task.difficulty === 3 ? 'Сложно' :
                                            task.difficulty === 4 ? 'Очень сложно' :
                                                'Экстремально';
                            message += `⚡ Сложность: D${task.difficulty} (${difficultyText})\n`;
                        }
                        // Добавляем notes, если есть
                        if (task.notes) {
                            message += `📝 Заметки: ${task.notes}\n`;
                        }
                        // Добавляем шаблон чеклиста для уборок
                        if (isCleaning && task.templateId) {
                            const templateName = templatesMap.get(task.templateId) || 'Неизвестный шаблон';
                            message += `📋 Шаблон чеклиста: ${templateName}\n`;
                        }
                        // Добавляем информацию о бронированиях для уборок
                        if (isCleaning && task.scheduledAt && event.orgId) {
                            try {
                                // Получаем unitId - либо из задачи, либо из уборки по cleaningId
                                let unitId = task.unitId;
                                if (!unitId && task.cleaningId) {
                                    const cleaning = await this.prisma.cleaning.findUnique({
                                        where: { id: task.cleaningId },
                                        select: { unitId: true }
                                    });
                                    if (cleaning) {
                                        unitId = cleaning.unitId;
                                    }
                                }
                                if (unitId) {
                                    const { checkoutBooking, checkinBooking } = await this.findAdjacentBookings(unitId, task.scheduledAt, event.orgId);
                                    const bookingInfo = [];
                                    if (checkoutBooking?.checkOut) {
                                        const checkoutDate = this.formatShortDate(checkoutBooking.checkOut);
                                        const checkoutTime = checkoutBooking.departureTime || '';
                                        bookingInfo.push(`Выезд ${checkoutDate}${checkoutTime ? ` ${checkoutTime}` : ''}`);
                                    }
                                    if (checkinBooking?.checkIn) {
                                        const checkinDate = this.formatShortDate(checkinBooking.checkIn);
                                        const checkinTime = checkinBooking.arrivalTime || '';
                                        bookingInfo.push(`Заезд ${checkinDate}${checkinTime ? ` ${checkinTime}` : ''}`);
                                    }
                                    if (bookingInfo.length > 0) {
                                        message += `📅 ${bookingInfo.join(' | ')}\n`;
                                    }
                                }
                                else {
                                    logger.warn('No unitId found for cleaning task', {
                                        cleaningId: task.cleaningId,
                                        hasUnitIdInTask: !!task.unitId,
                                    });
                                }
                            }
                            catch (error) {
                                logger.warn('Failed to get bookings for task', {
                                    cleaningId: task.cleaningId,
                                    unitId: task.unitId,
                                    scheduledAt: task.scheduledAt,
                                    error: error instanceof Error ? error.message : String(error),
                                });
                            }
                        }
                        // Добавляем ссылку на уборку, если это уборка
                        if (isCleaning && task.cleaningId) {
                            message += `🔗 Уборка: ${frontendUrl}/cleanings/${task.cleaningId}\n`;
                        }
                        message += '\n';
                    }
                    return {
                        title,
                        message: message.trim(),
                        actionUrl: `${frontendUrl}/tasks/${payload.taskId}`
                    };
                }
                // Обычная обработка TASK_CREATED
                return {
                    title: '📋 Новая задача',
                    message: `Создана задача: ${payload.taskName || payload.title || 'Без названия'}`,
                    actionUrl: `${frontendUrl}/tasks/${payload.taskId}`
                };
            }
            case 'TASK_ASSIGNED':
                return {
                    title: '👤 Задача назначена',
                    message: `Вам назначена задача: ${payload.taskName || payload.title || 'Без названия'}`,
                    actionUrl: `${frontendUrl}/tasks/${payload.taskId}`
                };
            case 'TASK_STATUS_CHANGED':
                return {
                    title: '🔄 Статус задачи изменен',
                    message: `Задача "${payload.taskName || payload.title || 'Без названия'}" → ${payload.status || 'новый статус'}`,
                    actionUrl: `${frontendUrl}/tasks/${payload.taskId}`
                };
            case 'TASK_COMPLETED':
                return {
                    title: '✅ Задача выполнена',
                    message: `Задача "${payload.taskName || payload.title || 'Без названия'}" выполнена`,
                    actionUrl: `${frontendUrl}/tasks/${payload.taskId}`
                };
            // Payment events
            case 'PAYMENT_RECEIVED':
                return {
                    title: '💰 Платеж получен',
                    message: `Получен платеж ${payload.amount ? `на сумму ${payload.amount}` : ''}${payload.currency ? ` ${payload.currency}` : ''}${payload.bookingId ? `\nБронирование #${payload.bookingId}` : ''}`,
                    actionUrl: payload.bookingId ? `${frontendUrl}/bookings/${payload.bookingId}` : `${frontendUrl}/payments`
                };
            case 'PAYMENT_FAILED':
                return {
                    title: '❌ Платеж не прошел',
                    message: `Платеж ${payload.amount ? `на сумму ${payload.amount}` : ''}${payload.currency ? ` ${payload.currency}` : ''} не удалось провести`,
                    actionUrl: `${frontendUrl}/payments`
                };
            case 'INVOICE_CREATED':
                return {
                    title: '📄 Счет создан',
                    message: `Создан счет ${payload.invoiceNumber || ''}${payload.amount ? `\nСумма: ${payload.amount}${payload.currency ? ` ${payload.currency}` : ''}` : ''}`,
                    actionUrl: `${frontendUrl}/invoices/${payload.invoiceId}`
                };
            case 'INVOICE_OVERDUE':
                return {
                    title: '⚠️ Счет просрочен',
                    message: `Счет ${payload.invoiceNumber || ''} просрочен${payload.amount ? `\nСумма: ${payload.amount}${payload.currency ? ` ${payload.currency}` : ''}` : ''}`,
                    actionUrl: `${frontendUrl}/invoices/${payload.invoiceId}`
                };
            // Repair events
            case 'REPAIR_CREATED':
                const repairCreatedScheduledDate = payload.scheduledAt
                    ? new Date(payload.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                let repairCreatedMessage = `Создан ремонт в "${payload.unitName || 'квартире'}"`;
                if (payload.scheduledAt) {
                    repairCreatedMessage += `\n\n📅 Дата и время: ${repairCreatedScheduledDate}`;
                }
                if (payload.unitAddress) {
                    repairCreatedMessage += `\n📍 Адрес: ${payload.unitAddress}`;
                }
                if (payload.masterName) {
                    repairCreatedMessage += `\n👤 Мастер: ${payload.masterName}`;
                }
                if (payload.notes) {
                    repairCreatedMessage += `\n📝 Примечания: ${payload.notes}`;
                }
                return {
                    title: '🔧 Ремонт создан',
                    message: repairCreatedMessage,
                    actionUrl: `${frontendUrl}/repairs/${payload.repairId}`
                };
            case 'REPAIR_ASSIGNED':
                const repairAssignedScheduledDate = payload.scheduledAt
                    ? new Date(payload.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                let repairAssignedMessage = `Вам назначен ремонт в "${payload.unitName || 'квартире'}"`;
                if (payload.scheduledAt) {
                    repairAssignedMessage += `\n\n📅 Дата и время: ${repairAssignedScheduledDate}`;
                }
                if (payload.unitAddress) {
                    repairAssignedMessage += `\n📍 Адрес: ${payload.unitAddress}`;
                }
                if (payload.masterName) {
                    repairAssignedMessage += `\n👤 Мастер: ${payload.masterName}`;
                }
                if (payload.notes) {
                    repairAssignedMessage += `\n📝 Примечания: ${payload.notes}`;
                }
                repairAssignedMessage += `\n\n💡 Подготовьтесь к ремонту и не забудьте взять все необходимое`;
                return {
                    title: '🔧 Ремонт назначен!',
                    message: repairAssignedMessage,
                    actionUrl: `${frontendUrl}/repairs/${payload.repairId}`
                };
            case 'REPAIR_INSPECTION_COMPLETED':
                const inspectionScheduledDate = payload.scheduledAt
                    ? new Date(payload.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                const inspectionSubmittedDate = payload.submittedAt
                    ? new Date(payload.submittedAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                let inspectionMessage = `Осмотр ремонта в "${payload.unitName || 'квартире'}" завершен`;
                if (payload.masterName) {
                    inspectionMessage += `\n\n👤 Мастер: ${payload.masterName}`;
                }
                if (payload.scheduledAt) {
                    inspectionMessage += `\n📅 Запланировано: ${inspectionScheduledDate}`;
                }
                if (payload.unitAddress) {
                    inspectionMessage += `\n📍 Адрес: ${payload.unitAddress}`;
                }
                inspectionMessage += `\n⏰ Осмотр завершен: ${inspectionSubmittedDate}`;
                // Статистика чеклиста
                if (payload.checklistStats) {
                    const { total, completed, incomplete } = payload.checklistStats;
                    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
                    inspectionMessage += `\n\n📋 Чеклист: ${completed}/${total} выполнено (${completionPercent}%)`;
                    if (incomplete > 0 && payload.checklistStats.incompleteItems && payload.checklistStats.incompleteItems.length > 0) {
                        inspectionMessage += `\n\n⚠️ Не выполнено (${incomplete}):`;
                        payload.checklistStats.incompleteItems.slice(0, 5).forEach((item, index) => {
                            inspectionMessage += `\n   ${index + 1}. ${item.title}`;
                        });
                        if (incomplete > 5) {
                            inspectionMessage += `\n   ... и ещё ${incomplete - 5}`;
                        }
                    }
                    else if (incomplete === 0) {
                        inspectionMessage += `\n✅ Все пункты выполнены`;
                    }
                }
                // Фото
                if (payload.photoUrls && payload.photoUrls.length > 0) {
                    inspectionMessage += `\n\n📸 Фотографии (${payload.photoUrls.length}):`;
                    payload.photoUrls.slice(0, 3).forEach((photo, index) => {
                        const caption = photo.caption ? ` - ${photo.caption}` : '';
                        inspectionMessage += `\n   ${index + 1}. ${photo.url}${caption}`;
                    });
                    if (payload.photoUrls.length > 3) {
                        inspectionMessage += `\n   ... и ещё ${payload.photoUrls.length - 3}`;
                    }
                }
                return {
                    title: '🔍 Осмотр ремонта завершен',
                    message: inspectionMessage,
                    actionUrl: `${frontendUrl}/repairs/${payload.repairId}`
                };
            case 'REPAIR_STARTED':
                const repairStartedScheduledDate = payload.scheduledAt
                    ? new Date(payload.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                let repairStartedMessage = `Ремонт в "${payload.unitName || 'квартире'}" начат`;
                if (payload.masterName) {
                    repairStartedMessage += `\n\n👤 Мастер: ${payload.masterName}`;
                }
                if (payload.scheduledAt) {
                    repairStartedMessage += `\n📅 Запланировано: ${repairStartedScheduledDate}`;
                }
                if (payload.unitAddress) {
                    repairStartedMessage += `\n📍 Адрес: ${payload.unitAddress}`;
                }
                repairStartedMessage += `\n▶️ Начато: ${new Date().toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;
                return {
                    title: '▶️ Ремонт начат',
                    message: repairStartedMessage,
                    actionUrl: `${frontendUrl}/repairs/${payload.repairId}`
                };
            case 'REPAIR_COMPLETED':
                const repairCompletedScheduledDate = payload.scheduledAt
                    ? new Date(payload.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                const repairCompletedStartedDate = payload.startedAt
                    ? new Date(payload.startedAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : null;
                const repairCompletedFinishedDate = payload.completedAt
                    ? new Date(payload.completedAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                // Вычисляем длительность
                let repairDurationText = '';
                if (payload.startedAt && payload.completedAt) {
                    const start = new Date(payload.startedAt);
                    const end = new Date(payload.completedAt);
                    const durationMs = end.getTime() - start.getTime();
                    const durationMinutes = Math.floor(durationMs / 60000);
                    const hours = Math.floor(durationMinutes / 60);
                    const minutes = durationMinutes % 60;
                    repairDurationText = hours > 0 ? `${hours}ч ${minutes}мин` : `${minutes}мин`;
                }
                let repairCompletedMessage = `Ремонт в "${payload.unitName || 'квартире'}" успешно завершен`;
                if (payload.masterName) {
                    repairCompletedMessage += `\n\n👤 Мастер: ${payload.masterName}`;
                }
                if (payload.scheduledAt) {
                    repairCompletedMessage += `\n📅 Запланировано: ${repairCompletedScheduledDate}`;
                }
                if (payload.startedAt) {
                    repairCompletedMessage += `\n▶️ Начато: ${repairCompletedStartedDate}`;
                }
                repairCompletedMessage += `\n✅ Завершено: ${repairCompletedFinishedDate}`;
                if (repairDurationText) {
                    repairCompletedMessage += `\n⏱️ Длительность: ${repairDurationText}`;
                }
                if (payload.unitAddress) {
                    repairCompletedMessage += `\n📍 Адрес: ${payload.unitAddress}`;
                }
                // Статистика чеклиста
                if (payload.checklistStats) {
                    const { total, completed, incomplete } = payload.checklistStats;
                    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
                    repairCompletedMessage += `\n\n📋 Чеклист: ${completed}/${total} выполнено (${completionPercent}%)`;
                    if (incomplete > 0 && payload.checklistStats.incompleteItems && payload.checklistStats.incompleteItems.length > 0) {
                        repairCompletedMessage += `\n\n⚠️ Не выполнено (${incomplete}):`;
                        payload.checklistStats.incompleteItems.slice(0, 5).forEach((item, index) => {
                            repairCompletedMessage += `\n   ${index + 1}. ${item.title}`;
                        });
                        if (incomplete > 5) {
                            repairCompletedMessage += `\n   ... и ещё ${incomplete - 5}`;
                        }
                    }
                    else if (incomplete === 0) {
                        repairCompletedMessage += `\n✅ Все пункты выполнены`;
                    }
                }
                // Фото
                if (payload.photoUrls && payload.photoUrls.length > 0) {
                    repairCompletedMessage += `\n\n📸 Фотографии (${payload.photoUrls.length}):`;
                    payload.photoUrls.slice(0, 3).forEach((photo, index) => {
                        const caption = photo.caption ? ` - ${photo.caption}` : '';
                        repairCompletedMessage += `\n   ${index + 1}. ${photo.url}${caption}`;
                    });
                    if (payload.photoUrls.length > 3) {
                        repairCompletedMessage += `\n   ... и ещё ${payload.photoUrls.length - 3}`;
                    }
                }
                repairCompletedMessage += `\n\n🎉 Спасибо за качественную работу!`;
                return {
                    title: '✅ Ремонт завершен',
                    message: repairCompletedMessage,
                    actionUrl: `${frontendUrl}/repairs/${payload.repairId}`
                };
            case 'REPAIR_CANCELLED':
                const repairCancelledScheduledDate = payload.scheduledAt
                    ? new Date(payload.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'не указана';
                let repairCancelledMessage = `Ремонт в "${payload.unitName || 'квартире'}" был отменен`;
                if (payload.masterName) {
                    repairCancelledMessage += `\n\n👤 Мастер: ${payload.masterName}`;
                }
                if (payload.scheduledAt) {
                    repairCancelledMessage += `\n📅 Запланировано было: ${repairCancelledScheduledDate}`;
                }
                if (payload.unitAddress) {
                    repairCancelledMessage += `\n📍 Адрес: ${payload.unitAddress}`;
                }
                if (payload.reason) {
                    repairCancelledMessage += `\n\n❌ Причина отмены: ${payload.reason}`;
                }
                if (payload.notes) {
                    repairCancelledMessage += `\n📝 Примечания: ${payload.notes}`;
                }
                return {
                    title: '❌ Ремонт отменен',
                    message: repairCancelledMessage,
                    actionUrl: `${frontendUrl}/repairs`
                };
            // System events
            case 'USER_REGISTERED':
                return {
                    title: '👋 Добро пожаловать!',
                    message: `Регистрация прошла успешно. Добро пожаловать в систему!`,
                    actionUrl: `${frontendUrl}/profile`
                };
            case 'USER_LOGIN':
                return {
                    title: '🔐 Вход в систему',
                    message: `Выполнен вход в систему${payload.ipAddress ? ` с IP ${payload.ipAddress}` : ''}`,
                    actionUrl: `${frontendUrl}/security`
                };
            case 'SYSTEM_ALERT':
                return {
                    title: '⚠️ Системное оповещение',
                    message: payload.message || payload.description || 'Системное оповещение',
                    actionUrl: frontendUrl
                };
            default:
                return {
                    title: event.type.replace(/_/g, ' '),
                    message: `Событие: ${event.type}`,
                    actionUrl: frontendUrl
                };
        }
    }
    /**
     * Находит ближайшие бронирования для уборки по unitId и scheduledAt
     */
    async findAdjacentBookings(unitId, scheduledAt, orgId) {
        try {
            // Получаем все бронирования для юнита
            const bookingsResult = await this.bookingsDL.listBookings({
                orgId,
                unitId,
                first: 100, // Получаем достаточно много для поиска ближайших
            });
            const bookings = bookingsResult.edges.map((edge) => edge.node);
            if (bookings.length === 0) {
                return { checkoutBooking: null, checkinBooking: null };
            }
            const cleaningDate = new Date(scheduledAt);
            cleaningDate.setHours(0, 0, 0, 0); // Нормализуем до начала дня
            // Фильтруем только подтвержденные бронирования
            const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING');
            // Находим бронь с выездом <= scheduledAt (последний выезд до или в день уборки)
            const checkoutBookingCandidates = confirmedBookings.filter((b) => {
                const checkoutDate = new Date(b.checkOut);
                checkoutDate.setHours(0, 0, 0, 0);
                return checkoutDate <= cleaningDate;
            });
            const checkoutBooking = checkoutBookingCandidates.length > 0
                ? checkoutBookingCandidates.sort((a, b) => {
                    return new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime();
                })[0]
                : null;
            // Находим бронь с заездом >= scheduledAt (первый заезд после или в день уборки)
            const checkinBookingCandidates = confirmedBookings.filter((b) => {
                const checkinDate = new Date(b.checkIn);
                checkinDate.setHours(0, 0, 0, 0);
                return checkinDate >= cleaningDate;
            });
            const checkinBooking = checkinBookingCandidates.length > 0
                ? checkinBookingCandidates.sort((a, b) => {
                    return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
                })[0]
                : null;
            return { checkoutBooking, checkinBooking };
        }
        catch (error) {
            logger.warn('Failed to find adjacent bookings', {
                unitId,
                scheduledAt,
                error: error instanceof Error ? error.message : String(error),
            });
            return { checkoutBooking: null, checkinBooking: null };
        }
    }
    /**
     * Форматирует короткую дату (день.месяц)
     */
    formatShortDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return dateString;
            }
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'numeric'
            });
        }
        catch (error) {
            return dateString;
        }
    }
    determinePriority(eventType) {
        switch (eventType) {
            // High priority - urgent actions required
            case 'CLEANING_ASSIGNED':
            case 'CLEANING_AVAILABLE':
            case 'REPAIR_ASSIGNED':
            case 'REPAIR_INSPECTION_COMPLETED':
            case 'TASK_ASSIGNED':
            case 'PAYMENT_FAILED':
            case 'INVOICE_OVERDUE':
                return 'HIGH';
            // Normal priority - important events
            case 'CLEANING_STARTED':
            case 'CLEANING_PRECHECK_COMPLETED':
            case 'CLEANING_DIFFICULTY_SET':
            case 'CLEANING_CANCELLED':
            case 'REPAIR_CREATED':
            case 'REPAIR_STARTED':
            case 'REPAIR_CANCELLED':
            case 'BOOKING_CREATED':
            case 'BOOKING_CONFIRMED':
            case 'BOOKING_CANCELLED':
            case 'BOOKING_CHECKIN':
            case 'BOOKING_CHECKOUT':
            case 'TASK_CREATED':
            case 'TASK_STATUS_CHANGED':
            case 'PAYMENT_RECEIVED':
            case 'INVOICE_CREATED':
                return 'NORMAL';
            // Low priority - informational events
            case 'CLEANING_COMPLETED':
            case 'REPAIR_COMPLETED':
            case 'TASK_COMPLETED':
            case 'USER_REGISTERED':
            case 'USER_LOGIN':
                return 'LOW';
            // Urgent priority - critical system events
            case 'SYSTEM_ALERT':
                return 'URGENT';
            default:
                return 'NORMAL';
        }
    }
}
