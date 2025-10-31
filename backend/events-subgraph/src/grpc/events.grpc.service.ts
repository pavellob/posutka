import type { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';
import type { EventBusService } from '../services/event-bus.service.js';

const logger = createGraphQLLogger('events-grpc-service');

export class EventsGrpcService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBusService
  ) {}
  
  /**
   * Обработчик gRPC: PublishEvent
   */
  async PublishEvent(request: any): Promise<any> {
    try {
      logger.info('Received PublishEvent gRPC request', { 
        eventType: request.eventType,
        sourceSubgraph: request.sourceSubgraph,
        entityId: request.entityId
      });
      
      // Парсим JSON payload
      const payload = request.payloadJson 
        ? JSON.parse(request.payloadJson) 
        : {};
      
      const metadata = request.metadataJson 
        ? JSON.parse(request.metadataJson) 
        : undefined;
      
      // Публикуем событие через EventBusService
      const event = await this.eventBus.publishEvent({
        type: this.mapEventType(request.eventType),
        sourceSubgraph: request.sourceSubgraph,
        entityType: request.entityType,
        entityId: request.entityId,
        orgId: request.orgId,
        actorUserId: request.actorUserId,
        targetUserIds: request.targetUserIds || [],
        payload,
        metadata
      });
      
      logger.info('Event published successfully', { eventId: event.id });
      
      return {
        eventId: event.id,
        status: this.mapEventStatusToGrpc(event.status),
        createdAt: event.createdAt.toISOString()
      };
    } catch (error: any) {
      logger.error('Failed to publish event via gRPC', { 
        error: error.message,
        request 
      });
      throw error;
    }
  }
  
  /**
   * Обработчик gRPC: PublishBulkEvents
   */
  async PublishBulkEvents(request: any): Promise<any> {
    try {
      logger.info('Received PublishBulkEvents gRPC request', { 
        count: request.events?.length || 0 
      });
      
      const results = [];
      let successCount = 0;
      let failedCount = 0;
      
      for (const eventRequest of request.events || []) {
        try {
          const result = await this.PublishEvent(eventRequest);
          results.push(result);
          successCount++;
        } catch (error: any) {
          results.push({
            eventId: '',
            status: 4, // FAILED
            createdAt: new Date().toISOString(),
            error: error.message
          });
          failedCount++;
        }
      }
      
      logger.info('Bulk events published', { successCount, failedCount });
      
      return {
        results,
        successCount,
        failedCount
      };
    } catch (error: any) {
      logger.error('Failed to publish bulk events via gRPC', { 
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Обработчик gRPC: GetEventStatus
   */
  async GetEventStatus(request: any): Promise<any> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: request.eventId }
      });
      
      if (!event) {
        throw new Error(`Event ${request.eventId} not found`);
      }
      
      return {
        eventId: event.id,
        status: this.mapEventStatusToGrpc(event.status),
        processedAt: event.processedAt?.toISOString(),
        error: (event.metadata as any)?.errors?.[0]
      };
    } catch (error: any) {
      logger.error('Failed to get event status', { 
        error: error.message,
        eventId: request.eventId 
      });
      throw error;
    }
  }
  
  /**
   * Маппинг типов событий из gRPC enum в строку
   */
  private mapEventType(grpcType: number): string {
    const mapping: Record<number, string> = {
      1: 'CLEANING_SCHEDULED',
      2: 'CLEANING_ASSIGNED',
      3: 'CLEANING_STARTED',
      4: 'CLEANING_COMPLETED',
      5: 'CLEANING_CANCELLED',
      10: 'BOOKING_CREATED',
      11: 'BOOKING_CONFIRMED',
      12: 'BOOKING_CANCELLED',
      13: 'BOOKING_CHECKIN',
      14: 'BOOKING_CHECKOUT',
      20: 'TASK_CREATED',
      21: 'TASK_ASSIGNED',
      22: 'TASK_STATUS_CHANGED',
      23: 'TASK_COMPLETED',
      30: 'USER_CREATED',
      31: 'USER_UPDATED',
      32: 'USER_LOCKED',
      33: 'USER_UNLOCKED'
    };
    
    return mapping[grpcType] || 'UNKNOWN';
  }
  
  /**
   * Маппинг статуса события в gRPC enum
   */
  private mapEventStatusToGrpc(status: string): number {
    const mapping: Record<string, number> = {
      'PENDING': 1,
      'PROCESSING': 2,
      'PROCESSED': 3,
      'FAILED': 4,
      'CANCELLED': 5
    };
    
    return mapping[status] || 0;
  }
}

