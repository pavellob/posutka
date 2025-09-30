import type {
  UUID,
  Money,
  Listing,
  DiscountRule,
} from './types.js';

export interface UpsertListingInput {
  unitId: UUID;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  channel: 'DIRECT' | 'AIRBNB' | 'BOOKING_COM' | 'AVITO';
  basePrice: Money;
  minNights: number;
  maxNights?: number;
  externalId?: string;
}

export interface DiscountRuleInput {
  listingId: UUID;
  name: string;
  percentOff: number;
  minNights?: number;
}

export interface IListingsDL {
  getListingById(id: UUID): Promise<(Listing & { discounts: DiscountRule[] }) | null>;
  listListings(unitId: UUID, first?: number, after?: string): Promise<{ edges: Listing[]; endCursor?: string; hasNextPage: boolean }>;
  upsertListing(input: UpsertListingInput & { id?: UUID }): Promise<Listing>;
  setPricing(listingId: UUID, price: Money, minNights: number, maxNights?: number): Promise<Listing>;
  addDiscountRule(input: DiscountRuleInput): Promise<DiscountRule>;
  removeDiscountRule(id: UUID): Promise<Listing>;
}
