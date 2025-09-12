export const resolvers = {
    Query: {
        property: (_, { id }, { dl }) => dl.getPropertyById(id),
        unit: (_, { id }, { dl }) => dl.getUnitById(id),
    },
    // Резолверы для связей между типами
    Unit: {
        property: (parent, _, { dl }) => {
            return dl.getPropertyById(parent.propertyId);
        },
    },
    Mutation: {
        createProperty: (_, args, { dl }) => dl.createProperty(args),
        createUnit: (_, args, { dl }) => dl.createUnit(args),
        blockDates: (_, args, { dl }) => dl.blockDates(args.unitId, args.from, args.to, args.note),
    },
    // Все связи между типами будут решаться на уровне mesh через base-schema.gql
    // Здесь оставляем только прямые запросы к данным
};
