export class CleaningDLPrisma {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ===== Cleaner operations =====
    async getCleanerById(id) {
        try {
            const cleaner = await this.prisma.cleaner.findUnique({
                where: { id },
            });
            if (!cleaner)
                return null;
            return this.mapCleanerFromPrisma(cleaner);
        }
        catch (error) {
            console.error('Error in getCleanerById:', { id, error });
            throw error;
        }
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
        // Получаем данные пользователя
        const user = await this.prisma.user.findUnique({
            where: { id: input.userId },
        });
        if (!user) {
            throw new Error(`User with id ${input.userId} not found`);
        }
        // Парсим имя пользователя (если полное имя в одном поле)
        const nameParts = user.name?.split(' ') || [];
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        // Создаем уборщика с данными из User
        const cleaner = await this.prisma.cleaner.create({
            data: {
                type: 'INTERNAL', // Всегда INTERNAL, так как связан с User
                userId: input.userId,
                orgId: input.orgId,
                firstName,
                lastName,
                phone: null, // Можно добавить в User если нужно
                email: user.email,
                telegramUsername: null, // Можно добавить в User если нужно
            },
        });
        // Обеспечиваем, что у пользователя есть членство с ролью CLEANER в этой организации
        await this.prisma.membership.upsert({
            where: {
                userId_orgId_role: {
                    userId: input.userId,
                    orgId: input.orgId,
                    role: 'CLEANER',
                },
            },
            update: {
                role: 'CLEANER',
            },
            create: {
                userId: input.userId,
                orgId: input.orgId,
                role: 'CLEANER',
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
            data: {
                isActive: false,
                deletedAt: new Date(),
            },
        });
        return this.mapCleanerFromPrisma(cleaner);
    }
    async activateCleaner(id) {
        const cleaner = await this.prisma.cleaner.update({
            where: { id },
            data: {
                isActive: true,
                deletedAt: null,
            },
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
                difficultyModifier: input.difficultyModifier,
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
        let deduplicatedItems = undefined;
        // If checklistItems are provided, delete old ones and create new ones
        if (input.checklistItems) {
            await this.prisma.cleaningTemplateCheckbox.deleteMany({
                where: { templateId: id },
            });
            // ДЕДУПЛИКАЦИЯ: удаляем дубликаты из входящих данных
            const uniqueItems = new Map();
            input.checklistItems.forEach((item, index) => {
                const key = `${item.label}-${item.order ?? index}`;
                if (!uniqueItems.has(key)) {
                    uniqueItems.set(key, {
                        label: item.label,
                        order: item.order ?? index,
                        isRequired: item.isRequired ?? false,
                    });
                }
            });
            deduplicatedItems = Array.from(uniqueItems.values());
            console.log('🔄 Updating template checklist:', {
                templateId: id,
                originalCount: input.checklistItems.length,
                uniqueCount: deduplicatedItems.length
            });
        }
        const template = await this.prisma.cleaningTemplate.update({
            where: { id },
            data: {
                name: input.name,
                description: input.description,
                requiresLinenChange: input.requiresLinenChange,
                estimatedDuration: input.estimatedDuration,
                difficultyModifier: input.difficultyModifier,
                checklistItems: deduplicatedItems
                    ? {
                        create: deduplicatedItems,
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
    // ===== Repair Template operations =====
    async getRepairTemplateById(id) {
        const template = await this.prisma.repairTemplate.findUnique({
            where: { id },
            include: { checklistItems: true },
        });
        if (!template)
            return null;
        return this.mapRepairTemplateFromPrisma(template);
    }
    async getRepairTemplatesByUnitId(unitId) {
        const templates = await this.prisma.repairTemplate.findMany({
            where: { unitId },
            include: { checklistItems: true },
            orderBy: { createdAt: 'desc' },
        });
        return templates.map((t) => this.mapRepairTemplateFromPrisma(t));
    }
    async createRepairTemplate(input) {
        const template = await this.prisma.repairTemplate.create({
            data: {
                unitId: input.unitId,
                name: input.name,
                description: input.description,
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
        return this.mapRepairTemplateFromPrisma(template);
    }
    async updateRepairTemplate(id, input) {
        let deduplicatedItems = undefined;
        // If checklistItems are provided, delete old ones and create new ones
        if (input.checklistItems) {
            await this.prisma.repairTemplateCheckbox.deleteMany({
                where: { templateId: id },
            });
            // ДЕДУПЛИКАЦИЯ: удаляем дубликаты из входящих данных
            const uniqueItems = new Map();
            input.checklistItems.forEach((item, index) => {
                const key = `${item.label}-${item.order ?? index}`;
                if (!uniqueItems.has(key)) {
                    uniqueItems.set(key, {
                        label: item.label,
                        order: item.order ?? index,
                        isRequired: item.isRequired ?? false,
                    });
                }
            });
            deduplicatedItems = Array.from(uniqueItems.values());
        }
        const template = await this.prisma.repairTemplate.update({
            where: { id },
            data: {
                name: input.name,
                description: input.description,
                estimatedDuration: input.estimatedDuration,
                checklistItems: deduplicatedItems
                    ? {
                        create: deduplicatedItems,
                    }
                    : undefined,
            },
            include: { checklistItems: true },
        });
        return this.mapRepairTemplateFromPrisma(template);
    }
    async deleteRepairTemplate(id) {
        await this.prisma.repairTemplate.delete({
            where: { id },
        });
        return true;
    }
    mapRepairTemplateFromPrisma(template) {
        return {
            id: template.id,
            unitId: template.unitId,
            name: template.name,
            description: template.description || undefined,
            estimatedDuration: template.estimatedDuration || undefined,
            checklistItems: (template.checklistItems || []).map((item) => ({
                id: item.id,
                templateId: item.templateId,
                label: item.label,
                order: item.order,
                isRequired: item.isRequired,
                createdAt: item.createdAt.toISOString(),
                updatedAt: item.updatedAt.toISOString(),
            })),
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString(),
        };
    }
    // ===== Cleaning operations =====
    async getCleaningById(id) {
        const cleaning = await this.prisma.cleaning.findUnique({
            where: { id },
            include: {
                checklistItems: true,
                reviews: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!cleaning)
            return null;
        return this.mapCleaningFromPrisma(cleaning);
    }
    async getCleaningByTaskId(taskId) {
        const cleaning = await this.prisma.cleaning.findFirst({
            where: { taskId },
            include: {
                checklistItems: true,
                reviews: {
                    orderBy: { createdAt: 'desc' },
                },
            },
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
        if (params.taskId)
            where.taskId = params.taskId;
        if (params.status) {
            if (Array.isArray(params.status)) {
                where.status = { in: params.status };
            }
            else {
                where.status = params.status;
            }
        }
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
                include: {
                    checklistItems: true,
                    reviews: {
                        orderBy: { createdAt: 'desc' },
                    },
                },
                take: first + 1,
                skip,
                cursor,
                orderBy: { createdAt: 'desc' },
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
        // Если не передан чеклист - загружаем из темплейта unit
        let checklistItemsData = input.checklistItems;
        console.log('🔍 scheduleCleaning called:', {
            unitId: input.unitId,
            hasChecklistInInput: !!input.checklistItems,
            checklistItemsCount: input.checklistItems?.length || 0
        });
        if (!checklistItemsData || checklistItemsData.length === 0) {
            // Загружаем ВСЕ темплейты для отладки
            const allTemplates = await this.prisma.cleaningTemplate.findMany({
                where: { unitId: input.unitId },
                include: { checklistItems: true },
                orderBy: { updatedAt: 'desc' },
            });
            console.log('📋 All templates for unit:', {
                unitId: input.unitId,
                totalTemplates: allTemplates.length,
                templates: allTemplates.map(t => ({
                    id: t.id,
                    name: t.name,
                    itemsCount: t.checklistItems.length,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt
                }))
            });
            const template = allTemplates[0]; // Берем первый (самый свежий)
            console.log('📋 Selected template for unit:', {
                unitId: input.unitId,
                templateId: template?.id,
                templateName: template?.name,
                itemsCount: template?.checklistItems?.length,
                templateUpdatedAt: template?.updatedAt,
                rawItems: template?.checklistItems?.map(i => ({ id: i.id, label: i.label, order: i.order }))
            });
            if (template?.checklistItems) {
                // ДЕДУПЛИКАЦИЯ: удаляем дубликаты по label
                const uniqueItems = new Map();
                template.checklistItems.forEach(item => {
                    const key = `${item.label}-${item.order}`;
                    if (!uniqueItems.has(key)) {
                        uniqueItems.set(key, {
                            label: item.label,
                            isChecked: false,
                            order: item.order,
                        });
                    }
                });
                checklistItemsData = Array.from(uniqueItems.values());
                console.log('✅ Loaded checklist items (deduplicated):', {
                    originalCount: template.checklistItems.length,
                    uniqueCount: checklistItemsData.length,
                    items: checklistItemsData.map(i => i.label)
                });
            }
            else {
                console.warn('⚠️ No template found for unit:', input.unitId);
            }
        }
        const cleaning = await this.prisma.cleaning.create({
            data: {
                orgId: input.orgId,
                cleanerId: input.cleanerId,
                unitId: input.unitId,
                bookingId: input.bookingId,
                taskId: input.taskId,
                scheduledAt: new Date(input.scheduledAt),
                notes: input.notes,
                requiresLinenChange: input.requiresLinenChange ?? false,
                status: 'SCHEDULED',
                checklistItems: checklistItemsData
                    ? {
                        create: checklistItemsData.map((item, index) => ({
                            label: item.label,
                            isChecked: item.isChecked ?? false,
                            order: item.order ?? index,
                        })),
                    }
                    : undefined,
            },
            include: {
                checklistItems: true,
                reviews: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        // Обновить связанную задачу - назначен уборщик, задача в работе
        if (cleaning.taskId && cleaning.cleanerId) {
            try {
                const cleaner = await this.prisma.cleaner.findUnique({
                    where: { id: cleaning.cleanerId },
                    select: { firstName: true, lastName: true }
                });
                await this.prisma.task.update({
                    where: { id: cleaning.taskId },
                    data: {
                        status: 'IN_PROGRESS',
                        assignedCleanerId: cleaning.cleanerId, // Назначаем уборщика на задачу!
                        note: cleaner
                            ? `Назначено на уборщика: ${cleaner.firstName} ${cleaner.lastName}`
                            : 'Уборка назначена'
                    },
                });
            }
            catch (error) {
                console.error('Failed to update task with cleaner info:', error);
                // Не падаем если задача не найдена
            }
        }
        return this.mapCleaningFromPrisma(cleaning);
    }
    async startCleaning(id) {
        const cleaning = await this.prisma.cleaning.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                startedAt: new Date(),
            },
            include: {
                checklistItems: true,
                reviews: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        // Обновить связанную задачу
        if (cleaning.taskId) {
            await this.prisma.task.update({
                where: { id: cleaning.taskId },
                data: { status: 'IN_PROGRESS' },
            }).catch((error) => {
                console.error('Failed to update task status:', error);
                // Не падаем если задача не найдена
            });
        }
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
            include: {
                checklistItems: true,
                reviews: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        // Обновить связанную задачу - перевести в DONE
        if (cleaning.taskId) {
            await this.prisma.task.update({
                where: { id: cleaning.taskId },
                data: { status: 'DONE' },
            }).catch((error) => {
                console.error('Failed to update task status:', error);
                // Не падаем если задача не найдена
            });
        }
        return this.mapCleaningFromPrisma(cleaning);
    }
    async approveCleaning(id, managerId, comment) {
        const cleaning = await this.prisma.cleaning.update({
            where: { id },
            data: {
                status: 'APPROVED',
                reviews: {
                    create: {
                        managerId,
                        status: 'APPROVED',
                        comment,
                    },
                },
            },
            include: {
                checklistItems: true,
                reviews: {
                    orderBy: { createdAt: 'desc' },
                },
            },
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
            include: {
                checklistItems: true,
                reviews: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        // Обновить связанную задачу - перевести в CANCELED
        if (cleaning.taskId) {
            await this.prisma.task.update({
                where: { id: cleaning.taskId },
                data: { status: 'CANCELED' },
            }).catch((error) => {
                console.error('Failed to update task status:', error);
                // Не падаем если задача не найдена
            });
        }
        return this.mapCleaningFromPrisma(cleaning);
    }
    async updateCleaningChecklist(id, items) {
        console.log('🔄 updateCleaningChecklist called:', {
            cleaningId: id,
            itemsCount: items.length,
            items: items.map(i => ({ label: i.label, isChecked: i.isChecked, order: i.order }))
        });
        // Проверяем текущее состояние ДО удаления
        const before = await this.prisma.cleaningChecklist.findMany({
            where: { cleaningId: id }
        });
        console.log('📊 Items BEFORE delete:', before.length);
        // Удаляем все старые пункты
        const deleted = await this.prisma.cleaningChecklist.deleteMany({
            where: { cleaningId: id }
        });
        console.log('🗑️ Deleted old items:', deleted.count);
        // Проверяем, что действительно удалено все
        const afterDelete = await this.prisma.cleaningChecklist.findMany({
            where: { cleaningId: id }
        });
        console.log('📊 Items AFTER delete (should be 0):', afterDelete.length);
        // Создаём новые пункты
        if (items.length > 0) {
            await this.prisma.cleaningChecklist.createMany({
                data: items.map((item, index) => ({
                    cleaningId: id,
                    label: item.label,
                    isChecked: item.isChecked,
                    order: item.order ?? index,
                }))
            });
            console.log('✅ Created new items:', items.length);
        }
        const cleaning = await this.prisma.cleaning.findUnique({
            where: { id },
            include: {
                checklistItems: true,
                reviews: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        console.log('📊 Final checklist items count:', cleaning?.checklistItems.length);
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
            difficultyModifier: template.difficultyModifier ?? undefined,
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
            cleanerId: cleaning.cleanerId ?? null,
            unitId: cleaning.unitId,
            bookingId: cleaning.bookingId,
            taskId: cleaning.taskId,
            status: cleaning.status,
            scheduledAt: cleaning.scheduledAt.toISOString(),
            startedAt: cleaning.startedAt?.toISOString(),
            completedAt: cleaning.completedAt?.toISOString(),
            assessedDifficulty: cleaning.assessedDifficulty !== null && cleaning.assessedDifficulty !== undefined
                ? `D${cleaning.assessedDifficulty}`
                : null,
            assessedAt: cleaning.assessedAt?.toISOString() ?? null,
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
            reviews: cleaning.reviews
                ? cleaning.reviews.map((review) => this.mapCleaningReviewFromPrisma(review))
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
    mapCleaningReviewFromPrisma(review) {
        return {
            id: review.id,
            cleaningId: review.cleaningId,
            managerId: review.managerId,
            status: review.status,
            comment: review.comment ?? undefined,
            createdAt: review.createdAt.toISOString(),
        };
    }
    // ===== Master operations =====
    async getMasterById(id) {
        try {
            const master = await this.prisma.master.findUnique({
                where: { id },
            });
            if (!master)
                return null;
            return this.mapMasterFromPrisma(master);
        }
        catch (error) {
            console.error('Error in getMasterById:', { id, error });
            throw error;
        }
    }
    async listMasters(params) {
        const where = {
            orgId: params.orgId,
            deletedAt: null,
        };
        if (params.isActive !== undefined) {
            where.isActive = params.isActive;
        }
        const first = params.first || 10;
        const skip = params.after ? 1 : 0;
        const cursor = params.after ? { id: params.after } : undefined;
        const [masters, totalCount] = await Promise.all([
            this.prisma.master.findMany({
                where,
                take: first + 1,
                skip,
                cursor,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.master.count({ where }),
        ]);
        const hasNextPage = masters.length > first;
        const edges = masters.slice(0, first).map((master) => ({
            node: this.mapMasterFromPrisma(master),
            cursor: master.id,
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
    async createMaster(input) {
        let firstName = input.firstName;
        let lastName = input.lastName;
        let email = input.email;
        // Если передан userId, получаем данные пользователя
        if (input.userId) {
            const user = await this.prisma.user.findUnique({
                where: { id: input.userId },
            });
            if (!user) {
                throw new Error(`User with id ${input.userId} not found`);
            }
            // Парсим имя пользователя (если полное имя в одном поле)
            const nameParts = (user.name || '').trim().split(/\s+/).filter(Boolean);
            if (!firstName && nameParts.length > 0) {
                firstName = nameParts[0];
            }
            if (!lastName && nameParts.length > 1) {
                lastName = nameParts.slice(1).join(' ');
            }
            if (!email) {
                email = user.email;
            }
        }
        // Убеждаемся, что firstName всегда имеет значение
        if (!firstName || firstName.trim() === '') {
            firstName = 'Unknown';
        }
        if (!lastName || lastName.trim() === '') {
            lastName = 'User';
        }
        const master = await this.prisma.master.create({
            data: {
                type: input.type || (input.userId ? 'INTERNAL' : 'EXTERNAL'),
                userId: input.userId || null,
                orgId: input.orgId,
                firstName,
                lastName: lastName || null,
                phone: input.phone || null,
                email: email || null,
                telegramUsername: input.telegramUsername || null,
                isActive: true,
            },
        });
        // Обеспечиваем, что у пользователя есть членство с ролью MASTER в этой организации
        if (input.userId) {
            await this.prisma.membership.upsert({
                where: {
                    userId_orgId_role: {
                        userId: input.userId,
                        orgId: input.orgId,
                        role: 'MASTER',
                    },
                },
                update: {
                    role: 'MASTER',
                },
                create: {
                    userId: input.userId,
                    orgId: input.orgId,
                    role: 'MASTER',
                },
            });
        }
        return this.mapMasterFromPrisma(master);
    }
    async updateMaster(id, input) {
        const updateData = {};
        if (input.firstName !== undefined)
            updateData.firstName = input.firstName;
        if (input.lastName !== undefined)
            updateData.lastName = input.lastName;
        if (input.phone !== undefined)
            updateData.phone = input.phone || null;
        if (input.email !== undefined)
            updateData.email = input.email || null;
        if (input.telegramUsername !== undefined)
            updateData.telegramUsername = input.telegramUsername || null;
        if (input.rating !== undefined)
            updateData.rating = input.rating;
        if (input.isActive !== undefined)
            updateData.isActive = input.isActive;
        const master = await this.prisma.master.update({
            where: { id },
            data: updateData,
        });
        return this.mapMasterFromPrisma(master);
    }
    mapMasterFromPrisma(master) {
        return {
            id: master.id,
            type: master.type,
            userId: master.userId || null,
            orgId: master.orgId,
            firstName: master.firstName,
            lastName: master.lastName,
            phone: master.phone || null,
            email: master.email || null,
            telegramUsername: master.telegramUsername || null,
            rating: master.rating || null,
            isActive: master.isActive,
            deletedAt: master.deletedAt ? master.deletedAt.toISOString() : null,
            createdAt: master.createdAt.toISOString(),
            updatedAt: master.updatedAt.toISOString(),
        };
    }
    // ===== Repair operations =====
    async getRepairById(id) {
        try {
            const repair = await this.prisma.repair.findUnique({
                where: { id },
                include: {
                    shoppingItems: {
                        include: {
                            photos: true,
                        },
                    },
                },
            });
            if (!repair)
                return null;
            return this.mapRepairFromPrisma(repair);
        }
        catch (error) {
            console.error('Error in getRepairById:', { id, error });
            throw error;
        }
    }
    async listRepairs(params) {
        const where = {};
        if (params.orgId)
            where.orgId = params.orgId;
        if (params.unitId)
            where.unitId = params.unitId;
        if (params.masterId)
            where.masterId = params.masterId;
        if (params.status) {
            if (Array.isArray(params.status)) {
                where.status = { in: params.status };
            }
            else {
                where.status = params.status;
            }
        }
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
        const [repairs, totalCount] = await Promise.all([
            this.prisma.repair.findMany({
                where,
                take: first + 1,
                skip,
                cursor,
                orderBy: { scheduledAt: 'desc' },
            }),
            this.prisma.repair.count({ where }),
        ]);
        const hasNextPage = repairs.length > first;
        const edges = repairs.slice(0, first).map((repair) => ({
            node: this.mapRepairFromPrisma(repair),
            cursor: repair.id,
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
    async scheduleRepair(input) {
        // Если это плановый осмотр, подтягиваем шаблон для логирования
        // Создание ChecklistInstance из шаблона будет сделано в резолвере
        if (input.isPlannedInspection) {
            const templates = await this.prisma.repairTemplate.findMany({
                where: { unitId: input.unitId },
                include: { checklistItems: true },
                orderBy: { updatedAt: 'desc' },
            });
            const template = templates[0]; // Берем первый (самый свежий)
            console.log('📋 Repair template for planned inspection:', {
                unitId: input.unitId,
                templateId: template?.id,
                templateName: template?.name,
                itemsCount: template?.checklistItems?.length || 0,
            });
            if (!template || !template.checklistItems || template.checklistItems.length === 0) {
                console.warn('⚠️ No repair template found for unit:', input.unitId);
            }
        }
        const repair = await this.prisma.repair.create({
            data: {
                orgId: input.orgId,
                unitId: input.unitId,
                masterId: input.masterId || null,
                bookingId: input.bookingId || null,
                taskId: input.taskId || null,
                isPlannedInspection: input.isPlannedInspection || false,
                scheduledAt: new Date(input.scheduledAt),
                notes: input.notes || null,
                status: 'PLANNED',
            },
        });
        return this.mapRepairFromPrisma(repair);
    }
    async startRepair(id) {
        const repair = await this.prisma.repair.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                startedAt: new Date(),
            },
        });
        return this.mapRepairFromPrisma(repair);
    }
    async completeRepair(id) {
        const repair = await this.prisma.repair.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });
        return this.mapRepairFromPrisma(repair);
    }
    async cancelRepair(id, reason) {
        const updateData = {
            status: 'CANCELLED',
        };
        if (reason) {
            updateData.notes = reason;
        }
        const repair = await this.prisma.repair.update({
            where: { id },
            data: updateData,
        });
        return this.mapRepairFromPrisma(repair);
    }
    async assessRepair(id, input) {
        const repair = await this.prisma.repair.update({
            where: { id },
            data: {
                assessedDifficulty: input.difficulty,
                assessedSize: input.size,
                assessedAt: new Date(),
            },
            include: {
                shoppingItems: {
                    include: {
                        photos: true,
                    },
                },
            },
        });
        return this.mapRepairFromPrisma(repair);
    }
    async createRepairShoppingItem(repairId, input) {
        const item = await this.prisma.repairShoppingItem.create({
            data: {
                repairId,
                name: input.name,
                quantity: input.quantity,
                amount: input.amount,
                currency: input.currency || 'RUB',
                notes: input.notes,
                photos: input.photos ? {
                    create: input.photos.map((photo, index) => ({
                        url: photo.url,
                        caption: photo.caption,
                        order: photo.order ?? index,
                    })),
                } : undefined,
            },
            include: {
                photos: true,
            },
        });
        return this.mapRepairShoppingItemFromPrisma(item);
    }
    async updateRepairShoppingItem(itemId, input) {
        const item = await this.prisma.repairShoppingItem.update({
            where: { id: itemId },
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.quantity !== undefined && { quantity: input.quantity }),
                ...(input.amount !== undefined && { amount: input.amount }),
                ...(input.currency !== undefined && { currency: input.currency }),
                ...(input.notes !== undefined && { notes: input.notes }),
            },
            include: {
                photos: true,
            },
        });
        return this.mapRepairShoppingItemFromPrisma(item);
    }
    async deleteRepairShoppingItem(itemId) {
        await this.prisma.repairShoppingItem.delete({
            where: { id: itemId },
        });
        return true;
    }
    async addPhotoToShoppingItem(itemId, url, caption, order) {
        const photo = await this.prisma.repairShoppingItemPhoto.create({
            data: {
                itemId,
                url,
                caption,
                order: order ?? 0,
            },
        });
        const item = await this.prisma.repairShoppingItem.findUnique({
            where: { id: itemId },
            include: {
                photos: true,
            },
        });
        return this.mapRepairShoppingItemFromPrisma(item);
    }
    async deletePhotoFromShoppingItem(photoId) {
        await this.prisma.repairShoppingItemPhoto.delete({
            where: { id: photoId },
        });
        return true;
    }
    mapRepairFromPrisma(repair) {
        return {
            id: repair.id,
            orgId: repair.orgId,
            masterId: repair.masterId || null,
            unitId: repair.unitId,
            bookingId: repair.bookingId || null,
            taskId: repair.taskId || null,
            status: repair.status,
            isPlannedInspection: repair.isPlannedInspection || false,
            scheduledAt: repair.scheduledAt.toISOString(),
            startedAt: repair.startedAt ? repair.startedAt.toISOString() : null,
            completedAt: repair.completedAt ? repair.completedAt.toISOString() : null,
            notes: repair.notes || null,
            assessedDifficulty: repair.assessedDifficulty ?? null,
            assessedSize: repair.assessedSize ?? null,
            assessedAt: repair.assessedAt ? repair.assessedAt.toISOString() : null,
            createdAt: repair.createdAt.toISOString(),
            updatedAt: repair.updatedAt.toISOString(),
            shoppingItems: repair.shoppingItems ? repair.shoppingItems.map((item) => this.mapRepairShoppingItemFromPrisma(item)) : [],
        };
    }
    mapRepairShoppingItemFromPrisma(item) {
        return {
            id: item.id,
            repairId: item.repairId,
            name: item.name,
            quantity: item.quantity,
            amount: item.amount,
            currency: item.currency,
            notes: item.notes || null,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            photos: item.photos ? item.photos.map((photo) => ({
                id: photo.id,
                itemId: photo.itemId,
                url: photo.url,
                caption: photo.caption || null,
                order: photo.order,
                createdAt: photo.createdAt.toISOString(),
                updatedAt: photo.updatedAt.toISOString(),
            })) : [],
        };
    }
}
