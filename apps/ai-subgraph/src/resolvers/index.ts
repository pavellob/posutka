import type { Context } from '../context.js';

export const resolvers: any = {
  Query: {
    _empty: () => true,
  },
  Mutation: {
    aiCommand: (_: unknown, { orgId, command, context }: { 
      orgId: string; 
      command: string; 
      context?: unknown 
    }, { orchestrator }: Context) => 
      orchestrator.run(orgId, command, context),
  },
};
