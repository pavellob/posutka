import { createServer } from 'nice-grpc';
import { BookingsGrpcService } from '../grpc/bookings.grpc.service.js';
import { BookingService } from '../services/booking.service.js';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('grpc-transport');

export class GrpcTransport {
  private server: any = null;
  private isServerRunning = false;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly bookingService: BookingService
  ) {}

  async start(): Promise<void> {
    try {
      logger.info('Starting GRPC transport with nice-grpc', { 
        host: this.host, 
        port: this.port 
      });

      // Создаем GRPC сервис
      const grpcService = new BookingsGrpcService(this.bookingService);
      
      // Создаем GRPC сервер с nice-grpc
      this.server = createServer({
        'bookings.BookingsService': {
          CreateBooking: grpcService.CreateBooking.bind(grpcService),
          GetBooking: grpcService.GetBooking.bind(grpcService),
          CancelBooking: grpcService.CancelBooking.bind(grpcService),
          ChangeBookingDates: grpcService.ChangeBookingDates.bind(grpcService),
        }
      });
      
      // Запускаем сервер
      await this.server.listen(`${this.host}:${this.port}`);
      
      this.isServerRunning = true;
      logger.info(`GRPC server started on ${this.host}:${this.port}`);
    } catch (error: any) {
      logger.error('Failed to start GRPC transport', { error: error.message });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.server && this.isServerRunning) {
      logger.info('Stopping GRPC transport');
      
      await this.server.shutdown();
      this.isServerRunning = false;
      this.server = null;
      logger.info('GRPC transport stopped');
    }
  }

  isRunning(): boolean {
    return this.isServerRunning;
  }
}
