import type { Context } from '../context.js';

import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('listings-subgraph-resolvers');
export const resolvers: any = {
  Query: {
    listing: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getListingById(id),
    listings: (_: unknown, { unitId, first, after }: { unitId: string; first?: number; after?: string }, { dl }: Context) => 
      dl.listListings(unitId, first, after),
  },
  Mutation: {
    upsertListing: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.upsertListing(input),
    setPricing: (_: unknown, { listingId, basePrice, minNights, maxNights }: { 
      listingId: string; 
      basePrice: any; 
      minNights: number; 
      maxNights?: number 
    }, { dl }: Context) => dl.setPricing(listingId, basePrice, minNights, maxNights),
    addDiscountRule: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.addDiscountRule(input),
    removeDiscountRule: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.removeDiscountRule(id),
  },
  // Все связи между типами будут решаться на уровне mesh через base-schema.gql
  // Здесь оставляем только прямые запросы к данным
};
