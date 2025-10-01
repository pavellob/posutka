import type { IOpsDL } from '@repo/datalayer';
import { sharedResolvers } from '../resolvers/index.js';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('ops-grpc-service');

// Простые типы для начала (позже заменим на генерируемые)
interface CreateCleaningTaskRequest {
  orgId: string;
  propertyId: string;
  roomId: string;
  bookingId: string;
  scheduledAt?: Date;
  notes?: string;
  priority?: number;
}

interface TaskResponse {
  task?: any;
  success: boolean;
  message: string;
}

interface GetTaskRequest {
  id: string;
}

interface UpdateTaskStatusRequest {
  id: string;
  status: number;
  notes?: string;
}

interface AssignTaskRequest {
  id: string;
  assignedTo: string;
}

interface GetTasksByPropertyRequest {
  propertyId: string;
  status?: number;
  limit?: number;
  offset?: number;
}

interface GetTasksByRoomRequest {
  roomId: string;
  status?: number;
  limit?: number;
  offset?: number;
}

interface TasksResponse {
  tasks: any[];
  success: boolean;
  message: string;
}

// Status enum mapping from proto to string
const statusMap: Record<number, string> = {
  0: 'TODO',
  1: 'IN_PROGRESS',
  2: 'DONE',
  3: 'CANCELED',
};

// Task type enum mapping from proto to string
const taskTypeMap: Record<number, string> = {
  0: 'CLEANING',
  1: 'CHECKIN',
  2: 'CHECKOUT',
  3: 'MAINTENANCE',
  4: 'INVENTORY',
};

export class OpsGrpcService {
  constructor(private readonly dl: IOpsDL) {}

  async CreateCleaningTask(request: CreateCleaningTaskRequest): Promise<TaskResponse> {
    try {
      logger.info('Received GRPC request', { 
        request,
        orgId: request.orgId,
        propertyId: request.propertyId,
        roomId: request.roomId,
        bookingId: request.bookingId
      });

      // Validate required fields
      if (!request.orgId) {
        logger.error('orgId is missing in request', { request });
        throw new Error('orgId is required');
      }
      if (!request.propertyId) {
        throw new Error('propertyId is required');
      }

      // Convert scheduledAt to ISO string (it might come as Date, string, or timestamp)
      let dueAt: string;
      if (request.scheduledAt) {
        if (typeof request.scheduledAt === 'string') {
          dueAt = request.scheduledAt;
        } else if (request.scheduledAt instanceof Date) {
          dueAt = request.scheduledAt.toISOString();
        } else if (typeof request.scheduledAt === 'object' && 'toISOString' in request.scheduledAt) {
          dueAt = (request.scheduledAt as Date).toISOString();
        } else {
          // Assume it's a timestamp or other format
          dueAt = new Date(request.scheduledAt as any).toISOString();
        }
      } else {
        dueAt = new Date().toISOString();
      }

      // Use shared resolver that uses datalayer-prisma
      const task = await sharedResolvers.createTask(this.dl, {
        orgId: request.orgId, // Use orgId from request
        unitId: request.roomId || undefined,
        bookingId: request.bookingId || undefined,
        type: 'CLEANING',
        dueAt,
        note: request.notes,
      });

      return {
        task: task,
        success: true,
        message: 'Cleaning task created successfully'
      };
    } catch (error: any) {
      logger.error('Failed to create cleaning task', { error: error.message });
      return {
        task: undefined,
        success: false,
        message: error.message
      };
    }
  }

  async GetTask(request: GetTaskRequest): Promise<TaskResponse> {
    try {
      // Use shared resolver that uses datalayer-prisma
      const task = await sharedResolvers.getTaskById(this.dl, request.id);
      
      if (!task) {
        return {
          task: undefined,
          success: false,
          message: 'Task not found'
        };
      }

      return {
        task: task,
        success: true,
        message: 'Task retrieved successfully'
      };
    } catch (error: any) {
      logger.error('Failed to get task', { error: error.message });
      return {
        task: undefined,
        success: false,
        message: error.message
      };
    }
  }

  async UpdateTaskStatus(request: UpdateTaskStatusRequest): Promise<TaskResponse> {
    try {
      // Map proto enum to string status
      const status = statusMap[request.status] || 'TODO';
      
      // Use shared resolver that uses datalayer-prisma
      const task = await sharedResolvers.updateTaskStatus(
        this.dl,
        request.id,
        status
      );

      return {
        task: task,
        success: true,
        message: 'Task status updated successfully'
      };
    } catch (error: any) {
      logger.error('Failed to update task status', { error: error.message });
      return {
        task: undefined,
        success: false,
        message: error.message
      };
    }
  }

  async AssignTask(request: AssignTaskRequest): Promise<TaskResponse> {
    try {
      // Use shared resolver that uses datalayer-prisma
      const task = await sharedResolvers.assignTask(this.dl, {
        taskId: request.id,
        providerId: request.assignedTo,
      });

      return {
        task: task,
        success: true,
        message: 'Task assigned successfully'
      };
    } catch (error: any) {
      logger.error('Failed to assign task', { error: error.message });
      return {
        task: undefined,
        success: false,
        message: error.message
      };
    }
  }

  async GetTasksByProperty(request: GetTasksByPropertyRequest): Promise<TasksResponse> {
    try {
      // Use shared resolver that uses datalayer-prisma
      const status = request.status !== undefined ? statusMap[request.status] : undefined;
      const result = await sharedResolvers.listTasks(this.dl, {
        orgId: request.propertyId,
        status,
        first: request.limit,
      });

      return {
        tasks: result.edges.map(edge => edge.node),
        success: true,
        message: 'Tasks retrieved successfully'
      };
    } catch (error: any) {
      logger.error('Failed to get tasks by property', { error: error.message });
      return {
        tasks: [],
        success: false,
        message: error.message
      };
    }
  }

  async GetTasksByRoom(request: GetTasksByRoomRequest): Promise<TasksResponse> {
    try {
      // For room-specific queries, we need to add unitId filter
      // This would require extending listTasks to support unitId filtering
      // For now, we'll fetch all tasks and filter in memory
      const status = request.status !== undefined ? statusMap[request.status] : undefined;
      
      // TODO: Extend datalayer to support unitId filtering for better performance
      const result = await sharedResolvers.listTasks(this.dl, {
        orgId: request.roomId, // This is a workaround - should be improved
        status,
        first: request.limit || 100,
      });

      // Filter by unitId (roomId)
      const filteredTasks = result.edges
        .map(edge => edge.node)
        .filter(task => task.unitId === request.roomId);

      return {
        tasks: filteredTasks,
        success: true,
        message: 'Tasks retrieved successfully'
      };
    } catch (error: any) {
      logger.error('Failed to get tasks by room', { error: error.message });
      return {
        tasks: [],
        success: false,
        message: error.message
      };
    }
  }
}
