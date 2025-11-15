export class IdentityDLPrisma {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                memberships: true,
            },
        });
        if (!user)
            return null;
        return this.mapUserFromPrisma(user);
    }
    async getUserByEmail(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                memberships: true,
            },
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
            orderBy: { createdAt: 'desc' },
            include: {
                memberships: true,
            },
        });
        const hasNextPage = users.length > first;
        const edges = hasNextPage ? users.slice(0, -1) : users;
        const startCursor = edges.length > 0 ? edges[0].id : undefined;
        const endCursor = edges.length > 0 ? edges[edges.length - 1].id : undefined;
        const totalCount = await this.prisma.user.count();
        return {
            edges: edges.map((user) => ({
                node: this.mapUserFromPrisma(user),
                cursor: user.id,
            })),
            pageInfo: {
                hasNextPage,
                hasPreviousPage: !!params.after,
                startCursor,
                endCursor,
                totalCount,
            },
        };
    }
    async createUser(input) {
        const user = await this.prisma.user.create({
            data: {
                email: input.email,
                name: input.name,
                password: input.password || '',
            },
            include: {
                memberships: true,
            },
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
                ...(input.status && { status: input.status }),
                ...(input.isLocked !== undefined && { isLocked: input.isLocked }),
            },
            include: {
                memberships: true,
            },
        });
        return this.mapUserFromPrisma(user);
    }
    async getOrganizationById(id) {
        const org = await this.prisma.organization.findUnique({
            where: { id },
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
            orderBy: { createdAt: 'desc' },
        });
        const hasNextPage = orgs.length > first;
        const edges = hasNextPage ? orgs.slice(0, -1) : orgs;
        const startCursor = edges.length > 0 ? edges[0].id : undefined;
        const endCursor = edges.length > 0 ? edges[edges.length - 1].id : undefined;
        const totalCount = await this.prisma.organization.count();
        return {
            edges: edges.map((org) => ({
                node: this.mapOrganizationFromPrisma(org),
                cursor: org.id,
            })),
            pageInfo: {
                hasNextPage,
                hasPreviousPage: !!params.after,
                startCursor,
                endCursor,
                totalCount,
            },
        };
    }
    async createOrganization(input) {
        const org = await this.prisma.organization.create({
            data: input,
        });
        return this.mapOrganizationFromPrisma(org);
    }
    async updateOrganization(id, input) {
        const org = await this.prisma.organization.update({
            where: { id },
            data: input,
        });
        return this.mapOrganizationFromPrisma(org);
    }
    async getMembershipById(id) {
        const membership = await this.prisma.membership.findUnique({
            where: { id },
        });
        if (!membership)
            return null;
        return this.mapMembershipFromPrisma(membership);
    }
    async getMembershipsByOrg(orgId) {
        const memberships = await this.prisma.membership.findMany({
            where: { orgId },
        });
        return memberships.map((membership) => this.mapMembershipFromPrisma(membership));
    }
    async getMembershipsByUser(userId) {
        const memberships = await this.prisma.membership.findMany({
            where: { userId },
        });
        return memberships.map((membership) => this.mapMembershipFromPrisma(membership));
    }
    async addMember(input) {
        const membership = await this.prisma.membership.create({
            data: input,
        });
        return this.mapMembershipFromPrisma(membership);
    }
    async updateMemberRole(input) {
        const membership = await this.prisma.membership.update({
            where: { id: input.membershipId },
            data: { role: input.role },
        });
        return this.mapMembershipFromPrisma(membership);
    }
    async removeMember(membershipId) {
        await this.prisma.membership.delete({
            where: { id: membershipId },
        });
    }
    mapUserFromPrisma(user) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            phoneNumber: user.phoneNumber || null,
            emailVerified: user.emailVerified || false,
            password: user.password,
            status: user.status || 'ACTIVE',
            isLocked: user.isLocked || false,
            lastLoginAt: user.lastLoginAt || null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            memberships: user.memberships
                ? user.memberships.map((membership) => this.mapMembershipFromPrisma(membership))
                : [],
        };
    }
    mapOrganizationFromPrisma(org) {
        return {
            id: org.id,
            name: org.name,
            timezone: org.timezone,
            currency: org.currency,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
        };
    }
    mapMembershipFromPrisma(membership) {
        return {
            id: membership.id,
            userId: membership.userId,
            orgId: membership.orgId,
            role: membership.role,
            createdAt: membership.createdAt,
            updatedAt: membership.updatedAt,
        };
    }
}
