import type { UUID, DateTime, Money } from '@repo/shared/types-only';

export type { UUID, DateTime, Money };

export type Channel = 'DIRECT' | 'AIRBNB' | 'BOOKING' | 'AVITO';
export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Listing {
  id: UUID;
  unitId: UUID;
  status: ListingStatus;
  channel: Channel;
  basePrice: Money;
  minNights: number;
  maxNights?: number;
  externalId?: string;
  lastSyncAt?: DateTime;
}

export interface DiscountRule {
  id: UUID;
  listingId: UUID;
  name: string;
  percentOff: number;
  minNights?: number;
}
