import { PrismaClient } from '@prisma/client';
import type { IOpsDL, Task, ServiceProvider, ServiceOrder, TaskConnection, CreateTaskInput, AssignTaskInput, CreateServiceOrderInput, ListTasksParams } from '@repo/datalayer';
export declare class OpsDLPrisma implements IOpsDL {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    getTaskById(id: string): Promise<Task | null>;
    listTasks(params: ListTasksParams): Promise<TaskConnection>;
    createTask(input: CreateTaskInput): Promise<Task>;
    assignTask(input: AssignTaskInput): Promise<Task>;
    updateTaskStatus(id: string, status: string): Promise<Task>;
    updateTask(id: string, input: any): Promise<Task>;
    getProviderById(id: string): Promise<ServiceProvider | null>;
    listProviders(serviceTypes?: string[]): Promise<ServiceProvider[]>;
    createProvider(input: {
        name: string;
        serviceTypes: string[];
        rating?: number;
        contact?: string;
    }): Promise<ServiceProvider>;
    getServiceOrderById(id: string): Promise<ServiceOrder | null>;
    createServiceOrder(input: CreateServiceOrderInput): Promise<ServiceOrder>;
    updateServiceOrderStatus(id: string, status: string): Promise<ServiceOrder>;
    validateTaskAssignment(taskId: string, providerId: string): Promise<boolean>;
    getTasksByProvider(providerId: string, status?: string): Promise<Task[]>;
    private mapTaskFromPrisma;
    private mapProviderFromPrisma;
    private mapServiceOrderFromPrisma;
}
