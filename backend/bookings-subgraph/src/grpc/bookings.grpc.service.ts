import { createGraphQLLogger } from '@repo/shared-logger';
import { BookingService } from '../services/booking.service.js';

const logger = createGraphQLLogger('bookings-grpc-service');

export class BookingsGrpcService {
  constructor(private readonly bookingService: BookingService) {}

  async CreateBooking(request: any): Promise<any> {
    try {
      logger.info('GRPC CreateBooking called', request);
      
      // Создаем бронирование через сервис
      const booking = await this.bookingService.createBooking(request);
      
      logger.info('Booking created via GRPC', { bookingId: booking.id });
      
      return {
        booking,
        success: true,
        message: 'Booking created successfully'
      };
    } catch (error: any) {
      logger.error('GRPC CreateBooking failed', { error: error.message });
      throw error;
    }
  }

  async GetBooking(request: any): Promise<any> {
    try {
      logger.info('GRPC GetBooking called', request);
      
      // Получаем бронирование по ID
      const booking = await this.bookingService.getBookingById(request.id);
      
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      return {
        booking,
        success: true,
        message: 'Booking retrieved successfully'
      };
    } catch (error: any) {
      logger.error('GRPC GetBooking failed', { error: error.message });
      throw error;
    }
  }

  async CancelBooking(request: any): Promise<any> {
    try {
      logger.info('GRPC CancelBooking called', request);
      
      // Отменяем бронирование
      const booking = await this.bookingService.cancelBooking(request.id, request.reason);
      
      return {
        booking,
        success: true,
        message: 'Booking cancelled successfully'
      };
    } catch (error: any) {
      logger.error('GRPC CancelBooking failed', { error: error.message });
      throw error;
    }
  }

  async ChangeBookingDates(request: any): Promise<any> {
    try {
      logger.info('GRPC ChangeBookingDates called', request);
      
      // Изменяем даты бронирования
      const booking = await this.bookingService.changeBookingDates(
        request.id, 
        request.checkIn, 
        request.checkOut
      );
      
      return {
        booking,
        success: true,
        message: 'Booking dates changed successfully'
      };
    } catch (error: any) {
      logger.error('GRPC ChangeBookingDates failed', { error: error.message });
      throw error;
    }
  }
}
