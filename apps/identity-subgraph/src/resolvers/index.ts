import type { Context } from '../context.js';

export const resolvers: any = {
  Query: {
    user: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getUserById(id),
    userByEmail: (_: unknown, { email }: { email: string }, { dl }: Context) => dl.getUserByEmail(email),
    users: (_: unknown, params: any, { dl }: Context) => dl.listUsers(params),
    
    organization: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getOrganizationById(id),
    organizations: (_: unknown, params: any, { dl }: Context) => dl.listOrganizations(params),
    
    membership: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getMembershipById(id),
    membershipsByOrg: (_: unknown, { orgId }: { orgId: string }, { dl }: Context) => dl.getMembershipsByOrg(orgId),
    membershipsByUser: (_: unknown, { userId }: { userId: string }, { dl }: Context) => dl.getMembershipsByUser(userId),
  },
  Mutation: {
    createUser: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.createUser(input),
    updateUser: (_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) => dl.updateUser(id, input),
    
    createOrganization: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.createOrganization(input),
    updateOrganization: (_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) => dl.updateOrganization(id, input),
    
    addMember: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.addMember(input),
    updateMemberRole: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.updateMemberRole(input),
    removeMember: (_: unknown, { membershipId }: { membershipId: string }, { dl }: Context) => dl.removeMember(membershipId),
  },
  // Все связи между типами будут решаться на уровне mesh через base-schema.gql
  // Здесь оставляем только прямые запросы к данным
};
