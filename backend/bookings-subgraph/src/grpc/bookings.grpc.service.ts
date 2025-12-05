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
      
      // Преобразуем booking для gRPC ответа - конвертируем строки ISO в Date объекты
      // nice-grpc автоматически конвертирует Date в Timestamp
      const grpcBooking = this.convertBookingForGrpc(booking);
      
      return {
        booking: grpcBooking,
        success: true,
        message: 'Booking created successfully'
      };
    } catch (error: any) {
      logger.error('GRPC CreateBooking failed', { error: error.message });
      throw error;
    }
  }

  private convertBookingForGrpc(booking: any): any {
    if (!booking) return booking;
    
    const convertDate = (date: any, fieldName: string): Date => {
      if (!date) {
        logger.warn(`Date field ${fieldName} is missing, using current date as fallback`);
        return new Date();
      }
      if (date instanceof Date) {
        if (isNaN(date.getTime())) {
          logger.warn(`Invalid Date object for ${fieldName}, using current date as fallback`);
          return new Date();
        }
        return date;
      }
      if (typeof date === 'string') {
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) {
          logger.warn(`Invalid date string for ${fieldName}, using current date as fallback`, { date });
          return new Date();
        }
        return parsed;
      }
      logger.warn(`Unexpected date type for ${fieldName}, using current date as fallback`, { type: typeof date, date });
      return new Date();
    };
    
    return {
      ...booking,
      checkIn: convertDate(booking.checkIn, 'checkIn'),
      checkOut: convertDate(booking.checkOut, 'checkOut'),
      createdAt: convertDate(booking.createdAt, 'createdAt'),
      updatedAt: convertDate(booking.updatedAt, 'updatedAt'),
    };
  }

  async GetBooking(request: GetBookingRequest): Promise<BookingResponse> {
    try {
      logger.info('GRPC GetBooking called', request);
      
      // Получаем бронирование по ID
      const booking = await this.bookingService.getBookingById(request.id);
      
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      // Преобразуем booking для gRPC ответа
      const grpcBooking = this.convertBookingForGrpc(booking);
      
      return {
        booking: grpcBooking,
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
      
      // Преобразуем booking для gRPC ответа
      const grpcBooking = this.convertBookingForGrpc(booking);
      
      return {
        booking: grpcBooking,
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
      
      // Преобразуем booking для gRPC ответа
      const grpcBooking = this.convertBookingForGrpc(booking);
      
      return {
        booking: grpcBooking,
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
      
      // Преобразуем booking для gRPC ответа
      const grpcBooking = booking ? this.convertBookingForGrpc(booking) : undefined;
      
      return {
        booking: grpcBooking as any,
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
      
      // Преобразуем booking для gRPC ответа
      const grpcBooking = this.convertBookingForGrpc(booking);
      
      return {
        booking: grpcBooking,
        success: true,
        message: 'Booking updated successfully'
      };
    } catch (error: any) {
      logger.error('GRPC UpdateBooking failed', { error: error.message });
      throw error;
    }
  }
}
