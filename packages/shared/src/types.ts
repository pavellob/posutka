export type { UUID, DateTime, Money } from './scalars.js';

export interface OrganizationRef {
  id: string;
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}
