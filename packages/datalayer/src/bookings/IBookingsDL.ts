import type { 
  Booking, 
  Guest, 
  Document, 
  DepositTransaction, 
  BookingConnection,
  CreateBookingInput,
  UpdateBookingInput,
  ListBookingsParams,
  UUID, 
  DateTime, 
  MoneyInput 
} from './types.js';

export interface IBookingsDL {
  // Booking operations
  getBookingById(id: UUID): Promise<Booking | null>;
  getBookingByExternalRef(externalSource: string, externalId: string): Promise<Booking | null>;
  listBookings(params: ListBookingsParams): Promise<BookingConnection>;
  createBooking(input: CreateBookingInput): Promise<Booking>;
  updateBooking(input: UpdateBookingInput): Promise<Booking>;
  cancelBooking(id: UUID, reason?: string): Promise<Booking>;
  changeBookingDates(id: UUID, checkIn: DateTime, checkOut: DateTime): Promise<Booking>;
  
  // Guest operations
  getGuestById(id: UUID): Promise<Guest | null>;
  upsertGuest(guest: {
    name: string;
    email: string;
    phone?: string;
    documentType?: string;
    documentNumber?: string;
  }): Promise<Guest>;
  
  // Availability check
  isRangeAvailable(unitId: UUID, checkIn: DateTime, checkOut: DateTime, excludeBookingId?: UUID): Promise<boolean>;
  
  // Document operations
  generateContract(bookingId: UUID, template: string): Promise<Document>;
  getDocumentById(id: UUID): Promise<Document | null>;
  
  // Deposit operations
  depositAction(bookingId: UUID, action: string, amount?: MoneyInput): Promise<DepositTransaction>;
  getDepositTransactionById(id: UUID): Promise<DepositTransaction | null>;
}
