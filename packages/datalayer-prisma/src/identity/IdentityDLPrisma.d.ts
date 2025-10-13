import { PrismaClient } from '@prisma/client';
import type { IIdentityDL, User, Organization, Membership, CreateUserInput, CreateOrganizationInput, AddMemberInput, UpdateMemberRoleInput } from '@repo/datalayer';
import type { UserConnection, OrganizationConnection } from '@repo/datalayer/src/identity/connection-types.js';
export declare class IdentityDLPrisma implements IIdentityDL {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    getUserById(id: string): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    listUsers(params: {
        first?: number;
        after?: string;
    }): Promise<UserConnection>;
    createUser(input: CreateUserInput): Promise<User>;
    updateUser(id: string, input: Partial<CreateUserInput & {
        systemRoles?: string[];
        status?: string;
        isLocked?: boolean;
    }>): Promise<User>;
    getOrganizationById(id: string): Promise<Organization | null>;
    listOrganizations(params: {
        first?: number;
        after?: string;
    }): Promise<OrganizationConnection>;
    createOrganization(input: CreateOrganizationInput): Promise<Organization>;
    updateOrganization(id: string, input: Partial<CreateOrganizationInput>): Promise<Organization>;
    getMembershipById(id: string): Promise<Membership | null>;
    getMembershipsByOrg(orgId: string): Promise<Membership[]>;
    getMembershipsByUser(userId: string): Promise<Membership[]>;
    addMember(input: AddMemberInput): Promise<Membership>;
    updateMemberRole(input: UpdateMemberRoleInput): Promise<Membership>;
    removeMember(membershipId: string): Promise<void>;
    private mapUserFromPrisma;
    private mapOrganizationFromPrisma;
    private mapMembershipFromPrisma;
}
