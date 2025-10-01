import { createChannel, createClient, Client, Channel } from 'nice-grpc';
import { createGraphQLLogger } from '@repo/shared-logger';
import type { 
  OpsServiceClientImpl, 
  CreateCleaningTaskRequest,
  TaskResponse,
  Task,
  TaskPriority
} from '../generated/ops.js';

const logger = createGraphQLLogger('grpc-ops-client');

// Экспортируем типы из сгенерированных файлов
export type { TaskResponse, Task, TaskPriority };

export interface OpsGrpcClientConfig {
  host: string;
  port: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface CreateCleaningTaskParams {
  orgId: string;
  propertyId: string;
  roomId: string;
  bookingId: string;
  scheduledAt?: Date;
  notes?: string;
  priority?: number;
}

export class OpsGrpcClient {
  private client: OpsServiceClientImpl | null = null;
  private channel: Channel | null = null;
  private isConnected = false;
  private retryAttempts: number;
  private retryDelay: number;
  private timeout: number;

  constructor(private readonly config: OpsGrpcClientConfig) {
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.timeout = config.timeout || 5000;
  }

  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Ops GRPC service', { 
        host: this.config.host, 
        port: this.config.port 
      });
      
      // Создаем GRPC канал
      this.channel = createChannel(`${this.config.host}:${this.config.port}`);
      
      // Создаем GRPC клиент с использованием сгенерированного определения
      // ts-proto генерирует интерфейсы, но не определения сервисов для nice-grpc
      // Поэтому создаём определение вручную на основе proto
      const OpsServiceDefinition = {
        createCleaningTask: {
          path: '/ops.OpsService/CreateCleaningTask',
          requestStream: false,
          responseStream: false,
          requestSerialize: (value: any) => Buffer.from(JSON.stringify(value)),
          requestDeserialize: (value: Buffer) => JSON.parse(value.toString()),
          responseSerialize: (value: any) => Buffer.from(JSON.stringify(value)),
          responseDeserialize: (value: Buffer) => JSON.parse(value.toString()),
        },
      };
      
      this.client = createClient(OpsServiceDefinition, this.channel) as any;
      
      this.isConnected = true;
      logger.info('Connected to Ops GRPC service');
    } catch (error: any) {
      logger.error('Failed to connect to Ops GRPC service', { error: error.message });
      throw error;
    }
  }

  async createCleaningTask(params: CreateCleaningTaskParams): Promise<TaskResponse> {
    if (!this.isConnected || !this.client) {
      throw new Error('GRPC client is not connected. Call connect() first.');
    }

    return this.executeWithRetry(async () => {
      logger.info('Creating cleaning task via GRPC', params);
      
      // Преобразуем параметры в формат proto (используем camelCase для JSON сериализации)
      const request = {
        orgId: params.orgId,
        propertyId: params.propertyId,
        roomId: params.roomId,
        bookingId: params.bookingId,
        scheduledAt: params.scheduledAt,
        notes: params.notes,
        priority: params.priority || 1,
      };

      logger.info('Sending GRPC request', { request });

      // Реальный GRPC вызов через сгенерированный клиент
      const response = await this.client!.CreateCleaningTask(request);
      
      logger.info('Cleaning task created', { taskId: response.task?.id });
      return response;
    });
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        logger.debug(`Executing GRPC operation, attempt ${attempt}`);
        
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
          )
        ]);
        
        return result;
      } catch (error: any) {
        lastError = error;
        logger.warn(`GRPC operation failed, attempt ${attempt}/${this.retryAttempts}`, { 
          error: error.message,
          willRetry: attempt < this.retryAttempts
        });
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    logger.error(`GRPC operation failed after ${this.retryAttempts} attempts`, {
      error: lastError?.message
    });
    
    throw lastError || new Error('Operation failed');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.client = null;
    this.isConnected = false;
    logger.info('Disconnected from Ops GRPC service');
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

// Экспорт фабрики для создания клиента
export function createOpsGrpcClient(config: OpsGrpcClientConfig): OpsGrpcClient {
  return new OpsGrpcClient(config);
}