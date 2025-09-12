import { describe, it, expect, vi } from 'vitest';
import type { IListingsDL } from '@repo/datalayer';

// Mock implementation of IListingsDL
const mockDL: IListingsDL = {
  getListingById: vi.fn(),
  listListings: vi.fn(),
  upsertListing: vi.fn(),
  setPricing: vi.fn(),
  addDiscountRule: vi.fn(),
  removeDiscountRule: vi.fn(),
};

describe('Listings Resolvers', () => {
  it('should create listing', async () => {
    const mockListing = {
      id: 'listing-1',
      unitId: 'unit-1',
      status: 'PUBLISHED' as const,
      channel: 'DIRECT' as const,
      basePrice: { amount: 5000, currency: 'RUB' },
      minNights: 1,
      maxNights: 30,
      externalId: undefined,
      lastSyncAt: new Date().toISOString(),
    };

    vi.mocked(mockDL.upsertListing).mockResolvedValue(mockListing);

    const result = await mockDL.upsertListing({
      unitId: 'unit-1',
      status: 'PUBLISHED',
      channel: 'DIRECT',
      basePrice: { amount: 5000, currency: 'RUB' },
      minNights: 1,
      maxNights: 30,
    });

    expect(result).toEqual(mockListing);
    expect(mockDL.upsertListing).toHaveBeenCalledWith({
      unitId: 'unit-1',
      status: 'PUBLISHED',
      channel: 'DIRECT',
      basePrice: { amount: 5000, currency: 'RUB' },
      minNights: 1,
      maxNights: 30,
    });
  });

  it('should set pricing', async () => {
    const mockListing = {
      id: 'listing-1',
      unitId: 'unit-1',
      status: 'PUBLISHED' as const,
      channel: 'DIRECT' as const,
      basePrice: { amount: 6000, currency: 'RUB' },
      minNights: 2,
      maxNights: 14,
      externalId: undefined,
      lastSyncAt: new Date().toISOString(),
    };

    vi.mocked(mockDL.setPricing).mockResolvedValue(mockListing);

    const result = await mockDL.setPricing(
      'listing-1',
      { amount: 6000, currency: 'RUB' },
      2,
      14
    );

    expect(result).toEqual(mockListing);
    expect(mockDL.setPricing).toHaveBeenCalledWith(
      'listing-1',
      { amount: 6000, currency: 'RUB' },
      2,
      14
    );
  });

  it('should add discount rule', async () => {
    const mockDiscountRule = {
      id: 'discount-1',
      listingId: 'listing-1',
      name: 'Early Bird',
      percentOff: 15,
      minNights: 7,
    };

    vi.mocked(mockDL.addDiscountRule).mockResolvedValue(mockDiscountRule);

    const result = await mockDL.addDiscountRule({
      listingId: 'listing-1',
      name: 'Early Bird',
      percentOff: 15,
      minNights: 7,
    });

    expect(result).toEqual(mockDiscountRule);
    expect(mockDL.addDiscountRule).toHaveBeenCalledWith({
      listingId: 'listing-1',
      name: 'Early Bird',
      percentOff: 15,
      minNights: 7,
    });
  });
});
