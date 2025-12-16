import type { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';
import type { ProviderManager } from '../providers/provider-manager.js';
import { Channel, Priority } from '../providers/base-provider.js';

const logger = createGraphQLLogger('notification-event-handler');

/**
 * Обработчик событий для создания уведомлений.
 * Вызывается Event Bus при получении новых событий.
 */
export class NotificationEventHandler {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly providerManager: ProviderManager
  ) {}
  
  /**
   * Обработать событие и создать уведомления для всех затронутых пользователей
   */
  async handleEvent(event: any): Promise<void> {
    try {
      logger.info('Handling event', { 
        eventId: event.id,
        type: event.type,
        targetUserIds: event.targetUserIds 
      });
      
      // Для каждого затронутого пользователя
      for (const userId of event.targetUserIds || []) {
        await this.createNotificationForUser(event, userId);
      }
      
      logger.info('Event handled successfully', { eventId: event.id });
    } catch (error: any) {
      logger.error('Failed to handle event', { 
        eventId: event.id,
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Создать уведомление для конкретного пользователя
   */
  private async createNotificationForUser(event: any, userId: string): Promise<void> {
    try {
      // 1. Загружаем настройки пользователя
      const settings = await this.prisma.userNotificationSettings.findUnique({
        where: { userId }
      });
      
      if (!settings) {
        logger.warn('No notification settings for user', { userId, eventId: event.id });
        return;
      }
      
      // 2. Проверяем, нужно ли отправлять уведомление
      if (!settings.enabled) {
        logger.info('Notifications disabled for user', { userId });
        return;
      }
      
      if (!settings.subscribedEvents.includes(event.type)) {
        logger.info('User not subscribed to event type', { 
          userId, 
          eventType: event.type,
          subscribedEvents: settings.subscribedEvents
        });
        return;
      }
      
      // 3. Рендерим шаблон (или используем дефолтные значения)
      // Сначала пытаемся загрузить шаблон из БД, если его нет - используем fallback
      const { title, message, actionUrl } = await this.renderNotification(event);
      
      // 4. Определяем приоритет
      const priority = this.determinePriority(event.type);
      
      // 5. Создаем Notification с Deliveries
      const notification = await this.prisma.notification.create({
        data: {
          eventId: event.id,
          userId,
          orgId: event.orgId,
          eventType: event.type,
          title,
          message,
          actionUrl,
          actionText: 'Открыть',
          priority: priority as any,
          status: 'PENDING',
          metadata: JSON.stringify(event.payload),
          
          // Создаем deliveries для каждого включенного канала
          deliveryStatuses: {
            create: this.createDeliveries(settings, userId)
          }
        },
        include: {
          deliveryStatuses: true
        }
      });
      
      logger.info('Notification created', { 
        notificationId: notification.id,
        userId,
        eventId: event.id,
        deliveriesCount: notification.deliveryStatuses.length
      });
      
      // 6. Создаем связь Event ← → Notification
      await this.prisma.eventNotification.create({
        data: {
          eventId: event.id,
          notificationId: notification.id
        }
      });
      
      // 7. Отправляем через провайдеры
      await this.deliverNotification(notification);
      
    } catch (error: any) {
      logger.error('Failed to create notification for user', { 
        userId,
        eventId: event.id,
        error: error.message 
      });
    }
  }
  
  /**
   * Рендерить уведомление на основе события
   * Сначала пытается загрузить шаблон из БД, если его нет - использует fallback
   */
  private async renderNotification(event: any): Promise<{ title: string; message: string; actionUrl: string }> {
    const payload = event.payload;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Пытаемся загрузить шаблон из БД
    try {
      const template = await this.prisma.notificationTemplate.findFirst({
        where: {
          eventType: event.type,
        },
        orderBy: {
          createdAt: 'desc', // Берем последний созданный шаблон
        },
      });

      if (template) {
        logger.info('Using notification template from DB', {
          templateId: template.id,
          eventType: event.type,
          templateName: template.name,
        });

        // Рендерим шаблон с подстановкой переменных
        const title = this.renderTemplate(template.titleTemplate, payload, frontendUrl);
        const message = this.renderTemplate(template.messageTemplate, payload, frontendUrl);
        const actionUrl = payload.bookingId 
          ? `${frontendUrl}/bookings/${payload.bookingId}`
          : payload.cleaningId
          ? `${frontendUrl}/cleanings/${payload.cleaningId}`
          : frontendUrl;

        return { title, message, actionUrl };
      } else {
        logger.debug('No template found in DB, using fallback', {
          eventType: event.type,
        });
      }
    } catch (error: any) {
      logger.warn('Failed to load template from DB, using fallback', {
        eventType: event.type,
        error: error.message,
      });
    }
    
    // Fallback: используем встроенную логику
    switch (event.type) {
      case 'CLEANING_ASSIGNED': {
        const unitName = payload.unitName || 'квартире';
        const unitAddress = payload.unitAddress;
        const cleanerName = payload.cleanerName;
        const scheduledDate = this.formatDate(payload.scheduledAt);
        const requiresLinen = payload.requiresLinenChange ? '\n\n🛏️ Требуется смена белья' : '';
        const notes = payload.notes ? `\n\n📝 Примечание: ${payload.notes}` : '';
        const templateName = payload.templateName || payload.templateId;
        const templateInfo = templateName ? `\n📋 Шаблон чеклиста: ${templateName}` : '';
        
        let message = `Вам назначена уборка в "${unitName}"`;
        if (unitAddress) {
          message += `\n📍 Адрес: ${unitAddress}`;
        }
        message += `\n📅 Дата и время: ${scheduledDate}`;
        if (cleanerName) {
          message += `\n👤 Исполнитель: ${cleanerName}`;
        }
        message += templateInfo + requiresLinen + notes;
        
        return {
          title: '🧹 Новая уборка назначена!',
          message,
          actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
        };
      }
      
      case 'CLEANING_AVAILABLE': {
        const unitName = payload.unitName || 'квартире';
        const unitAddress = payload.unitAddress;
        const scheduledDate = this.formatDate(payload.scheduledAt);
        const requiresLinen = payload.requiresLinenChange ? '\n\n🛏️ Требуется смена белья' : '';
        const notes = payload.notes ? `\n\n📝 Примечание: ${payload.notes}` : '';
        
        let message = `Доступна уборка в "${unitName}"`;
        if (unitAddress) {
          message += `\n📍 Адрес: ${unitAddress}`;
        }
        message += `\n📅 Дата и время: ${scheduledDate}`;
        message += requiresLinen + notes;
        message += '\n\n💡 Вы можете взять эту уборку себе';
        
        return {
          title: '📋 Доступна уборка!',
          message,
          actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
        };
      }
      
      case 'CLEANING_STARTED': {
        const unitName = payload.unitName || 'квартире';
        const unitAddress = payload.unitAddress;
        const cleanerName = payload.cleanerName;
        const startedDate = payload.startedAt ? this.formatDate(payload.startedAt) : this.formatDate(new Date().toISOString());
        const notes = payload.notes ? `\n\n📝 Примечание: ${payload.notes}` : '';
        
        let message = `Уборка в "${unitName}" начата`;
        if (unitAddress) {
          message += `\n📍 Адрес: ${unitAddress}`;
        }
        message += `\n⏰ Время начала: ${startedDate}`;
        if (cleanerName) {
          message += `\n👤 Исполнитель: ${cleanerName}`;
        }
        message += notes;
        message += '\n\n💡 Не забудьте завершить уборку после выполнения всех пунктов чеклиста';
        
        return {
          title: '▶️ Уборка начата',
          message,
          actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}?tab=checklist`
        };
      }
      
      case 'CLEANING_COMPLETED': {
        const unitName = payload.unitName || 'квартире';
        const unitAddress = payload.unitAddress;
        const cleanerName = payload.cleanerName;
        const completedDate = payload.completedAt ? this.formatDate(payload.completedAt) : this.formatDate(new Date().toISOString());
        const notes = payload.notes ? `\n\n📝 Примечание: ${payload.notes}` : '';
        
        let message = `Уборка в "${unitName}" успешно завершена`;
        if (unitAddress) {
          message += `\n📍 Адрес: ${unitAddress}`;
        }
        message += `\n✅ Время завершения: ${completedDate}`;
        if (cleanerName) {
          message += `\n👤 Исполнитель: ${cleanerName}`;
        }
        message += notes;
        message += '\n\n🎉 Спасибо за качественную работу!';
        
        return {
          title: '✅ Уборка завершена',
          message,
          actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
        };
      }

      case 'CLEANING_PRECHECK_COMPLETED': {
        const unitName = payload.unitName || 'квартире';
        const unitAddress = payload.unitAddress;
        const cleanerName = payload.cleanerName;
        const submittedDate = payload.submittedAt ? this.formatDate(payload.submittedAt) : this.formatDate(new Date().toISOString());
        const notes = payload.notes ? `\n\n📝 Примечание: ${payload.notes}` : '';
        
        let message = `Приёмка уборки в "${unitName}" завершена`;
        if (unitAddress) {
          message += `\n📍 Адрес: ${unitAddress}`;
        }
        message += `\n⏰ Время приёмки: ${submittedDate}`;
        if (cleanerName) {
          message += `\n👤 Исполнитель: ${cleanerName}`;
        }
        message += notes;
        message += '\n\n✅ Уборка может начаться';
        
        return {
          title: '🧾 Приёмка завершена',
          message,
          actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
        };
      }

      case 'CLEANING_READY_FOR_REVIEW': {
        const unitName = payload.unitName || 'квартире';
        const unitAddress = payload.unitAddress;
        const cleanerName = payload.cleanerName;
        const scheduledDate = payload.scheduledAt ? this.formatDate(payload.scheduledAt) : '';
        const notes = payload.notes ? `\n\n📝 Примечание: ${payload.notes}` : '';
        
        let message = `Уборка в "${unitName}" готова к проверке`;
        if (unitAddress) {
          message += `\n📍 Адрес: ${unitAddress}`;
        }
        if (scheduledDate) {
          message += `\n📅 Запланировано: ${scheduledDate}`;
        }
        if (cleanerName) {
          message += `\n👤 Исполнитель: ${cleanerName}`;
        }
        message += notes;
        message += '\n\n🔎 Требуется проверка менеджера';
        
        return {
          title: '🔎 Требуется проверка уборки',
          message,
          actionUrl: `${frontendUrl}/cleanings/${payload.cleaningId}`
        };
      }
      
      case 'BOOKING_CREATED': {
        const guestName = payload.guestName || 'Гость';
        const unitName = payload.unitName || 'квартире';
        const unitAddress = payload.unitAddress;
        const checkInDate = payload.checkIn ? this.formatDate(payload.checkIn) : '';
        const checkOutDate = payload.checkOut ? this.formatDate(payload.checkOut) : '';
        const lockCode = payload.lockCode ? `\n🔑 Код от замка: ${payload.lockCode}` : '';
        const checkInInstructions = payload.checkInInstructions ? `\n\n📋 Инструкции по заселению:\n${payload.checkInInstructions}` : '';
        
        let message = `Создано новое бронирование для "${guestName}"`;
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
        if (payload.guestsCount) {
          message += `\n👥 Гостей: ${payload.guestsCount}`;
        }
        message += lockCode + checkInInstructions;
        
        return {
          title: '🎉 Новое бронирование',
          message,
          actionUrl: `${frontendUrl}/bookings/${payload.bookingId}`
        };
      }

      case 'BOOKING_CANCELLED': {
        const guestName = payload.guestName || 'Гость';
        const unitName = payload.unitName || 'квартире';
        const unitAddress = payload.unitAddress;
        const checkInDate = payload.checkIn ? this.formatDate(payload.checkIn) : '';
        const checkOutDate = payload.checkOut ? this.formatDate(payload.checkOut) : '';
        const cancellationReason = payload.cancellationReason ? `\n\n📝 Причина отмены: ${payload.cancellationReason}` : '';
        
        let message = `Бронирование для "${guestName}" отменено`;
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
        message += cancellationReason;
        
        return {
          title: '❌ Бронирование отменено',
          message,
          actionUrl: `${frontendUrl}/bookings/${payload.bookingId}`
        };
      }

      case 'BOOKING_CONFIRMED': {
        const guestName = payload.guestName || 'Гость';
        const unitName = payload.unitName || 'квартире';
        const unitAddress = payload.unitAddress;
        const checkInDate = payload.checkIn ? this.formatDate(payload.checkIn) : '';
        const checkOutDate = payload.checkOut ? this.formatDate(payload.checkOut) : '';
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
      
      default:
        return {
          title: event.type.replace(/_/g, ' '),
          message: `Событие: ${event.type}`,
          actionUrl: frontendUrl
        };
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
    
    if (settings.enabledChannels.includes('EMAIL') && settings.email) {
      deliveries.push({
        channel: 'EMAIL',
        recipientType: 'EMAIL',
        recipientId: settings.email,
        status: 'PENDING'
      });
    }
    
    return deliveries;
  }
  
  /**
   * Отправить уведомление через провайдеры
   */
  private async deliverNotification(notification: any): Promise<void> {
    for (const delivery of notification.deliveryStatuses) {
      try {
        // Обновляем статус → SENDING
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: { status: 'SENDING' as any }
        });
        
        // Формируем сообщение для провайдера
        const message = {
          id: notification.id,
          recipientId: delivery.recipientId,
          title: notification.title,
          message: notification.message,
          priority: this.mapPriority(notification.priority),
          metadata: notification.metadata ? JSON.parse(notification.metadata) : undefined,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText
        };
        
        // Отправляем через провайдер
        const channelEnum = this.mapChannel(delivery.channel);
        const results = await this.providerManager.sendNotification(message, [channelEnum]);
        const result = results.get(channelEnum);
        
        if (result?.success) {
          // Успешно отправлено
          await this.prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'SENT' as any,
              externalId: result.externalId,
              deliveredAt: result.deliveredAt || new Date()
            }
          });
          
          logger.info('Delivery sent successfully', { 
            deliveryId: delivery.id,
            channel: delivery.channel 
          });
        } else {
          // Ошибка отправки
          await this.prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'FAILED' as any,
              error: result?.error || 'Unknown error'
            }
          });
          
          logger.warn('Delivery failed', { 
            deliveryId: delivery.id,
            channel: delivery.channel,
            error: result?.error 
          });
        }
      } catch (error: any) {
        logger.error('Error delivering notification', { 
          deliveryId: delivery.id,
          error: error.message 
        });
        
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'FAILED' as any,
            error: error.message
          }
        });
      }
    }
    
    // Агрегируем статус Notification
    await this.aggregateNotificationStatus(notification.id);
  }
  
  /**
   * Агрегировать статус Notification на основе Deliveries
   */
  private async aggregateNotificationStatus(notificationId: string): Promise<void> {
    const deliveries = await this.prisma.notificationDelivery.findMany({
      where: { notificationId }
    });
    
    const allSent = deliveries.every(d => d.status === 'SENT');
    const allFailed = deliveries.every(d => d.status === 'FAILED');
    const someSent = deliveries.some(d => d.status === 'SENT');
    
    let status: string;
    if (allSent) {
      status = 'SENT';
    } else if (allFailed) {
      status = 'FAILED';
    } else if (someSent) {
      status = 'SENT'; // Частичная отправка считаем успехом
    } else {
      status = 'PENDING';
    }
    
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { 
        status: status as any,
        sentAt: allSent || someSent ? new Date() : null
      }
    });
    
    logger.info('Notification status aggregated', { 
      notificationId,
      finalStatus: status,
      deliveriesCount: deliveries.length
    });
  }
  
  /**
   * Определить приоритет на основе типа события
   */
  private determinePriority(eventType: string): string {
    switch (eventType) {
      case 'CLEANING_ASSIGNED':
      case 'TASK_ASSIGNED':
        return 'HIGH';
      
      case 'BOOKING_CREATED':
      case 'CLEANING_STARTED':
        return 'NORMAL';
      
      case 'BOOKING_CANCELLED':
        return 'HIGH';
      
      case 'BOOKING_CONFIRMED':
        return 'NORMAL';
      
      case 'CLEANING_COMPLETED':
      case 'TASK_COMPLETED':
        return 'LOW';
      
      default:
        return 'NORMAL';
    }
  }
  
  /**
   * Рендерить шаблон с подстановкой переменных
   */
  private renderTemplate(template: string, payload: any, frontendUrl: string): string {
    let rendered = template;
    
    // Подстановка переменных из payload
    // Поддерживаем формат {{variableName}}
    const variablePattern = /\{\{(\w+)\}\}/g;
    
    rendered = rendered.replace(variablePattern, (match, varName) => {
      // Специальные обработки для дат
      if (varName.includes('Date') || varName.includes('At')) {
        const dateValue = payload[varName];
        if (dateValue) {
          return this.formatDate(dateValue);
        }
      }
      
      // Обычные переменные
      const value = payload[varName];
      if (value !== undefined && value !== null) {
        return String(value);
      }
      
      // Если переменная не найдена, оставляем как есть или заменяем на пустую строку
      return '';
    });
    
    return rendered;
  }

  /**
   * Форматировать дату для отображения
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * Маппинг канала из строки в enum
   */
  private mapChannel(channel: string): Channel {
    const mapping: Record<string, Channel> = {
      'TELEGRAM': Channel.TELEGRAM,
      'WEBSOCKET': Channel.WEBSOCKET,
      'EMAIL': Channel.EMAIL,
      'SMS': Channel.SMS,
      'PUSH': Channel.PUSH,
      'IN_APP': Channel.IN_APP
    };
    
    return mapping[channel] || Channel.WEBSOCKET;
  }
  
  /**
   * Маппинг приоритета из строки в enum
   */
  private mapPriority(priority: string): Priority {
    const mapping: Record<string, Priority> = {
      'LOW': Priority.LOW,
      'NORMAL': Priority.NORMAL,
      'HIGH': Priority.HIGH,
      'URGENT': Priority.URGENT
    };
    
    return mapping[priority] || Priority.NORMAL;
  }
}

