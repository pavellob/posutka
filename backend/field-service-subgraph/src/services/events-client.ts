import { createGraphQLLogger } from '@repo/shared-logger';
import {
  createEventsGrpcClient,
  type EventsGrpcClient,
  EventsEventType as EventType,
} from '@repo/grpc-sdk';

const logger = createGraphQLLogger('cleaning-events-client');
const EVENT_TYPE_CLEANING_READY_FOR_REVIEW =
  (EventType as any).EVENT_TYPE_CLEANING_READY_FOR_REVIEW ?? (5 as EventType);
const EVENT_TYPE_CLEANING_DIFFICULTY_SET =
  (EventType as any).EVENT_TYPE_CLEANING_DIFFICULTY_SET ?? (8 as EventType);
const EVENT_TYPE_CLEANING_APPROVED =
  (EventType as any).EVENT_TYPE_CLEANING_APPROVED ?? (9 as EventType);
const EVENT_TYPE_CLEANING_PRECHECK_COMPLETED =
  (EventType as any).EVENT_TYPE_CLEANING_PRECHECK_COMPLETED ?? (7 as EventType);
const EVENT_TYPE_REPAIR_ASSIGNED =
  (EventType as any).EVENT_TYPE_REPAIR_ASSIGNED ?? (15 as EventType);
const EVENT_TYPE_REPAIR_INSPECTION_COMPLETED =
  (EventType as any).EVENT_TYPE_REPAIR_INSPECTION_COMPLETED ?? (16 as EventType);
const EVENT_TYPE_REPAIR_STARTED =
  (EventType as any).EVENT_TYPE_REPAIR_STARTED ?? (17 as EventType);
const EVENT_TYPE_REPAIR_COMPLETED =
  (EventType as any).EVENT_TYPE_REPAIR_COMPLETED ?? (18 as EventType);
const EVENT_TYPE_REPAIR_CANCELLED =
  (EventType as any).EVENT_TYPE_REPAIR_CANCELLED ?? (19 as EventType);

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
    unitAddress?: string;
    scheduledAt: string;
    requiresLinenChange: boolean;
    cleanerName?: string;
    notes?: string;
    orgId?: string;
    actorUserId?: string;
    targetUserId?: string;
    unitGrade?: number;
    cleaningDifficulty?: string;
    priceAmount?: number;
    priceCurrency?: string;
    templateId?: string;
    templateName?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('📥 Received params in publishCleaningAssigned', {
        cleaningId: params.cleaningId,
        hasUnitGrade: params.unitGrade !== undefined && params.unitGrade !== null,
        unitGrade: params.unitGrade,
        hasCleaningDifficulty: params.cleaningDifficulty !== undefined && params.cleaningDifficulty !== null,
        cleaningDifficulty: params.cleaningDifficulty,
        hasPriceAmount: params.priceAmount !== undefined && params.priceAmount !== null,
        priceAmount: params.priceAmount,
        hasPriceCurrency: params.priceCurrency !== undefined && params.priceCurrency !== null,
        priceCurrency: params.priceCurrency,
        allParamsKeys: Object.keys(params),
        allParams: JSON.stringify(params, null, 2),
      });
      
      // Используем targetUserId если передан, иначе fallback на cleanerId для обратной совместимости
      const targetUserIds = params.targetUserId ? [params.targetUserId] : [params.cleanerId];
      
      logger.info('Using targetUserIds', {
        targetUserId: params.targetUserId,
        cleanerId: params.cleanerId,
        targetUserIds
      });
      
      // Создаем payload, явно включая все поля (даже если undefined)
      // JSON.stringify пропускает undefined, поэтому используем null для опциональных полей
      const payloadData: any = {
        cleaningId: params.cleaningId,
        cleanerId: params.cleanerId,
        cleanerName: params.cleanerName,
        unitId: params.unitId,
        unitName: params.unitName,
        unitAddress: params.unitAddress,
        scheduledAt: params.scheduledAt,
        requiresLinenChange: params.requiresLinenChange,
        notes: params.notes || null,
      };
      
      // Явно добавляем опциональные поля, даже если они undefined
      // Это гарантирует, что они будут в JSON (как null, если undefined)
      if (params.unitGrade !== undefined && params.unitGrade !== null) {
        payloadData.unitGrade = params.unitGrade;
      }
      if (params.cleaningDifficulty !== undefined && params.cleaningDifficulty !== null) {
        payloadData.cleaningDifficulty = params.cleaningDifficulty;
      }
      if (params.priceAmount !== undefined && params.priceAmount !== null) {
        payloadData.priceAmount = params.priceAmount;
      }
      if (params.priceCurrency !== undefined && params.priceCurrency !== null) {
        payloadData.priceCurrency = params.priceCurrency;
      }
      if (params.templateId !== undefined && params.templateId !== null) {
        payloadData.templateId = params.templateId;
      }
      if (params.templateName !== undefined && params.templateName !== null) {
        payloadData.templateName = params.templateName;
      }
      
      logger.info('📤 Publishing CLEANING_ASSIGNED event with payload', {
        cleaningId: params.cleaningId,
        hasUnitGrade: payloadData.unitGrade !== undefined && payloadData.unitGrade !== null,
        unitGrade: payloadData.unitGrade,
        hasCleaningDifficulty: payloadData.cleaningDifficulty !== undefined && payloadData.cleaningDifficulty !== null,
        cleaningDifficulty: payloadData.cleaningDifficulty,
        hasPriceAmount: payloadData.priceAmount !== undefined && payloadData.priceAmount !== null,
        priceAmount: payloadData.priceAmount,
        hasPriceCurrency: payloadData.priceCurrency !== undefined && payloadData.priceCurrency !== null,
        priceCurrency: payloadData.priceCurrency,
        hasTemplateId: payloadData.templateId !== undefined && payloadData.templateId !== null,
        templateId: payloadData.templateId,
        hasTemplateName: payloadData.templateName !== undefined && payloadData.templateName !== null,
        templateName: payloadData.templateName,
        requiresLinenChange: payloadData.requiresLinenChange,
        fullPayload: JSON.stringify(payloadData, null, 2),
      });
      
      await this.grpcClient.publishEvent({
        eventType: EventType.EVENT_TYPE_CLEANING_ASSIGNED,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        actorUserId: params.actorUserId,
        targetUserIds,
        payload: payloadData,
      });
      
      logger.info('✅ CLEANING_ASSIGNED event published', { cleaningId: params.cleaningId });
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
    unitAddress?: string;
    cleanerName?: string;
    scheduledAt?: string;
    notes?: string;
    orgId?: string;
    targetUserId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('Publishing CLEANING_STARTED event', params);
      
      const targetUserIds = params.targetUserId ? [params.targetUserId] : [params.cleanerId];
      
      await this.grpcClient.publishEvent({
        eventType: EventType.EVENT_TYPE_CLEANING_STARTED,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds,
        payload: {
          cleaningId: params.cleaningId,
          cleanerId: params.cleanerId,
          cleanerName: params.cleanerName,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          scheduledAt: params.scheduledAt,
          startedAt: new Date().toISOString(),
          notes: params.notes
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
    unitAddress?: string;
    cleanerName?: string;
    completedAt: string;
    scheduledAt?: string;
    startedAt?: string;
    notes?: string;
    orgId?: string;
    targetUserId?: string;
    targetUserIds?: string[];
    checklistStats?: {
      total: number;
      completed: number;
      incomplete: number;
      incompleteItems?: Array<{ title: string; key: string }>;
    };
    photoUrls?: Array<{ url: string; caption?: string }>;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('Publishing CLEANING_COMPLETED event', params);
      
      const targetUserIds = (params.targetUserIds && params.targetUserIds.length > 0)
        ? params.targetUserIds
        : params.targetUserId
          ? [params.targetUserId]
          : [params.cleanerId];
      
      await this.grpcClient.publishEvent({
        eventType: EventType.EVENT_TYPE_CLEANING_COMPLETED,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds,
        payload: {
          cleaningId: params.cleaningId,
          cleanerId: params.cleanerId,
          cleanerName: params.cleanerName,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          scheduledAt: params.scheduledAt,
          startedAt: params.startedAt,
          completedAt: params.completedAt,
          notes: params.notes,
          checklistStats: params.checklistStats,
          photoUrls: params.photoUrls,
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
   * Опубликовать событие CLEANING_PRECHECK_COMPLETED
   */
  async publishCleaningPrecheckCompleted(params: {
    cleaningId: string;
    managerIds: string[];
    unitName: string;
    unitAddress?: string;
    cleanerName?: string;
    submittedAt: string;
    scheduledAt?: string;
    notes?: string;
    orgId?: string;
    cleanerId?: string | null;
    checklistStats?: {
      total: number;
      completed: number;
      incomplete: number;
      incompleteItems?: Array<{ title: string; key: string }>;
    };
    photoUrls?: Array<{ url: string; caption?: string }>;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      if (params.managerIds.length === 0) {
        logger.info('No managers to notify for CLEANING_PRECHECK_COMPLETED', {
          cleaningId: params.cleaningId,
        });
        return;
      }

      logger.info('Publishing CLEANING_PRECHECK_COMPLETED event', params);

      await this.grpcClient.publishEvent({
        eventType: EVENT_TYPE_CLEANING_PRECHECK_COMPLETED,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds: params.managerIds,
        payload: {
          cleaningId: params.cleaningId,
          cleanerId: params.cleanerId ?? undefined,
          cleanerName: params.cleanerName,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          scheduledAt: params.scheduledAt,
          submittedAt: params.submittedAt,
          notes: params.notes,
          checklistStats: params.checklistStats,
          photoUrls: params.photoUrls,
        },
      });

      logger.info('CLEANING_PRECHECK_COMPLETED event published', {
        cleaningId: params.cleaningId,
        managerIds: params.managerIds,
      });
    } catch (error: any) {
      logger.error('Failed to publish CLEANING_PRECHECK_COMPLETED event', {
        error: error.message,
        params,
      });
    }
  }

  /**
   * Опубликовать событие CLEANING_READY_FOR_REVIEW
   */
  async publishCleaningReadyForReview(params: {
    cleaningId: string;
    managerIds: string[];
    unitName: string;
    unitAddress?: string;
    cleanerName?: string;
    completedAt?: string;
    scheduledAt?: string;
    startedAt?: string;
    notes?: string;
    orgId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      if (params.managerIds.length === 0) {
        logger.info('No managers to notify for CLEANING_READY_FOR_REVIEW', {
          cleaningId: params.cleaningId,
        });
        return;
      }

      logger.info('Publishing CLEANING_READY_FOR_REVIEW event', params);

      await this.grpcClient.publishEvent({
        eventType: EVENT_TYPE_CLEANING_READY_FOR_REVIEW,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds: params.managerIds,
        payload: {
          cleaningId: params.cleaningId,
          cleanerName: params.cleanerName,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          scheduledAt: params.scheduledAt,
          startedAt: params.startedAt,
          completedAt: params.completedAt,
          notes: params.notes
        },
      });

      logger.info('CLEANING_READY_FOR_REVIEW event published', {
        cleaningId: params.cleaningId,
        managerIds: params.managerIds,
      });
    } catch (error: any) {
      logger.error('Failed to publish CLEANING_READY_FOR_REVIEW event', {
        error: error.message,
        params,
      });
    }
  }
  
  /**
   * Опубликовать событие CLEANING_CANCELLED
   */
  async publishCleaningCancelled(params: {
    cleaningId: string;
    cleanerId?: string;
    cleanerName?: string;
    unitName: string;
    unitAddress?: string;
    scheduledAt?: string;
    reason?: string;
    notes?: string;
    orgId?: string;
    targetUserId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('Publishing CLEANING_CANCELLED event', params);
      
      const targetUserIds = params.targetUserId ? [params.targetUserId] : (params.cleanerId ? [params.cleanerId] : []);
      
      await this.grpcClient.publishEvent({
        eventType: EventType.EVENT_TYPE_CLEANING_CANCELLED,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds,
        payload: {
          cleaningId: params.cleaningId,
          cleanerId: params.cleanerId,
          cleanerName: params.cleanerName,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          scheduledAt: params.scheduledAt,
          reason: params.reason,
          notes: params.notes,
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
   * Опубликовать событие CLEANING_DIFFICULTY_SET
   */
  async publishCleaningDifficultySet(params: {
    cleaningId: string;
    difficulty: number;
    managerIds: string[];
    unitName: string;
    unitAddress?: string;
    cleanerName?: string;
    scheduledAt?: string;
    startedAt?: string;
    notes?: string;
    orgId?: string;
    priceAmount?: number;
    priceCurrency?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      if (params.managerIds.length === 0) {
        logger.info('No managers to notify for CLEANING_DIFFICULTY_SET', {
          cleaningId: params.cleaningId,
        });
        return;
      }

      logger.info('Publishing CLEANING_DIFFICULTY_SET event', params);

      await this.grpcClient.publishEvent({
        eventType: EVENT_TYPE_CLEANING_DIFFICULTY_SET,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds: params.managerIds,
        payload: {
          cleaningId: params.cleaningId,
          difficulty: params.difficulty,
          cleanerName: params.cleanerName,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          scheduledAt: params.scheduledAt,
          startedAt: params.startedAt,
          notes: params.notes,
          assessedAt: new Date().toISOString(),
          ...(params.priceAmount !== undefined && params.priceCurrency !== undefined
            ? { priceAmount: params.priceAmount, priceCurrency: params.priceCurrency }
            : {})
        },
      });

      logger.info('CLEANING_DIFFICULTY_SET event published', {
        cleaningId: params.cleaningId,
        managerIds: params.managerIds,
      });
    } catch (error: any) {
      logger.error('Failed to publish CLEANING_DIFFICULTY_SET event', {
        error: error.message,
        params,
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
    unitAddress?: string;
    scheduledAt: string;
    requiresLinenChange: boolean;
    notes?: string;
    targetUserIds: string[];
    orgId?: string;
    unitGrade?: number;
    cleaningDifficulty?: string;
    priceAmount?: number;
    priceCurrency?: string;
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
      
      // Создаем payload, включая только определенные поля (не undefined)
      const payloadData: any = {
        cleaningId: params.cleaningId,
        unitId: params.unitId,
        unitName: params.unitName,
        scheduledAt: params.scheduledAt,
        requiresLinenChange: params.requiresLinenChange,
      };
      
      // Добавляем опциональные поля только если они определены
      if (params.unitAddress !== undefined) {
        payloadData.unitAddress = params.unitAddress;
      }
      if (params.notes !== undefined) {
        payloadData.notes = params.notes;
      }
      if (params.unitGrade !== undefined && params.unitGrade !== null) {
        payloadData.unitGrade = params.unitGrade;
      }
      if (params.cleaningDifficulty !== undefined && params.cleaningDifficulty !== null) {
        payloadData.cleaningDifficulty = params.cleaningDifficulty;
      }
      if (params.priceAmount !== undefined && params.priceAmount !== null) {
        payloadData.priceAmount = params.priceAmount;
      }
      if (params.priceCurrency !== undefined && params.priceCurrency !== null) {
        payloadData.priceCurrency = params.priceCurrency;
      }
      
      logger.info('Publishing CLEANING_AVAILABLE event', {
        eventTypeValue,
        eventTypeName: EventType[eventTypeValue],
        paramsReceived: {
          cleaningId: params.cleaningId,
          hasUnitAddress: params.unitAddress !== undefined,
          unitAddress: params.unitAddress,
          hasUnitGrade: params.unitGrade !== undefined,
          unitGrade: params.unitGrade,
          hasCleaningDifficulty: params.cleaningDifficulty !== undefined,
          cleaningDifficulty: params.cleaningDifficulty,
          hasPriceAmount: params.priceAmount !== undefined,
          priceAmount: params.priceAmount,
          hasPriceCurrency: params.priceCurrency !== undefined,
          priceCurrency: params.priceCurrency,
        },
        payloadData,
        payloadKeys: Object.keys(payloadData),
        hasUnitGrade: payloadData.unitGrade !== undefined,
        hasCleaningDifficulty: payloadData.cleaningDifficulty !== undefined,
        hasPriceAmount: payloadData.priceAmount !== undefined,
        hasPriceCurrency: payloadData.priceCurrency !== undefined
      });
      
      await this.grpcClient.publishEvent({
        eventType: eventTypeValue,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds: params.targetUserIds,
        payload: payloadData
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
   * Опубликовать событие CLEANING_APPROVED
   */
  async publishCleaningApproved(params: {
    cleaningId: string;
    managerId: string;
    cleanerId?: string;
    unitName: string;
    unitAddress?: string;
    cleanerName?: string;
    comment?: string;
    scheduledAt?: string;
    completedAt?: string;
    orgId?: string;
    targetUserIds: string[];
  }): Promise<void> {
    try {
      await this.ensureConnected();
      if (params.targetUserIds.length === 0) {
        logger.info('No target users to notify for CLEANING_APPROVED', {
          cleaningId: params.cleaningId,
        });
        return;
      }

      logger.info('Publishing CLEANING_APPROVED event', params);

      await this.grpcClient.publishEvent({
        eventType: EVENT_TYPE_CLEANING_APPROVED,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Cleaning',
        entityId: params.cleaningId,
        orgId: params.orgId,
        targetUserIds: params.targetUserIds,
        payload: {
          cleaningId: params.cleaningId,
          managerId: params.managerId,
          cleanerId: params.cleanerId,
          cleanerName: params.cleanerName,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          comment: params.comment,
          scheduledAt: params.scheduledAt,
          completedAt: params.completedAt,
          approvedAt: new Date().toISOString()
        },
      });

      logger.info('CLEANING_APPROVED event published', {
        cleaningId: params.cleaningId,
        targetUserIds: params.targetUserIds,
      });
    } catch (error: any) {
      logger.error('Failed to publish CLEANING_APPROVED event', {
        error: error.message,
        params,
      });
    }
  }
  
  /**
   * Опубликовать событие REPAIR_ASSIGNED
   */
  async publishRepairAssigned(params: {
    repairId: string;
    masterId: string;
    unitId: string;
    unitName: string;
    unitAddress?: string;
    scheduledAt: string;
    masterName?: string;
    notes?: string;
    orgId?: string;
    targetUserId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('Publishing REPAIR_ASSIGNED event', params);
      
      const targetUserIds = params.targetUserId ? [params.targetUserId] : [params.masterId];
      
      await this.grpcClient.publishEvent({
        eventType: EVENT_TYPE_REPAIR_ASSIGNED,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Repair',
        entityId: params.repairId,
        orgId: params.orgId,
        targetUserIds,
        payload: {
          repairId: params.repairId,
          masterId: params.masterId,
          masterName: params.masterName,
          unitId: params.unitId,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          scheduledAt: params.scheduledAt,
          notes: params.notes
        }
      });
      
      logger.info('✅ REPAIR_ASSIGNED event published', { repairId: params.repairId });
    } catch (error: any) {
      logger.error('Failed to publish REPAIR_ASSIGNED event', { 
        error: error.message,
        params 
      });
    }
  }
  
  /**
   * Опубликовать событие REPAIR_INSPECTION_COMPLETED
   */
  async publishRepairInspectionCompleted(params: {
    repairId: string;
    masterId?: string;
    masterName?: string;
    unitName: string;
    unitAddress?: string;
    submittedAt: string;
    scheduledAt?: string;
    notes?: string;
    orgId?: string;
    managerIds: string[];
    checklistStats?: {
      total: number;
      completed: number;
      incomplete: number;
      incompleteItems?: Array<{ title: string; key: string }>;
    };
    photoUrls?: Array<{ url: string; caption?: string }>;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      if (params.managerIds.length === 0) {
        logger.info('No managers to notify for REPAIR_INSPECTION_COMPLETED', {
          repairId: params.repairId,
        });
        return;
      }

      logger.info('Publishing REPAIR_INSPECTION_COMPLETED event', params);

      await this.grpcClient.publishEvent({
        eventType: EVENT_TYPE_REPAIR_INSPECTION_COMPLETED,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Repair',
        entityId: params.repairId,
        orgId: params.orgId,
        targetUserIds: params.managerIds,
        payload: {
          repairId: params.repairId,
          masterId: params.masterId,
          masterName: params.masterName,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          scheduledAt: params.scheduledAt,
          submittedAt: params.submittedAt,
          notes: params.notes,
          checklistStats: params.checklistStats,
          photoUrls: params.photoUrls,
        },
      });

      logger.info('REPAIR_INSPECTION_COMPLETED event published', {
        repairId: params.repairId,
        managerIds: params.managerIds,
      });
    } catch (error: any) {
      logger.error('Failed to publish REPAIR_INSPECTION_COMPLETED event', {
        error: error.message,
        params,
      });
    }
  }
  
  /**
   * Опубликовать событие REPAIR_STARTED
   */
  async publishRepairStarted(params: {
    repairId: string;
    masterId: string;
    unitName: string;
    unitAddress?: string;
    masterName?: string;
    scheduledAt?: string;
    notes?: string;
    orgId?: string;
    targetUserId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('Publishing REPAIR_STARTED event', params);
      
      const targetUserIds = params.targetUserId ? [params.targetUserId] : [params.masterId];
      
      await this.grpcClient.publishEvent({
        eventType: EVENT_TYPE_REPAIR_STARTED,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Repair',
        entityId: params.repairId,
        orgId: params.orgId,
        targetUserIds,
        payload: {
          repairId: params.repairId,
          masterId: params.masterId,
          masterName: params.masterName,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          scheduledAt: params.scheduledAt,
          startedAt: new Date().toISOString(),
          notes: params.notes
        }
      });
      
      logger.info('✅ REPAIR_STARTED event published', { repairId: params.repairId });
    } catch (error: any) {
      logger.error('Failed to publish REPAIR_STARTED event', { 
        error: error.message,
        params 
      });
    }
  }
  
  /**
   * Опубликовать событие REPAIR_COMPLETED
   */
  async publishRepairCompleted(params: {
    repairId: string;
    masterId: string;
    unitName: string;
    unitAddress?: string;
    masterName?: string;
    completedAt: string;
    scheduledAt?: string;
    startedAt?: string;
    notes?: string;
    orgId?: string;
    targetUserId?: string;
    targetUserIds?: string[];
    checklistStats?: {
      total: number;
      completed: number;
      incomplete: number;
      incompleteItems?: Array<{ title: string; key: string }>;
    };
    photoUrls?: Array<{ url: string; caption?: string }>;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('Publishing REPAIR_COMPLETED event', params);
      
      const targetUserIds = (params.targetUserIds && params.targetUserIds.length > 0)
        ? params.targetUserIds
        : params.targetUserId
          ? [params.targetUserId]
          : [params.masterId];
      
      await this.grpcClient.publishEvent({
        eventType: EVENT_TYPE_REPAIR_COMPLETED,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Repair',
        entityId: params.repairId,
        orgId: params.orgId,
        targetUserIds,
        payload: {
          repairId: params.repairId,
          masterId: params.masterId,
          masterName: params.masterName,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          scheduledAt: params.scheduledAt,
          startedAt: params.startedAt,
          completedAt: params.completedAt,
          notes: params.notes,
          checklistStats: params.checklistStats,
          photoUrls: params.photoUrls,
        }
      });
      
      logger.info('✅ REPAIR_COMPLETED event published', { repairId: params.repairId });
    } catch (error: any) {
      logger.error('Failed to publish REPAIR_COMPLETED event', { 
        error: error.message,
        params 
      });
    }
  }
  
  /**
   * Опубликовать событие REPAIR_CANCELLED
   */
  async publishRepairCancelled(params: {
    repairId: string;
    masterId?: string;
    masterName?: string;
    unitName: string;
    unitAddress?: string;
    scheduledAt?: string;
    reason?: string;
    notes?: string;
    orgId?: string;
    targetUserId?: string;
  }): Promise<void> {
    try {
      await this.ensureConnected();
      logger.info('Publishing REPAIR_CANCELLED event', params);
      
      const targetUserIds = params.targetUserId 
        ? [params.targetUserId] 
        : (params.masterId ? [params.masterId] : []);
      
      await this.grpcClient.publishEvent({
        eventType: EVENT_TYPE_REPAIR_CANCELLED,
        sourceSubgraph: 'field-service-subgraph',
        entityType: 'Repair',
        entityId: params.repairId,
        orgId: params.orgId,
        targetUserIds,
        payload: {
          repairId: params.repairId,
          masterId: params.masterId,
          masterName: params.masterName,
          unitName: params.unitName,
          unitAddress: params.unitAddress,
          scheduledAt: params.scheduledAt,
          reason: params.reason,
          notes: params.notes,
          cancelledAt: new Date().toISOString()
        }
      });
      
      logger.info('✅ REPAIR_CANCELLED event published', { repairId: params.repairId });
    } catch (error: any) {
      logger.error('Failed to publish REPAIR_CANCELLED event', { 
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

