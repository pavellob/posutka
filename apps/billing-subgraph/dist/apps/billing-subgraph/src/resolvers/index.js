export const resolvers = {
    Query: {
        invoice: (_, { id }, { dl }) => dl.getInvoiceById(id),
        invoices: (_, params, { dl }) => dl.listInvoices(params),
        payment: (_, { id }, { dl }) => dl.getPaymentById(id),
    },
    Mutation: {
        createInvoice: (_, { input }, { dl }) => dl.createInvoice(input),
        addInvoiceItems: (_, { input }, { dl }) => dl.addInvoiceItems(input),
        cancelInvoice: (_, { id }, { dl }) => dl.cancelInvoice(id),
        recordPayment: (_, { input }, { dl }) => dl.recordPayment(input),
        generatePaymentLink: (_, { input }, { dl }) => dl.generatePaymentLink(input),
        issueRefund: (_, { input }, { dl }) => dl.issueRefund(input),
    },
    // Все связи между типами будут решаться на уровне mesh через base-schema.gql
    // Здесь оставляем только прямые запросы к данным
};
