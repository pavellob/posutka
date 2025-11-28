import { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';
import { 
  createMinioServiceFromEnv,
  getExtensionFromMimeType,
  generateFileId,
  type PresignedPutUrlResult,
} from '@repo/storage-service';
import type { MinioService } from '@repo/storage-service';

const logger = createGraphQLLogger('checklist-instance-service');

function getChecklistAttachmentKey(
  instanceId: string,
  itemKey: string,
  fileId: string,
  extension: string
): string {
  return `checklists/instances/${instanceId}/items/${itemKey}/${fileId}.${extension}`;
}

export class ChecklistInstanceService {
  private minio: MinioService | null = null;

  constructor(private prisma: PrismaClient) {
    try {
      this.minio = createMinioServiceFromEnv();
      logger.info('ChecklistInstanceService initialized with MinIO');
    } catch (error) {
      logger.warn('MinIO service not available - file upload functionality will be disabled', { error });
      logger.warn('To enable file uploads, configure MinIO environment variables');
      // Не выбрасываем ошибку, делаем MinIO опциональным
    }
  }

  /**
   * Создает инстанс чек-листа для юнита и стадии
   * Копирует все items из актуальной версии шаблона
   */
  async createChecklistInstance(
    unitId: string,
    stage: 'PRE_CLEANING' | 'CLEANING' | 'FINAL_REPORT' | 'REPAIR_INSPECTION' | 'REPAIR_RESULT',
    cleaningId?: string,
    repairId?: string,
    isPlannedInspection?: boolean
  ) {
    const isRepairStage = stage === 'REPAIR_INSPECTION' || stage === 'REPAIR_RESULT';
    
    let template = null;
    let sourceItems: any[] = [];

    // Для уборок всегда используем шаблон
    // Для ремонтов: если плановый осмотр - используем шаблон, если кастомный - пустой чеклист
    const shouldUseTemplate = !isRepairStage || (isRepairStage && isPlannedInspection);

    if (shouldUseTemplate) {
      template = await this.prisma.checklistTemplate.findFirst({
        where: { unitId },
        orderBy: { version: 'desc' },
        include: { items: true }
      });

      if (!template) {
        if (isRepairStage && isPlannedInspection) {
          throw new Error(`No checklist template found for unit: ${unitId}. Плановый осмотр требует шаблон чеклиста.`);
        }
        if (!isRepairStage) {
          throw new Error(`No checklist template found for unit: ${unitId}`);
        }
      }

      if (template) {
        sourceItems = template.items.map(item => ({
          key: item.key,
          title: item.title,
          description: item.description,
          type: item.type,
          required: item.required,
          requiresPhoto: item.requiresPhoto,
          photoMin: item.photoMin,
          order: item.order,
        }));
      }
    }
    
    // Для кастомных ремонтов чеклист создается пустым - пункты добавляются вручную

    // 2. Создаем инстанс
    const instance = await this.prisma.checklistInstance.create({
      data: {
        unitId,
        stage,
        status: 'DRAFT',
        templateId: template?.id || null,
        templateVersion: template?.version || null,
        cleaningId: cleaningId || null,
        repairId: repairId || null
      }
    });

    // 3. Для уборок: определяем источник пунктов - шаблон или предыдущая стадия
    if (!isRepairStage && stage === 'CLEANING' && cleaningId) {
      const preInstance = await this.prisma.checklistInstance.findFirst({
        where: {
          cleaningId,
          stage: 'PRE_CLEANING'
        },
        include: {
          items: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (preInstance?.items?.length) {
        sourceItems = preInstance.items.map(item => ({
          key: item.key,
          title: item.title,
          description: item.description,
          type: item.type,
          required: item.required,
          requiresPhoto: item.requiresPhoto,
          photoMin: item.photoMin,
          order: item.order,
        }));
      }
    }
    
    // 4. Для ремонтов: если это стадия результата, копируем пункты из стадии осмотра
    if (isRepairStage && stage === 'REPAIR_RESULT' && repairId) {
      const inspectionInstance = await this.prisma.checklistInstance.findFirst({
        where: {
          repairId,
          stage: 'REPAIR_INSPECTION'
        },
        include: {
          items: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (inspectionInstance?.items?.length) {
        sourceItems = inspectionInstance.items.map(item => ({
          key: item.key,
          title: item.title,
          description: item.description,
          type: item.type,
          required: item.required,
          requiresPhoto: item.requiresPhoto,
          photoMin: item.photoMin,
          order: item.order,
        }));
      }
    }
    
    // Для кастомных ремонтов без шаблона чеклист создается пустым - пункты добавляются вручную

    if (stage === 'FINAL_REPORT' && cleaningId) {
      const cleaningInstance = await this.prisma.checklistInstance.findFirst({
        where: {
          cleaningId,
          stage: 'CLEANING'
        },
        include: {
          items: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (cleaningInstance?.items?.length) {
        sourceItems = cleaningInstance.items.map(item => ({
          key: item.key,
          title: item.title,
          description: item.description,
          type: item.type,
          required: item.required,
          requiresPhoto: item.requiresPhoto,
          photoMin: item.photoMin,
          order: item.order,
        }));
      }
    }

    // 4. Копируем пункты
    if (sourceItems.length > 0) {
      await this.prisma.checklistInstanceItem.createMany({
        data: sourceItems.map(item => ({
          instanceId: instance.id,
          key: item.key,
          title: item.title,
          description: item.description,
          type: item.type,
          required: item.required,
          requiresPhoto: item.requiresPhoto,
          photoMin: item.photoMin,
          order: item.order
        }))
      });
    }

    logger.info('Checklist instance created', {
      instanceId: instance.id,
      unitId,
      stage,
      cleaningId,
      repairId,
      templateVersion: template?.version || null,
      itemsCount: sourceItems.length
    });

    return this.getChecklistInstance(instance.id);
  }

  private async syncDraftInstance(instance: any) {
    if (!instance || instance.status !== 'DRAFT') {
      return instance;
    }

    let existingKeys = new Set((instance.items ?? []).map((item: any) => item.key));

    // Сначала синхронизируем с шаблоном (только если templateId указан)
    let template = null;
    if (instance.templateId) {
      template = await this.prisma.checklistTemplate.findUnique({
        where: { id: instance.templateId },
        include: { items: true },
      });
    }

    let updatedInstance = instance;

    if (template) {
      const templateItemsToCreate = template.items
        .filter((item) => item.key && !existingKeys.has(item.key))
        .map((item) => ({
          instanceId: instance.id,
          key: item.key,
          title: item.title,
          description: item.description,
          type: item.type,
          required: item.required,
          requiresPhoto: item.requiresPhoto,
          photoMin: item.photoMin,
          order: item.order,
        }));

      if (templateItemsToCreate.length > 0) {
        await this.prisma.checklistInstanceItem.createMany({ data: templateItemsToCreate });
        templateItemsToCreate.forEach((item) => existingKeys.add(item.key));
        updatedInstance = await this.prisma.checklistInstance.findUnique({
          where: { id: instance.id },
          include: {
            items: { orderBy: { order: 'asc' } },
            answers: true,
            attachments: { orderBy: { createdAt: 'asc' } },
          },
        }) ?? instance;
        existingKeys = new Set((updatedInstance.items ?? []).map((item: any) => item.key));
      }
    }

    // Для стадии уборки синхронизируем кастомные пункты из приёмки
    if (updatedInstance.stage === 'CLEANING' && updatedInstance.cleaningId) {
      const preInstance = await this.prisma.checklistInstance.findFirst({
        where: {
          cleaningId: updatedInstance.cleaningId,
          stage: 'PRE_CLEANING'
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      });

      if (preInstance?.items?.length) {
        const preItemsToCreate = preInstance.items
          .filter((item) => item.key && !existingKeys.has(item.key))
          .map((item) => ({
            instanceId: updatedInstance.id,
            key: item.key,
            title: item.title,
            description: item.description,
            type: item.type,
            required: item.required,
            requiresPhoto: item.requiresPhoto,
            photoMin: item.photoMin,
            order: item.order,
          }));

        if (preItemsToCreate.length > 0) {
          await this.prisma.checklistInstanceItem.createMany({ data: preItemsToCreate });
          updatedInstance = await this.prisma.checklistInstance.findUnique({
            where: { id: instance.id },
            include: {
              items: { orderBy: { order: 'asc' } },
              answers: true,
              attachments: { orderBy: { createdAt: 'asc' } },
            },
          }) ?? updatedInstance;
          existingKeys = new Set((updatedInstance.items ?? []).map((item: any) => item.key));
        }
      }
    }

    return updatedInstance;
  }

  /**
   * Получает инстанс чек-листа с items, answers и attachments
   */
  async getChecklistInstance(instanceId: string) {
    const instance = await this.prisma.checklistInstance.findUnique({
      where: { id: instanceId },
      include: {
        items: {
          orderBy: { order: 'asc' }
        },
        answers: true,
        attachments: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!instance) {
      return instance;
    }

    const synced = await this.syncDraftInstance(instance);
    return synced ?? instance;
  }

  /**
   * Получает инстанс по юниту и стадии
   */
  async getChecklistByUnitAndStage(
    unitId: string,
    stage: 'PRE_CLEANING' | 'CLEANING' | 'FINAL_REPORT'
  ) {
    const instance = await this.prisma.checklistInstance.findFirst({
      where: { unitId, stage },
      include: {
        items: {
          orderBy: { order: 'asc' }
        },
        answers: true,
        attachments: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!instance) {
      return instance;
    }

    return this.syncDraftInstance(instance);
  }

  /**
   * Получает инстанс по уборке и стадии
   */
  async getChecklistByCleaningAndStage(
    cleaningId: string,
    stage: 'PRE_CLEANING' | 'CLEANING' | 'FINAL_REPORT'
  ) {
    const instance = await this.prisma.checklistInstance.findFirst({
      where: { cleaningId, stage },
      include: {
        items: {
          orderBy: { order: 'asc' }
        },
        answers: true,
        attachments: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!instance) {
      return instance;
    }

    return this.syncDraftInstance(instance);
  }

  async getChecklistByRepairAndStage(
    repairId: string,
    stage: 'REPAIR_INSPECTION' | 'REPAIR_RESULT'
  ) {
    const instance = await this.prisma.checklistInstance.findFirst({
      where: { repairId, stage },
      include: {
        items: {
          orderBy: { order: 'asc' }
        },
        answers: true,
        attachments: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!instance) {
      return instance;
    }

    return this.syncDraftInstance(instance);
  }

  /**
   * Добавляет новый пункт в инстанс
   */
  async addItem(input: {
    instanceId: string;
    key: string;
    title: string;
    description?: string;
    type: string;
    required?: boolean;
    requiresPhoto?: boolean;
    photoMin?: number;
    order?: number;
  }) {
    const instance = await this.prisma.checklistInstance.findUnique({
      where: { id: input.instanceId }
    });

    if (!instance) {
      throw new Error(`ChecklistInstance not found: ${input.instanceId}`);
    }

    if (instance.status !== 'DRAFT') {
      throw new Error(`Cannot modify checklist in status: ${instance.status}`);
    }

    // Проверяем уникальность key
    const existing = await this.prisma.checklistInstanceItem.findUnique({
      where: {
        instanceId_key: {
          instanceId: input.instanceId,
          key: input.key
        }
      }
    });

    if (existing) {
      throw new Error(`Item with key "${input.key}" already exists in this instance`);
    }

    // Создаем новый item
    await this.prisma.checklistInstanceItem.create({
      data: {
        instanceId: input.instanceId,
        key: input.key,
        title: input.title,
        description: input.description,
        type: input.type as any,
        required: input.required ?? false,
        requiresPhoto: input.requiresPhoto ?? false,
        photoMin: input.photoMin,
        order: input.order ?? 0
      }
    });

    logger.info('Item added to checklist instance', {
      instanceId: input.instanceId,
      itemKey: input.key
    });

    return this.getChecklistInstance(input.instanceId);
  }

  /**
   * Обновляет пункт в инстансе
   */
  async updateItem(input: {
    instanceId: string;
    itemKey: string;
    title?: string;
    description?: string;
    type?: string;
    required?: boolean;
    requiresPhoto?: boolean;
    photoMin?: number;
    order?: number;
  }) {
    const instance = await this.prisma.checklistInstance.findUnique({
      where: { id: input.instanceId }
    });

    if (!instance) {
      throw new Error(`ChecklistInstance not found: ${input.instanceId}`);
    }

    if (instance.status !== 'DRAFT') {
      throw new Error(`Cannot modify checklist in status: ${instance.status}`);
    }

    // Обновляем item
    await this.prisma.checklistInstanceItem.update({
      where: {
        instanceId_key: {
          instanceId: input.instanceId,
          key: input.itemKey
        }
      },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.type !== undefined && { type: input.type as any }),
        ...(input.required !== undefined && { required: input.required }),
        ...(input.requiresPhoto !== undefined && { requiresPhoto: input.requiresPhoto }),
        ...(input.photoMin !== undefined && { photoMin: input.photoMin }),
        ...(input.order !== undefined && { order: input.order })
      }
    });

    logger.info('Item updated in checklist instance', {
      instanceId: input.instanceId,
      itemKey: input.itemKey
    });

    return this.getChecklistInstance(input.instanceId);
  }

  /**
   * Удаляет пункт из инстанса
   */
  async removeItem(input: {
    instanceId: string;
    itemKey: string;
  }) {
    const instance = await this.prisma.checklistInstance.findUnique({
      where: { id: input.instanceId }
    });

    if (!instance) {
      throw new Error(`ChecklistInstance not found: ${input.instanceId}`);
    }

    if (instance.status !== 'DRAFT') {
      throw new Error(`Cannot modify checklist in status: ${instance.status}`);
    }

    await this.prisma.checklistInstanceItem.delete({
      where: {
        instanceId_key: {
          instanceId: input.instanceId,
          key: input.itemKey
        }
      }
    });

    logger.info('Item removed from checklist instance', {
      instanceId: input.instanceId,
      itemKey: input.itemKey
    });

    return this.getChecklistInstance(input.instanceId);
  }

  /**
   * Промоут инстанса в следующую стадию
   * Копирует все items из родительского инстанса
   */
  async promoteChecklist(
    fromInstanceId: string,
    toStage: 'PRE_CLEANING' | 'CLEANING' | 'FINAL_REPORT'
  ) {
    const fromInstance = await this.prisma.checklistInstance.findUnique({
      where: { id: fromInstanceId },
      include: { items: true }
    });

    if (!fromInstance) {
      throw new Error(`ChecklistInstance not found: ${fromInstanceId}`);
    }

    if (fromInstance.status === 'DRAFT') {
      throw new Error('Cannot promote draft checklist. Submit it first.');
    }

    // 1. Создаем новый инстанс
    const newInstance = await this.prisma.checklistInstance.create({
      data: {
        unitId: fromInstance.unitId,
        stage: toStage,
        status: 'DRAFT',
        templateId: fromInstance.templateId,
        templateVersion: fromInstance.templateVersion,
        parentInstanceId: fromInstanceId
      }
    });

    // 2. Копируем ВСЕ items из родителя (включая добавленные/измененные)
    if (fromInstance.items.length > 0) {
      await this.prisma.checklistInstanceItem.createMany({
        data: fromInstance.items.map(item => ({
          instanceId: newInstance.id,
          key: item.key,
          title: item.title,
          description: item.description,
          type: item.type,
          required: item.required,
          requiresPhoto: item.requiresPhoto,
          photoMin: item.photoMin,
          order: item.order
        }))
      });
    }

    logger.info('Checklist promoted', {
      fromInstanceId,
      toInstanceId: newInstance.id,
      fromStage: fromInstance.stage,
      toStage,
      itemsCount: fromInstance.items.length
    });

    return this.getChecklistInstance(newInstance.id);
  }

  /**
   * Отправляет чек-лист (SUBMITTED)
   */
  async submitChecklist(instanceId: string) {
    const instance = await this.prisma.checklistInstance.findUnique({
      where: { id: instanceId },
      include: {
        items: true,
        answers: true,
        attachments: true
      }
    });

    if (!instance) {
      throw new Error(`ChecklistInstance not found: ${instanceId}`);
    }

    if (instance.status !== 'DRAFT') {
      throw new Error(`Cannot submit checklist in status: ${instance.status}`);
    }

    // Валидация: проверяем required items
    // Для items с requiresPhoto нужны фото, для остальных - ответы
    const missingRequired: string[] = [];
    
    for (const item of instance.items) {
      if (!item.required) continue;
      
      if (item.requiresPhoto) {
        // Для items с requiresPhoto проверяем наличие фото
        const itemAttachments = instance.attachments.filter(a => a.itemKey === item.key);
        const minPhotos = item.photoMin ?? 1;
        
        if (itemAttachments.length < minPhotos) {
          missingRequired.push(item.title);
        }
      } else {
        // Для остальных required items проверяем наличие ответа
        const hasAnswer = instance.answers.some(a => a.itemKey === item.key);
        if (!hasAnswer) {
          missingRequired.push(item.title);
        }
      }
    }

    if (missingRequired.length > 0) {
      throw new Error(
        `Missing required items: ${missingRequired.join(', ')}`
      );
    }

    // Обновляем статус
    await this.prisma.checklistInstance.update({
      where: { id: instanceId },
      data: { status: 'SUBMITTED' }
    });

    logger.info('Checklist submitted', { instanceId });

    return this.getChecklistInstance(instanceId);
  }

  /**
   * Блокирует чек-лист (LOCKED)
   */
  async lockChecklist(instanceId: string) {
    const instance = await this.prisma.checklistInstance.findUnique({
      where: { id: instanceId }
    });

    if (!instance) {
      throw new Error(`ChecklistInstance not found: ${instanceId}`);
    }

    if (instance.status !== 'SUBMITTED') {
      throw new Error(
        `Cannot lock checklist in status: ${instance.status}. Must be SUBMITTED.`
      );
    }

    await this.prisma.checklistInstance.update({
      where: { id: instanceId },
      data: { status: 'LOCKED' }
    });

    logger.info('Checklist locked', { instanceId });

    return this.getChecklistInstance(instanceId);
  }

  /**
   * Добавляет ответ на пункт
   */
  async answer(input: {
    instanceId: string;
    itemKey: string;
    value?: any;
    note?: string;
  }) {
    const instance = await this.prisma.checklistInstance.findUnique({
      where: { id: input.instanceId },
      include: {
        items: true
      }
    });

    if (!instance) {
      throw new Error(`ChecklistInstance not found: ${input.instanceId}`);
    }

    // Проверяем, что пункт существует
    const item = instance.items.find(i => i.key === input.itemKey);
    if (!item) {
      throw new Error(`Item with key "${input.itemKey}" not found in this instance`);
    }

    // Проверяем тип для PHOTO_ONLY
    if (item.type === 'PHOTO_ONLY' && input.value) {
      throw new Error('PHOTO_ONLY items cannot have value, only attachments');
    }

    // Upsert ответа
    await this.prisma.checklistAnswer.upsert({
      where: {
        instanceId_itemKey: {
          instanceId: input.instanceId,
          itemKey: input.itemKey
        }
      },
      create: {
        instanceId: input.instanceId,
        itemKey: input.itemKey,
        value:
          input.value === undefined
            ? null
            : JSON.parse(JSON.stringify(input.value)),
        note: input.note
      },
      update: {
        value:
          input.value === undefined
            ? null
            : JSON.parse(JSON.stringify(input.value)),
        note: input.note
      }
    });

    return this.getChecklistInstance(input.instanceId);
  }

  /**
   * Получает presigned URLs для загрузки фото к ответам
   */
  async getAttachmentUploadUrls(input: {
    instanceId: string;
    itemKey: string;
    count: number;
    mimeTypes?: string[];
  }): Promise<PresignedPutUrlResult[]> {
    const instance = await this.prisma.checklistInstance.findUnique({
      where: { id: input.instanceId },
      include: { items: true }
    });

    if (!instance) {
      throw new Error(`ChecklistInstance not found: ${input.instanceId}`);
    }

    const item = instance.items.find(i => i.key === input.itemKey);
    if (!item) {
      throw new Error(`Item with key "${input.itemKey}" not found in this instance`);
    }

    const urls: PresignedPutUrlResult[] = [];

    for (let i = 0; i < input.count; i++) {
      const fileId = generateFileId();
      const mimeType = input.mimeTypes?.[i] || 'image/jpeg';
      const extension = getExtensionFromMimeType(mimeType) || 'jpg';
      const objectKey = getChecklistAttachmentKey(
        input.instanceId,
        input.itemKey,
        fileId,
        extension
      );

      if (!this.minio) {
        throw new Error('MinIO is not configured. File uploads are disabled.');
      }
      const presignedUrl = await this.minio.getPresignedPutUrl({
        objectKey,
        mimeType,
        expiry: 3600, // 1 час
      });

      urls.push(presignedUrl);
    }

    logger.info('Presigned URLs generated for checklist attachments', {
      instanceId: input.instanceId,
      itemKey: input.itemKey,
      count: urls.length
    });

    return urls;
  }

  /**
   * Добавляет аттачмент (фото) к пункту
   */
  async attach(input: {
    instanceId: string;
    itemKey: string;
    objectKey: string;
    url?: string;
    caption?: string;
  }) {
    const instance = await this.prisma.checklistInstance.findUnique({
      where: { id: input.instanceId },
      include: {
        items: true
      }
    });

    if (!instance) {
      throw new Error(`ChecklistInstance not found: ${input.instanceId}`);
    }

    // Проверяем, что пункт существует
    const item = instance.items.find(i => i.key === input.itemKey);
    if (!item) {
      throw new Error(`Item with key "${input.itemKey}" not found in this instance`);
    }

    // Получаем URL для файла из MinIO
    if (!this.minio && !input.url) {
      throw new Error('MinIO is not configured and no URL provided. Cannot generate file URL.');
    }
    const url = input.url || await this.minio!.getFileUrl({
      objectKey: input.objectKey,
      expiry: 7 * 24 * 60 * 60 // 7 дней
    });

    // Создаем аттачмент
    await this.prisma.checklistAttachment.create({
      data: {
        instanceId: input.instanceId,
        itemKey: input.itemKey,
        url: url,
        caption: input.caption
      }
    });

    logger.info('Attachment added', {
      instanceId: input.instanceId,
      itemKey: input.itemKey,
      objectKey: input.objectKey
    });

    return this.getChecklistInstance(input.instanceId);
  }

  /**
   * Удаляет аттачмент (фото) из пункта
   */
  async removeAttachment(attachmentId: string) {
    await this.prisma.checklistAttachment.delete({
      where: { id: attachmentId }
    });

    logger.info('Attachment removed', { attachmentId });
    return true;
  }

  /**
   * Получает шаблон чек-листа для юнита
   */
  async getChecklistTemplate(unitId: string, version?: number) {
    if (version) {
      return this.prisma.checklistTemplate.findUnique({
        where: {
          unitId_version: {
            unitId,
            version
          }
        },
        include: { 
          items: { 
            orderBy: { order: 'asc' },
            include: {
              exampleMedia: {
                orderBy: { order: 'asc' }
              }
            }
          } 
        }
      });
    }

    return this.prisma.checklistTemplate.findFirst({
      where: { unitId },
      orderBy: { version: 'desc' },
      include: { 
        items: { 
          orderBy: { order: 'asc' },
          include: {
            exampleMedia: {
              orderBy: { order: 'asc' }
            }
          }
        } 
      }
    });
  }

  /**
   * Создает шаблон для юнита
   */
  async createChecklistTemplate(unitId: string) {
    // Проверяем, есть ли уже шаблон для этого юнита
    const existing = await this.prisma.checklistTemplate.findFirst({
      where: { unitId },
      orderBy: { version: 'desc' }
    });

    if (existing) {
      return existing;
    }

    // Создаем новый шаблон версии 1
    const template = await this.prisma.checklistTemplate.create({
      data: {
        unitId,
        version: 1
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: {
            exampleMedia: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    logger.info('Checklist template created', {
      templateId: template.id,
      unitId,
      version: template.version
    });

    return template;
  }

  /**
   * Добавляет пункт в шаблон
   */
  async addTemplateItem(input: {
    templateId: string;
    key: string;
    title: string;
    description?: string;
    type?: string;
    required?: boolean;
    requiresPhoto?: boolean;
    photoMin?: number;
    order?: number;
  }) {
    // Проверяем уникальность key
    const existing = await this.prisma.checklistItemTemplate.findUnique({
      where: {
        templateId_key: {
          templateId: input.templateId,
          key: input.key
        }
      }
    });

    if (existing) {
      throw new Error(`Item with key "${input.key}" already exists in this template`);
    }

    // Получаем максимальный order
    const maxOrder = await this.prisma.checklistItemTemplate.findFirst({
      where: { templateId: input.templateId },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    // Создаем новый item
    await this.prisma.checklistItemTemplate.create({
      data: {
        templateId: input.templateId,
        key: input.key,
        title: input.title,
        description: input.description,
        type: (input.type || 'BOOL') as any,
        required: input.required ?? false,
        requiresPhoto: input.requiresPhoto ?? false,
        photoMin: input.photoMin,
        order: input.order ?? (maxOrder?.order ?? 0) + 1
      }
    });

    logger.info('Item added to checklist template', {
      templateId: input.templateId,
      itemKey: input.key
    });

    return this.getChecklistTemplateById(input.templateId);
  }

  /**
   * Обновляет пункт в шаблоне
   */
  async updateTemplateItem(input: {
    templateId: string;
    itemKey: string;
    title?: string;
    description?: string;
    type?: string;
    required?: boolean;
    requiresPhoto?: boolean;
    photoMin?: number;
    order?: number;
  }) {
    // Обновляем item
    await this.prisma.checklistItemTemplate.update({
      where: {
        templateId_key: {
          templateId: input.templateId,
          key: input.itemKey
        }
      },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.type !== undefined && { type: input.type as any }),
        ...(input.required !== undefined && { required: input.required }),
        ...(input.requiresPhoto !== undefined && { requiresPhoto: input.requiresPhoto }),
        ...(input.photoMin !== undefined && { photoMin: input.photoMin }),
        ...(input.order !== undefined && { order: input.order })
      }
    });

    logger.info('Item updated in checklist template', {
      templateId: input.templateId,
      itemKey: input.itemKey
    });

    return this.getChecklistTemplateById(input.templateId);
  }

  /**
   * Удаляет пункт из шаблона
   */
  async removeTemplateItem(input: {
    templateId: string;
    itemKey: string;
  }) {
    await this.prisma.checklistItemTemplate.delete({
      where: {
        templateId_key: {
          templateId: input.templateId,
          key: input.itemKey
        }
      }
    });

    logger.info('Item removed from checklist template', {
      templateId: input.templateId,
      itemKey: input.itemKey
    });

    return this.getChecklistTemplateById(input.templateId);
  }

  /**
   * Обновляет порядок пунктов в шаблоне
   */
  async updateTemplateItemOrder(input: {
    templateId: string;
    itemKeys: string[];
  }) {
    // Обновляем порядок для каждого item
    await Promise.all(
      input.itemKeys.map((key, index) =>
        this.prisma.checklistItemTemplate.update({
          where: {
            templateId_key: {
              templateId: input.templateId,
              key
            }
          },
          data: { order: index + 1 }
        })
      )
    );

    logger.info('Item order updated in checklist template', {
      templateId: input.templateId,
      itemCount: input.itemKeys.length
    });

    return this.getChecklistTemplateById(input.templateId);
  }

  /**
   * Получает шаблон по ID
   */
  private async getChecklistTemplateById(templateId: string) {
    const template = await this.prisma.checklistTemplate.findUnique({
      where: { id: templateId },
      include: { 
        items: { 
          orderBy: { order: 'asc' },
          include: {
            exampleMedia: {
              orderBy: { order: 'asc' }
            }
          }
        } 
      }
    });

    if (!template) {
      throw new Error(`ChecklistTemplate not found: ${templateId}`);
    }

    return template;
  }

  /**
   * Добавляет пример фото к пункту шаблона
   */
  async addTemplateItemExampleMedia(input: {
    templateId: string;
    itemKey: string;
    files: Array<{
      objectKey: string;
      url?: string;
      mimeType?: string;
      caption?: string;
    }>;
  }) {
    // Проверяем существование шаблона и пункта
    const template = await this.prisma.checklistTemplate.findUnique({
      where: { id: input.templateId },
      include: { items: true }
    });

    if (!template) {
      throw new Error(`ChecklistTemplate not found: ${input.templateId}`);
    }

    const item = template.items.find((i: any) => i.key === input.itemKey);
    if (!item) {
      throw new Error(`ChecklistItemTemplate not found: ${input.itemKey}`);
    }

    // Получаем максимальный order
    const maxOrder = await this.prisma.checklistItemTemplateMedia.findFirst({
      where: { templateId: input.templateId, itemKey: input.itemKey },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    // Создаем записи для каждого файла
    const media = await Promise.all(
      input.files.map(async (file, index) => {
        // Получаем URL для файла из MinIO
        if (!this.minio && !file.url) {
          throw new Error('MinIO is not configured and no URL provided. Cannot create media.');
        }
        const url = file.url || await this.minio!.getFileUrl({
          objectKey: file.objectKey,
          expiry: 7 * 24 * 60 * 60 // 7 дней
        });

        return this.prisma.checklistItemTemplateMedia.create({
          data: {
            templateId: input.templateId,
            itemKey: input.itemKey,
            url: url,
            objectKey: file.objectKey,
            mimeType: file.mimeType,
            caption: file.caption,
            order: (maxOrder?.order ?? 0) + index + 1
          }
        });
      })
    );

    logger.info('Example media added to template item', {
      templateId: input.templateId,
      itemKey: input.itemKey,
      count: media.length
    });

    return media;
  }

  /**
   * Удаляет пример фото из пункта шаблона
   */
  async removeTemplateItemExampleMedia(mediaId: string) {
    await this.prisma.checklistItemTemplateMedia.delete({
      where: { id: mediaId }
    });

    logger.info('Example media removed from template item', { mediaId });
    return true;
  }

  /**
   * Получает presigned URLs для загрузки примеров фото к пункту шаблона
   */
  async getTemplateItemExampleMediaUploadUrls(input: {
    templateId: string;
    itemKey: string;
    count: number;
    mimeTypes?: string[];
  }): Promise<PresignedPutUrlResult[]> {
    const template = await this.prisma.checklistTemplate.findUnique({
      where: { id: input.templateId },
      include: { items: true }
    });

    if (!template) {
      throw new Error(`ChecklistTemplate not found: ${input.templateId}`);
    }

    const item = template.items.find((i: any) => i.key === input.itemKey);
    if (!item) {
      throw new Error(`ChecklistItemTemplate not found: ${input.itemKey}`);
    }

    const urls: PresignedPutUrlResult[] = [];

    for (let i = 0; i < input.count; i++) {
      const fileId = generateFileId();
      const mimeType = input.mimeTypes?.[i] || 'image/jpeg';
      const extension = getExtensionFromMimeType(mimeType) || 'jpg';
      const objectKey = `checklists/templates/${input.templateId}/items/${input.itemKey}/examples/${fileId}.${extension}`;

      if (!this.minio) {
        throw new Error('MinIO is not configured. File uploads are disabled.');
      }
      const presignedUrl = await this.minio.getPresignedPutUrl({
        objectKey,
        mimeType,
        expiry: 3600, // 1 час
      });

      urls.push(presignedUrl);
    }

    logger.info('Presigned URLs generated for template item example media', {
      templateId: input.templateId,
      itemKey: input.itemKey,
      count: urls.length
    });

    return urls;
  }
}

