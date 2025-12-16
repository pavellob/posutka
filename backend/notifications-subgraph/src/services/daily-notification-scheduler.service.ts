import { createGraphQLLogger } from '@repo/shared-logger';
import type { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const logger = createGraphQLLogger('daily-notification-scheduler');

const OPS_SUBGRAPH_URL = process.env.OPS_SUBGRAPH_URL || 'http://localhost:4003/graphql';

interface CreateDailyNotificationTaskInput {
  orgId: string;
  taskType: 'CLEANING' | 'REPAIR';
  targetDate: string;
}

/**
 * Сервис для автоматической рассылки ежедневных уведомлений о задачах
 */
export class DailyNotificationSchedulerService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Вызвать GraphQL мутацию createDailyNotificationTask в ops-subgraph
   */
  private async callCreateDailyNotificationTask(
    orgId: string,
    taskType: 'CLEANING' | 'REPAIR',
    targetDate: Date
  ): Promise<void> {
    const mutation = `
      mutation CreateDailyNotificationTask($input: CreateDailyNotificationTaskInput!) {
        createDailyNotificationTask(input: $input) {
          id
          type
          org {
            id
          }
        }
      }
    `;

    const variables = {
      input: {
        orgId,
        taskType,
        targetDate: targetDate.toISOString(),
      },
    };

    try {
      const response = await fetch(OPS_SUBGRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: mutation,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      logger.info('Daily notification task created', {
        orgId,
        taskType,
        targetDate: targetDate.toISOString(),
        taskId: result.data?.createDailyNotificationTask?.id,
      });
    } catch (error) {
      logger.error('Failed to create daily notification task', {
        orgId,
        taskType,
        targetDate: targetDate.toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Обработать одну организацию с включенной рассылкой
   */
  private async processOrganization(orgId: string): Promise<void> {
    try {
      const settings = await this.prisma.organizationNotificationSettings.findUnique({
        where: { orgId },
      });

      if (!settings) {
        return;
      }

      // Получаем всех менеджеров организации
      const memberships = await this.prisma.membership.findMany({
        where: {
          orgId,
          role: 'MANAGER',
        },
        select: {
          userId: true,
        },
      });

      if (memberships.length === 0) {
        logger.debug('Organization has no MANAGER members', { orgId });
        return;
      }

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      // Проверяем время для уборок
      if (settings.dailyCleaningNotificationEnabled && settings.dailyCleaningNotificationTime) {
        const [hours, minutes] = settings.dailyCleaningNotificationTime
          .split(':')
          .map(Number);
        const scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        // Проверяем только в течение 5 минут после наступления времени
        // Это позволяет отправить уведомление только один раз, когда наступает время
        const timeWindowEnd = new Date(scheduledTime);
        timeWindowEnd.setMinutes(timeWindowEnd.getMinutes() + 5);

        if (now >= scheduledTime && now < timeWindowEnd) {
          try {
            await this.callCreateDailyNotificationTask(
              orgId,
              'CLEANING',
              tomorrow
            );
          } catch (error) {
            logger.error('Failed to create daily cleaning notification task', {
              orgId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      // Проверяем время для ремонтов
      if (settings.dailyRepairNotificationEnabled && settings.dailyRepairNotificationTime) {
        const [hours, minutes] = settings.dailyRepairNotificationTime
          .split(':')
          .map(Number);
        const scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        // Проверяем только в течение 5 минут после наступления времени
        const timeWindowEnd = new Date(scheduledTime);
        timeWindowEnd.setMinutes(timeWindowEnd.getMinutes() + 5);

        if (now >= scheduledTime && now < timeWindowEnd) {
          try {
            await this.callCreateDailyNotificationTask(
              orgId,
              'REPAIR',
              tomorrow
            );
          } catch (error) {
            logger.error('Failed to create daily repair notification task', {
              orgId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error processing organization for daily notifications', {
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Запустить проверку всех организаций с включенной рассылкой
   */
  async runScheduledCheck(): Promise<void> {
    logger.info('Running daily notification scheduler check');

    try {
      // Проверяем, что prisma и модель доступны
      if (!this.prisma) {
        logger.error('Prisma client is not initialized');
        return;
      }
      
      if (!this.prisma.organizationNotificationSettings) {
        logger.error('OrganizationNotificationSettings model is not available in Prisma client');
        logger.error('Available models:', Object.keys(this.prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')).join(', '));
        return;
      }

      const organizations = await this.prisma.organizationNotificationSettings.findMany({
        where: {
          OR: [
            { dailyCleaningNotificationEnabled: true },
            { dailyRepairNotificationEnabled: true },
          ],
        },
      });

      logger.info('Found organizations with daily notifications enabled', {
        count: organizations.length,
      });

      // Обрабатываем каждую организацию
      for (const orgSettings of organizations) {
        await this.processOrganization(orgSettings.orgId);
      }

      logger.info('Daily notification scheduler check completed', {
        processedOrganizations: organizations.length,
      });
    } catch (error) {
      logger.error('Failed to run daily notification scheduler check', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Запустить cron job для ежедневной проверки
   */
  start(): void {
    // Проверяем каждые 5 минут для обработки организаций с разным временем рассылки
    // Логика внутри processOrganization проверяет окно времени (5 минут),
    // чтобы избежать дублирования задач и снизить нагрузку
    cron.schedule('*/5 * * * *', async () => {
      await this.runScheduledCheck();
    });

    logger.info('Daily notification scheduler started (runs every 5 minutes)');
  }
}
