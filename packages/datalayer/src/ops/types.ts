import type { UUID, DateTime, Money } from '@repo/shared/types-only';

export type { UUID, DateTime, Money };

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';
export type TaskType = 'CLEANING' | 'CHECKIN' | 'CHECKOUT' | 'MAINTENANCE' | 'INVENTORY';

export interface ServiceProvider {
  id: UUID;
  name: string;
  serviceTypes: TaskType[];
  rating?: number;
  contact?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface Task {
  id: UUID;
  orgId: UUID;
  unitId?: UUID;
  bookingId?: UUID;
  type: TaskType;
  status: TaskStatus;
  dueAt?: DateTime;
  assignedProviderId?: UUID;
  checklist: string[];
  createdAt: DateTime;
  updatedAt: DateTime;
  note?: string;
}

export interface ServiceOrder {
  id: UUID;
  orgId: UUID;
  taskId: UUID;
  providerId?: UUID;
  status: 'CREATED' | 'ACCEPTED' | 'DONE' | 'CANCELED';
  cost?: Money;
  invoiceId?: UUID;
  createdAt: DateTime;
  updatedAt: DateTime;
  notes?: string;
}

export interface TaskConnection {
  edges: Array<{
    node: Task;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
}

export interface CreateTaskInput {
  orgId: UUID;
  type: TaskType;
  unitId?: UUID;
  bookingId?: UUID;
  dueAt?: DateTime;
  checklist?: string[];
  note?: string;
}

export interface AssignTaskInput {
  taskId: UUID;
  providerId?: UUID;
  status?: TaskStatus;
  note?: string;
}

export interface CreateServiceOrderInput {
  taskId: UUID;
  providerId?: UUID;
  cost?: Money;
  notes?: string;
}

export interface ListTasksParams {
  orgId: UUID;
  status?: TaskStatus;
  type?: TaskType;
  first?: number;
  after?: string;
}
