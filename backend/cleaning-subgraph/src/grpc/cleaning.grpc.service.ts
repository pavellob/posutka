import { createGraphQLLogger } from '@repo/shared-logger';
import type { ICleaningDL } from '@repo/datalayer';
import type { PrismaClient } from '@prisma/client';
import {
  CleaningServiceDefinition,
  ScheduleCleaningRequest,
  CleaningResponse,
  GetCleaningRequest,
  UpdateCleaningStatusRequest,
  AssignCleanerRequest,
  Cleaning as GrpcCleaning,
  CleaningStatus as GrpcCleaningStatus,
} from '@repo/grpc-sdk';
import { CleaningService } from '../services/cleaning.service.js';
import { getEventsClient } from '../services/events-client.js';

const logger = createGraphQLLogger('cleaning-grpc');

export class CleaningGrpcService implements CleaningServiceDefinition {
  readonly name = "CleaningService";
  readonly fullName = "cleaning.CleaningService";
  readonly methods = CleaningServiceDefinition.methods;

  constructor(
    private readonly dl: ICleaningDL,
    private readonly prisma: PrismaClient,
    private readonly cleaningService: CleaningService
  ) {}

  async scheduleCleaning(request: ScheduleCleaningRequest): Promise<CleaningResponse> {
    try {
      logger.info('Received scheduleCleaning request via gRPC', {
        orgId: request.orgId,
        unitId: request.unitId,
        taskId: request.taskId,
        scheduledAtType: typeof request.scheduledAt,
        scheduledAtValue: request.scheduledAt,
        hasCleaningService: !!this.cleaningService,
        cleaningServiceType: this.cleaningService ? typeof this.cleaningService : 'undefined',
      });

      if (!this.cleaningService) {
        logger.error('❌ cleaningService is null or undefined in CleaningGrpcService!', {
          hint: 'Check that cleaningService is passed to CleaningGrpcService constructor',
        });
        throw new Error('CleaningService is not initialized');
      }

      // Преобразуем scheduledAt - может быть Date или Timestamp
      let scheduledAt: Date;
      if (!request.scheduledAt) {
        scheduledAt = new Date();
      } else if (request.scheduledAt instanceof Date) {
        scheduledAt = request.scheduledAt;
      } else if (typeof request.scheduledAt === 'object' && request.scheduledAt && 'seconds' in request.scheduledAt) {
        scheduledAt = new Date(Number((request.scheduledAt as any).seconds) * 1000);
      } else {
        scheduledAt = new Date(request.scheduledAt as any);
      }

      logger.info('📞 About to call cleaningService.scheduleCleaning', {
        orgId: request.orgId,
        unitId: request.unitId,
        scheduledAt: scheduledAt.toISOString(),
      });

      // Используем единый сервис для создания уборки и публикации событий
      const result = await this.cleaningService.scheduleCleaning({
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
        cleaningId: result.cleaning.id,
        taskId: request.taskId,
      });

      return {
        cleaning: this.mapCleaningToGrpc(result.cleaning),
        cleanings: [this.mapCleaningToGrpc(result.cleaning)],
        success: true,
        message: 'Cleaning scheduled successfully',
      };
    } catch (error) {
      logger.error('Failed to schedule cleaning via gRPC', error);
      return {
        cleaning: undefined,
        cleanings: [],
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
          cleanings: [],
          success: false,
          message: 'Cleaning not found',
        };
      }

      return {
        cleaning: this.mapCleaningToGrpc(cleaning),
        cleanings: [this.mapCleaningToGrpc(cleaning)],
        success: true,
        message: 'Cleaning retrieved successfully',
      };
    } catch (error) {
      logger.error('Failed to get cleaning via gRPC', error);
      return {
        cleaning: undefined,
        cleanings: [],
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
        [-1]: 'UNRECOGNIZED',
      };

      const status = statusMap[request.status];
      let cleaning;

      switch (status) {
        case 'IN_PROGRESS':
          cleaning = await this.dl.startCleaning(request.id);
          // Публикуем событие CLEANING_STARTED
          try {
            if (cleaning.cleanerId) {
              const cleaner = await this.prisma.cleaner.findUnique({
                where: { id: cleaning.cleanerId },
              });
              const unit = await this.prisma.unit.findUnique({
                where: { id: cleaning.unitId },
                include: { property: true },
              });
              
              if (cleaner && unit) {
                const eventsClient = getEventsClient();
                await eventsClient.publishCleaningStarted({
                  cleaningId: cleaning.id,
                  cleanerId: cleaning.cleanerId,
                  unitName: `${unit.property?.title || ''} - ${unit.name}`,
                  orgId: cleaning.orgId || undefined,
                });
                logger.info('✅ CLEANING_STARTED event published', { cleaningId: cleaning.id });
              }
            }
          } catch (error) {
            logger.error('Failed to publish CLEANING_STARTED event', error);
          }
          break;
        case 'COMPLETED':
          cleaning = await this.dl.completeCleaning(request.id, {});
          // Публикуем событие CLEANING_COMPLETED
          try {
            if (cleaning.cleanerId) {
              const cleaner = await this.prisma.cleaner.findUnique({
                where: { id: cleaning.cleanerId },
              });
              const unit = await this.prisma.unit.findUnique({
                where: { id: cleaning.unitId },
                include: { property: true },
              });
              
              if (cleaner && unit) {
                const eventsClient = getEventsClient();
                await eventsClient.publishCleaningCompleted({
                  cleaningId: cleaning.id,
                  cleanerId: cleaning.cleanerId,
                  unitName: `${unit.property?.title || ''} - ${unit.name}`,
                  completedAt: cleaning.completedAt || new Date().toISOString(), // Уже строка из datalayer
                  orgId: cleaning.orgId || undefined,
                });
                logger.info('✅ CLEANING_COMPLETED event published', { cleaningId: cleaning.id });
              }
            }
          } catch (error) {
            logger.error('Failed to publish CLEANING_COMPLETED event', error);
          }
          break;
        case 'CANCELLED':
          cleaning = await this.dl.cancelCleaning(request.id);
          // Публикуем событие CLEANING_CANCELLED
          try {
            if (cleaning.cleanerId) {
              const cleaner = await this.prisma.cleaner.findUnique({
                where: { id: cleaning.cleanerId },
              });
              const unit = await this.prisma.unit.findUnique({
                where: { id: cleaning.unitId },
                include: { property: true },
              });
              
              if (cleaner && unit) {
                const eventsClient = getEventsClient();
                await eventsClient.publishCleaningCancelled({
                  cleaningId: cleaning.id,
                  cleanerId: cleaning.cleanerId,
                  unitName: `${unit.property?.title || ''} - ${unit.name}`,
                  orgId: cleaning.orgId || undefined,
                });
                logger.info('✅ CLEANING_CANCELLED event published', { cleaningId: cleaning.id });
              }
            }
          } catch (error) {
            logger.error('Failed to publish CLEANING_CANCELLED event', error);
          }
          break;
        default:
          throw new Error(`Invalid status: ${status}`);
      }

      return {
        cleaning: this.mapCleaningToGrpc(cleaning),
        cleanings: [this.mapCleaningToGrpc(cleaning)],
        success: true,
        message: 'Cleaning status updated successfully',
      };
    } catch (error) {
      logger.error('Failed to update cleaning status via gRPC', error);
      return {
        cleaning: undefined,
        cleanings: [],
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async assignCleaner(request: AssignCleanerRequest): Promise<CleaningResponse> {
    try {
      // TODO: Implement assignCleaning method in ICleaningDL
      const cleaning = await this.dl.getCleaningById(request.cleaningId);
      if (!cleaning) {
        throw new Error('Cleaning not found');
      }

      return {
        cleaning: this.mapCleaningToGrpc(cleaning),
        cleanings: [this.mapCleaningToGrpc(cleaning)],
        success: true,
        message: 'Cleaner assigned successfully',
      };
    } catch (error) {
      logger.error('Failed to assign cleaner via gRPC', error);
      return {
        cleaning: undefined,
        cleanings: [],
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
          cleaner: true
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

