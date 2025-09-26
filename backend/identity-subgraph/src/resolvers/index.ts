import type { Context } from '../context.js';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('identity-resolvers');

export const resolvers: any = {
  Query: {
    user: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getUserById(id),
    userByEmail: (_: unknown, { email }: { email: string }, { dl }: Context) => dl.getUserByEmail(email),
    users: (_: unknown, params: any, { dl }: Context) => dl.listUsers(params),
    
    organization: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getOrganizationById(id),
    organizations: async (_: unknown, params: any, { dl }: Context) => {
      logger.resolverStart('organizations', params);
      const result = await dl.listOrganizations(params);
      logger.resolverEnd('organizations', result);
      logger.info('GraphQL resolver organizations completed', { 
        params, 
        resultCount: Array.isArray(result) ? result.length : result ? 1 : 0 
      });
      return result;
    },
    
    membership: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getMembershipById(id),
    membershipsByOrg: (_: unknown, { orgId }: { orgId: string }, { dl }: Context) => dl.getMembershipsByOrg(orgId),
    membershipsByUser: (_: unknown, { userId }: { userId: string }, { dl }: Context) => dl.getMembershipsByUser(userId),
  },
  
  // Резолверы для связей между типами
  Organization: {
    members: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getMembershipsByOrg(parent.id);
    },
  },
  
  Membership: {
    user: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getUserById(parent.userId);
    },
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