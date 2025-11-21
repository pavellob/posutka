import { createGraphQLLogger } from '@repo/shared-logger';
import type {
  INotificationProvider,
  NotificationMessage,
  DeliveryResult,
  Channel,
} from './base-provider.js';

const logger = createGraphQLLogger('provider-manager');

/**
 * Менеджер провайдеров уведомлений.
 * Управляет несколькими провайдерами и выбирает подходящие для отправки.
 */
export class ProviderManager {
  private providers: Map<Channel, INotificationProvider> = new Map();
  private initialized: boolean = false;
  
  /**
   * Зарегистрировать провайдер.
   */
  registerProvider(provider: INotificationProvider): void {
    this.providers.set(provider.channel, provider);
    logger.info(`Provider registered: ${provider.name} (${provider.channel})`);
  }
  
  /**
   * Получить провайдер по каналу.
   */
  getProvider(channel: Channel): INotificationProvider | undefined {
    return this.providers.get(channel);
  }
  
  /**
   * Получить все зарегистрированные провайдеры.
   */
  getAllProviders(): INotificationProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Инициализировать все провайдеры.
   * Продолжает работу, даже если некоторые провайдеры не инициализировались.
   */
  async initialize(): Promise<void> {
    logger.info('Initializing all providers...');
    
    let successCount = 0;
    let failedCount = 0;
    
    const initPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        await provider.initialize();
        logger.info(`✅ Provider ${provider.name} initialized successfully`);
        successCount++;
      } catch (error) {
        // Некоторые провайдеры могут быть опциональными (например, WebSocket)
        // Логируем предупреждение, но не останавливаем инициализацию остальных
        logger.warn(`⚠️ Provider ${provider.name} failed to initialize:`, error instanceof Error ? error.message : error);
        failedCount++;
      }
    });
    
    await Promise.all(initPromises);
    
    this.initialized = true;
    
    if (successCount > 0) {
      logger.info(`✅ Provider initialization complete: ${successCount} successful, ${failedCount} failed`);
      if (failedCount > 0) {
        logger.warn(`⚠️ Some providers failed to initialize, but service will continue with available providers`);
      }
    } else {
      logger.error(`❌ All providers failed to initialize!`);
      throw new Error('No providers available - cannot start notifications service');
    }
  }
  
  /**
   * Остановить все провайдеры.
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down all providers...');
    
    const shutdownPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        await provider.shutdown();
        logger.info(`Provider ${provider.name} shut down successfully`);
      } catch (error) {
        logger.error(`Failed to shutdown provider ${provider.name}:`, error);
      }
    });
    
    await Promise.all(shutdownPromises);
    
    this.initialized = false;
    logger.info('All providers shut down');
  }
  
  /**
   * Отправить уведомление через указанные каналы.
   */
  async sendNotification(
    message: NotificationMessage,
    channels: Channel[]
  ): Promise<Map<Channel, DeliveryResult>> {
    if (!this.initialized) {
      throw new Error('ProviderManager is not initialized');
    }
    
    const results = new Map<Channel, DeliveryResult>();
    
    // Отправляем параллельно через все указанные каналы
    const sendPromises = channels.map(async (channel) => {
      const provider = this.providers.get(channel);
      
      if (!provider) {
        results.set(channel, {
          success: false,
          error: `Provider for channel ${channel} not registered`,
        });
        return;
      }
      
      try {
        // Проверяем, инициализирован ли провайдер
        if (!(provider as any).initialized) {
          results.set(channel, {
            success: false,
            error: `Provider ${provider.name} is not initialized`,
          });
          return;
        }
        
        // Проверяем, можем ли отправить
        const canSend = await provider.canSend(message.recipientId);
        
        logger.info(`🔍 Provider ${provider.name} canSend check`, {
          channel,
          providerName: provider.name,
          recipientId: message.recipientId,
          canSend,
          notificationId: message.id,
        });
        
        if (!canSend) {
          logger.warn(`⚠️ Provider ${provider.name} cannot send to recipient`, {
            channel,
            recipientId: message.recipientId,
            notificationId: message.id,
          });
          results.set(channel, {
            success: false,
            error: `Provider ${provider.name} cannot send to recipient ${message.recipientId}`,
          });
          return;
        }
        
        // Отправляем
        logger.info(`📤 Calling provider.send for ${provider.name}`, {
          channel,
          providerName: provider.name,
          notificationId: message.id,
          recipientId: message.recipientId,
        });
        
        const result = await provider.send(message);
        
        logger.info(`📥 Provider ${provider.name} send completed`, {
          channel,
          providerName: provider.name,
          notificationId: message.id,
          success: result.success,
        });
        results.set(channel, result);
        
        if (result.success) {
          logger.info(`Notification sent via ${provider.name}`, {
            notificationId: message.id,
            recipientId: message.recipientId,
            channel,
          });
        } else {
          logger.warn(`Failed to send via ${provider.name}:`, result.error);
        }
      } catch (error) {
        logger.error(`Error sending via ${channel}:`, error);
        results.set(channel, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
    
    await Promise.all(sendPromises);
    
    return results;
  }
  
  /**
   * Массовая отправка уведомлений.
   */
  async sendBulkNotifications(
    messages: Array<{ message: NotificationMessage; channels: Channel[] }>
  ): Promise<Map<string, Map<Channel, DeliveryResult>>> {
    const allResults = new Map<string, Map<Channel, DeliveryResult>>();
    
    // Отправляем все параллельно
    const sendPromises = messages.map(async ({ message, channels }) => {
      const results = await this.sendNotification(message, channels);
      allResults.set(message.id, results);
    });
    
    await Promise.all(sendPromises);
    
    return allResults;
  }
  
  /**
   * Получить статистику по провайдерам.
   */
  getProviderStats(): Array<{
    channel: Channel;
    name: string;
    initialized: boolean;
  }> {
    return Array.from(this.providers.entries()).map(([channel, provider]) => ({
      channel,
      name: provider.name,
      initialized: this.initialized,
    }));
  }
}

