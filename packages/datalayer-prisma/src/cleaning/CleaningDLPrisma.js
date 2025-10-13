export class CleaningDLPrisma {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ===== Cleaner operations =====
    async getCleanerById(id) {
        const cleaner = await this.prisma.cleaner.findUnique({
            where: { id },
        });
        if (!cleaner)
            return null;
        return this.mapCleanerFromPrisma(cleaner);
    }
    async listCleaners(params) {
        const where = {
            orgId: params.orgId,
        };
        if (params.isActive !== undefined) {
            where.isActive = params.isActive;
        }
        const first = params.first || 10;
        const skip = params.after ? 1 : 0;
        const cursor = params.after ? { id: params.after } : undefined;
        const [cleaners, totalCount] = await Promise.all([
            this.prisma.cleaner.findMany({
                where,
                take: first + 1,
                skip,
                cursor,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.cleaner.count({ where }),
        ]);
        const hasNextPage = cleaners.length > first;
        const edges = cleaners.slice(0, first).map((cleaner) => ({
            node: this.mapCleanerFromPrisma(cleaner),
            cursor: cleaner.id,
        }));
        return {
            edges,
            pageInfo: {
                hasNextPage,
                hasPreviousPage: !!params.after,
                startCursor: edges[0]?.cursor,
                endCursor: edges[edges.length - 1]?.cursor,
                totalCount,
            },
        };
    }
    async createCleaner(input) {
        const cleaner = await this.prisma.cleaner.create({
            data: {
                userId: input.userId,
                orgId: input.orgId,
                firstName: input.firstName,
                lastName: input.lastName,
                phone: input.phone,
                email: input.email,
            },
        });
        return this.mapCleanerFromPrisma(cleaner);
    }
    async updateCleaner(id, input) {
        const cleaner = await this.prisma.cleaner.update({
            where: { id },
            data: {
                firstName: input.firstName,
                lastName: input.lastName,
                phone: input.phone,
                email: input.email,
                rating: input.rating,
            },
        });
        return this.mapCleanerFromPrisma(cleaner);
    }
    async deactivateCleaner(id) {
        const cleaner = await this.prisma.cleaner.update({
            where: { id },
            data: { isActive: false },
        });
        return this.mapCleanerFromPrisma(cleaner);
    }
    // ===== Cleaning Template operations =====
    async getCleaningTemplateById(id) {
        const template = await this.prisma.cleaningTemplate.findUnique({
            where: { id },
            include: { checklistItems: true },
        });
        if (!template)
            return null;
        return this.mapCleaningTemplateFromPrisma(template);
    }
    async getCleaningTemplatesByUnitId(unitId) {
        const templates = await this.prisma.cleaningTemplate.findMany({
            where: { unitId },
            include: { checklistItems: true },
            orderBy: { createdAt: 'desc' },
        });
        return templates.map((t) => this.mapCleaningTemplateFromPrisma(t));
    }
    async createCleaningTemplate(input) {
        const template = await this.prisma.cleaningTemplate.create({
            data: {
                unitId: input.unitId,
                name: input.name,
                description: input.description,
                requiresLinenChange: input.requiresLinenChange ?? false,
                estimatedDuration: input.estimatedDuration,
                checklistItems: input.checklistItems
                    ? {
                        create: input.checklistItems.map((item, index) => ({
                            label: item.label,
                            order: item.order ?? index,
                            isRequired: item.isRequired ?? false,
                        })),
                    }
                    : undefined,
            },
            include: { checklistItems: true },
        });
        return this.mapCleaningTemplateFromPrisma(template);
    }
    async updateCleaningTemplate(id, input) {
        // If checklistItems are provided, delete old ones and create new ones
        if (input.checklistItems) {
            await this.prisma.cleaningTemplateCheckbox.deleteMany({
                where: { templateId: id },
            });
        }
        const template = await this.prisma.cleaningTemplate.update({
            where: { id },
            data: {
                name: input.name,
                description: input.description,
                requiresLinenChange: input.requiresLinenChange,
                estimatedDuration: input.estimatedDuration,
                checklistItems: input.checklistItems
                    ? {
                        create: input.checklistItems.map((item, index) => ({
                            label: item.label,
                            order: item.order ?? index,
                            isRequired: item.isRequired ?? false,
                        })),
                    }
                    : undefined,
            },
            include: { checklistItems: true },
        });
        return this.mapCleaningTemplateFromPrisma(template);
    }
    async deleteCleaningTemplate(id) {
        await this.prisma.cleaningTemplate.delete({
            where: { id },
        });
        return true;
    }
    // ===== Cleaning operations =====
    async getCleaningById(id) {
        const cleaning = await this.prisma.cleaning.findUnique({
            where: { id },
            include: { checklistItems: true },
        });
        if (!cleaning)
            return null;
        return this.mapCleaningFromPrisma(cleaning);
    }
    async listCleanings(params) {
        const where = {};
        if (params.orgId)
            where.orgId = params.orgId;
        if (params.unitId)
            where.unitId = params.unitId;
        if (params.cleanerId)
            where.cleanerId = params.cleanerId;
        if (params.bookingId)
            where.bookingId = params.bookingId;
        if (params.status)
            where.status = params.status;
        if (params.from || params.to) {
            where.scheduledAt = {};
            if (params.from)
                where.scheduledAt.gte = new Date(params.from);
            if (params.to)
                where.scheduledAt.lte = new Date(params.to);
        }
        const first = params.first || 10;
        const skip = params.after ? 1 : 0;
        const cursor = params.after ? { id: params.after } : undefined;
        const [cleanings, totalCount] = await Promise.all([
            this.prisma.cleaning.findMany({
                where,
                include: { checklistItems: true },
                take: first + 1,
                skip,
                cursor,
                orderBy: { scheduledAt: 'desc' },
            }),
            this.prisma.cleaning.count({ where }),
        ]);
        const hasNextPage = cleanings.length > first;
        const edges = cleanings.slice(0, first).map((cleaning) => ({
            node: this.mapCleaningFromPrisma(cleaning),
            cursor: cleaning.id,
        }));
        return {
            edges,
            pageInfo: {
                hasNextPage,
                hasPreviousPage: !!params.after,
                startCursor: edges[0]?.cursor,
                endCursor: edges[edges.length - 1]?.cursor,
                totalCount,
            },
        };
    }
    async scheduleCleaning(input) {
        const cleaning = await this.prisma.cleaning.create({
            data: {
                orgId: input.orgId,
                cleanerId: input.cleanerId,
                unitId: input.unitId,
                bookingId: input.bookingId,
                scheduledAt: new Date(input.scheduledAt),
                notes: input.notes,
                requiresLinenChange: input.requiresLinenChange ?? false,
                status: 'SCHEDULED',
                checklistItems: input.checklistItems
                    ? {
                        create: input.checklistItems.map((item, index) => ({
                            label: item.label,
                            isChecked: item.isChecked,
                            order: item.order ?? index,
                        })),
                    }
                    : undefined,
            },
            include: { checklistItems: true },
        });
        return this.mapCleaningFromPrisma(cleaning);
    }
    async startCleaning(id) {
        const cleaning = await this.prisma.cleaning.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                startedAt: new Date(),
            },
            include: { checklistItems: true },
        });
        return this.mapCleaningFromPrisma(cleaning);
    }
    async completeCleaning(id, input) {
        // If checklist items are provided, update them
        if (input.checklistItems) {
            await this.updateCleaningChecklist(id, input.checklistItems);
        }
        const cleaning = await this.prisma.cleaning.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                notes: input.notes,
            },
            include: { checklistItems: true },
        });
        return this.mapCleaningFromPrisma(cleaning);
    }
    async cancelCleaning(id, reason) {
        const cleaning = await this.prisma.cleaning.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                notes: reason ? `Cancelled: ${reason}` : undefined,
            },
            include: { checklistItems: true },
        });
        return this.mapCleaningFromPrisma(cleaning);
    }
    async updateCleaningChecklist(id, items) {
        // Update or create checklist items
        for (const item of items) {
            if (item.id) {
                // Update existing item
                await this.prisma.cleaningChecklist.update({
                    where: { id: item.id },
                    data: {
                        label: item.label,
                        isChecked: item.isChecked,
                        order: item.order,
                    },
                });
            }
            else {
                // Create new item
                await this.prisma.cleaningChecklist.create({
                    data: {
                        cleaningId: id,
                        label: item.label,
                        isChecked: item.isChecked,
                        order: item.order ?? 0,
                    },
                });
            }
        }
        const cleaning = await this.prisma.cleaning.findUnique({
            where: { id },
            include: { checklistItems: true },
        });
        return this.mapCleaningFromPrisma(cleaning);
    }
    // ===== Cleaning Document operations =====
    async getCleaningDocumentById(id) {
        const document = await this.prisma.cleaningDocument.findUnique({
            where: { id },
            include: { photos: true },
        });
        if (!document)
            return null;
        return this.mapCleaningDocumentFromPrisma(document);
    }
    async createPreCleaningDocument(cleaningId, input) {
        return this.createDocument(cleaningId, 'PRE_CLEANING_ACCEPTANCE', input);
    }
    async createPostCleaningDocument(cleaningId, input) {
        return this.createDocument(cleaningId, 'POST_CLEANING_HANDOVER', input);
    }
    async createDocument(cleaningId, type, input) {
        const document = await this.prisma.cleaningDocument.create({
            data: {
                cleaningId,
                type,
                notes: input.notes,
                photos: input.photos
                    ? {
                        create: input.photos.map((photo, index) => ({
                            url: photo.url,
                            caption: photo.caption,
                            order: photo.order ?? index,
                        })),
                    }
                    : undefined,
            },
            include: { photos: true },
        });
        return this.mapCleaningDocumentFromPrisma(document);
    }
    async addPhotoToDocument(documentId, input) {
        const photo = await this.prisma.cleaningDocumentPhoto.create({
            data: {
                documentId,
                url: input.url,
                caption: input.caption,
                order: input.order ?? 0,
            },
        });
        return this.mapCleaningDocumentPhotoFromPrisma(photo);
    }
    async deletePhotoFromDocument(photoId) {
        await this.prisma.cleaningDocumentPhoto.delete({
            where: { id: photoId },
        });
        return true;
    }
    // ===== Mapping functions =====
    mapCleanerFromPrisma(cleaner) {
        return {
            id: cleaner.id,
            userId: cleaner.userId,
            orgId: cleaner.orgId,
            firstName: cleaner.firstName,
            lastName: cleaner.lastName,
            phone: cleaner.phone,
            email: cleaner.email,
            rating: cleaner.rating,
            isActive: cleaner.isActive,
            createdAt: cleaner.createdAt.toISOString(),
            updatedAt: cleaner.updatedAt.toISOString(),
        };
    }
    mapCleaningTemplateFromPrisma(template) {
        return {
            id: template.id,
            unitId: template.unitId,
            name: template.name,
            description: template.description,
            requiresLinenChange: template.requiresLinenChange,
            estimatedDuration: template.estimatedDuration,
            checklistItems: template.checklistItems
                ? template.checklistItems.map((item) => ({
                    id: item.id,
                    templateId: item.templateId,
                    label: item.label,
                    order: item.order,
                    isRequired: item.isRequired,
                    createdAt: item.createdAt.toISOString(),
                    updatedAt: item.updatedAt.toISOString(),
                }))
                : [],
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString(),
        };
    }
    mapCleaningFromPrisma(cleaning) {
        return {
            id: cleaning.id,
            orgId: cleaning.orgId,
            cleanerId: cleaning.cleanerId,
            unitId: cleaning.unitId,
            bookingId: cleaning.bookingId,
            status: cleaning.status,
            scheduledAt: cleaning.scheduledAt.toISOString(),
            startedAt: cleaning.startedAt?.toISOString(),
            completedAt: cleaning.completedAt?.toISOString(),
            notes: cleaning.notes,
            requiresLinenChange: cleaning.requiresLinenChange,
            checklistItems: cleaning.checklistItems
                ? cleaning.checklistItems.map((item) => ({
                    id: item.id,
                    cleaningId: item.cleaningId,
                    label: item.label,
                    isChecked: item.isChecked,
                    order: item.order,
                    createdAt: item.createdAt.toISOString(),
                    updatedAt: item.updatedAt.toISOString(),
                }))
                : [],
            createdAt: cleaning.createdAt.toISOString(),
            updatedAt: cleaning.updatedAt.toISOString(),
        };
    }
    mapCleaningDocumentFromPrisma(document) {
        return {
            id: document.id,
            cleaningId: document.cleaningId,
            type: document.type,
            notes: document.notes,
            photos: document.photos
                ? document.photos.map((photo) => this.mapCleaningDocumentPhotoFromPrisma(photo))
                : [],
            createdAt: document.createdAt.toISOString(),
            updatedAt: document.updatedAt.toISOString(),
        };
    }
    mapCleaningDocumentPhotoFromPrisma(photo) {
        return {
            id: photo.id,
            documentId: photo.documentId,
            url: photo.url,
            caption: photo.caption,
            order: photo.order,
            createdAt: photo.createdAt.toISOString(),
            updatedAt: photo.updatedAt.toISOString(),
        };
    }
}
