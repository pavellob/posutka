export class IdentityDLPrisma {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id }
        });
        if (!user)
            return null;
        return this.mapUserFromPrisma(user);
    }
    async getUserByEmail(email) {
        const user = await this.prisma.user.findUnique({
            where: { email }
        });
        if (!user)
            return null;
        return this.mapUserFromPrisma(user);
    }
    async listUsers(params) {
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
        const endCursor = edges.length > 0 ? edges[edges.length - 1].id : undefined;
        return {
            edges: edges.map((user) => ({
                node: this.mapUserFromPrisma(user),
                cursor: user.id
            })),
            pageInfo: {
                hasNextPage,
                endCursor
            }
        };
    }
    async createUser(input) {
        const user = await this.prisma.user.create({
            data: {
                email: input.email,
                name: input.name,
                password: input.password || ''
            }
        });
        return this.mapUserFromPrisma(user);
    }
    async updateUser(id, input) {
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
    async getOrganizationById(id) {
        const org = await this.prisma.organization.findUnique({
            where: { id }
        });
        if (!org)
            return null;
        return this.mapOrganizationFromPrisma(org);
    }
    async listOrganizations(params) {
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
        const endCursor = edges.length > 0 ? edges[edges.length - 1].id : undefined;
        return {
            edges: edges.map((org) => ({
                node: this.mapOrganizationFromPrisma(org),
                cursor: org.id
            })),
            pageInfo: {
                hasNextPage,
                endCursor
            }
        };
    }
    async createOrganization(input) {
        const org = await this.prisma.organization.create({
            data: input
        });
        return this.mapOrganizationFromPrisma(org);
    }
    async updateOrganization(id, input) {
        const org = await this.prisma.organization.update({
            where: { id },
            data: input
        });
        return this.mapOrganizationFromPrisma(org);
    }
    async getMembershipById(id) {
        const membership = await this.prisma.membership.findUnique({
            where: { id }
        });
        if (!membership)
            return null;
        return this.mapMembershipFromPrisma(membership);
    }
    async getMembershipsByOrg(orgId) {
        const memberships = await this.prisma.membership.findMany({
            where: { orgId }
        });
        return memberships.map((membership) => this.mapMembershipFromPrisma(membership));
    }
    async getMembershipsByUser(userId) {
        const memberships = await this.prisma.membership.findMany({
            where: { userId }
        });
        return memberships.map((membership) => this.mapMembershipFromPrisma(membership));
    }
    async addMember(input) {
        const membership = await this.prisma.membership.create({
            data: input
        });
        return this.mapMembershipFromPrisma(membership);
    }
    async updateMemberRole(input) {
        const membership = await this.prisma.membership.update({
            where: { id: input.membershipId },
            data: { role: input.role }
        });
        return this.mapMembershipFromPrisma(membership);
    }
    async removeMember(membershipId) {
        await this.prisma.membership.delete({
            where: { id: membershipId }
        });
    }
    mapUserFromPrisma(user) {
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
    mapOrganizationFromPrisma(org) {
        return {
            id: org.id,
            name: org.name,
            timezone: org.timezone,
            currency: org.currency,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt
        };
    }
    mapMembershipFromPrisma(membership) {
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
