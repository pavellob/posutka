import { describe, it, expect, beforeEach } from 'vitest';
import type { IBookingsDL, Booking, Guest, Document, DepositTransaction, BookingConnection } from '@repo/datalayer';
import { resolvers } from '../src/resolvers/index.js';

// Mock DataLayer implementation
class MockBookingsDL implements IBookingsDL {
  private bookings: Map<string, Booking> = new Map();
  private guests: Map<string, Guest> = new Map();
  private documents: Map<string, Document> = new Map();
  private transactions: Map<string, DepositTransaction> = new Map();

  async getBookingById(id: string): Promise<Booking | null> {
    return this.bookings.get(id) || null;
  }

  async listBookings(params: any): Promise<BookingConnection> {
    const bookings = Array.from(this.bookings.values());
    return {
      edges: bookings.map(booking => ({ node: booking, cursor: booking.id })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: bookings[0]?.id,
        endCursor: bookings[bookings.length - 1]?.id
      },
      totalCount: bookings.length
    };
  }

  async createBooking(input: any): Promise<Booking> {
    const guest = await this.upsertGuest(input.guest);
    const booking: Booking = {
      id: `booking_${Date.now()}`,
      orgId: input.orgId,
      unitId: input.unitId,
      guestId: guest.id,
      status: 'PENDING',
      source: input.source || 'DIRECT',
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guestsCount: input.guestsCount,
      priceBreakdown: input.priceBreakdown,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.bookings.set(booking.id, booking);
    return booking;
  }

  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    const booking = this.bookings.get(id);
    if (!booking) throw new Error('Booking not found');
    
    const updatedBooking = { ...booking, status: 'CANCELLED' as const, cancellationReason: reason };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async changeBookingDates(id: string, checkIn: string, checkOut: string): Promise<Booking> {
    const booking = this.bookings.get(id);
    if (!booking) throw new Error('Booking not found');
    
    const updatedBooking = { ...booking, checkIn, checkOut };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async getGuestById(id: string): Promise<Guest | null> {
    return this.guests.get(id) || null;
  }

  async upsertGuest(guest: any): Promise<Guest> {
    const existingGuest = Array.from(this.guests.values()).find(g => g.email === guest.email);
    
    if (existingGuest) {
      const updatedGuest = { ...existingGuest, ...guest };
      this.guests.set(existingGuest.id, updatedGuest);
      return updatedGuest;
    }

    const newGuest: Guest = {
      id: `guest_${Date.now()}`,
      ...guest,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.guests.set(newGuest.id, newGuest);
    return newGuest;
  }

  async isRangeAvailable(unitId: string, checkIn: string, checkOut: string, excludeBookingId?: string): Promise<boolean> {
    // Simple mock - always available
    return true;
  }

  async generateContract(bookingId: string, template: string): Promise<Document> {
    const document: Document = {
      id: `doc_${Date.now()}`,
      bookingId,
      type: 'CONTRACT',
      template,
      content: `Contract for booking ${bookingId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.documents.set(document.id, document);
    return document;
  }

  async getDocumentById(id: string): Promise<Document | null> {
    return this.documents.get(id) || null;
  }

  async depositAction(bookingId: string, action: string, amount?: any): Promise<DepositTransaction> {
    const transaction: DepositTransaction = {
      id: `tx_${Date.now()}`,
      bookingId,
      action: action as any,
      amount: amount || { amount: 0, currency: 'RUB' },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async getDepositTransactionById(id: string): Promise<DepositTransaction | null> {
    return this.transactions.get(id) || null;
  }
}

describe('Bookings Resolvers', () => {
  let mockDataLayer: MockBookingsDL;
  let context: { dl: IBookingsDL };

  beforeEach(() => {
    mockDataLayer = new MockBookingsDL();
    context = { dl: mockDataLayer };
  });

  describe('Query', () => {
    it('should get booking by id', async () => {
      const booking = await mockDataLayer.createBooking({
        orgId: 'org1',
        unitId: 'unit1',
        guest: { name: 'Test Guest', email: 'test@example.com' },
        checkIn: '2025-01-01T00:00:00.000Z',
        checkOut: '2025-01-05T00:00:00.000Z',
        guestsCount: 2,
        priceBreakdown: {
          basePrice: { amount: 1000, currency: 'RUB' },
          total: { amount: 1000, currency: 'RUB' }
        }
      });

      const result = await resolvers.Query.booking(null, { id: booking.id }, context);
      expect(result).toEqual(booking);
    });

    it('should return null for non-existent booking', async () => {
      const result = await resolvers.Query.booking(null, { id: 'non-existent' }, context);
      expect(result).toBeNull();
    });

    it('should list bookings', async () => {
      const result = await resolvers.Query.bookings(null, {}, context);
      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('pageInfo');
      expect(result).toHaveProperty('totalCount');
    });
  });

  describe('Mutation', () => {
    it('should create booking', async () => {
      const input = {
        orgId: 'org1',
        unitId: 'unit1',
        guest: { name: 'New Guest', email: 'new@example.com' },
        checkIn: '2025-01-01T00:00:00.000Z',
        checkOut: '2025-01-05T00:00:00.000Z',
        guestsCount: 2,
        priceBreakdown: {
          basePrice: { amount: 1000, currency: 'RUB' },
          total: { amount: 1000, currency: 'RUB' }
        }
      };

      const result = await resolvers.Mutation.createBooking(null, { input }, context);
      expect(result).toMatchObject({
        orgId: input.orgId,
        unitId: input.unitId,
        guestsCount: input.guestsCount
      });
      expect(result.id).toBeDefined();
    });

    it('should cancel booking', async () => {
      const booking = await mockDataLayer.createBooking({
        orgId: 'org1',
        unitId: 'unit1',
        guest: { name: 'Test Guest', email: 'test@example.com' },
        checkIn: '2025-01-01T00:00:00.000Z',
        checkOut: '2025-01-05T00:00:00.000Z',
        guestsCount: 2,
        priceBreakdown: {
          basePrice: { amount: 1000, currency: 'RUB' },
          total: { amount: 1000, currency: 'RUB' }
        }
      });

      const result = await resolvers.Mutation.cancelBooking(null, { id: booking.id, reason: 'Guest cancelled' }, context);
      expect(result.status).toBe('CANCELLED');
      expect(result.cancellationReason).toBe('Guest cancelled');
    });

    it('should generate contract', async () => {
      const booking = await mockDataLayer.createBooking({
        orgId: 'org1',
        unitId: 'unit1',
        guest: { name: 'Test Guest', email: 'test@example.com' },
        checkIn: '2025-01-01T00:00:00.000Z',
        checkOut: '2025-01-05T00:00:00.000Z',
        guestsCount: 2,
        priceBreakdown: {
          basePrice: { amount: 1000, currency: 'RUB' },
          total: { amount: 1000, currency: 'RUB' }
        }
      });

      const result = await resolvers.Mutation.generateContract(null, { bookingId: booking.id, template: 'standard' }, context);
      expect(result).toMatchObject({
        bookingId: booking.id,
        type: 'CONTRACT',
        template: 'standard'
      });
    });
  });

  describe('Entity Resolvers', () => {
    it('should resolve Booking reference', async () => {
      const booking = await mockDataLayer.createBooking({
        orgId: 'org1',
        unitId: 'unit1',
        guest: { name: 'Test Guest', email: 'test@example.com' },
        checkIn: '2025-01-01T00:00:00.000Z',
        checkOut: '2025-01-05T00:00:00.000Z',
        guestsCount: 2,
        priceBreakdown: {
          basePrice: { amount: 1000, currency: 'RUB' },
          total: { amount: 1000, currency: 'RUB' }
        }
      });

      const result = await resolvers.Booking__resolveReference({ id: booking.id }, context);
      expect(result).toEqual(booking);
    });

    it('should resolve Guest reference', async () => {
      const guest = await mockDataLayer.upsertGuest({
        name: 'Test Guest',
        email: 'test@example.com'
      });

      const result = await resolvers.Guest__resolveReference({ id: guest.id }, context);
      expect(result).toEqual(guest);
    });
  });
});
