import type { UUID, DateTime } from '@repo/shared/types-only';

export type { UUID, DateTime };

export type CleaningStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'CANCELLED';
export type CleaningDocumentType = 'PRE_CLEANING_ACCEPTANCE' | 'POST_CLEANING_HANDOVER';
export type CleaningReviewStatus = 'APPROVED';

// ===== Cleaner =====

export interface Cleaner {
  id: UUID;
  userId: UUID;
  orgId: UUID;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  rating?: number;
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface CreateCleanerInput {
  userId: UUID;
  orgId: UUID;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

export interface UpdateCleanerInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  rating?: number;
}

// ===== Cleaning Template =====

export interface CleaningTemplateCheckbox {
  id: UUID;
  templateId: UUID;
  label: string;
  order: number;
  isRequired: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface CleaningTemplate {
  id: UUID;
  unitId: UUID;
  name: string;
  description?: string;
  requiresLinenChange: boolean;
  estimatedDuration?: number;
  checklistItems: CleaningTemplateCheckbox[];
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface CreateCleaningTemplateInput {
  unitId: UUID;
  name: string;
  description?: string;
  requiresLinenChange?: boolean;
  estimatedDuration?: number;
  checklistItems?: ChecklistTemplateItemInput[];
}

export interface UpdateCleaningTemplateInput {
  name?: string;
  description?: string;
  requiresLinenChange?: boolean;
  estimatedDuration?: number;
  checklistItems?: ChecklistTemplateItemInput[];
}

export interface ChecklistTemplateItemInput {
  label: string;
  order?: number;
  isRequired?: boolean;
}

// ===== Cleaning =====

export interface CleaningChecklist {
  id: UUID;
  cleaningId: UUID;
  label: string;
  isChecked: boolean;
  order: number;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface Cleaning {
  id: UUID;
  orgId: UUID;
  cleanerId?: UUID | null;
  unitId: UUID;
  bookingId?: UUID;
  taskId?: UUID;
  status: CleaningStatus;
  scheduledAt: DateTime;
  startedAt?: DateTime;
  completedAt?: DateTime;
  notes?: string;
  requiresLinenChange: boolean;
  checklistItems: CleaningChecklist[];
  reviews: CleaningReview[];
  createdAt: DateTime;
  updatedAt: DateTime;
}
export interface CleaningReview {
  id: UUID;
  cleaningId: UUID;
  managerId: UUID;
  status: CleaningReviewStatus;
  comment?: string;
  createdAt: DateTime;
}

export interface ScheduleCleaningInput {
  orgId: UUID;
  cleanerId?: UUID; // Опциональный - если не указан, система отправит уведомления всем привязанным уборщикам
  unitId: UUID;
  bookingId?: UUID;
  taskId?: UUID;
  scheduledAt: DateTime;
  notes?: string;
  requiresLinenChange?: boolean;
  checklistItems?: ChecklistItemInput[];
}

export interface CompleteCleaningInput {
  notes?: string;
  checklistItems?: ChecklistItemInput[];
}

export interface ChecklistItemInput {
  id?: UUID;
  label: string;
  isChecked: boolean;
  order?: number;
}

// ===== Cleaning Document =====

export interface CleaningDocumentPhoto {
  id: UUID;
  documentId: UUID;
  url: string;
  caption?: string;
  order: number;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface CleaningDocument {
  id: UUID;
  cleaningId: UUID;
  type: CleaningDocumentType;
  notes?: string;
  photos: CleaningDocumentPhoto[];
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface CreateCleaningDocumentInput {
  notes?: string;
  photos?: AddPhotoInput[];
}

export interface AddPhotoInput {
  url: string;
  caption?: string;
  order?: number;
}

// ===== Connections =====

export interface CleanerConnection {
  edges: Array<{
    node: Cleaner;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
    totalCount?: number;
  };
}

export interface CleaningConnection {
  edges: Array<{
    node: Cleaning;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
    totalCount?: number;
  };
}

// ===== Query Params =====

export interface ListCleanersParams {
  orgId: UUID;
  isActive?: boolean;
  first?: number;
  after?: string;
}

export interface ListCleaningsParams {
  orgId?: UUID;
  unitId?: UUID;
  cleanerId?: UUID;
  bookingId?: UUID;
  taskId?: UUID;
  status?: CleaningStatus;
  from?: DateTime;
  to?: DateTime;
  first?: number;
  after?: string;
}

