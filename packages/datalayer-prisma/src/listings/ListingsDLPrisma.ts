// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';
import type {
  IListingsDL,
  Listing,
  DiscountRule,
  UpsertListingInput,
  DiscountRuleInput,
  Money,
  UUID,
} from '@repo/datalayer';

export class ListingsDLPrisma implements IListingsDL {
  constructor(private readonly prisma: PrismaClient) {}

  async getListingById(id: string): Promise<(Listing & { discounts: DiscountRule[] }) | null> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { discounts: true }
    });
    
    if (!listing) return null;
    
    return {
      ...this.mapListingFromPrisma(listing),
      discounts: listing.discounts.map((discount: any) => this.mapDiscountRuleFromPrisma(discount))
    };
  }

  async listListings(unitId: string, first?: number, after?: string): Promise<{ edges: Listing[]; endCursor?: string; hasNextPage: boolean }> {
    const limit = first || 10;
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const listings = await this.prisma.listing.findMany({
      where: { unitId },
      take: limit + 1,
      skip,
      cursor,
      orderBy: { createdAt: 'desc' }
    });

    const hasNextPage = listings.length > limit;
    const edges = hasNextPage ? listings.slice(0, -1) : listings;
    const endCursor = edges.length > 0 ? edges[edges.length - 1].id : undefined;

    return {
      edges: edges.map((listing: any) => this.mapListingFromPrisma(listing)),
      endCursor,
      hasNextPage
    };
  }

  async upsertListing(input: UpsertListingInput & { id?: UUID }): Promise<Listing> {
    const data = {
      unitId: input.unitId,
      status: input.status,
      channel: input.channel,
      basePriceAmount: input.basePrice.amount,
      basePriceCurrency: input.basePrice.currency,
      minNights: input.minNights,
      maxNights: input.maxNights,
      externalId: input.externalId,
      updatedAt: new Date().toISOString(),
    };

    const listing = input.id 
      ? await this.prisma.listing.update({
          where: { id: input.id },
          data
        })
      : await this.prisma.listing.create({
          data: {
            id: crypto.randomUUID(),
            ...data,
            createdAt: new Date().toISOString(),
          }
        });

    return this.mapListingFromPrisma(listing);
  }

  async setPricing(listingId: string, price: Money, minNights: number, maxNights?: number): Promise<Listing> {
    const listing = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        basePriceAmount: price.amount,
        basePriceCurrency: price.currency,
        minNights,
        maxNights,
        updatedAt: new Date().toISOString(),
      }
    });

    return this.mapListingFromPrisma(listing);
  }

  async addDiscountRule(input: DiscountRuleInput): Promise<DiscountRule> {
    const discountRule = await this.prisma.discountRule.create({
      data: {
        id: crypto.randomUUID(),
        listingId: input.listingId,
        name: input.name,
        percentOff: input.percentOff,
        minNights: input.minNights,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    });

    return this.mapDiscountRuleFromPrisma(discountRule);
  }

  async removeDiscountRule(id: string): Promise<Listing> {
    // Сначала получаем listingId для возврата обновленного листинга
    const discountRule = await this.prisma.discountRule.findUnique({
      where: { id },
      select: { listingId: true }
    });

    if (!discountRule) {
      throw new Error('Discount rule not found');
    }

    // Удаляем правило скидки
    await this.prisma.discountRule.delete({
      where: { id }
    });

    // Возвращаем обновленный листинг
    const listing = await this.prisma.listing.findUnique({
      where: { id: discountRule.listingId }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    return this.mapListingFromPrisma(listing);
  }

  private mapListingFromPrisma(listing: any): Listing {
    return {
      id: listing.id,
      unitId: listing.unitId,
      status: listing.status,
      channel: listing.channel,
      basePrice: { amount: listing.basePriceAmount, currency: listing.basePriceCurrency },
      minNights: listing.minNights,
      maxNights: listing.maxNights,
      externalId: listing.externalId,
      lastSyncAt: listing.lastSyncAt
    };
  }

  private mapDiscountRuleFromPrisma(discountRule: any): DiscountRule {
    return {
      id: discountRule.id,
      listingId: discountRule.listingId,
      name: discountRule.name,
      percentOff: discountRule.percentOff,
      minNights: discountRule.minNights
    };
  }
}
