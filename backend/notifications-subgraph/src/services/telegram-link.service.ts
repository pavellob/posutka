import { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('telegram-link-service');

/**
 * Сервис для автоматической привязки Telegram chat ID к пользователям
 * по username при первом обращении к боту.
 */
export class TelegramLinkService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Попытка найти и связать пользователя с Telegram chat ID через Cleaner.
   * Вызывается когда пользователь пишет /start боту.
   * 
   * @param telegramUsername - username из Telegram (без @)
   * @param chatId - chat ID пользователя
   * @returns true если связывание прошло успешно
   */
  async linkUserByChatId(telegramUsername: string, chatId: string): Promise<boolean> {
    try {
      // Убираем @ если он есть
      const cleanUsername = telegramUsername.replace('@', '').toLowerCase();
      
      logger.info(`Attempting to link user with Telegram username: ${cleanUsername}`);
      
      // Ищем уборщика с таким username
      const cleaner = await this.prisma.cleaner.findFirst({
        where: {
          telegramUsername: {
            equals: cleanUsername,
            mode: 'insensitive', // Case-insensitive поиск
          },
          isActive: true,
          deletedAt: null,
        },
      });

      if (!cleaner) {
        logger.info(`No cleaner found with Telegram username: ${cleanUsername}`);
        return false;
      }

      // Определяем userId - для INTERNAL берем userId, для EXTERNAL используем id уборщика как userId
      const targetUserId = cleaner.userId || cleaner.id;

      // Проверяем есть ли уже настройки для этого userId
      const existingSettings = await this.prisma.userNotificationSettings.findUnique({
        where: { userId: targetUserId },
      });

      if (existingSettings) {
        // Обновляем существующие настройки
        await this.prisma.userNotificationSettings.update({
          where: { userId: targetUserId },
          data: {
            telegramChatId: chatId,
            enabled: true,
            enabledChannels: ['TELEGRAM', 'WEBSOCKET'],
            subscribedEvents: [
              'CLEANING_AVAILABLE',
              'CLEANING_ASSIGNED',
              'CLEANING_STARTED',
              'CLEANING_COMPLETED',
              'CLEANING_READY_FOR_REVIEW',
              'CLEANING_CANCELLED',
              'CLEANING_PRECHECK_COMPLETED',
            ],
            updatedAt: new Date(),
          },
        });
        
        logger.info(`Updated Telegram chat ID for user: ${cleaner.firstName} ${cleaner.lastName} (userId: ${targetUserId}, chatId: ${chatId})`);
      } else {
        // Создаем новые настройки
        await this.prisma.userNotificationSettings.create({
          data: {
            userId: targetUserId,
            telegramChatId: chatId,
            enabled: true,
            enabledChannels: ['TELEGRAM', 'WEBSOCKET'],
            subscribedEvents: [
              'CLEANING_AVAILABLE',
              'CLEANING_ASSIGNED',
              'CLEANING_STARTED',
              'CLEANING_COMPLETED',
              'CLEANING_READY_FOR_REVIEW',
              'CLEANING_CANCELLED',
              'CLEANING_PRECHECK_COMPLETED',
            ],
          },
        });
        
        logger.info(`Created Telegram notification settings for user: ${cleaner.firstName} ${cleaner.lastName} (userId: ${targetUserId}, chatId: ${chatId})`);
      }

      return true;
    } catch (error) {
      logger.error('Failed to link user with Telegram:', error);
      return false;
    }
  }

  /**
   * Получить информацию о пользователе по chat ID
   */
  async getUserByChatId(chatId: string) {
    try {
      const settings = await this.prisma.userNotificationSettings.findFirst({
        where: { telegramChatId: chatId },
      });

      if (!settings) return null;

      return {
        userId: settings.userId,
        settings,
      };
    } catch (error) {
      logger.error('Failed to get user by chat ID:', error);
      return null;
    }
  }

  /**
   * Получить информацию о уборщике по chat ID
   * @deprecated Используйте getUserByChatId для получения информации о пользователе
   */
  async getCleanerByChatId(chatId: string) {
    try {
      const settings = await this.prisma.userNotificationSettings.findFirst({
        where: { telegramChatId: chatId },
      });

      if (!settings) return null;

      const cleaner = await this.prisma.cleaner.findFirst({
        where: {
          OR: [
            { userId: settings.userId },
            { id: settings.userId },
          ],
          isActive: true,
          deletedAt: null,
        },
      });

      return cleaner;
    } catch (error) {
      logger.error('Failed to get cleaner by chat ID:', error);
      return null;
    }
  }

  /**
   * @deprecated Используйте linkUserByChatId
   */
  async linkCleanerByChatId(telegramUsername: string, chatId: string): Promise<boolean> {
    return this.linkUserByChatId(telegramUsername, chatId);
  }
}

