import type { Context } from '../context.js';

import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('legal-subgraph-resolvers');
export const resolvers: any = {
  Query: {
    document: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getDocument(id),
    depositTx: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getDepositTx(id),
  },
  Mutation: {
    generateContract: (_: unknown, { bookingId, template }: { bookingId: string; template?: string }, { dl }: Context) => 
      dl.generateContract(bookingId, template),
    depositAction: (_: unknown, { bookingId, action, amount }: { 
      bookingId: string; 
      action: string; 
      amount?: any 
    }, { dl }: Context) => dl.depositAction(bookingId, action as any, amount),
  },
  // Все связи между типами будут решаться на уровне mesh через base-schema.gql
  // Здесь оставляем только прямые запросы к данным
};
