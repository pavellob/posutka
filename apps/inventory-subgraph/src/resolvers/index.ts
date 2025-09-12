import type { Context } from '../context.js';

export const resolvers = {
  Query: {
    property: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getPropertyById(id),
    unit: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getUnitById(id),
  },
  Mutation: {
    createProperty: (_: unknown, args: any, { dl }: Context) => dl.createProperty(args),
    createUnit: (_: unknown, args: any, { dl }: Context) => dl.createUnit(args),
    blockDates: (_: unknown, args: any, { dl }: Context) => dl.blockDates(args.unitId, args.from, args.to, args.note),
  },
  // Все связи между типами будут решаться на уровне mesh через base-schema.gql
  // Здесь оставляем только прямые запросы к данным
};
