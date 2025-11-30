import { createGraphQLLogger } from '@repo/shared-logger';
import { BookingService } from '../services/booking.service.js';
import type { 
  CreateBookingRequest,
  GetBookingRequest,
  GetBookingByExternalRefRequest,
  CancelBookingRequest,
  ChangeBookingDatesRequest,
  UpdateBookingRequest,
  BookingResponse
} from '@repo/grpc-sdk';

const logger = createGraphQLLogger('bookings-grpc-service');

export class BookingsGrpcService {
  constructor(private readonly bookingService: BookingService) {}

  async CreateBooking(request: CreateBookingRequest): Promise<BookingResponse> {
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

  async GetBooking(request: GetBookingRequest): Promise<BookingResponse> {
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

  async CancelBooking(request: CancelBookingRequest): Promise<BookingResponse> {
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

  async ChangeBookingDates(request: ChangeBookingDatesRequest): Promise<BookingResponse> {
    try {
      logger.info('GRPC ChangeBookingDates called', request);
      
      // Изменяем даты бронирования
      const booking = await this.bookingService.changeBookingDates(
        request.id, 
        request.checkIn?.toISOString() || new Date().toISOString(), 
        request.checkOut?.toISOString() || new Date().toISOString()
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

  async GetBookingByExternalRef(request: GetBookingByExternalRefRequest): Promise<BookingResponse> {
    try {
      logger.info('GRPC GetBookingByExternalRef called', request);
      
      // Получаем бронирование по externalRef через сервис
      const booking = await this.bookingService.getBookingByExternalRef(
        request.externalSource,
        request.externalId
      );
      
      if (!booking) {
        return {
          booking: undefined as any,
          success: false,
          message: 'Booking not found by external reference'
        };
      }
      
      return {
        booking,
        success: true,
        message: 'Booking retrieved successfully'
      };
    } catch (error: any) {
      logger.error('GRPC GetBookingByExternalRef failed', { error: error.message });
      throw error;
    }
  }

  async UpdateBooking(request: UpdateBookingRequest): Promise<BookingResponse> {
    try {
      logger.info('GRPC UpdateBooking called', request);
      
      // Обновляем бронирование через сервис
      const booking = await this.bookingService.updateBooking(request);
      
      return {
        booking,
        success: true,
        message: 'Booking updated successfully'
      };
    } catch (error: any) {
      logger.error('GRPC UpdateBooking failed', { error: error.message });
      throw error;
    }
  }
}
