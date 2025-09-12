import { describe, it, expect, beforeEach } from 'vitest';
import type { IOpsDL, Task, ServiceProvider, ServiceOrder, TaskConnection } from '@repo/datalayer';
import { resolvers } from '../src/resolvers/index.js';

// Mock DataLayer implementation
class MockOpsDL implements IOpsDL {
  private tasks: Map<string, Task> = new Map();
  private providers: Map<string, ServiceProvider> = new Map();
  private orders: Map<string, ServiceOrder> = new Map();

  async getTaskById(id: string): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async listTasks(params: any): Promise<TaskConnection> {
    const tasks = Array.from(this.tasks.values()).filter(task => task.orgId === params.orgId);
    return {
      edges: tasks.map(task => ({ node: task, cursor: task.id })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: tasks[0]?.id,
        endCursor: tasks[tasks.length - 1]?.id
      },
      totalCount: tasks.length
    };
  }

  async createTask(input: any): Promise<Task> {
    const task: Task = {
      id: `task_${Date.now()}`,
      orgId: input.orgId,
      unitId: input.unitId,
      bookingId: input.bookingId,
      type: input.type,
      status: 'TODO',
      dueAt: input.dueAt,
      checklist: input.checklist || [],
      note: input.note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async assignTask(input: any): Promise<Task> {
    const task = this.tasks.get(input.taskId);
    if (!task) throw new Error('Task not found');
    
    const updatedTask = { 
      ...task, 
      assignedProviderId: input.providerId,
      status: input.status || task.status,
      note: input.note || task.note
    };
    this.tasks.set(input.taskId, updatedTask);
    return updatedTask;
  }

  async updateTaskStatus(id: string, status: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error('Task not found');
    
    const updatedTask = { ...task, status: status as any };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async getProviderById(id: string): Promise<ServiceProvider | null> {
    return this.providers.get(id) || null;
  }

  async listProviders(serviceTypes?: string[]): Promise<ServiceProvider[]> {
    const providers = Array.from(this.providers.values());
    if (serviceTypes) {
      return providers.filter(p => p.serviceTypes.some(type => serviceTypes.includes(type)));
    }
    return providers;
  }

  async createProvider(input: any): Promise<ServiceProvider> {
    const provider: ServiceProvider = {
      id: `provider_${Date.now()}`,
      name: input.name,
      serviceTypes: input.serviceTypes,
      rating: input.rating,
      contact: input.contact,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.providers.set(provider.id, provider);
    return provider;
  }

  async getServiceOrderById(id: string): Promise<ServiceOrder | null> {
    return this.orders.get(id) || null;
  }

  async createServiceOrder(input: any): Promise<ServiceOrder> {
    const order: ServiceOrder = {
      id: `order_${Date.now()}`,
      orgId: 'org1', // Mock orgId
      taskId: input.taskId,
      providerId: input.providerId,
      status: 'CREATED',
      cost: input.cost,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.orders.set(order.id, order);
    return order;
  }

  async updateServiceOrderStatus(id: string, status: string): Promise<ServiceOrder> {
    const order = this.orders.get(id);
    if (!order) throw new Error('Service order not found');
    
    const updatedOrder = { ...order, status: status as any };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async validateTaskAssignment(taskId: string, providerId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    const provider = this.providers.get(providerId);
    
    if (!task || !provider) return false;
    
    return provider.serviceTypes.includes(task.type);
  }

  async getTasksByProvider(providerId: string, status?: string): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values()).filter(task => 
      task.assignedProviderId === providerId && (!status || task.status === status)
    );
    return tasks;
  }
}

describe('Ops Resolvers', () => {
  let mockDataLayer: MockOpsDL;
  let context: { dl: IOpsDL };

  beforeEach(() => {
    mockDataLayer = new MockOpsDL();
    context = { dl: mockDataLayer };
  });

  describe('Query', () => {
    it('should get task by id', async () => {
      const task = await mockDataLayer.createTask({
        orgId: 'org1',
        type: 'CLEANING',
        unitId: 'unit1',
        checklist: ['Kitchen', 'Bathroom']
      });

      const result = await resolvers.Query.task(null, { id: task.id }, context);
      expect(result).toEqual(task);
    });

    it('should return null for non-existent task', async () => {
      const result = await resolvers.Query.task(null, { id: 'non-existent' }, context);
      expect(result).toBeNull();
    });

    it('should list tasks', async () => {
      await mockDataLayer.createTask({
        orgId: 'org1',
        type: 'CLEANING'
      });

      const result = await resolvers.Query.tasks(null, { orgId: 'org1' }, context);
      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('pageInfo');
      expect(result).toHaveProperty('totalCount');
      expect(result.edges.length).toBe(1);
    });

    it('should get service provider by id', async () => {
      const provider = await mockDataLayer.createProvider({
        name: 'Test Provider',
        serviceTypes: ['CLEANING', 'MAINTENANCE']
      });

      const result = await resolvers.Query.serviceProvider(null, { id: provider.id }, context);
      expect(result).toEqual(provider);
    });
  });

  describe('Mutation', () => {
    it('should create task', async () => {
      const input = {
        orgId: 'org1',
        type: 'CLEANING',
        unitId: 'unit1',
        checklist: ['Kitchen', 'Bathroom'],
        note: 'Deep clean required'
      };

      const result = await resolvers.Mutation.createTask(null, { input }, context);
      expect(result).toMatchObject({
        orgId: input.orgId,
        type: input.type,
        unitId: input.unitId,
        checklist: input.checklist,
        note: input.note
      });
      expect(result.id).toBeDefined();
      expect(result.status).toBe('TODO');
    });

    it('should assign task to provider', async () => {
      const task = await mockDataLayer.createTask({
        orgId: 'org1',
        type: 'CLEANING'
      });

      const provider = await mockDataLayer.createProvider({
        name: 'Cleaning Service',
        serviceTypes: ['CLEANING']
      });

      const result = await resolvers.Mutation.assignTask(null, { 
        input: { 
          taskId: task.id, 
          providerId: provider.id, 
          status: 'IN_PROGRESS' 
        } 
      }, context);
      
      expect(result.assignedProviderId).toBe(provider.id);
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should create service order', async () => {
      const task = await mockDataLayer.createTask({
        orgId: 'org1',
        type: 'CLEANING'
      });

      const provider = await mockDataLayer.createProvider({
        name: 'Cleaning Service',
        serviceTypes: ['CLEANING']
      });

      const result = await resolvers.Mutation.createServiceOrder(null, { 
        input: { 
          taskId: task.id, 
          providerId: provider.id,
          cost: { amount: 1000, currency: 'RUB' }
        } 
      }, context);
      
      expect(result.taskId).toBe(task.id);
      expect(result.providerId).toBe(provider.id);
      expect(result.status).toBe('CREATED');
    });

    it('should create service provider', async () => {
      const input = {
        name: 'New Provider',
        serviceTypes: ['CLEANING', 'MAINTENANCE'],
        rating: 4.5,
        contact: '+7-999-123-45-67'
      };

      const result = await resolvers.Mutation.createServiceProvider(null, { input }, context);
      expect(result).toMatchObject(input);
      expect(result.id).toBeDefined();
    });
  });

  describe('Entity Resolvers', () => {
    it('should resolve Task reference', async () => {
      const task = await mockDataLayer.createTask({
        orgId: 'org1',
        type: 'CLEANING'
      });

      const result = await resolvers.Task__resolveReference({ id: task.id }, context);
      expect(result).toEqual(task);
    });

    it('should resolve ServiceProvider reference', async () => {
      const provider = await mockDataLayer.createProvider({
        name: 'Test Provider',
        serviceTypes: ['CLEANING']
      });

      const result = await resolvers.ServiceProvider__resolveReference({ id: provider.id }, context);
      expect(result).toEqual(provider);
    });

    it('should resolve ServiceOrder reference', async () => {
      const task = await mockDataLayer.createTask({
        orgId: 'org1',
        type: 'CLEANING'
      });

      const order = await mockDataLayer.createServiceOrder({
        taskId: task.id
      });

      const result = await resolvers.ServiceOrder__resolveReference({ id: order.id }, context);
      expect(result).toEqual(order);
    });
  });
});
