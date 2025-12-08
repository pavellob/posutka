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
      
      // Собираем priceBreakdown из gRPC полей (опционально)
      const buildPriceBreakdown = () => {
        const currency = request.basePriceCurrency || request.totalCurrency || 'RUB';
        const hasAny =
          request.basePriceAmount !== undefined ||
          request.totalAmount !== undefined ||
          request.pricePerDayAmount !== undefined ||
          request.platformTaxAmount !== undefined ||
          request.prepaymentAmount !== undefined ||
          request.amountAmount !== undefined ||
          request.cleaningFeeAmount !== undefined ||
          request.serviceFeeAmount !== undefined ||
          request.taxesAmount !== undefined;

        if (!hasAny) return undefined;

        const baseAmount = request.basePriceAmount ?? request.totalAmount ?? 0;

        return {
          basePrice: {
            amount: baseAmount,
            currency: request.basePriceCurrency || currency,
          },
          pricePerDay: request.pricePerDayAmount !== undefined ? {
            amount: request.pricePerDayAmount,
            currency: request.pricePerDayCurrency || currency,
          } : undefined,
          cleaningFee: request.cleaningFeeAmount !== undefined ? {
            amount: request.cleaningFeeAmount,
            currency: request.cleaningFeeCurrency || currency,
          } : undefined,
          serviceFee: request.serviceFeeAmount !== undefined ? {
            amount: request.serviceFeeAmount,
            currency: request.serviceFeeCurrency || currency,
          } : undefined,
          taxes: request.taxesAmount !== undefined ? {
            amount: request.taxesAmount,
            currency: request.taxesCurrency || currency,
          } : undefined,
          platformTax: request.platformTaxAmount !== undefined ? {
            amount: request.platformTaxAmount,
            currency: request.platformTaxCurrency || currency,
          } : undefined,
          prepayment: request.prepaymentAmount !== undefined ? {
            amount: request.prepaymentAmount,
            currency: request.prepaymentCurrency || currency,
          } : undefined,
          amount: request.amountAmount !== undefined ? {
            amount: request.amountAmount,
            currency: request.amountCurrency || currency,
          } : undefined,
          total: {
            amount: request.totalAmount ?? baseAmount,
            currency: request.totalCurrency || currency,
          },
        };
      };

      // Создаем бронирование через сервис
      const booking = await this.bookingService.createBooking({
        ...request,
        guestEmail: (request as any).guestEmail || undefined,
        guestPhone: (request as any).guestPhone || undefined,
        priceBreakdown: buildPriceBreakdown(),
      });
      
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
    
    const price = booking.priceBreakdown || {};

    return {
      ...booking,
      basePriceAmount: price.basePrice?.amount,
      basePriceCurrency: price.basePrice?.currency,
      pricePerDayAmount: price.pricePerDay?.amount,
      pricePerDayCurrency: price.pricePerDay?.currency,
      cleaningFeeAmount: price.cleaningFee?.amount,
      cleaningFeeCurrency: price.cleaningFee?.currency,
      serviceFeeAmount: price.serviceFee?.amount,
      serviceFeeCurrency: price.serviceFee?.currency,
      taxesAmount: price.taxes?.amount,
      taxesCurrency: price.taxes?.currency,
      platformTaxAmount: price.platformTax?.amount,
      platformTaxCurrency: price.platformTax?.currency,
      prepaymentAmount: price.prepayment?.amount,
      prepaymentCurrency: price.prepayment?.currency,
      amountAmount: price.amount?.amount,
      amountCurrency: price.amount?.currency,
      totalAmount: price.total?.amount,
      totalCurrency: price.total?.currency,
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
      
      const buildPriceBreakdown = () => {
        const currency = (request as any).basePriceCurrency || (request as any).totalCurrency || 'RUB';
        const hasAny =
          (request as any).basePriceAmount !== undefined ||
          (request as any).totalAmount !== undefined ||
          (request as any).pricePerDayAmount !== undefined ||
          (request as any).platformTaxAmount !== undefined ||
          (request as any).prepaymentAmount !== undefined ||
          (request as any).amountAmount !== undefined ||
          (request as any).cleaningFeeAmount !== undefined ||
          (request as any).serviceFeeAmount !== undefined ||
          (request as any).taxesAmount !== undefined;

        if (!hasAny) return undefined;

        const baseAmount = (request as any).basePriceAmount ?? (request as any).totalAmount ?? 0;

        return {
          basePrice: {
            amount: baseAmount,
            currency: (request as any).basePriceCurrency || currency,
          },
          pricePerDay: (request as any).pricePerDayAmount !== undefined ? {
            amount: (request as any).pricePerDayAmount,
            currency: (request as any).pricePerDayCurrency || currency,
          } : undefined,
          cleaningFee: (request as any).cleaningFeeAmount !== undefined ? {
            amount: (request as any).cleaningFeeAmount,
            currency: (request as any).cleaningFeeCurrency || currency,
          } : undefined,
          serviceFee: (request as any).serviceFeeAmount !== undefined ? {
            amount: (request as any).serviceFeeAmount,
            currency: (request as any).serviceFeeCurrency || currency,
          } : undefined,
          taxes: (request as any).taxesAmount !== undefined ? {
            amount: (request as any).taxesAmount,
            currency: (request as any).taxesCurrency || currency,
          } : undefined,
          platformTax: (request as any).platformTaxAmount !== undefined ? {
            amount: (request as any).platformTaxAmount,
            currency: (request as any).platformTaxCurrency || currency,
          } : undefined,
          prepayment: (request as any).prepaymentAmount !== undefined ? {
            amount: (request as any).prepaymentAmount,
            currency: (request as any).prepaymentCurrency || currency,
          } : undefined,
          amount: (request as any).amountAmount !== undefined ? {
            amount: (request as any).amountAmount,
            currency: (request as any).amountCurrency || currency,
          } : undefined,
          total: {
            amount: (request as any).totalAmount ?? baseAmount,
            currency: (request as any).totalCurrency || currency,
          },
        };
      };

      // Обновляем бронирование через сервис
      const booking = await this.bookingService.updateBooking({
        ...request,
        guestEmail: (request as any).guestEmail || undefined,
        guestPhone: (request as any).guestPhone || undefined,
      arrivalTime: (request as any).arrivalTime || undefined,
      departureTime: (request as any).departureTime || undefined,
        priceBreakdown: buildPriceBreakdown(),
      });
      
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
