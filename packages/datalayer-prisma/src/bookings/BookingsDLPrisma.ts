// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';
import type { 
  IBookingsDL, 
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
} from '@repo/datalayer';

export class BookingsDLPrisma implements IBookingsDL {
  constructor(private readonly prisma: PrismaClient) {}

  async getBookingById(id: string): Promise<Booking | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { guest: true }
    });
    
    if (!booking) return null;
    
    return this.mapBookingFromPrisma(booking);
  }

  async getBookingByExternalRef(externalSource: string, externalId: string): Promise<Booking | null> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        externalSource,
        externalId,
      },
      include: { guest: true }
    });
    
    if (!booking) return null;
    
    return this.mapBookingFromPrisma(booking);
  }

  async listBookings(params: ListBookingsParams): Promise<BookingConnection> {
    const where: any = {};
    
    if (params.orgId) where.orgId = params.orgId;
    if (params.unitId) where.unitId = params.unitId;
    if (params.status) where.status = params.status;
    if (params.from || params.to) {
      where.OR = [];
      if (params.from) where.OR.push({ checkIn: { gte: new Date(params.from) } });
      if (params.to) where.OR.push({ checkOut: { lte: new Date(params.to) } });
    }

    const first = params.first || 10;
    const skip = params.after ? 1 : 0;
    const cursor = params.after ? { id: params.after } : undefined;

    const [bookings, totalCount] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: { guest: true },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.booking.count({ where })
    ]);

    const hasNextPage = bookings.length > first;
    const edges = bookings.slice(0, first).map((booking: any) => ({
      node: this.mapBookingFromPrisma(booking),
      cursor: booking.id
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!params.after,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor
      },
      totalCount
    };
  }

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    // First, upsert the guest
    const guest = await this.upsertGuest(input.guest);
    
    // Create the booking
    const booking = await this.prisma.booking.create({
      data: {
        orgId: input.orgId,
        unitId: input.unitId,
        guestId: guest.id,
        checkIn: new Date(input.checkIn),
        checkOut: new Date(input.checkOut),
        guestsCount: input.guestsCount,
        basePriceAmount: input.priceBreakdown.basePrice.amount,
        basePriceCurrency: input.priceBreakdown.basePrice.currency,
        cleaningFeeAmount: input.priceBreakdown.cleaningFee?.amount,
        cleaningFeeCurrency: input.priceBreakdown.cleaningFee?.currency,
        serviceFeeAmount: input.priceBreakdown.serviceFee?.amount,
        serviceFeeCurrency: input.priceBreakdown.serviceFee?.currency,
        taxesAmount: input.priceBreakdown.taxes?.amount,
        taxesCurrency: input.priceBreakdown.taxes?.currency,
        totalAmount: input.priceBreakdown.total.amount,
        totalCurrency: input.priceBreakdown.total.currency,
        notes: input.notes,
        source: input.source || 'DIRECT',
        status: 'PENDING',
        externalSource: input.externalSource,
        externalId: input.externalId,
      },
      include: { guest: true }
    });

    return this.mapBookingFromPrisma(booking);
  }

  async updateBooking(input: UpdateBookingInput): Promise<Booking> {
    const data: any = {};
    if (input.guestId) data.guestId = input.guestId;
    if (input.checkIn) data.checkIn = new Date(input.checkIn);
    if (input.checkOut) data.checkOut = new Date(input.checkOut);
    if (input.guestsCount) data.guestsCount = input.guestsCount;
    if (input.status) data.status = input.status;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.cancellationReason !== undefined) data.cancellationReason = input.cancellationReason;

    const updatedBooking = await this.prisma.booking.update({
      where: { id: input.id },
      data,
      include: { guest: true },
    });

    return this.mapBookingFromPrisma(updatedBooking);
  }

  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    const booking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason
      },
      include: { guest: true }
    });

    return this.mapBookingFromPrisma(booking);
  }

  async changeBookingDates(id: string, checkIn: string, checkOut: string): Promise<Booking> {
    const booking = await this.prisma.booking.update({
      where: { id },
      data: {
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut)
      },
      include: { guest: true }
    });

    return this.mapBookingFromPrisma(booking);
  }

  async getGuestById(id: string): Promise<Guest | null> {
    const guest = await this.prisma.guest.findUnique({ where: { id } });
    return guest ? this.mapGuestFromPrisma(guest) : null;
  }

  async upsertGuest(guest: {
    name: string;
    email: string;
    phone?: string;
    documentType?: string;
    documentNumber?: string;
  }): Promise<Guest> {
    const existingGuest = await this.prisma.guest.findFirst({
      where: { email: guest.email }
    });

    if (existingGuest) {
      const updatedGuest = await this.prisma.guest.update({
        where: { id: existingGuest.id },
        data: {
          name: guest.name,
          phone: guest.phone,
          documentType: guest.documentType,
          documentNumber: guest.documentNumber
        }
      });
      return this.mapGuestFromPrisma(updatedGuest);
    }

    const newGuest = await this.prisma.guest.create({
      data: guest
    });

    return this.mapGuestFromPrisma(newGuest);
  }

  async isRangeAvailable(unitId: string, checkIn: string, checkOut: string, excludeBookingId?: string): Promise<boolean> {
    const where: any = {
      unitId,
      status: { not: 'CANCELLED' },
      OR: [
        {
          AND: [
            { checkIn: { lt: new Date(checkOut) } },
            { checkOut: { gt: new Date(checkIn) } }
          ]
        }
      ]
    };

    if (excludeBookingId) {
      where.id = { not: excludeBookingId };
    }

    const conflictingBookings = await this.prisma.booking.count({ where });
    return conflictingBookings === 0;
  }

  async generateContract(bookingId: string, template: string): Promise<Document> {
    const document = await this.prisma.document.create({
      data: {
        bookingId,
        type: 'CONTRACT',
        template,
        content: `Contract content for booking ${bookingId} using template ${template}`
      }
    });

    return this.mapDocumentFromPrisma(document);
  }

  async getDocumentById(id: string): Promise<Document | null> {
    const document = await this.prisma.document.findUnique({ where: { id } });
    return document ? this.mapDocumentFromPrisma(document) : null;
  }

  async depositAction(bookingId: string, action: string, amount?: MoneyInput): Promise<DepositTransaction> {
    const transaction = await this.prisma.depositTransaction.create({
      data: {
        bookingId,
        action: action as any,
        amount: amount?.amount || 0,
        currency: amount?.currency || 'RUB',
        status: 'PENDING'
      }
    });

    return this.mapDepositTransactionFromPrisma(transaction);
  }

  async getDepositTransactionById(id: string): Promise<DepositTransaction | null> {
    const transaction = await this.prisma.depositTransaction.findUnique({ where: { id } });
    return transaction ? this.mapDepositTransactionFromPrisma(transaction) : null;
  }

  private mapBookingFromPrisma(booking: any): Booking {
    return {
      id: booking.id,
      orgId: booking.orgId,
      unitId: booking.unitId,
      guestId: booking.guestId,
      status: booking.status,
      source: booking.source,
      checkIn: booking.checkIn.toISOString(),
      checkOut: booking.checkOut.toISOString(),
      guestsCount: booking.guestsCount,
      priceBreakdown: {
        basePrice: { amount: booking.basePriceAmount, currency: booking.basePriceCurrency },
        cleaningFee: booking.cleaningFeeAmount ? { amount: booking.cleaningFeeAmount, currency: booking.cleaningFeeCurrency } : undefined,
        serviceFee: booking.serviceFeeAmount ? { amount: booking.serviceFeeAmount, currency: booking.serviceFeeCurrency } : undefined,
        taxes: booking.taxesAmount ? { amount: booking.taxesAmount, currency: booking.taxesCurrency } : undefined,
        total: { amount: booking.totalAmount, currency: booking.totalCurrency }
      },
      notes: booking.notes,
      cancellationReason: booking.cancellationReason,
      externalSource: booking.externalSource || undefined,
      externalId: booking.externalId || undefined,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString()
    };
  }

  private mapGuestFromPrisma(guest: any): Guest {
    return {
      id: guest.id,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      documentType: guest.documentType,
      documentNumber: guest.documentNumber,
      createdAt: guest.createdAt.toISOString(),
      updatedAt: guest.updatedAt.toISOString()
    };
  }

  private mapDocumentFromPrisma(document: any): Document {
    return {
      id: document.id,
      bookingId: document.bookingId,
      type: document.type,
      template: document.template,
      content: document.content,
      signedAt: document.signedAt?.toISOString(),
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString()
    };
  }

  private mapDepositTransactionFromPrisma(transaction: any): DepositTransaction {
    return {
      id: transaction.id,
      bookingId: transaction.bookingId,
      action: transaction.action,
      amount: { amount: transaction.amount, currency: transaction.currency },
      status: transaction.status,
      transactionId: transaction.transactionId,
      notes: transaction.notes,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    };
  }
}
