import { createChannel, createClient, type Client } from 'nice-grpc';
import { createGraphQLLogger } from '@repo/shared-logger';
import type {
  CleaningServiceDefinition,
  ScheduleCleaningRequest,
  CleaningResponse,
  GetCleaningRequest,
  UpdateCleaningStatusRequest,
  AssignCleanerRequest,
  CleaningStatus,
} from '../generated/cleaning.js';
import { CleaningServiceDefinition as CleaningServiceDef } from '../generated/cleaning.js';

const logger = createGraphQLLogger('grpc-cleaning-client');

export interface ScheduleCleaningParams {
  orgId: string;
  unitId: string;
  bookingId?: string;
  taskId?: string;
  cleanerId?: string;
  scheduledAt: Date;
  requiresLinenChange?: boolean;
  notes?: string;
}

export class CleaningGrpcClient {
  private client: Client<CleaningServiceDefinition> | null = null;
  private isConnected = false;
  private readonly host: string;
  private readonly port: number;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;
  private readonly timeout: number;

  constructor(config: {
    host: string;
    port: number;
    retryAttempts?: number;
    retryDelay?: number;
    timeout?: number;
  }) {
    this.host = config.host;
    this.port = config.port;
    this.retryAttempts = config.retryAttempts ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.timeout = config.timeout ?? 10000;
  }

  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Cleaning GRPC service', {
        host: this.host,
        port: this.port,
      });

      const channel = createChannel(`${this.host}:${this.port}`);
      this.client = createClient(CleaningServiceDef, channel);
      this.isConnected = true;

      logger.info('Connected to Cleaning GRPC service');
    } catch (error) {
      logger.error('Failed to connect to Cleaning GRPC service', error);
      throw error;
    }
  }

  async scheduleCleaning(params: ScheduleCleaningParams): Promise<CleaningResponse> {
    if (!this.isConnected || !this.client) {
      throw new Error('GRPC client is not connected. Call connect() first.');
    }

    return this.executeWithRetry(async () => {
      logger.info('Scheduling cleaning via GRPC', {
        orgId: params.orgId,
        unitId: params.unitId,
        taskId: params.taskId,
      });

      const request = {
        orgId: params.orgId,
        unitId: params.unitId,
        bookingId: params.bookingId,
        taskId: params.taskId,
        cleanerId: params.cleanerId,
        scheduledAt: params.scheduledAt,
        requiresLinenChange: params.requiresLinenChange ?? false,
        notes: params.notes,
      };

      const response = await this.client!.scheduleCleaning(request as any);

      logger.info('Cleaning scheduled successfully', {
        cleaningId: response.cleaning?.id,
        success: response.success,
      });

      return response;
    });
  }

  async getCleaning(id: string): Promise<CleaningResponse> {
    if (!this.isConnected || !this.client) {
      throw new Error('GRPC client is not connected. Call connect() first.');
    }

    return this.executeWithRetry(async () => {
      const request = { id };
      return await this.client!.getCleaning(request as any);
    });
  }

  async updateStatus(id: string, status: CleaningStatus): Promise<CleaningResponse> {
    if (!this.isConnected || !this.client) {
      throw new Error('GRPC client is not connected. Call connect() first.');
    }

    return this.executeWithRetry(async () => {
      const request = { id, status };
      return await this.client!.updateCleaningStatus(request as any);
    });
  }

  async assignCleaner(cleaningId: string, cleanerId: string): Promise<CleaningResponse> {
    if (!this.isConnected || !this.client) {
      throw new Error('GRPC client is not connected. Call connect() first.');
    }

    return this.executeWithRetry(async () => {
      const request = { cleaningId, cleanerId };
      return await this.client!.assignCleaner(request as any);
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client = null;
      this.isConnected = false;
      logger.info('Disconnected from Cleaning GRPC service');
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`GRPC call failed (attempt ${attempt}/${this.retryAttempts})`, {
          error: lastError.message,
        });

        if (attempt < this.retryAttempts) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    throw lastError || new Error('GRPC call failed');
  }
}

export function createCleaningGrpcClient(config: {
  host: string;
  port: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}): CleaningGrpcClient {
  return new CleaningGrpcClient(config);
}

export type { CleaningResponse, CleaningStatus };

