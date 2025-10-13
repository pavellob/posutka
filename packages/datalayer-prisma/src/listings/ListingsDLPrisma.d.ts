import { PrismaClient } from '@prisma/client';
import type { IListingsDL, Listing, DiscountRule, UpsertListingInput, DiscountRuleInput, Money, UUID } from '@repo/datalayer';
export declare class ListingsDLPrisma implements IListingsDL {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    getListingById(id: string): Promise<(Listing & {
        discounts: DiscountRule[];
    }) | null>;
    listListings(unitId: string, first?: number, after?: string): Promise<{
        edges: Listing[];
        endCursor?: string;
        hasNextPage: boolean;
    }>;
    upsertListing(input: UpsertListingInput & {
        id?: UUID;
    }): Promise<Listing>;
    setPricing(listingId: string, price: Money, minNights: number, maxNights?: number): Promise<Listing>;
    addDiscountRule(input: DiscountRuleInput): Promise<DiscountRule>;
    removeDiscountRule(id: string): Promise<Listing>;
    private mapListingFromPrisma;
    private mapDiscountRuleFromPrisma;
}
