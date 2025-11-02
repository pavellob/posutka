import TelegramBot from 'node-telegram-bot-api';
import { createGraphQLLogger } from '@repo/shared-logger';
import {
  BaseNotificationProvider,
  Channel,
  type NotificationMessage,
  type DeliveryResult,
} from './base-provider.js';

const logger = createGraphQLLogger('telegram-provider');

/**
 * Провайдер для отправки уведомлений через Telegram.
 */
export class TelegramProvider extends BaseNotificationProvider {
  readonly channel = Channel.TELEGRAM;
  readonly name = 'Telegram';
  
  private bot: TelegramBot | null = null;
  private readonly token: string;
  
  constructor(token: string) {
    super();
    this.token = token;
  }
  
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Telegram bot...');
      
      const usePolling = process.env.TELEGRAM_POLLING === 'true';
      this.bot = new TelegramBot(this.token, { polling: usePolling });
      
      // Проверяем подключение
      const me = await this.bot.getMe();
      logger.info(`Telegram bot initialized: @${me.username} (polling: ${usePolling})`);
      
      await super.initialize();
    } catch (error) {
      logger.error('Failed to initialize Telegram bot:', error);
      throw error;
    }
  }
  
  /**
   * Регистрирует обработчики команд бота для автопривязки уборщиков.
   * @param onStartCallback - Callback для обработки /start (получает username и chatId)
   */
  setupCommandHandlers(onStartCallback?: (username: string | undefined, chatId: string, firstName: string, lastName: string) => Promise<void>) {
    if (!this.bot) {
      logger.error('Bot not initialized, cannot setup command handlers');
      return;
    }
    
    // Обработчик /start
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id.toString();
      const username = msg.from?.username;
      const firstName = msg.from?.first_name || '';
      const lastName = msg.from?.last_name || '';
      
      logger.info(`Received /start from: ${username || 'no_username'} (${chatId})`);
      
      // Вызываем callback если он есть
      if (onStartCallback) {
        await onStartCallback(username, chatId, firstName, lastName);
      }
      
      if (username) {
        await this.bot!.sendMessage(
          chatId,
          `Привет, ${firstName}! 👋\n\n` +
          `Это система уведомлений Kakadu.\n\n` +
          `Ваш chat ID: \`${chatId}\`\n` +
          `Ваш username: @${username}\n\n` +
          `Если вы уборщик и указали этот username при регистрации, ` +
          `уведомления о назначенных уборках будут приходить автоматически!\n\n` +
          `Используйте /help для справки.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await this.bot!.sendMessage(
          chatId,
          `Привет, ${firstName}! 👋\n\n` +
          `Это система уведомлений Kakadu.\n\n` +
          `Ваш chat ID: \`${chatId}\`\n\n` +
          `⚠️ У вас не установлен username в Telegram.\n` +
          `Для автоматической привязки уведомлений установите username в настройках Telegram.`,
          { parse_mode: 'Markdown' }
        );
      }
    });
    
    // Обработчик /help
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id.toString();
      await this.bot!.sendMessage(
        chatId,
        `📖 *Помощь по боту Kakadu Notifications*\n\n` +
        `*Команды:*\n` +
        `/start - Начало работы и привязка к системе\n` +
        `/help - Эта справка\n\n` +
        `*Бот автоматически отправляет уведомления о:*\n` +
        `• Назначенных уборках\n` +
        `• Начале уборок\n` +
        `• Завершении уборок\n` +
        `• Отмене уборок`,
        { parse_mode: 'Markdown' }
      );
    });
    
    logger.info('Telegram bot command handlers registered');
  }
  
  async send(message: NotificationMessage): Promise<DeliveryResult> {
    this.ensureInitialized();
    
    if (!this.bot) {
      return {
        success: false,
        error: 'Telegram bot not initialized',
      };
    }
    
    try {
      const chatId = message.recipientId;
      
      // Формируем текст сообщения
      let text = `<b>${this.escapeHtml(message.title)}</b>\n\n${this.escapeHtml(message.message)}`;
      
      // Метаданные больше не показываем - они не нужны пользователю
      
      // Отправляем сообщение
      const options: any = {
        parse_mode: 'HTML',
      };
      
      // Добавляем кнопки действий
      const buttons: any[][] = [];
      
      logger.info('Processing Telegram message buttons', {
        notificationId: message.id,
        hasActionButtons: !!message.actionButtons,
        actionButtonsCount: message.actionButtons?.length || 0,
        actionButtons: message.actionButtons,
        hasActionUrl: !!message.actionUrl,
        hasActionText: !!message.actionText,
      });
      
      // Используем новый формат с несколькими кнопками, если есть
      if (message.actionButtons && message.actionButtons.length > 0) {
        logger.info('Using actionButtons format', {
          notificationId: message.id,
          buttonsCount: message.actionButtons.length,
        });
        const useMiniApp = process.env.TELEGRAM_USE_MINIAPP === 'true';
        
        for (const button of message.actionButtons) {
          const buttonConfig: any = {
            text: button.text,
          };
          
          if (button.useWebApp || useMiniApp) {
            buttonConfig.web_app = { url: button.url };
          } else {
            buttonConfig.url = button.url;
          }
          
          logger.info('Adding button to keyboard', {
            notificationId: message.id,
            buttonText: button.text,
            buttonUrl: button.url,
            useWebApp: button.useWebApp || useMiniApp,
          });
          
          // Добавляем кнопки по 2 в ряд
          if (buttons.length === 0 || buttons[buttons.length - 1].length >= 2) {
            buttons.push([buttonConfig]);
          } else {
            buttons[buttons.length - 1].push(buttonConfig);
          }
        }
      } else if (message.actionUrl && message.actionText) {
        // Обратная совместимость с одной кнопкой
        logger.info('Using actionUrl/actionText format', {
          notificationId: message.id,
          actionText: message.actionText,
          actionUrl: message.actionUrl,
        });
        const useMiniApp = process.env.TELEGRAM_USE_MINIAPP === 'true';
        const buttonConfig: any = {
          text: message.actionText,
        };
        
        if (useMiniApp) {
          buttonConfig.web_app = { url: message.actionUrl };
        } else {
          buttonConfig.url = message.actionUrl;
        }
        
        buttons.push([buttonConfig]);
      }
      
      if (buttons.length > 0) {
        options.reply_markup = {
          inline_keyboard: buttons,
        };
        logger.info('Keyboard configured', {
          notificationId: message.id,
          rowsCount: buttons.length,
          totalButtons: buttons.reduce((sum, row) => sum + row.length, 0),
        });
      } else {
        logger.warn('No buttons configured', {
          notificationId: message.id,
          hasActionButtons: !!message.actionButtons,
          hasActionUrl: !!message.actionUrl,
        });
      }
      
      const sentMessage = await this.bot.sendMessage(chatId, text, options);
      
      logger.info(`Message sent to Telegram chat ${chatId}`, {
        messageId: sentMessage.message_id,
        notificationId: message.id,
      });
      
      return {
        success: true,
        externalId: String(sentMessage.message_id),
        deliveredAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to send Telegram message:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async canSend(recipientId: string): Promise<boolean> {
    if (!this.initialized || !this.bot) {
      return false;
    }
    
    // Проверяем, что recipientId - это валидный chat ID
    // Telegram chat ID может быть числом или строкой
    return /^-?\d+$/.test(recipientId);
  }
  
  async shutdown(): Promise<void> {
    if (this.bot) {
      await this.bot.stopPolling();
      this.bot = null;
    }
    await super.shutdown();
  }
  
  /**
   * Экранирует HTML символы для Telegram.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  
  /**
   * Получить бота (для дополнительных операций).
   */
  getBot(): TelegramBot | null {
    return this.bot;
  }
}

