export const resolvers = {
    Query: {
        document: (_, { id }, { dl }) => dl.getDocument(id),
        depositTx: (_, { id }, { dl }) => dl.getDepositTx(id),
    },
    Mutation: {
        generateContract: (_, { bookingId, template }, { dl }) => dl.generateContract(bookingId, template),
        depositAction: (_, { bookingId, action, amount }, { dl }) => dl.depositAction(bookingId, action, amount),
    },
    // Все связи между типами будут решаться на уровне mesh через base-schema.gql
    // Здесь оставляем только прямые запросы к данным
};
