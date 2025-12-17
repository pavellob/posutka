export class OpsDLPrisma {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTaskById(id) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            include: { assignedProvider: true, assignedMaster: true }
        });
        return task ? this.mapTaskFromPrisma(task) : null;
    }
    async listTasks(params) {
        const where = { orgId: params.orgId };
        if (params.status)
            where.status = params.status;
        if (params.type)
            where.type = params.type;
        const first = params.first || 10;
        const skip = params.after ? 1 : 0;
        const cursor = params.after ? { id: params.after } : undefined;
        const [tasks, totalCount] = await Promise.all([
            this.prisma.task.findMany({
                where,
                include: { assignedProvider: true, assignedMaster: true },
                take: first + 1,
                skip,
                cursor,
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.task.count({ where })
        ]);
        const hasNextPage = tasks.length > first;
        const edges = tasks.slice(0, first).map((task) => ({
            node: this.mapTaskFromPrisma(task),
            cursor: task.id
        }));
        return {
            edges,
            pageInfo: {
                hasNextPage,
                hasPreviousPage: !!params.after,
                startCursor: edges[0]?.cursor,
                endCursor: edges[edges.length - 1]?.cursor
            },
            totalCount
        };
    }
    async createTask(input) {
        const task = await this.prisma.task.create({
            data: {
                orgId: input.orgId,
                unitId: input.unitId,
                bookingId: input.bookingId,
                sourceId: input.sourceId,
                checklistItemKey: input.checklistItemKey,
                checklistItemInstanceId: input.checklistItemInstanceId,
                authorId: input.authorId,
                assignedProviderId: input.assignedProviderId,
                assignedCleanerId: input.assignedCleanerId,
                assignedMasterId: input.assignedMasterId,
                plannedForNextChecklist: input.plannedForNextChecklist ?? false,
                sourceCleaningId: input.sourceCleaningId,
                type: input.type,
                dueAt: input.dueAt ? new Date(input.dueAt) : null,
                checklist: input.checklist || [],
                note: input.note,
                status: input.status || 'TODO'
            },
            include: { assignedProvider: true, assignedMaster: true }
        });
        return this.mapTaskFromPrisma(task);
    }
    async assignTask(input) {
        const updateData = {};
        if (input.providerId)
            updateData.assignedProviderId = input.providerId;
        if (input.cleanerId)
            updateData.assignedCleanerId = input.cleanerId;
        if (input.masterId)
            updateData.assignedMasterId = input.masterId;
        if (input.status)
            updateData.status = input.status;
        if (input.note)
            updateData.note = input.note;
        const task = await this.prisma.task.update({
            where: { id: input.taskId },
            data: updateData,
            include: { assignedProvider: true, assignedMaster: true }
        });
        return this.mapTaskFromPrisma(task);
    }
    async updateTaskStatus(id, status) {
        const task = await this.prisma.task.update({
            where: { id },
            data: { status: status },
            include: { assignedProvider: true, assignedMaster: true }
        });
        return this.mapTaskFromPrisma(task);
    }
    async updateTask(id, input) {
        const updateData = {};
        if (input.type)
            updateData.type = input.type;
        if (input.status)
            updateData.status = input.status;
        if (input.note !== undefined)
            updateData.note = input.note;
        if (input.dueAt)
            updateData.dueAt = new Date(input.dueAt);
        const task = await this.prisma.task.update({
            where: { id },
            data: updateData,
            include: { assignedProvider: true, assignedMaster: true }
        });
        return this.mapTaskFromPrisma(task);
    }
    async getProviderById(id) {
        const provider = await this.prisma.serviceProvider.findUnique({ where: { id } });
        return provider ? this.mapProviderFromPrisma(provider) : null;
    }
    async listProviders(serviceTypes) {
        const where = serviceTypes ? { serviceTypes: { hasSome: serviceTypes } } : {};
        const providers = await this.prisma.serviceProvider.findMany({ where });
        return providers.map((provider) => this.mapProviderFromPrisma(provider));
    }
    async createProvider(input) {
        const provider = await this.prisma.serviceProvider.create({
            data: {
                name: input.name,
                serviceTypes: input.serviceTypes,
                rating: input.rating,
                contact: input.contact
            }
        });
        return this.mapProviderFromPrisma(provider);
    }
    async getServiceOrderById(id) {
        const order = await this.prisma.serviceOrder.findUnique({
            where: { id },
            include: { task: true, provider: true }
        });
        return order ? this.mapServiceOrderFromPrisma(order) : null;
    }
    async createServiceOrder(input) {
        // Get task to extract orgId
        const task = await this.prisma.task.findUnique({ where: { id: input.taskId } });
        if (!task)
            throw new Error('Task not found');
        const order = await this.prisma.serviceOrder.create({
            data: {
                orgId: task.orgId,
                taskId: input.taskId,
                providerId: input.providerId,
                costAmount: input.cost?.amount,
                costCurrency: input.cost?.currency,
                notes: input.notes,
                status: 'CREATED'
            },
            include: { task: true, provider: true }
        });
        return this.mapServiceOrderFromPrisma(order);
    }
    async updateServiceOrderStatus(id, status) {
        const order = await this.prisma.serviceOrder.update({
            where: { id },
            data: { status: status },
            include: { task: true, provider: true }
        });
        return this.mapServiceOrderFromPrisma(order);
    }
    async validateTaskAssignment(taskId, providerId) {
        const [task, provider] = await Promise.all([
            this.prisma.task.findUnique({ where: { id: taskId } }),
            this.prisma.serviceProvider.findUnique({ where: { id: providerId } })
        ]);
        if (!task || !provider)
            return false;
        return provider.serviceTypes.includes(task.type);
    }
    async getTasksByProvider(providerId, status) {
        const where = { assignedProviderId: providerId };
        if (status)
            where.status = status;
        const tasks = await this.prisma.task.findMany({
            where,
            include: { assignedProvider: true },
            orderBy: { createdAt: 'desc' }
        });
        return tasks.map((task) => this.mapTaskFromPrisma(task));
    }
    mapTaskFromPrisma(task) {
        // Преобразуем статус в строку, если это enum объект Prisma
        let status = task.status;
        if (status && typeof status !== 'string') {
            // Если это enum объект Prisma, берем значение
            status = status.value || String(status);
        }
        // Если статус отсутствует, используем значение по умолчанию
        if (!status) {
            status = 'TODO';
        }
        // Валидация: проверяем, что статус соответствует допустимым значениям
        const validStatuses = ['DRAFT', 'TODO', 'IN_PROGRESS', 'DONE', 'CANCELED'];
        if (!validStatuses.includes(status)) {
            // Если статус недопустим, логируем и используем значение по умолчанию
            console.warn(`Invalid task status: ${status}, using TODO as default. Task ID: ${task.id}`);
            status = 'TODO';
        }
        return {
            id: task.id,
            orgId: task.orgId,
            unitId: task.unitId,
            bookingId: task.bookingId,
            sourceId: task.sourceId,
            checklistItemKey: task.checklistItemKey,
            checklistItemInstanceId: task.checklistItemInstanceId,
            authorId: task.authorId,
            type: task.type,
            status: status,
            dueAt: task.dueAt?.toISOString(),
            assignedProviderId: task.assignedProviderId,
            assignedCleanerId: task.assignedCleanerId,
            assignedMasterId: task.assignedMasterId,
            plannedForNextChecklist: task.plannedForNextChecklist ?? false,
            sourceCleaningId: task.sourceCleaningId,
            checklist: task.checklist,
            note: task.note,
            createdAt: task.createdAt.toISOString(),
            updatedAt: task.updatedAt.toISOString()
        };
    }
    mapProviderFromPrisma(provider) {
        return {
            id: provider.id,
            name: provider.name,
            serviceTypes: provider.serviceTypes,
            rating: provider.rating,
            contact: provider.contact,
            createdAt: provider.createdAt.toISOString(),
            updatedAt: provider.updatedAt.toISOString()
        };
    }
    mapServiceOrderFromPrisma(order) {
        return {
            id: order.id,
            orgId: order.orgId,
            taskId: order.taskId,
            providerId: order.providerId,
            status: order.status,
            cost: order.costAmount ? { amount: order.costAmount, currency: order.costCurrency } : undefined,
            invoiceId: order.invoiceId,
            notes: order.notes,
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString()
        };
    }
}
