import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('cleaning-events-client');

/**
 * Клиент для публикации событий в events-subgraph через gRPC.
 */
export class EventsClient {
  private grpcClient: any;
  private readonly frontendUrl: string;
  
  constructor(
    grpcHost: string = process.env.EVENTS_GRPC_HOST || 'localhost',
    grpcPort: number = parseInt(process.env.EVENTS_GRPC_PORT || '4112'),
    frontendUrl?: string
  ) {
    this.frontendUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // TODO: После генерации proto, подключить gRPC клиент
    // this.grpcClient = createEventsGrpcClient({ host: grpcHost, port: grpcPort });
    
    logger.info('EventsClient initialized', {
      grpcHost,
      grpcPort,
      frontendUrl: this.frontendUrl
    });
  }
  
  /**
   * Опубликовать событие CLEANING_SCHEDULED
   */
  async publishCleaningScheduled(params: {
    cleaningId: string;
    unitId: string;
    unitName: string;
    scheduledAt: string;
    cleanerId?: string;
    orgId?: string;
    actorUserId?: string;
  }): Promise<void> {
    try {
      logger.info('Publishing CLEANING_SCHEDULED event', params);
      
      const targetUserIds = params.cleanerId ? [params.cleanerId] : [];
      
      // TODO: Раскомментировать после генерации gRPC клиента
      // await this.grpcClient.publishEvent({
      //   eventType: 1, // CLEANING_SCHEDULED
      //   sourceSubgraph: 'cleaning-subgraph',
      //   entityType: 'Cleaning',
      //   entityId: params.cleaningId,
      //   orgId: params.orgId,
      //   actorUserId: params.actorUserId,
      //   targetUserIds,
      //   payloadJson: JSON.stringify({
      //     cleaningId: params.cleaningId,
      //     unitId: params.unitId,
      //     unitName: params.unitName,
      //     scheduledAt: params.scheduledAt,
      //     cleanerId: params.cleanerId
      //   })
      // });
      
      logger.info('CLEANING_SCHEDULED event published', { cleaningId: params.cleaningId });
    } catch (error: any) {
      logger.error('Failed to publish CLEANING_SCHEDULED event', { 
        error: error.message,
        params 
      });
      // Не прерываем основной flow
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
      logger.info('Publishing CLEANING_ASSIGNED event', params);
      
      // TODO: Раскомментировать после генерации gRPC клиента
      // await this.grpcClient.publishEvent({
      //   eventType: 2, // CLEANING_ASSIGNED
      //   sourceSubgraph: 'cleaning-subgraph',
      //   entityType: 'Cleaning',
      //   entityId: params.cleaningId,
      //   orgId: params.orgId,
      //   actorUserId: params.actorUserId,
      //   targetUserIds: [params.cleanerId],
      //   payloadJson: JSON.stringify({
      //     cleaningId: params.cleaningId,
      //     cleanerId: params.cleanerId,
      //     unitId: params.unitId,
      //     unitName: params.unitName,
      //     scheduledAt: params.scheduledAt,
      //     requiresLinenChange: params.requiresLinenChange
      //   })
      // });
      
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
      logger.info('Publishing CLEANING_STARTED event', params);
      
      // TODO: Раскомментировать после генерации gRPC клиента
      
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
      logger.info('Publishing CLEANING_COMPLETED event', params);
      
      // TODO: Раскомментировать после генерации gRPC клиента
      
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
      logger.info('Publishing CLEANING_CANCELLED event', params);
      
      const targetUserIds = params.cleanerId ? [params.cleanerId] : [];
      
      // TODO: Раскомментировать после генерации gRPC клиента
      
      logger.info('CLEANING_CANCELLED event published', { cleaningId: params.cleaningId });
    } catch (error: any) {
      logger.error('Failed to publish CLEANING_CANCELLED event', { 
        error: error.message,
        params 
      });
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

