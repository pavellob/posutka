import type { Context } from '../context.js';

import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('billing-subgraph-resolvers');
export const resolvers: any = {
  Query: {
    invoice: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getInvoiceById(id),
    invoices: (_: unknown, params: any, { dl }: Context) => dl.listInvoices(params),
    payment: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getPaymentById(id),
  },
  Mutation: {
    createInvoice: (_: unknown, { input }: { input: any }, { dl }: Context) => 
      dl.createInvoice(input),
    addInvoiceItems: (_: unknown, { input }: { input: any }, { dl }: Context) => 
      dl.addInvoiceItems(input),
    cancelInvoice: (_: unknown, { id }: { id: string }, { dl }: Context) => 
      dl.cancelInvoice(id),
    recordPayment: (_: unknown, { input }: { input: any }, { dl }: Context) => 
      dl.recordPayment(input),
    generatePaymentLink: (_: unknown, { input }: { input: any }, { dl }: Context) => 
      dl.generatePaymentLink(input),
    issueRefund: (_: unknown, { input }: { input: any }, { dl }: Context) => 
      dl.issueRefund(input),
  },
  // Все связи между типами будут решаться на уровне mesh через base-schema.gql
  // Здесь оставляем только прямые запросы к данным
};
