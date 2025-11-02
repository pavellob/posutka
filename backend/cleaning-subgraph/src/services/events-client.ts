import { createGraphQLLogger } from '@repo/shared-logger';
import {
  createEventsGrpcClient,
  type EventsGrpcClient,
  EventsEventType as EventType,
} from '@repo/grpc-sdk';

const logger = createGraphQLLogger('cleaning-events-client');

/**
 * Клиент для публикации событий в events-subgraph через gRPC.
 */
export class EventsClient {
  private grpcClient: EventsGrpcClient;
  private readonly frontendUrl: string;
  private connected = false;
  
  constructor(
    grpcHost: string = process.env.EVENTS_GRPC_HOST || 'localhost',
    grpcPort: number = parseInt(process.env.EVENTS_GRPC_PORT || '4113'),
    frontendUrl?: string
  ) {
    this.frontendUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
    
    this.grpcClient = createEventsGrpcClient({
      host: grpcHost,
      port: grpcPort,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
    });
    
    // Подключаемся к gRPC серверу
    this.connect();
    
    logger.info('EventsClient initialized', {
      grpcHost,
      grpcPort,
      frontendUrl: this.frontendUrl
    });
  }
  
  private async connect(): Promise<void> {
    try {
      await this.grpcClient.connect();
      this.connected = true;
      logger.info('EventsClient connected to gRPC server');
    } catch (error) {
      logger.error('Failed to connect EventsClient to gRPC server', error);
    }
  }
  
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }
  
  /**
   * Опубликовать событие CLEANING_ASSIGNED
   */
  async publishCleaningAssigned(params: {
    cleaningId: string;
    cleanerId: string;
    unitId: string;
    unitName: string;
    scheduledAt: string;
    requiresLinenChange: boolean;
    orgId?: string;
    actorUserId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('Publishing CLEANING_ASSIGNED event', params);
      
      await this.grpcClient.publishEvent({
        eventType: EventType.EVENT_TYPE_CLEANING_ASSIGNED,
        sourceSubgraph: 'cleaning-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        actorUserId: params.actorUserId,
        targetUserIds: [params.cleanerId],
        payload: {
          cleaningId: params.cleaningId,
          cleanerId: params.cleanerId,
          unitId: params.unitId,
          unitName: params.unitName,
          scheduledAt: params.scheduledAt,
          requiresLinenChange: params.requiresLinenChange
        }
      });
      
      logger.info('CLEANING_ASSIGNED event published', { cleaningId: params.cleaningId });
    } catch (error: any) {
      logger.error('Failed to publish CLEANING_ASSIGNED event', { 
        error: error.message,
        params 
      });
    }
  }
  
  /**
   * Опубликовать событие CLEANING_STARTED
   */
  async publishCleaningStarted(params: {
    cleaningId: string;
    cleanerId: string;
    unitName: string;
    orgId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('Publishing CLEANING_STARTED event', params);
      
      await this.grpcClient.publishEvent({
        eventType: EventType.EVENT_TYPE_CLEANING_STARTED,
        sourceSubgraph: 'cleaning-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds: [params.cleanerId],
        payload: {
          cleaningId: params.cleaningId,
          cleanerId: params.cleanerId,
          unitName: params.unitName,
          startedAt: new Date().toISOString()
        }
      });
      
      logger.info('CLEANING_STARTED event published', { cleaningId: params.cleaningId });
    } catch (error: any) {
      logger.error('Failed to publish CLEANING_STARTED event', { 
        error: error.message,
        params 
      });
    }
  }
  
  /**
   * Опубликовать событие CLEANING_COMPLETED
   */
  async publishCleaningCompleted(params: {
    cleaningId: string;
    cleanerId: string;
    unitName: string;
    completedAt: string;
    orgId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('Publishing CLEANING_COMPLETED event', params);
      
      await this.grpcClient.publishEvent({
        eventType: EventType.EVENT_TYPE_CLEANING_COMPLETED,
        sourceSubgraph: 'cleaning-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds: [params.cleanerId],
        payload: {
          cleaningId: params.cleaningId,
          cleanerId: params.cleanerId,
          unitName: params.unitName,
          completedAt: params.completedAt
        }
      });
      
      logger.info('CLEANING_COMPLETED event published', { cleaningId: params.cleaningId });
    } catch (error: any) {
      logger.error('Failed to publish CLEANING_COMPLETED event', { 
        error: error.message,
        params 
      });
    }
  }
  
  /**
   * Опубликовать событие CLEANING_CANCELLED
   */
  async publishCleaningCancelled(params: {
    cleaningId: string;
    cleanerId?: string;
    unitName: string;
    reason?: string;
    orgId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('Publishing CLEANING_CANCELLED event', params);
      
      const targetUserIds = params.cleanerId ? [params.cleanerId] : [];
      
      await this.grpcClient.publishEvent({
        eventType: EventType.EVENT_TYPE_CLEANING_CANCELLED,
        sourceSubgraph: 'cleaning-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds,
        payload: {
          cleaningId: params.cleaningId,
          cleanerId: params.cleanerId,
          unitName: params.unitName,
          reason: params.reason,
          cancelledAt: new Date().toISOString()
        }
      });
      
      logger.info('CLEANING_CANCELLED event published', { cleaningId: params.cleaningId });
    } catch (error: any) {
      logger.error('Failed to publish CLEANING_CANCELLED event', { 
        error: error.message,
        params 
      });
    }
  }
  
  /**
   * Опубликовать событие CLEANING_AVAILABLE (для самоназначения)
   */
  async publishCleaningAvailable(params: {
    cleaningId: string;
    unitId: string;
    unitName: string;
    scheduledAt: string;
    requiresLinenChange: boolean;
    targetUserIds: string[];
    orgId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      
      // Проверяем, что enum значение доступно
      const eventTypeValue = EventType.EVENT_TYPE_CLEANING_AVAILABLE;
      if (eventTypeValue === undefined || eventTypeValue === null) {
        logger.error('EVENT_TYPE_CLEANING_AVAILABLE is not defined!', {
          EventTypeKeys: Object.keys(EventType),
          EventTypeValues: Object.values(EventType)
        });
        throw new Error('EVENT_TYPE_CLEANING_AVAILABLE is not defined in EventType enum');
      }
      
      logger.info('Publishing CLEANING_AVAILABLE event', {
        ...params,
        eventTypeValue,
        eventTypeName: EventType[eventTypeValue]
      });
      
      await this.grpcClient.publishEvent({
        eventType: eventTypeValue,
        sourceSubgraph: 'cleaning-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds: params.targetUserIds,
        payload: {
          cleaningId: params.cleaningId,
          unitId: params.unitId,
          unitName: params.unitName,
          scheduledAt: params.scheduledAt,
          requiresLinenChange: params.requiresLinenChange
        }
      });
      
      logger.info('CLEANING_AVAILABLE event published', { cleaningId: params.cleaningId });
    } catch (error: any) {
      logger.error('Failed to publish CLEANING_AVAILABLE event', { 
        error: error.message,
        params 
      });
    }
  }
  
  /**
   * Отключиться от gRPC сервера.
   */
  async disconnect(): Promise<void> {
    try {
      await this.grpcClient.disconnect();
      this.connected = false;
      logger.info('EventsClient disconnected from gRPC server');
    } catch (error) {
      logger.error('Failed to disconnect EventsClient', error);
    }
  }
}

// Singleton instance
let eventsClientInstance: EventsClient | null = null;

export function getEventsClient(): EventsClient {
  if (!eventsClientInstance) {
    eventsClientInstance = new EventsClient();
  }
  return eventsClientInstance;
}

