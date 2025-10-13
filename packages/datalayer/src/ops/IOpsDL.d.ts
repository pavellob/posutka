import type { Task, ServiceProvider, ServiceOrder, TaskConnection, CreateTaskInput, AssignTaskInput, CreateServiceOrderInput, ListTasksParams, UUID } from './types.js';
export interface IOpsDL {
    getTaskById(id: UUID): Promise<Task | null>;
    listTasks(params: ListTasksParams): Promise<TaskConnection>;
    createTask(input: CreateTaskInput): Promise<Task>;
    assignTask(input: AssignTaskInput): Promise<Task>;
    updateTaskStatus(id: UUID, status: string): Promise<Task>;
    updateTask(id: UUID, input: any): Promise<Task>;
    getProviderById(id: UUID): Promise<ServiceProvider | null>;
    listProviders(serviceTypes?: string[]): Promise<ServiceProvider[]>;
    createProvider(input: {
        name: string;
        serviceTypes: string[];
        rating?: number;
        contact?: string;
    }): Promise<ServiceProvider>;
    getServiceOrderById(id: UUID): Promise<ServiceOrder | null>;
    createServiceOrder(input: CreateServiceOrderInput): Promise<ServiceOrder>;
    updateServiceOrderStatus(id: UUID, status: string): Promise<ServiceOrder>;
    validateTaskAssignment(taskId: UUID, providerId: UUID): Promise<boolean>;
    getTasksByProvider(providerId: UUID, status?: string): Promise<Task[]>;
}
