import { createOpsGrpcClient, OpsGrpcClient, TaskPriority } from '@repo/grpc-sdk';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('booking-service');

export class BookingService {
  private opsClient: OpsGrpcClient;

  constructor(
    private readonly dl: any,
    private readonly inventoryDL: any,
    opsGrpcHost: string,
    opsGrpcPort: number
  ) {
    this.opsClient = createOpsGrpcClient({
      host: opsGrpcHost,
      port: opsGrpcPort,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 5000
    });
  }

  async initialize(): Promise<void> {
    await this.opsClient.connect();
  }

  async createBooking(bookingData: any): Promise<any> {
    try {
      logger.info('Creating booking', { bookingData });

      // Создаем бронирование
      const booking = await this.dl.createBooking(bookingData);

      // Создаем задачу на уборку
      await this.createCleaningTask(booking);

      logger.info('Booking created successfully', { bookingId: booking.id });
      return booking;
    } catch (error: any) {
      logger.error('Failed to create booking', { error: error.message });
      throw error;
    }
  }

  private async createCleaningTask(booking: any): Promise<void> {
    try {
      // Вычисляем время для уборки (за 2 часа до заезда)
      const scheduledAt = new Date(booking.checkIn);
      scheduledAt.setHours(scheduledAt.getHours() - 2);

      // Get unit to extract propertyId
      const unit = await this.inventoryDL.getUnitById(booking.unitId);
      if (!unit) {
        logger.error('Unit not found, cannot create cleaning task', { 
          unitId: booking.unitId,
          bookingId: booking.id 
        });
        return;
      }

      const request = {
        orgId: booking.orgId, // Use orgId from booking
        propertyId: unit.propertyId, // Get from unit
        roomId: booking.unitId, // Use unitId as roomId
        bookingId: booking.id,
        scheduledAt,
        notes: `Уборка для бронирования ${booking.id}. Гость: ${booking.guestId}`,
        priority: TaskPriority.TASK_PRIORITY_MEDIUM
      };

      logger.info('Creating cleaning task', { 
        bookingId: booking.id,
        orgId: booking.orgId,
        unitId: booking.unitId,
        propertyId: unit.propertyId,
        scheduledAt: scheduledAt.toISOString()
      });

      const response = await this.opsClient.createCleaningTask(request);

      if (!response.success) {
        logger.error('Failed to create cleaning task', { 
          bookingId: booking.id,
          error: response.message 
        });
      } else {
        logger.info('Cleaning task created successfully', { 
          bookingId: booking.id,
          taskId: response.task?.id
        });
      }
    } catch (error: any) {
      logger.error('Failed to create cleaning task', { 
        bookingId: booking.id,
        error: error.message 
      });
    }
  }

  async getBookingById(id: string): Promise<any> {
    try {
      logger.info('Getting booking by ID', { id });
      
      // Пока что симулируем получение бронирования
      // В реальной реализации здесь будет this.dl.getBookingById(id)
      return {
        id,
        orgId: '123e4567-e89b-12d3-a456-426614174000',
        unitId: '123e4567-e89b-12d3-a456-426614174001',
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        roomId: '123e4567-e89b-12d3-a456-426614174001',
        guestName: 'Test Guest',
        checkIn: '2024-01-01T14:00:00Z',
        checkOut: '2024-01-03T11:00:00Z',
        guestsCount: 2,
        status: 'CONFIRMED',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error: any) {
      logger.error('Failed to get booking', { error: error.message });
      throw error;
    }
  }

  async cancelBooking(id: string, reason?: string): Promise<any> {
    try {
      logger.info('Cancelling booking', { id, reason });
      
      // Пока что симулируем отмену бронирования
      // В реальной реализации здесь будет this.dl.cancelBooking(id, reason)
      return {
        id,
        orgId: '123e4567-e89b-12d3-a456-426614174000',
        unitId: '123e4567-e89b-12d3-a456-426614174001',
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        roomId: '123e4567-e89b-12d3-a456-426614174001',
        guestName: 'Test Guest',
        checkIn: '2024-01-01T14:00:00Z',
        checkOut: '2024-01-03T11:00:00Z',
        guestsCount: 2,
        status: 'CANCELLED',
        cancellationReason: reason,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error: any) {
      logger.error('Failed to cancel booking', { error: error.message });
      throw error;
    }
  }

  async changeBookingDates(id: string, checkIn: string, checkOut: string): Promise<any> {
    try {
      logger.info('Changing booking dates', { id, checkIn, checkOut });
      
      // Пока что симулируем изменение дат бронирования
      // В реальной реализации здесь будет this.dl.changeBookingDates(id, checkIn, checkOut)
      return {
        id,
        orgId: '123e4567-e89b-12d3-a456-426614174000',
        unitId: '123e4567-e89b-12d3-a456-426614174001',
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        roomId: '123e4567-e89b-12d3-a456-426614174001',
        guestName: 'Test Guest',
        checkIn,
        checkOut,
        guestsCount: 2,
        status: 'CONFIRMED',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error: any) {
      logger.error('Failed to change booking dates', { error: error.message });
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    await this.opsClient.disconnect();
  }
}
