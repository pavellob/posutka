export const resolvers = {
    Query: {
        listing: (_, { id }, { dl }) => dl.getListingById(id),
        listings: (_, { unitId, first, after }, { dl }) => dl.listListings(unitId, first, after),
    },
    Mutation: {
        upsertListing: (_, { input }, { dl }) => dl.upsertListing(input),
        setPricing: (_, { listingId, basePrice, minNights, maxNights }, { dl }) => dl.setPricing(listingId, basePrice, minNights, maxNights),
        addDiscountRule: (_, { input }, { dl }) => dl.addDiscountRule(input),
        removeDiscountRule: (_, { id }, { dl }) => dl.removeDiscountRule(id),
    },
    // Все связи между типами будут решаться на уровне mesh через base-schema.gql
    // Здесь оставляем только прямые запросы к данным
};
