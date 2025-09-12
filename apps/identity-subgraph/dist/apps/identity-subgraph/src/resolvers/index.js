export const resolvers = {
    Query: {
        user: (_, { id }, { dl }) => dl.getUserById(id),
        userByEmail: (_, { email }, { dl }) => dl.getUserByEmail(email),
        users: (_, params, { dl }) => dl.listUsers(params),
        organization: (_, { id }, { dl }) => dl.getOrganizationById(id),
        organizations: (_, params, { dl }) => dl.listOrganizations(params),
        membership: (_, { id }, { dl }) => dl.getMembershipById(id),
        membershipsByOrg: (_, { orgId }, { dl }) => dl.getMembershipsByOrg(orgId),
        membershipsByUser: (_, { userId }, { dl }) => dl.getMembershipsByUser(userId),
    },
    Mutation: {
        createUser: (_, { input }, { dl }) => dl.createUser(input),
        updateUser: (_, { id, input }, { dl }) => dl.updateUser(id, input),
        createOrganization: (_, { input }, { dl }) => dl.createOrganization(input),
        updateOrganization: (_, { id, input }, { dl }) => dl.updateOrganization(id, input),
        addMember: (_, { input }, { dl }) => dl.addMember(input),
        updateMemberRole: (_, { input }, { dl }) => dl.updateMemberRole(input),
        removeMember: (_, { membershipId }, { dl }) => dl.removeMember(membershipId),
    },
    // Все связи между типами будут решаться на уровне mesh через base-schema.gql
    // Здесь оставляем только прямые запросы к данным
};
