// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import type { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';
import { 
  createNotificationsGrpcClient,
  type NotificationsGrpcClient,
  EventType as NotificationEventType,
  NotificationChannel,
  Priority as NotificationPriority
} from '@repo/grpc-sdk';

const logger = createGraphQLLogger('notification-event-handler');

/**
 * Handler для создания уведомлений из событий.
 * Создает Notification записи и отправляет их через notifications-subgraph.
 */
export class NotificationEventHandler {
  private notificationsClient: NotificationsGrpcClient | null = null;
  
  constructor(private readonly prisma: PrismaClient) {
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
  
  async handle(event: any): Promise<void> {
    try {
      logger.info('📨 Creating notifications for event', { 
        eventId: event.id,
        type: event.type,
        targetUserIds: event.targetUserIds,
        targetUserIdsCount: event.targetUserIds?.length || 0
      });
      
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
          } else {
            skippedCount++;
          }
        } catch (error: any) {
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
    } catch (error: any) {
      logger.error('❌ Failed to create notifications', { 
        eventId: event.id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  
  private async createNotificationForUser(event: any, userId: string): Promise<boolean> {
    try {
      logger.info('🔍 Processing notification for user', { userId, eventType: event.type });
      
      // Загружаем настройки
      const settings = await this.prisma.userNotificationSettings.findUnique({
        where: { userId }
      });
      
      if (!settings) {
        logger.warn('⚠️ No notification settings found for user', { userId });
        return false;
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

      if (event.type === 'CLEANING_READY_FOR_REVIEW' && !settings.subscribedEvents.includes('CLEANING_READY_FOR_REVIEW')) {
        const updatedEvents = [...settings.subscribedEvents, 'CLEANING_READY_FOR_REVIEW'];
        await this.prisma.userNotificationSettings.update({
          where: { userId },
          data: { subscribedEvents: updatedEvents },
        });
        settings.subscribedEvents = updatedEvents as any;
        logger.info('Auto-subscribed user to CLEANING_READY_FOR_REVIEW', { userId });
      }

      if (event.type === 'CLEANING_PRECHECK_COMPLETED' && !settings.subscribedEvents.includes('CLEANING_PRECHECK_COMPLETED')) {
        const updatedEvents = [...settings.subscribedEvents, 'CLEANING_PRECHECK_COMPLETED'];
        await this.prisma.userNotificationSettings.update({
          where: { userId },
          data: { subscribedEvents: updatedEvents },
        });
        settings.subscribedEvents = updatedEvents as any;
        logger.info('Auto-subscribed user to CLEANING_PRECHECK_COMPLETED', { userId });
      }
      
      // Проверяем подписку на событие (без автоподписки - управление через UI)
      if (!settings.subscribedEvents.includes(event.type)) {
        logger.warn('⚠️ User not subscribed to event type', { 
          userId, 
          eventType: event.type,
          userSubscribedEvents: settings.subscribedEvents,
          hint: 'User needs to subscribe to this event type via UI'
        });
        return false;
      }
      
      // Рендерим сообщение
      const rendered = this.renderNotification(event);
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
      
      const notification = await (this.prisma.notification.create as any)({
        data: {
          userId,
          orgId: event.orgId || null,
          eventType: event.type,
          title,
          message,
          actionUrl: actionUrl || (actionButtons && actionButtons.length > 0 ? actionButtons[0].url : null),
          actionText: actionButtons && actionButtons.length > 0 ? actionButtons[0].text : 'Открыть',
          priority: this.determinePriority(event.type) as any,
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
        deliveriesCount: (notification.deliveryStatuses as any[])?.length || 0,
        eventLinksCount: (notification.eventLinks as any[])?.length || 0
      });
      
      // Отправляем уведомление через notifications-subgraph gRPC
      // notifications-subgraph создаст свое уведомление и отправит через провайдеры
      await this.sendNotificationToProviders(event, notification, settings, userId);
      
      return true;
      
    } catch (error: any) {
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
  private async sendNotificationToProviders(event: any, notification: any, settings: any, userId: string): Promise<void> {
    if (!this.notificationsClient) {
      logger.warn('Notifications gRPC client not initialized');
      return;
    }

    try {
      // Маппинг типов событий из events в notifications
      const eventTypeMap: Record<string, NotificationEventType> = {
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
      const priorityMap: Record<string, NotificationPriority> = {
        'LOW': NotificationPriority.PRIORITY_LOW,
        'NORMAL': NotificationPriority.PRIORITY_NORMAL,
        'HIGH': NotificationPriority.PRIORITY_HIGH,
        'URGENT': NotificationPriority.PRIORITY_URGENT,
      };

      // Маппинг каналов
      const channels: NotificationChannel[] = [];
      if (settings.enabledChannels.includes('TELEGRAM') && settings.telegramChatId) {
        channels.push(NotificationChannel.CHANNEL_TELEGRAM);
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
      let parsedMetadata: any = {};
      let actionButtons: Array<{ text: string; url: string; useWebApp?: boolean }> | undefined = undefined;
      
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
      } catch (e) {
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
      const sendParams: any = {
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
      } else {
        sendParams.actionUrl = notification.actionUrl || undefined;
        sendParams.actionText = notification.actionText || undefined;
      }
      
      await this.notificationsClient.sendNotification(sendParams);

      logger.info('✅ Notification sent via gRPC', { notificationId: notification.id });
    } catch (error: any) {
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
  private createDeliveries(settings: any, userId: string): any[] {
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
  
  private renderNotification(event: any): { 
    title: string; 
    message: string; 
    actionUrl?: string; 
    actionButtons?: Array<{ text: string; url: string; useWebApp?: boolean }> 
  } {
    const payload = event.payload;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const useWebApp = process.env.TELEGRAM_USE_MINIAPP === 'true';
    
    switch (event.type) {
      case 'CLEANING_ASSIGNED':
        // Если уборщик назначен - только одна кнопка "Посмотреть уборку"
        return {
          title: '🧹 Новая уборка назначена!',
          message: `Вам назначена уборка в ${payload.unitName || 'квартире'}`,
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
        
        // Если уборка доступна (не назначена) - две кнопки: "Взять уборку" и "Посмотреть уборку"
        return {
          title: '📋 Доступна уборка!',
          message: `Запланирована уборка в квартире "${payload.unitName || 'квартире'}"

Дата: ${scheduledDate}

💡 Нажмите кнопку ниже, чтобы взять уборку в работу`,
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
        return {
          title: '✅ Уборка завершена',
          message: `Уборка в ${payload.unitName || 'квартире'} успешно завершена`,
          actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
        };

      case 'CLEANING_PRECHECK_COMPLETED':
        return {
          title: '🧾 Приёмка завершена',
          message: `Приёмка уборки в ${payload.unitName || 'квартире'} завершена.`,
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
        return {
          title: '📅 Новое бронирование',
          message: `Создано бронирование #${payload.bookingId || 'N/A'}${payload.guestName ? `\nГость: ${payload.guestName}` : ''}`,
          actionUrl: `${frontendUrl}/bookings/${payload.bookingId}`
        };
      
      case 'BOOKING_CONFIRMED':
        return {
          title: '✅ Бронирование подтверждено',
          message: `Бронирование #${payload.bookingId || 'N/A'} подтверждено`,
          actionUrl: `${frontendUrl}/bookings/${payload.bookingId}`
        };
      
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
      case 'TASK_CREATED':
        return {
          title: '📋 Новая задача',
          message: `Создана задача: ${payload.taskName || payload.title || 'Без названия'}`,
          actionUrl: `${frontendUrl}/tasks/${payload.taskId}`
        };
      
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
  
  private determinePriority(eventType: string): string {
    switch (eventType) {
      // High priority - urgent actions required
      case 'CLEANING_ASSIGNED':
      case 'CLEANING_AVAILABLE':
      case 'TASK_ASSIGNED':
      case 'PAYMENT_FAILED':
      case 'INVOICE_OVERDUE':
        return 'HIGH';
      
      // Normal priority - important events
      case 'CLEANING_STARTED':
      case 'CLEANING_PRECHECK_COMPLETED':
      case 'CLEANING_CANCELLED':
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

