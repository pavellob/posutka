/**
 * Базовый интерфейс для провайдеров уведомлений.
 * Все провайдеры (Telegram, Email, WebSocket и т.д.) должны реализовать этот интерфейс.
 */

export enum Channel {
  TELEGRAM = 'TELEGRAM',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBSOCKET = 'WEBSOCKET',
  IN_APP = 'IN_APP',
}

export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface ActionButton {
  /** Текст кнопки */
  text: string;
  /** URL для действия */
  url: string;
  /** Использовать Telegram Mini App (web_app вместо url) */
  useWebApp?: boolean;
}

export interface NotificationMessage {
  /** ID уведомления */
  id: string;
  /** ID получателя */
  recipientId: string;
  /** Заголовок */
  title: string;
  /** Текст сообщения */
  message: string;
  /** Приоритет */
  priority: Priority;
  /** Метаданные */
  metadata?: Record<string, any>;
  /** URL действия (для обратной совместимости) */
  actionUrl?: string;
  /** Текст кнопки (для обратной совместимости) */
  actionText?: string;
  /** Массив кнопок действий (новый формат для нескольких кнопок) */
  actionButtons?: ActionButton[];
  /** Запланировано на */
  scheduledAt?: Date;
}

export interface DeliveryResult {
  /** Успешно ли отправлено */
  success: boolean;
  /** ID сообщения в системе провайдера */
  externalId?: string;
  /** Время доставки */
  deliveredAt?: Date;
  /** Ошибка (если есть) */
  error?: string;
}

/**
 * Базовый интерфейс провайдера уведомлений.
 */
export interface INotificationProvider {
  /** Тип канала провайдера */
  readonly channel: Channel;
  
  /** Название провайдера */
  readonly name: string;
  
  /**
   * Отправить уведомление одному получателю.
   */
  send(message: NotificationMessage): Promise<DeliveryResult>;
  
  /**
   * Массовая отправка уведомлений.
   */
  sendBulk(messages: NotificationMessage[]): Promise<DeliveryResult[]>;
  
  /**
   * Проверить, может ли провайдер отправить сообщение данному получателю.
   */
  canSend(recipientId: string): Promise<boolean>;
  
  /**
   * Инициализировать провайдер (подключение, аутентификация и т.д.).
   */
  initialize(): Promise<void>;
  
  /**
   * Закрыть соединения и освободить ресурсы.
   */
  shutdown(): Promise<void>;
}

/**
 * Абстрактный базовый класс провайдера с общей логикой.
 */
export abstract class BaseNotificationProvider implements INotificationProvider {
  abstract readonly channel: Channel;
  abstract readonly name: string;
  
  protected initialized: boolean = false;
  
  abstract send(message: NotificationMessage): Promise<DeliveryResult>;
  
  async sendBulk(messages: NotificationMessage[]): Promise<DeliveryResult[]> {
    // По умолчанию отправляем последовательно
    const results: DeliveryResult[] = [];
    
    for (const message of messages) {
      try {
        const result = await this.send(message);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }
  
  async canSend(_recipientId: string): Promise<boolean> {
    // По умолчанию можем отправлять всем
    return this.initialized;
  }
  
  async initialize(): Promise<void> {
    this.initialized = true;
  }
  
  async shutdown(): Promise<void> {
    this.initialized = false;
  }
  
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Provider ${this.name} is not initialized`);
    }
  }
}

