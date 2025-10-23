import { createGraphQLLogger } from '@repo/shared-logger';
import type { ICleaningDL } from '@repo/datalayer';
import type { PrismaClient } from '@prisma/client';
import type {
  CleaningServiceDefinition,
  ScheduleCleaningRequest,
  CleaningResponse,
  GetCleaningRequest,
  UpdateCleaningStatusRequest,
  AssignCleanerRequest,
  Cleaning as GrpcCleaning,
  CleaningStatus as GrpcCleaningStatus,
} from '@repo/grpc-sdk';
import { notificationClient } from '../services/notification-client.js';

const logger = createGraphQLLogger('cleaning-grpc');

export class CleaningGrpcService implements CleaningServiceDefinition {
  constructor(
    private readonly dl: ICleaningDL,
    private readonly prisma: PrismaClient
  ) {}

  async scheduleCleaning(request: ScheduleCleaningRequest): Promise<CleaningResponse> {
    try {
      logger.info('Received scheduleCleaning request via gRPC', {
        orgId: request.orgId,
        unitId: request.unitId,
        taskId: request.taskId,
        scheduledAtType: typeof request.scheduledAt,
        scheduledAtValue: request.scheduledAt,
      });

      // Преобразуем scheduledAt - может быть Date или Timestamp
      let scheduledAt: Date;
      if (!request.scheduledAt) {
        scheduledAt = new Date();
      } else if (request.scheduledAt instanceof Date) {
        scheduledAt = request.scheduledAt;
      } else if (typeof request.scheduledAt === 'object' && 'seconds' in request.scheduledAt) {
        scheduledAt = new Date(Number(request.scheduledAt.seconds) * 1000);
      } else {
        scheduledAt = new Date(request.scheduledAt as any);
      }

      const cleaning = await this.dl.scheduleCleaning({
        orgId: request.orgId,
        unitId: request.unitId,
        bookingId: request.bookingId,
        taskId: request.taskId,
        cleanerId: request.cleanerId,
        scheduledAt: scheduledAt.toISOString(),
        requiresLinenChange: request.requiresLinenChange ?? false,
        notes: request.notes,
      });

      logger.info('✅ Cleaning scheduled via gRPC', {
        cleaningId: cleaning.id,
        taskId: request.taskId,
      });

      // Отправляем уведомления (та же логика что в GraphQL резолвере)
      try {
        const unit = await this.prisma.unit.findUnique({
          where: { id: cleaning.unitId },
          include: { property: true, preferredCleaners: { include: { cleaner: true } } }
        });
        
        if (!unit) {
          logger.warn('❌ Unit not found for notifications', { unitId: cleaning.unitId });
        } else if (cleaning.cleanerId) {
          // Если уборщик назначен - отправляем ASSIGNED
          const cleaner = await this.prisma.cleaner.findUnique({
            where: { id: cleaning.cleanerId },
          });
          
          if (cleaner) {
            const targetUserId = cleaner.userId || cleaner.id;
            const settings = await this.prisma.userNotificationSettings.findUnique({
              where: { userId: targetUserId },
            }).catch(() => null);
            
            if (settings?.telegramChatId) {
              await notificationClient.notifyCleaningAssigned({
                userId: targetUserId,
                telegramChatId: settings.telegramChatId,
                cleanerId: cleaning.cleanerId,
                cleaningId: cleaning.id,
                unitName: `${unit.property?.title || ''} - ${unit.name}`,
                scheduledAt: cleaning.scheduledAt,
                requiresLinenChange: cleaning.requiresLinenChange,
                orgId: cleaning.orgId,
              });
              logger.info('✅ ASSIGNED notification sent', { cleaningId: cleaning.id });
            }
          }
        } else {
          // Если уборщик НЕ назначен - отправляем AVAILABLE всем привязанным
          for (const preferredCleaner of unit.preferredCleaners) {
            const cleaner = preferredCleaner.cleaner;
            if (!cleaner.isActive) continue;
            
            const targetUserId = cleaner.userId || cleaner.id;
            const settings = await this.prisma.userNotificationSettings.findUnique({
              where: { userId: targetUserId },
            }).catch(() => null);
            
            if (settings?.telegramChatId) {
              await notificationClient.notifyCleaningAvailable({
                userId: targetUserId,
                telegramChatId: settings.telegramChatId,
                cleaningId: cleaning.id,
                unitName: `${unit.property?.title || ''} - ${unit.name}`,
                scheduledAt: cleaning.scheduledAt,
                requiresLinenChange: cleaning.requiresLinenChange,
                orgId: cleaning.orgId,
              });
              logger.info('✅ AVAILABLE notification sent to cleaner', { cleanerId: cleaner.id });
            }
          }
        }
      } catch (error) {
        logger.error('Failed to send notifications', error);
        // Не прерываем выполнение если уведомления не отправились
      }

      return {
        cleaning: this.mapCleaningToGrpc(cleaning),
        success: true,
        message: 'Cleaning scheduled successfully',
      };
    } catch (error) {
      logger.error('Failed to schedule cleaning via gRPC', error);
      return {
        cleaning: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getCleaning(request: GetCleaningRequest): Promise<CleaningResponse> {
    try {
      const cleaning = await this.dl.getCleaningById(request.id);

      if (!cleaning) {
        return {
          cleaning: undefined,
          success: false,
          message: 'Cleaning not found',
        };
      }

      return {
        cleaning: this.mapCleaningToGrpc(cleaning),
        success: true,
        message: 'Cleaning retrieved successfully',
      };
    } catch (error) {
      logger.error('Failed to get cleaning via gRPC', error);
      return {
        cleaning: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async updateCleaningStatus(request: UpdateCleaningStatusRequest): Promise<CleaningResponse> {
    try {
      const statusMap: Record<GrpcCleaningStatus, string> = {
        0: 'SCHEDULED',
        1: 'IN_PROGRESS',
        2: 'COMPLETED',
        3: 'CANCELLED',
      };

      const status = statusMap[request.status];
      let cleaning;

      switch (status) {
        case 'IN_PROGRESS':
          cleaning = await this.dl.startCleaning(request.id);
          break;
        case 'COMPLETED':
          cleaning = await this.dl.completeCleaning(request.id);
          break;
        case 'CANCELLED':
          cleaning = await this.dl.cancelCleaning(request.id);
          break;
        default:
          throw new Error(`Invalid status: ${status}`);
      }

      return {
        cleaning: this.mapCleaningToGrpc(cleaning),
        success: true,
        message: 'Cleaning status updated successfully',
      };
    } catch (error) {
      logger.error('Failed to update cleaning status via gRPC', error);
      return {
        cleaning: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async assignCleaner(request: AssignCleanerRequest): Promise<CleaningResponse> {
    try {
      const cleaning = await this.dl.assignCleaning(request.cleaningId, request.cleanerId);

      return {
        cleaning: this.mapCleaningToGrpc(cleaning),
        success: true,
        message: 'Cleaner assigned successfully',
      };
    } catch (error) {
      logger.error('Failed to assign cleaner via gRPC', error);
      return {
        cleaning: undefined,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getCleaningsByTaskId(request: { taskId: string }): Promise<CleaningResponse> {
    try {
      logger.info('Getting cleanings by task ID via gRPC', { taskId: request.taskId });

      // Получаем все уборки для данной задачи
      const cleanings = await this.prisma.cleaning.findMany({
        where: { taskId: request.taskId },
        include: {
          cleaner: true,
          unit: {
            include: {
              property: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      logger.info('Found cleanings for task', { 
        taskId: request.taskId, 
        count: cleanings.length 
      });

      return {
        cleaning: undefined, // Для множественных результатов используем массив
        cleanings: cleanings.map(cleaning => this.mapCleaningToGrpc(cleaning)),
        success: true,
        message: `Found ${cleanings.length} cleanings for task`,
      };
    } catch (error) {
      logger.error('Failed to get cleanings by task ID via gRPC', error);
      return {
        cleaning: undefined,
        cleanings: [],
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private mapCleaningToGrpc(cleaning: any): GrpcCleaning {
    const statusMap: Record<string, GrpcCleaningStatus> = {
      SCHEDULED: 0,
      IN_PROGRESS: 1,
      COMPLETED: 2,
      CANCELLED: 3,
    };

    // Просто возвращаем Date объекты - gRPC сериализатор сам их преобразует
    return {
      id: cleaning.id,
      orgId: cleaning.orgId,
      unitId: cleaning.unitId,
      bookingId: cleaning.bookingId,
      taskId: cleaning.taskId,
      cleanerId: cleaning.cleanerId,
      status: statusMap[cleaning.status] ?? 0,
      scheduledAt: cleaning.scheduledAt ? new Date(cleaning.scheduledAt) : undefined,
      startedAt: cleaning.startedAt ? new Date(cleaning.startedAt) : undefined,
      completedAt: cleaning.completedAt ? new Date(cleaning.completedAt) : undefined,
      requiresLinenChange: cleaning.requiresLinenChange ?? false,
      notes: cleaning.notes,
      createdAt: new Date(cleaning.createdAt),
      updatedAt: new Date(cleaning.updatedAt),
    } as any;
  }
}

