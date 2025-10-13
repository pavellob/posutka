import type { Context } from '../context.js';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('cleaning-subgraph-resolvers');

export const resolvers = {
  Query: {
    // Cleaner queries
    cleaner: (_: unknown, { id }: { id: string }, { dl }: Context) => 
      dl.getCleanerById(id),
    
    cleaners: (_: unknown, params: any, { dl }: Context) => 
      dl.listCleaners(params),
    
    // Cleaning template queries
    cleaningTemplate: (_: unknown, { id }: { id: string }, { dl }: Context) => 
      dl.getCleaningTemplateById(id),
    
    cleaningTemplates: (_: unknown, { unitId }: { unitId: string }, { dl }: Context) => 
      dl.getCleaningTemplatesByUnitId(unitId),
    
    // Cleaning queries
    cleaning: (_: unknown, { id }: { id: string }, { dl }: Context) => 
      dl.getCleaningById(id),
    
    cleaningByTask: (_: unknown, { taskId }: { taskId: string }, { dl }: Context) => 
      dl.getCleaningByTaskId(taskId),
    
    cleanings: (_: unknown, params: any, { dl }: Context) => 
      dl.listCleanings(params),
  },

  Mutation: {
    // Cleaner mutations
    createCleaner: async (_: unknown, { input }: { input: any }, { dl }: Context) => {
      logger.info('Creating cleaner', { input });
      return dl.createCleaner(input);
    },
    
    updateCleaner: async (_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) => {
      logger.info('Updating cleaner', { id, input });
      return dl.updateCleaner(id, input);
    },
    
    deactivateCleaner: async (_: unknown, { id }: { id: string }, { dl }: Context) => {
      logger.info('Deactivating cleaner', { id });
      return dl.deactivateCleaner(id);
    },
    
    activateCleaner: async (_: unknown, { id }: { id: string }, { dl }: Context) => {
      logger.info('Activating cleaner', { id });
      return dl.activateCleaner(id);
    },
    
    // Cleaning template mutations
    createCleaningTemplate: async (_: unknown, { input }: { input: any }, { dl }: Context) => {
      logger.info('Creating cleaning template', { input });
      return dl.createCleaningTemplate(input);
    },
    
    updateCleaningTemplate: async (_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) => {
      logger.info('Updating cleaning template', { id, input });
      return dl.updateCleaningTemplate(id, input);
    },
    
    deleteCleaningTemplate: async (_: unknown, { id }: { id: string }, { dl }: Context) => {
      logger.info('Deleting cleaning template', { id });
      return dl.deleteCleaningTemplate(id);
    },
    
    // Cleaning mutations
    scheduleCleaning: async (_: unknown, { input }: { input: any }, { dl }: Context) => {
      logger.info('Scheduling cleaning', { input });
      return dl.scheduleCleaning(input);
    },
    
    startCleaning: async (_: unknown, { id }: { id: string }, { dl }: Context) => {
      logger.info('Starting cleaning', { id });
      return dl.startCleaning(id);
    },
    
    completeCleaning: async (_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) => {
      logger.info('Completing cleaning', { id, input });
      return dl.completeCleaning(id, input);
    },
    
    cancelCleaning: async (_: unknown, { id, reason }: { id: string; reason?: string }, { dl }: Context) => {
      logger.info('Cancelling cleaning', { id, reason });
      return dl.cancelCleaning(id, reason);
    },
    
    updateCleaningChecklist: async (_: unknown, { id, items }: { id: string; items: any[] }, { dl }: Context) => {
      logger.info('Updating cleaning checklist', { id, itemsCount: items.length });
      return dl.updateCleaningChecklist(id, items);
    },
    
    // Cleaning document mutations
    createPreCleaningDocument: async (_: unknown, { cleaningId, input }: { cleaningId: string; input: any }, { dl }: Context) => {
      logger.info('Creating pre-cleaning document', { cleaningId });
      return dl.createPreCleaningDocument(cleaningId, input);
    },
    
    createPostCleaningDocument: async (_: unknown, { cleaningId, input }: { cleaningId: string; input: any }, { dl }: Context) => {
      logger.info('Creating post-cleaning document', { cleaningId });
      return dl.createPostCleaningDocument(cleaningId, input);
    },
    
    addPhotoToDocument: async (_: unknown, { documentId, input }: { documentId: string; input: any }, { dl }: Context) => {
      logger.info('Adding photo to document', { documentId });
      return dl.addPhotoToDocument(documentId, input);
    },
    
    deletePhotoFromDocument: async (_: unknown, { photoId }: { photoId: string }, { dl }: Context) => {
      logger.info('Deleting photo from document', { photoId });
      return dl.deletePhotoFromDocument(photoId);
    },
  },

  // Type resolvers for federation
  Cleaner: {
    user: (parent: any, _: unknown, { identityDL }: Context) => {
      return { id: parent.userId };
    },
    org: (parent: any, _: unknown, { identityDL }: Context) => {
      return { id: parent.orgId };
    },
    cleanings: async (parent: any, _: unknown, { dl }: Context) => {
      const result = await dl.listCleanings({
        cleanerId: parent.id,
        first: 100,
      });
      return result.edges.map((edge: any) => edge.node);
    },
  },

  CleaningTemplate: {
    unit: (parent: any, _: unknown, { inventoryDL }: Context) => {
      return { id: parent.unitId };
    },
  },

  Cleaning: {
    org: (parent: any, _: unknown, { identityDL }: Context) => {
      return { id: parent.orgId };
    },
    cleaner: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getCleanerById(parent.cleanerId);
    },
    unit: (parent: any, _: unknown, { inventoryDL }: Context) => {
      return { id: parent.unitId };
    },
    booking: (parent: any, _: unknown, { bookingsDL }: Context) => {
      if (!parent.bookingId) return null;
      return { id: parent.bookingId };
    },
    documents: async (parent: any, _: unknown, { prisma }: Context) => {
      // Get documents for this cleaning
      const documents = await prisma.cleaningDocument.findMany({
        where: { cleaningId: parent.id },
        include: { photos: true },
      });
      
      return documents.map((doc: any) => ({
        id: doc.id,
        cleaningId: doc.cleaningId,
        type: doc.type,
        notes: doc.notes,
        photos: doc.photos.map((photo: any) => ({
          id: photo.id,
          documentId: photo.documentId,
          url: photo.url,
          caption: photo.caption,
          order: photo.order,
          createdAt: photo.createdAt.toISOString(),
          updatedAt: photo.updatedAt.toISOString(),
        })),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }));
    },
  },

  CleaningDocument: {
    cleaning: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getCleaningById(parent.cleaningId);
    },
  },
};

