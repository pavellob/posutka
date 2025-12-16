import { createGraphQLLogger } from '@repo/shared-logger';
import type { ICleaningDL, IDataLayerInventory } from '@repo/datalayer';
import type { PrismaClient } from '@prisma/client';
import { createPricingGrpcClient } from '@repo/grpc-sdk';
import { getEventsClient } from './events-client.js';

const logger = createGraphQLLogger('cleaning-service');

export interface ScheduleCleaningInput {
  orgId: string;
  unitId: string;
  bookingId?: string;
  taskId?: string;
  cleanerId?: string;
  scheduledAt: string;
  requiresLinenChange?: boolean;
  notes?: string;
  checklistItems?: Array<{
    label: string;
    isChecked: boolean;
    order: number;
  }>;
}

export interface ScheduleCleaningResult {
  cleaning: any;
  unitGrade?: number;
  cleaningDifficulty?: string;
  priceAmount?: number;
  priceCurrency?: string;
  unitAddress?: string;
}

export class CleaningService {
  constructor(
    private readonly dl: ICleaningDL,
    private readonly prisma: PrismaClient,
    private readonly inventoryDL?: IDataLayerInventory
  ) {}

  /**
   * Создает уборку и публикует соответствующее событие
   */
  async scheduleCleaning(input: ScheduleCleaningInput): Promise<ScheduleCleaningResult> {
    logger.info('🎯 CleaningService.scheduleCleaning called', {
      input,
      hasInventoryDL: !!this.inventoryDL,
      hasDl: !!this.dl,
      hasPrisma: !!this.prisma,
    });

    // 1. Создаем уборку через datalayer
    const cleaning = await this.dl.scheduleCleaning(input);
    
    logger.info('✅ Cleaning created via datalayer', {
      cleaningId: cleaning.id,
      unitId: cleaning.unitId,
    });

    // 2. Получаем данные о unit для публикации события
    const unit = await this.prisma.unit.findUnique({
      where: { id: cleaning.unitId },
      include: { property: true, preferredCleaners: { include: { cleaner: true } } }
    });

    if (!unit) {
      logger.warn('❌ Unit not found', { unitId: cleaning.unitId });
      return { cleaning };
    }

    logger.info('✅ Unit found', { unitId: unit.id, unitName: unit.name });

    // 3. Получаем дополнительные данные о unit (grade, cleaningDifficulty, address)
    let unitGrade: number | undefined;
    let cleaningDifficulty: string | undefined;
    let priceAmount: number | undefined;
    let priceCurrency: string | undefined;
    let unitAddress: string | undefined = unit.property?.address;

    logger.info('🔍 Getting unit data for event publication', {
      cleaningId: cleaning.id,
      unitId: cleaning.unitId,
      hasInventoryDL: !!this.inventoryDL,
      inventoryDLType: this.inventoryDL ? typeof this.inventoryDL : 'undefined',
    });

    if (!this.inventoryDL) {
      logger.error('❌ inventoryDL is not initialized in CleaningService!', {
        cleaningId: cleaning.id,
        unitId: cleaning.unitId,
        hint: 'Check that inventoryDL is passed to CleaningService constructor',
      });
    } else {
      try {
        logger.info('📞 Calling inventoryDL.getUnitById', {
          cleaningId: cleaning.id,
          unitId: cleaning.unitId,
        });
        
        const unitData = await this.inventoryDL.getUnitById(cleaning.unitId);
        
        logger.info('📦 Unit data retrieved from inventoryDL', {
          cleaningId: cleaning.id,
          unitId: cleaning.unitId,
          hasUnitData: !!unitData,
          unitGrade: unitData?.grade,
          cleaningDifficulty: unitData?.cleaningDifficulty,
          hasProperty: !!unitData?.property,
          unitDataKeys: unitData ? Object.keys(unitData) : [],
        });

        if (unitData) {
          unitAddress = unitData.property?.address || unitAddress;
          
          if (unitData.grade !== null && unitData.grade !== undefined) {
            unitGrade = unitData.grade;
            logger.info('✅ Unit grade found', { cleaningId: cleaning.id, unitGrade });
          } else {
            logger.warn('⚠️ Unit grade is null or undefined', { cleaningId: cleaning.id });
          }

          if (unitData.cleaningDifficulty !== null && unitData.cleaningDifficulty !== undefined) {
            cleaningDifficulty = `D${unitData.cleaningDifficulty}`;
            logger.info('✅ Cleaning difficulty found', { cleaningId: cleaning.id, cleaningDifficulty });
          } else {
            logger.warn('⚠️ Cleaning difficulty is null or undefined', { cleaningId: cleaning.id });
          }

          // Рассчитываем стоимость уборки
          try {
            const pricingClient = createPricingGrpcClient({
              host: process.env.PRICING_GRPC_HOST || 'localhost',
              port: parseInt(process.env.PRICING_GRPC_PORT || '4112'),
            });
            const defaultDifficulty = unitData.cleaningDifficulty ?? 1;
            logger.info('💰 Calculating cleaning price', {
              cleaningId: cleaning.id,
              unitId: cleaning.unitId,
              difficulty: defaultDifficulty,
            });

            const priceResponse = await pricingClient.CalculateCleaningCost({
              unitId: cleaning.unitId,
              difficulty: defaultDifficulty,
              mode: 'BASIC'
            });

            logger.info('💰 Price response received', {
              cleaningId: cleaning.id,
              hasQuote: !!priceResponse.quote,
              totalAmount: priceResponse.quote?.totalAmount,
              totalCurrency: priceResponse.quote?.totalCurrency,
            });

            if (priceResponse.quote?.totalAmount && priceResponse.quote?.totalCurrency) {
              priceAmount = Number(priceResponse.quote.totalAmount);
              priceCurrency = priceResponse.quote.totalCurrency;
              logger.info('✅ Price calculated', { cleaningId: cleaning.id, priceAmount, priceCurrency });
            } else {
              logger.warn('⚠️ Price quote missing data', { cleaningId: cleaning.id });
            }
          } catch (priceError: any) {
            logger.warn('Failed to calculate cleaning price', {
              cleaningId: cleaning.id,
              error: priceError.message,
              stack: priceError.stack,
            });
          }
        } else {
          logger.warn('⚠️ Unit data is null or undefined', { cleaningId: cleaning.id, unitId: cleaning.unitId });
        }
      } catch (error: any) {
        logger.error('❌ Failed to get unit data', {
          cleaningId: cleaning.id,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    // 4. Публикуем событие
    const additionalData = {
      unitGrade,
      cleaningDifficulty,
      priceAmount,
      priceCurrency,
      unitAddress,
    };
    
    logger.info('📤 About to publish cleaning event with additional data', {
      cleaningId: cleaning.id,
      hasUnitGrade: additionalData.unitGrade !== undefined,
      unitGrade: additionalData.unitGrade,
      hasCleaningDifficulty: additionalData.cleaningDifficulty !== undefined,
      cleaningDifficulty: additionalData.cleaningDifficulty,
      hasPriceAmount: additionalData.priceAmount !== undefined,
      priceAmount: additionalData.priceAmount,
      hasPriceCurrency: additionalData.priceCurrency !== undefined,
      priceCurrency: additionalData.priceCurrency,
      hasUnitAddress: !!additionalData.unitAddress,
    });
    
    await this.publishCleaningEvent(cleaning, unit, additionalData);

    return {
      cleaning,
      unitGrade,
      cleaningDifficulty,
      priceAmount,
      priceCurrency,
      unitAddress,
    };
  }

  /**
   * Публикует событие для созданной уборки
   */
  private async publishCleaningEvent(
    cleaning: any,
    unit: any,
    additionalData: {
      unitGrade?: number;
      cleaningDifficulty?: string;
      priceAmount?: number;
      priceCurrency?: string;
      unitAddress?: string;
    }
  ): Promise<void> {
    try {
      const eventsClient = getEventsClient();
      const unitName = `${unit.property?.title || ''} - ${unit.name}`.trim();

      if (cleaning.cleanerId) {
        // Если уборщик назначен - публикуем CLEANING_ASSIGNED
        const cleaner = await this.prisma.cleaner.findUnique({
          where: { id: cleaning.cleanerId },
        });

        if (cleaner) {
          const targetUserId = cleaner.userId || cleaner.id;
          const cleanerName = `${cleaner.firstName || ''} ${cleaner.lastName || ''}`.trim();

          // Получаем информацию о шаблоне чеклиста из ChecklistInstance
          let templateId: string | undefined;
          let templateName: string | undefined;
          try {
            const checklistInstance = await this.prisma.checklistInstance.findFirst({
              where: { cleaningId: cleaning.id },
              include: { template: { select: { id: true, name: true } } }
            });
            if (checklistInstance?.template) {
              templateId = checklistInstance.template.id;
              templateName = checklistInstance.template.name || undefined;
            }
          } catch (error) {
            logger.warn('Failed to fetch template name for notification', {
              cleaningId: cleaning.id,
              error
            });
          }

          const publishParams = {
            cleaningId: cleaning.id,
            cleanerId: cleaning.cleanerId,
            targetUserId,
            unitId: cleaning.unitId,
            unitName,
            unitAddress: additionalData.unitAddress || unit.property?.address,
            cleanerName,
            scheduledAt: cleaning.scheduledAt,
            requiresLinenChange: cleaning.requiresLinenChange,
            notes: cleaning.notes || undefined,
            orgId: cleaning.orgId || undefined,
            actorUserId: undefined, // TODO: получить из context
            unitGrade: additionalData.unitGrade,
            cleaningDifficulty: additionalData.cleaningDifficulty,
            priceAmount: additionalData.priceAmount,
            priceCurrency: additionalData.priceCurrency,
            templateId,
            templateName,
          };

          logger.info('📤 Publishing CLEANING_ASSIGNED event from CleaningService', {
            cleaningId: cleaning.id,
            hasUnitGrade: publishParams.unitGrade !== undefined && publishParams.unitGrade !== null,
            unitGrade: publishParams.unitGrade,
            hasCleaningDifficulty: publishParams.cleaningDifficulty !== undefined && publishParams.cleaningDifficulty !== null,
            cleaningDifficulty: publishParams.cleaningDifficulty,
            hasPriceAmount: publishParams.priceAmount !== undefined && publishParams.priceAmount !== null,
            priceAmount: publishParams.priceAmount,
            hasPriceCurrency: publishParams.priceCurrency !== undefined && publishParams.priceCurrency !== null,
            priceCurrency: publishParams.priceCurrency,
            additionalDataReceived: {
              unitGrade: additionalData.unitGrade,
              cleaningDifficulty: additionalData.cleaningDifficulty,
              priceAmount: additionalData.priceAmount,
              priceCurrency: additionalData.priceCurrency,
            },
            allPublishParams: JSON.stringify(publishParams, null, 2),
          });

          await eventsClient.publishCleaningAssigned(publishParams);
          logger.info('✅ CLEANING_ASSIGNED event published', { cleaningId: cleaning.id });
        }
      } else {
        // Если уборщик НЕ назначен - публикуем CLEANING_AVAILABLE для всех привязанных
        logger.info('No cleaner assigned, collecting active preferred cleaners', {
          preferredCleanersCount: unit.preferredCleaners.length
        });

        const targetUserIds = unit.preferredCleaners
          .filter((pc: any) => {
            if (!pc.cleaner.isActive) {
              logger.info('Skipping inactive preferred cleaner', {
                cleanerId: pc.cleaner.id
              });
              return false;
            }
            return true;
          })
          .map((pc: any) => {
            const userId = pc.cleaner.userId || pc.cleaner.id;
            logger.info('Added preferred cleaner to targetUserIds', {
              cleanerId: pc.cleaner.id,
              cleanerUserId: pc.cleaner.userId,
              targetUserId: userId
            });
            return userId;
          })
          .filter(Boolean);

        logger.info('Collected targetUserIds for CLEANING_AVAILABLE', {
          targetUserIdsCount: targetUserIds.length,
          targetUserIds
        });

        if (targetUserIds.length > 0) {
          await eventsClient.publishCleaningAvailable({
            cleaningId: cleaning.id,
            unitId: cleaning.unitId,
            unitName,
            unitAddress: additionalData.unitAddress || unit.property?.address,
            scheduledAt: cleaning.scheduledAt,
            requiresLinenChange: cleaning.requiresLinenChange,
            targetUserIds,
            orgId: cleaning.orgId || undefined,
            unitGrade: additionalData.unitGrade,
            cleaningDifficulty: additionalData.cleaningDifficulty,
            priceAmount: additionalData.priceAmount,
            priceCurrency: additionalData.priceCurrency,
          });
          logger.info('✅ CLEANING_AVAILABLE event published', {
            cleaningId: cleaning.id,
            targetUserIdsCount: targetUserIds.length
          });
        }
      }
    } catch (error: any) {
      logger.error('Failed to publish cleaning event', {
        cleaningId: cleaning.id,
        error: error.message,
        stack: error.stack,
      });
      // Не прерываем выполнение, если событие не опубликовалось
    }
  }
}

