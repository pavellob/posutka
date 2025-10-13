import type {
  Cleaner,
  CleanerConnection,
  Cleaning,
  CleaningConnection,
  CleaningTemplate,
  CleaningDocument,
  CleaningDocumentPhoto,
  CreateCleanerInput,
  UpdateCleanerInput,
  CreateCleaningTemplateInput,
  UpdateCleaningTemplateInput,
  ScheduleCleaningInput,
  CompleteCleaningInput,
  ChecklistItemInput,
  CreateCleaningDocumentInput,
  AddPhotoInput,
  ListCleanersParams,
  ListCleaningsParams,
  UUID,
} from './types.js';

export interface ICleaningDL {
  // Cleaner operations
  getCleanerById(id: UUID): Promise<Cleaner | null>;
  listCleaners(params: ListCleanersParams): Promise<CleanerConnection>;
  createCleaner(input: CreateCleanerInput): Promise<Cleaner>;
  updateCleaner(id: UUID, input: UpdateCleanerInput): Promise<Cleaner>;
  deactivateCleaner(id: UUID): Promise<Cleaner>;
  activateCleaner(id: UUID): Promise<Cleaner>;

  // Cleaning Template operations
  getCleaningTemplateById(id: UUID): Promise<CleaningTemplate | null>;
  getCleaningTemplatesByUnitId(unitId: UUID): Promise<CleaningTemplate[]>;
  createCleaningTemplate(input: CreateCleaningTemplateInput): Promise<CleaningTemplate>;
  updateCleaningTemplate(id: UUID, input: UpdateCleaningTemplateInput): Promise<CleaningTemplate>;
  deleteCleaningTemplate(id: UUID): Promise<boolean>;

  // Cleaning operations
  getCleaningById(id: UUID): Promise<Cleaning | null>;
  getCleaningByTaskId(taskId: UUID): Promise<Cleaning | null>;
  listCleanings(params: ListCleaningsParams): Promise<CleaningConnection>;
  scheduleCleaning(input: ScheduleCleaningInput): Promise<Cleaning>;
  startCleaning(id: UUID): Promise<Cleaning>;
  completeCleaning(id: UUID, input: CompleteCleaningInput): Promise<Cleaning>;
  cancelCleaning(id: UUID, reason?: string): Promise<Cleaning>;
  updateCleaningChecklist(id: UUID, items: ChecklistItemInput[]): Promise<Cleaning>;

  // Cleaning Document operations
  getCleaningDocumentById(id: UUID): Promise<CleaningDocument | null>;
  createPreCleaningDocument(cleaningId: UUID, input: CreateCleaningDocumentInput): Promise<CleaningDocument>;
  createPostCleaningDocument(cleaningId: UUID, input: CreateCleaningDocumentInput): Promise<CleaningDocument>;
  addPhotoToDocument(documentId: UUID, input: AddPhotoInput): Promise<CleaningDocumentPhoto>;
  deletePhotoFromDocument(photoId: UUID): Promise<boolean>;
}

