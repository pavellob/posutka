// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
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
      let payload: any = {};
      let metadata: any = undefined;
      
      try {
        if (request.payloadJson) {
          payload = JSON.parse(request.payloadJson);
          logger.info('Parsed payload from gRPC request', { 
            payloadKeys: Object.keys(payload),
            hasPriceAmount: 'priceAmount' in payload,
            hasPriceCurrency: 'priceCurrency' in payload,
            hasUnitGrade: 'unitGrade' in payload,
            hasCleaningDifficulty: 'cleaningDifficulty' in payload,
            unitGrade: payload.unitGrade,
            cleaningDifficulty: payload.cleaningDifficulty,
            priceAmount: payload.priceAmount,
            priceCurrency: payload.priceCurrency,
            unitAddress: payload.unitAddress,
            fullPayload: JSON.stringify(payload, null, 2)
          });
        }
      } catch (parseError: any) {
        logger.error('Failed to parse payload JSON', { 
          error: parseError.message,
          payloadJson: request.payloadJson?.substring(0, 500)
        });
        throw new Error(`Invalid payload JSON: ${parseError.message}`);
      }
      
      try {
        if (request.metadataJson) {
          metadata = JSON.parse(request.metadataJson);
        }
      } catch (parseError: any) {
        logger.error('Failed to parse metadata JSON', { 
          error: parseError.message,
          metadataJson: request.metadataJson?.substring(0, 500)
        });
        // Metadata не критично, продолжаем без него
      }
      
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
      1: 'CLEANING_AVAILABLE',
      2: 'CLEANING_ASSIGNED',
      3: 'CLEANING_STARTED',
      4: 'CLEANING_COMPLETED',
      5: 'CLEANING_READY_FOR_REVIEW',
      6: 'CLEANING_CANCELLED',
      7: 'CLEANING_PRECHECK_COMPLETED',
      8: 'CLEANING_DIFFICULTY_SET',
      9: 'CLEANING_APPROVED',
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
    
    // Проверяем, есть ли значение в маппинге
    if (mapping[grpcType]) {
      return mapping[grpcType];
    }
    
    const mapped = mapping[grpcType];
    if (!mapped) {
      logger.error('Unknown or unspecified event type received', { grpcType });
      throw new Error(`Invalid event type: ${grpcType}. Expected valid EventType enum value.`);
    }
    
    return mapped;
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

