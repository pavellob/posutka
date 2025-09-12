export const resolvers = {
    Query: {
        _empty: () => true,
    },
    Mutation: {
        aiCommand: (_, { orgId, command, context }, { orchestrator }) => orchestrator.run(orgId, command, context),
    },
};
