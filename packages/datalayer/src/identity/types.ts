import type { UUID, DateTime } from '@repo/shared/types-only';

export type { UUID, DateTime };

export type Role = 'OWNER' | 'MANAGER' | 'STAFF';

export interface User {
  id: UUID;
  email: string;
  name?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface Organization {
  id: UUID;
  name: string;
  timezone: string;
  currency: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface Membership {
  id: UUID;
  userId: UUID;
  orgId: UUID;
  role: Role;
  createdAt: DateTime;
  updatedAt: DateTime;
}
