import { createChannel, createClient } from 'nice-grpc';
import { BookingsServiceDefinition } from '../generated/bookings.js';
import type { 
  CreateBookingRequest,
  GetBookingRequest,
  GetBookingByExternalRefRequest,
  CancelBookingRequest,
  ChangeBookingDatesRequest,
  UpdateBookingRequest,
  BookingResponse
} from '../generated/bookings.js';

export interface BookingsGrpcClientConfig {
  host: string;
  port: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export class BookingsGrpcClient {
  private client: any;
  private channel: any;
  private isConnected = false;

  constructor(private readonly config: BookingsGrpcClientConfig) {}

  async connect(): Promise<void> {
    try {
      const address = `${this.config.host}:${this.config.port}`;
      this.channel = createChannel(address);
      this.client = createClient(BookingsServiceDefinition, this.channel);
      this.isConnected = true;
    } catch (error) {
      throw new Error(`Failed to connect to bookings gRPC server: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      this.channel.close();
      this.isConnected = false;
    }
  }

  async createBooking(request: CreateBookingRequest): Promise<BookingResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.createBooking(request);
  }

  async getBooking(request: GetBookingRequest): Promise<BookingResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.getBooking(request);
  }

  async cancelBooking(request: CancelBookingRequest): Promise<BookingResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.cancelBooking(request);
  }

  async changeBookingDates(request: ChangeBookingDatesRequest): Promise<BookingResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.changeBookingDates(request);
  }

  async getBookingByExternalRef(request: GetBookingByExternalRefRequest): Promise<BookingResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.getBookingByExternalRef(request);
  }

  async updateBooking(request: UpdateBookingRequest): Promise<BookingResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.updateBooking(request);
  }
}

export function createBookingsGrpcClient(config: BookingsGrpcClientConfig): BookingsGrpcClient {
  return new BookingsGrpcClient(config);
}
