import { PrismaClient } from '@prisma/client';
import type { IBookingsDL, Booking, Guest, Document, DepositTransaction, BookingConnection, CreateBookingInput, ListBookingsParams, MoneyInput } from '@repo/datalayer';
export declare class BookingsDLPrisma implements IBookingsDL {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    getBookingById(id: string): Promise<Booking | null>;
    listBookings(params: ListBookingsParams): Promise<BookingConnection>;
    createBooking(input: CreateBookingInput): Promise<Booking>;
    cancelBooking(id: string, reason?: string): Promise<Booking>;
    changeBookingDates(id: string, checkIn: string, checkOut: string): Promise<Booking>;
    getGuestById(id: string): Promise<Guest | null>;
    upsertGuest(guest: {
        name: string;
        email: string;
        phone?: string;
        documentType?: string;
        documentNumber?: string;
    }): Promise<Guest>;
    isRangeAvailable(unitId: string, checkIn: string, checkOut: string, excludeBookingId?: string): Promise<boolean>;
    generateContract(bookingId: string, template: string): Promise<Document>;
    getDocumentById(id: string): Promise<Document | null>;
    depositAction(bookingId: string, action: string, amount?: MoneyInput): Promise<DepositTransaction>;
    getDepositTransactionById(id: string): Promise<DepositTransaction | null>;
    private mapBookingFromPrisma;
    private mapGuestFromPrisma;
    private mapDocumentFromPrisma;
    private mapDepositTransactionFromPrisma;
}
