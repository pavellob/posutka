// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';
import type { 
  IOpsDL, 
  Task, 
  ServiceProvider, 
  ServiceOrder, 
  TaskConnection,
  CreateTaskInput,
  AssignTaskInput,
  CreateServiceOrderInput,
  ListTasksParams,
  UUID 
} from '@repo/datalayer';

export class OpsDLPrisma implements IOpsDL {
  constructor(private readonly prisma: PrismaClient) {}

  async getTaskById(id: string): Promise<Task | null> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignedProvider: true }
    });
    
    return task ? this.mapTaskFromPrisma(task) : null;
  }

  async listTasks(params: ListTasksParams): Promise<TaskConnection> {
    const where: any = { orgId: params.orgId };
    
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;

    const first = params.first || 10;
    const skip = params.after ? 1 : 0;
    const cursor = params.after ? { id: params.after } : undefined;

    const [tasks, totalCount] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: { assignedProvider: true },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.task.count({ where })
    ]);

    const hasNextPage = tasks.length > first;
    const edges = tasks.slice(0, first).map((task: any) => ({
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

  async createTask(input: CreateTaskInput): Promise<Task> {
    const task = await this.prisma.task.create({
      data: {
        orgId: input.orgId,
        unitId: input.unitId,
        bookingId: input.bookingId,
        type: input.type,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        checklist: input.checklist || [],
        note: input.note,
        status: 'TODO'
      },
      include: { assignedProvider: true }
    });

    return this.mapTaskFromPrisma(task);
  }

  async assignTask(input: AssignTaskInput): Promise<Task> {
    const updateData: any = {};
    
    if (input.providerId) updateData.assignedProviderId = input.providerId;
    if (input.cleanerId) updateData.assignedCleanerId = input.cleanerId;
    if (input.status) updateData.status = input.status;
    if (input.note) updateData.note = input.note;

    const task = await this.prisma.task.update({
      where: { id: input.taskId },
      data: updateData,
      include: { assignedProvider: true }
    });

    return this.mapTaskFromPrisma(task);
  }

  async updateTaskStatus(id: string, status: string): Promise<Task> {
    const task = await this.prisma.task.update({
      where: { id },
      data: { status: status as any },
      include: { assignedProvider: true }
    });

    return this.mapTaskFromPrisma(task);
  }

  async updateTask(id: string, input: any): Promise<Task> {
    const updateData: any = {};
    
    if (input.type) updateData.type = input.type;
    if (input.status) updateData.status = input.status;
    if (input.note !== undefined) updateData.note = input.note;
    if (input.dueAt) updateData.dueAt = new Date(input.dueAt);

    const task = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: { assignedProvider: true }
    });

    return this.mapTaskFromPrisma(task);
  }

  async getProviderById(id: string): Promise<ServiceProvider | null> {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id } });
    return provider ? this.mapProviderFromPrisma(provider) : null;
  }

  async listProviders(serviceTypes?: string[]): Promise<ServiceProvider[]> {
    const where = serviceTypes ? { serviceTypes: { hasSome: serviceTypes } } : {};
    
    const providers = await this.prisma.serviceProvider.findMany({ where });
    return providers.map((provider: any) => this.mapProviderFromPrisma(provider));
  }

  async createProvider(input: {
    name: string;
    serviceTypes: string[];
    rating?: number;
    contact?: string;
  }): Promise<ServiceProvider> {
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

  async getServiceOrderById(id: string): Promise<ServiceOrder | null> {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: { task: true, provider: true }
    });
    
    return order ? this.mapServiceOrderFromPrisma(order) : null;
  }

  async createServiceOrder(input: CreateServiceOrderInput): Promise<ServiceOrder> {
    // Get task to extract orgId
    const task = await this.prisma.task.findUnique({ where: { id: input.taskId } });
    if (!task) throw new Error('Task not found');

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

  async updateServiceOrderStatus(id: string, status: string): Promise<ServiceOrder> {
    const order = await this.prisma.serviceOrder.update({
      where: { id },
      data: { status: status as any },
      include: { task: true, provider: true }
    });

    return this.mapServiceOrderFromPrisma(order);
  }

  async validateTaskAssignment(taskId: string, providerId: string): Promise<boolean> {
    const [task, provider] = await Promise.all([
      this.prisma.task.findUnique({ where: { id: taskId } }),
      this.prisma.serviceProvider.findUnique({ where: { id: providerId } })
    ]);

    if (!task || !provider) return false;
    
    return provider.serviceTypes.includes(task.type);
  }

  async getTasksByProvider(providerId: string, status?: string): Promise<Task[]> {
    const where: any = { assignedProviderId: providerId };
    if (status) where.status = status;

    const tasks = await this.prisma.task.findMany({
      where,
      include: { assignedProvider: true },
      orderBy: { createdAt: 'desc' }
    });

    return tasks.map((task: any) => this.mapTaskFromPrisma(task));
  }

  private mapTaskFromPrisma(task: any): Task {
    return {
      id: task.id,
      orgId: task.orgId,
      unitId: task.unitId,
      bookingId: task.bookingId,
      type: task.type,
      status: task.status,
      dueAt: task.dueAt?.toISOString(),
      assignedProviderId: task.assignedProviderId,
      assignedCleanerId: task.assignedCleanerId,
      checklist: task.checklist,
      note: task.note,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    };
  }

  private mapProviderFromPrisma(provider: any): ServiceProvider {
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

  private mapServiceOrderFromPrisma(order: any): ServiceOrder {
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
