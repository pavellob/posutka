// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';
import type {
  IIdentityDL,
  User,
  Organization,
  Membership,
  CreateUserInput,
  CreateOrganizationInput,
  AddMemberInput,
  UpdateMemberRoleInput,
  UUID,
} from '@repo/datalayer';
import type { UserConnection, OrganizationConnection } from '@repo/datalayer/src/identity/connection-types.js';

export class IdentityDLPrisma implements IIdentityDL {
  constructor(private readonly prisma: PrismaClient) {}

  async getUserById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) return null;
    
    return this.mapUserFromPrisma(user);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) return null;
    
    return this.mapUserFromPrisma(user);
  }

  async listUsers(params: { first?: number; after?: string }): Promise<UserConnection> {
    const first = params.first || 10;
    const skip = params.after ? 1 : 0;
    const cursor = params.after ? { id: params.after } : undefined;

    const users = await this.prisma.user.findMany({
      take: first + 1,
      skip,
      cursor,
      orderBy: { createdAt: 'desc' }
    });

    const hasNextPage = users.length > first;
    const edges = hasNextPage ? users.slice(0, -1) : users;
    const startCursor = edges.length > 0 ? edges[0].id : undefined;
    const endCursor = edges.length > 0 ? edges[edges.length - 1].id : undefined;
    const totalCount = await this.prisma.user.count();

    return {
      edges: edges.map((user: any) => ({
        node: this.mapUserFromPrisma(user),
        cursor: user.id
      })),
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!params.after,
        startCursor,
        endCursor,
        totalCount
      }
    };
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: input.password || ''
      }
    });
    
    return this.mapUserFromPrisma(user);
  }

  async updateUser(id: string, input: Partial<CreateUserInput & { systemRoles?: string[]; status?: string; isLocked?: boolean }>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.email && { email: input.email }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.password && { password: input.password }),
        ...(input.systemRoles && { systemRoles: input.systemRoles }),
        ...(input.status && { status: input.status }),
        ...(input.isLocked !== undefined && { isLocked: input.isLocked })
      }
    });
    
    return this.mapUserFromPrisma(user);
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id }
    });
    
    if (!org) return null;
    
    return this.mapOrganizationFromPrisma(org);
  }

  async listOrganizations(params: { first?: number; after?: string }): Promise<OrganizationConnection> {
    const first = params.first || 10;
    const skip = params.after ? 1 : 0;
    const cursor = params.after ? { id: params.after } : undefined;

    const orgs = await this.prisma.organization.findMany({
      take: first + 1,
      skip,
      cursor,
      orderBy: { createdAt: 'desc' }
    });

    const hasNextPage = orgs.length > first;
    const edges = hasNextPage ? orgs.slice(0, -1) : orgs;
    const startCursor = edges.length > 0 ? edges[0].id : undefined;
    const endCursor = edges.length > 0 ? edges[edges.length - 1].id : undefined;
    const totalCount = await this.prisma.organization.count();

    return {
      edges: edges.map((org: any) => ({
        node: this.mapOrganizationFromPrisma(org),
        cursor: org.id
      })),
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!params.after,
        startCursor,
        endCursor,
        totalCount
      }
    };
  }

  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    const org = await this.prisma.organization.create({
      data: input
    });
    
    return this.mapOrganizationFromPrisma(org);
  }

  async updateOrganization(id: string, input: Partial<CreateOrganizationInput>): Promise<Organization> {
    const org = await this.prisma.organization.update({
      where: { id },
      data: input
    });
    
    return this.mapOrganizationFromPrisma(org);
  }

  async getMembershipById(id: string): Promise<Membership | null> {
    const membership = await this.prisma.membership.findUnique({
      where: { id }
    });
    
    if (!membership) return null;
    
    return this.mapMembershipFromPrisma(membership);
  }

  async getMembershipsByOrg(orgId: string): Promise<Membership[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { orgId }
    });
    
    return memberships.map((membership: any) => this.mapMembershipFromPrisma(membership));
  }

  async getMembershipsByUser(userId: string): Promise<Membership[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId }
    });
    
    return memberships.map((membership: any) => this.mapMembershipFromPrisma(membership));
  }

  async addMember(input: AddMemberInput): Promise<Membership> {
    const membership = await this.prisma.membership.create({
      data: input
    });
    
    return this.mapMembershipFromPrisma(membership);
  }

  async updateMemberRole(input: UpdateMemberRoleInput): Promise<Membership> {
    const membership = await this.prisma.membership.update({
      where: { id: input.membershipId },
      data: { role: input.role }
    });
    
    return this.mapMembershipFromPrisma(membership);
  }

  async removeMember(membershipId: string): Promise<void> {
    await this.prisma.membership.delete({
      where: { id: membershipId }
    });
  }

  private mapUserFromPrisma(user: any): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      password: user.password,
      systemRoles: user.systemRoles || ['USER'],
      status: user.status || 'ACTIVE',
      isLocked: user.isLocked || false,
      lastLoginAt: user.lastLoginAt || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  private mapOrganizationFromPrisma(org: any): Organization {
    return {
      id: org.id,
      name: org.name,
      timezone: org.timezone,
      currency: org.currency,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    };
  }

  private mapMembershipFromPrisma(membership: any): Membership {
    return {
      id: membership.id,
      userId: membership.userId,
      orgId: membership.orgId,
      role: membership.role,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt
    };
  }
}