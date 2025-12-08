import type { UUID, DateTime, Money } from '@repo/shared/types-only';
export type { UUID, DateTime, Money };
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type BookingSource = 'DIRECT' | 'AIRBNB' | 'BOOKING_COM' | 'AVITO' | 'OTHER';
export type DepositAction = 'HOLD' | 'RELEASE' | 'CHARGE' | 'REFUND';
export interface Guest {
    id: UUID;
    name: string;
    email: string;
    phone?: string;
    documentType?: string;
    documentNumber?: string;
    createdAt: DateTime;
    updatedAt: DateTime;
}
export interface PriceBreakdown {
    basePrice: Money;
    pricePerDay?: Money;
    cleaningFee?: Money;
    serviceFee?: Money;
    taxes?: Money;
    platformTax?: Money;
    prepayment?: Money;
    amount?: Money;
    total: Money;
}
export interface ServiceFee {
    type: string;
    amount: Money;
    description?: string;
}
export interface Booking {
    id: UUID;
    orgId: UUID;
    unitId: UUID;
    guestId: UUID;
    status: BookingStatus;
    source: BookingSource;
    checkIn: DateTime;
    checkOut: DateTime;
    arrivalTime?: string;
    departureTime?: string;
    guestsCount: number;
    priceBreakdown: PriceBreakdown;
    notes?: string;
    cancellationReason?: string;
    createdAt: DateTime;
    updatedAt: DateTime;
}
export interface Document {
    id: UUID;
    bookingId: UUID;
    type: string;
    template: string;
    content: string;
    signedAt?: DateTime;
    createdAt: DateTime;
    updatedAt: DateTime;
}
export interface DepositTransaction {
    id: UUID;
    bookingId: UUID;
    action: DepositAction;
    amount: Money;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    transactionId?: string;
    notes?: string;
    createdAt: DateTime;
    updatedAt: DateTime;
}
export interface BookingConnection {
    edges: Array<{
        node: Booking;
        cursor: string;
    }>;
    pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor?: string;
        endCursor?: string;
    };
    totalCount: number;
}
export interface CreateBookingInput {
    orgId: UUID;
    unitId: UUID;
    guest: {
        name: string;
        email: string;
        phone?: string;
        documentType?: string;
        documentNumber?: string;
    };
    checkIn: DateTime;
    checkOut: DateTime;
    arrivalTime?: string;
    departureTime?: string;
    guestsCount: number;
    priceBreakdown: PriceBreakdown;
    notes?: string;
    source?: BookingSource;
}
export interface MoneyInput {
    amount: number;
    currency: string;
}
export interface ListBookingsParams {
    orgId?: UUID;
    unitId?: UUID;
    from?: DateTime;
    to?: DateTime;
    status?: BookingStatus;
    first?: number;
    after?: string;
}

export interface UpdateBookingInput {
    id: UUID;
    guestId?: UUID;
    checkIn?: DateTime;
    checkOut?: DateTime;
    arrivalTime?: string;
    departureTime?: string;
    guestsCount?: number;
    status?: BookingStatus;
    notes?: string;
    cancellationReason?: string;
    priceBreakdown?: PriceBreakdown;
}
