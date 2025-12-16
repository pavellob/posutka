import type { UUID, DateTime, Money } from '@repo/shared/types-only';

export type { UUID, DateTime, Money };

export type TaskStatus = 'DRAFT' | 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';
export type TaskType = 'CLEANING' | 'CHECKIN' | 'CHECKOUT' | 'MAINTENANCE' | 'INVENTORY' | 'DAILY_NOTIFICATION';

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
  sourceId?: UUID; // Связь с источником задачи (cleaning, repair, booking и т.д.)
  checklistItemKey?: string; // Ключ пункта чек-листа, из которого создана задача (deprecated)
  checklistItemInstanceId?: UUID; // Связь с конкретным пунктом чек-листа
  authorId?: UUID; // ID пользователя/уборщика, который создал задачу
  type: TaskType;
  status: TaskStatus;
  dueAt?: DateTime;
  assignedProviderId?: UUID;
  assignedCleanerId?: UUID;
  assignedMasterId?: UUID; // Для задач типа MAINTENANCE/ремонтов
  plannedForNextChecklist?: boolean; // Задача для следующего чек-листа
  sourceCleaningId?: UUID; // ID уборки, из которой создана задача для следующего чек-листа
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
  status?: TaskStatus; // Статус задачи (по умолчанию TODO)
  unitId?: UUID;
  bookingId?: UUID;
  sourceId?: UUID; // Связь с источником задачи (cleaning, repair, booking и т.д.)
  checklistItemKey?: string; // Ключ пункта чек-листа, из которого создана задача (deprecated)
  checklistItemInstanceId?: UUID; // Связь с конкретным пунктом чек-листа
  authorId?: UUID; // ID пользователя/уборщика, который создал задачу
  assignedProviderId?: UUID; // ID поставщика услуг (для не-CLEANING задач)
  assignedCleanerId?: UUID; // ID уборщика (для CLEANING задач)
  assignedMasterId?: UUID; // ID мастера (для задач типа MAINTENANCE/ремонтов)
  plannedForNextChecklist?: boolean; // Задача для следующего чек-листа
  sourceCleaningId?: UUID; // ID уборки, из которой создана задача для следующего чек-листа
  dueAt?: DateTime;
  checklist?: string[];
  note?: string;
}

export interface AssignTaskInput {
  taskId: UUID;
  providerId?: UUID;
  cleanerId?: UUID;
  masterId?: UUID; // ID мастера (для задач типа MAINTENANCE/ремонтов)
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
