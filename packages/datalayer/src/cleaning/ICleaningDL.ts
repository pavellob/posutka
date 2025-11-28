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
  Master,
  MasterConnection,
  CreateMasterInput,
  UpdateMasterInput,
  ListMastersParams,
  Repair,
  RepairConnection,
  RepairTemplate,
  CreateRepairTemplateInput,
  UpdateRepairTemplateInput,
  ScheduleRepairInput,
  AssessRepairInput,
  RepairShoppingItem,
  CreateRepairShoppingItemInput,
  UpdateRepairShoppingItemInput,
  ListRepairsParams,
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
  approveCleaning(id: UUID, managerId: UUID, comment?: string): Promise<Cleaning>;
  cancelCleaning(id: UUID, reason?: string): Promise<Cleaning>;
  updateCleaningChecklist(id: UUID, items: ChecklistItemInput[]): Promise<Cleaning>;

  // Cleaning Document operations
  getCleaningDocumentById(id: UUID): Promise<CleaningDocument | null>;
  createPreCleaningDocument(cleaningId: UUID, input: CreateCleaningDocumentInput): Promise<CleaningDocument>;
  createPostCleaningDocument(cleaningId: UUID, input: CreateCleaningDocumentInput): Promise<CleaningDocument>;
  addPhotoToDocument(documentId: UUID, input: AddPhotoInput): Promise<CleaningDocumentPhoto>;
  deletePhotoFromDocument(photoId: UUID): Promise<boolean>;

  // Master operations
  getMasterById(id: UUID): Promise<Master | null>;
  listMasters(params: ListMastersParams): Promise<MasterConnection>;
  createMaster(input: CreateMasterInput): Promise<Master>;
  updateMaster(id: UUID, input: UpdateMasterInput): Promise<Master>;

  // Repair Template operations
  getRepairTemplateById(id: UUID): Promise<RepairTemplate | null>;
  getRepairTemplatesByUnitId(unitId: UUID): Promise<RepairTemplate[]>;
  createRepairTemplate(input: CreateRepairTemplateInput): Promise<RepairTemplate>;
  updateRepairTemplate(id: UUID, input: UpdateRepairTemplateInput): Promise<RepairTemplate>;
  deleteRepairTemplate(id: UUID): Promise<boolean>;

  // Repair operations
  getRepairById(id: UUID): Promise<Repair | null>;
  listRepairs(params: ListRepairsParams): Promise<RepairConnection>;
  scheduleRepair(input: ScheduleRepairInput): Promise<Repair>;
  startRepair(id: UUID): Promise<Repair>;
  assessRepair(id: UUID, input: AssessRepairInput): Promise<Repair>;
  completeRepair(id: UUID): Promise<Repair>;
  cancelRepair(id: UUID, reason?: string): Promise<Repair>;
  
  // Repair Shopping List operations
  createRepairShoppingItem(repairId: UUID, input: CreateRepairShoppingItemInput): Promise<RepairShoppingItem>;
  updateRepairShoppingItem(itemId: UUID, input: UpdateRepairShoppingItemInput): Promise<RepairShoppingItem>;
  deleteRepairShoppingItem(itemId: UUID): Promise<boolean>;
  addPhotoToShoppingItem(itemId: UUID, url: string, caption?: string, order?: number): Promise<RepairShoppingItem>;
  deletePhotoFromShoppingItem(photoId: UUID): Promise<boolean>;
}

