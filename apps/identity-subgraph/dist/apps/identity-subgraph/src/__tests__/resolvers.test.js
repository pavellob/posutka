import { describe, it, expect, vi } from 'vitest';
// Mock implementation of IIdentityDL
const mockDL = {
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    getOrganizationById: vi.fn(),
    listOrganizations: vi.fn(),
    createOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    getMembershipById: vi.fn(),
    getMembershipsByOrg: vi.fn(),
    getMembershipsByUser: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
};
describe('Identity Resolvers', () => {
    it('should create user', async () => {
        const mockUser = {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        vi.mocked(mockDL.createUser).mockResolvedValue(mockUser);
        const result = await mockDL.createUser({
            email: 'test@example.com',
            name: 'Test User'
        });
        expect(result).toEqual(mockUser);
        expect(mockDL.createUser).toHaveBeenCalledWith({
            email: 'test@example.com',
            name: 'Test User'
        });
    });
    it('should create organization', async () => {
        const mockOrg = {
            id: 'org-1',
            name: 'Test Organization',
            timezone: 'UTC',
            currency: 'RUB',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        vi.mocked(mockDL.createOrganization).mockResolvedValue(mockOrg);
        const result = await mockDL.createOrganization({
            name: 'Test Organization',
            timezone: 'UTC',
            currency: 'RUB'
        });
        expect(result).toEqual(mockOrg);
        expect(mockDL.createOrganization).toHaveBeenCalledWith({
            name: 'Test Organization',
            timezone: 'UTC',
            currency: 'RUB'
        });
    });
    it('should add member to organization', async () => {
        const mockMembership = {
            id: 'membership-1',
            userId: 'user-1',
            orgId: 'org-1',
            role: 'OWNER',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        vi.mocked(mockDL.addMember).mockResolvedValue(mockMembership);
        const result = await mockDL.addMember({
            userId: 'user-1',
            orgId: 'org-1',
            role: 'OWNER'
        });
        expect(result).toEqual(mockMembership);
        expect(mockDL.addMember).toHaveBeenCalledWith({
            userId: 'user-1',
            orgId: 'org-1',
            role: 'OWNER'
        });
    });
});
