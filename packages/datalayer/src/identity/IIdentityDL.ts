import type {
  UUID,
  User,
  Organization,
  Membership,
  Role,
} from './types.js';

export interface CreateUserInput {
  email: string;
  name?: string;
}

export interface CreateOrganizationInput {
  name: string;
  timezone: string;
  currency: string;
}

export interface AddMemberInput {
  userId: UUID;
  orgId: UUID;
  role: Role;
}

export interface UpdateMemberRoleInput {
  membershipId: UUID;
  role: Role;
}

export interface IIdentityDL {
  // Users
  getUserById(id: UUID): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  listUsers(params: { first?: number; after?: string }): Promise<{ edges: User[]; endCursor?: string; hasNextPage: boolean }>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(id: UUID, input: Partial<CreateUserInput>): Promise<User>;

  // Organizations
  getOrganizationById(id: UUID): Promise<Organization | null>;
  listOrganizations(params: { first?: number; after?: string }): Promise<{ edges: Organization[]; endCursor?: string; hasNextPage: boolean }>;
  createOrganization(input: CreateOrganizationInput): Promise<Organization>;
  updateOrganization(id: UUID, input: Partial<CreateOrganizationInput>): Promise<Organization>;

  // Memberships
  getMembershipById(id: UUID): Promise<Membership | null>;
  getMembershipsByOrg(orgId: UUID): Promise<Membership[]>;
  getMembershipsByUser(userId: UUID): Promise<Membership[]>;
  addMember(input: AddMemberInput): Promise<Membership>;
  updateMemberRole(input: UpdateMemberRoleInput): Promise<Membership>;
  removeMember(membershipId: UUID): Promise<void>;
}
