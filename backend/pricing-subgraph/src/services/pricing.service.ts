import type { IPricingDL, CleaningPricingRule, CleaningCostQuote, UnitGrade, CleaningDifficulty } from '@repo/datalayer';
import type { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('pricing-service');

export class PricingService {
  constructor(
    private readonly dl: IPricingDL,
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Получить правило с приоритетом: unit → org → default
   */
  async getRule(orgId: string, unitId?: string | null): Promise<CleaningPricingRule | null> {
    // 1. Попытка получить unit-specific правило
    if (unitId) {
      const unitRule = await this.dl.getPricingRule(orgId, unitId);
      if (unitRule) return unitRule;
    }
    
    // 2. Попытка получить org-level правило
    const orgRule = await this.dl.getPricingRule(orgId, null);
    if (orgRule) return orgRule;
    
    // 3. Возвращаем дефолтное правило
    return this.getDefaultRule(orgId);
  }

  /**
   * Рассчитать стоимость уборки
   */
  async calculateCost(params: {
    unitId: string;
    grade?: UnitGrade;
    difficulty?: CleaningDifficulty;
    mode?: 'BASIC' | 'INCREASED';
  }): Promise<CleaningCostQuote> {
    // Получаем юнит для grade и propertyId
    const unit = await this.prisma.unit.findUnique({
      where: { id: params.unitId },
      select: { 
        grade: true, 
        cleaningDifficulty: true, 
        propertyId: true 
      },
    });
    
    if (!unit) {
      throw new Error(`Unit ${params.unitId} not found`);
    }

    // Используем переданный grade или берем из БД
    const grade = (params.grade !== undefined ? params.grade : (unit.grade ?? 0)) as UnitGrade;
    const difficulty = (params.difficulty !== undefined ? params.difficulty : (unit.cleaningDifficulty ?? 0)) as CleaningDifficulty;
    const mode = params.mode ?? 'BASIC';
    const propertyId = unit.propertyId;

    // Получаем property для orgId
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { orgId: true },
    });

    if (!property) {
      throw new Error(`Property not found for unit ${params.unitId}`);
    }

    const rule = await this.getRule(property.orgId, params.unitId);
    if (!rule) {
      throw new Error(`No pricing rule found for org ${property.orgId}`);
    }

    // Расчёт коэффициентов
    const gradeCoefficient = 1 + rule.gradeStep * grade;
    let difficultyCoefficient = 1 + rule.difficultyStep * difficulty;
    
    if (mode === 'INCREASED') {
      difficultyCoefficient += rule.increasedDifficultyDelta;
    }

    // Итоговая стоимость (округление до копеек)
    const totalAmount = Math.round(
      rule.baseCleaningPrice.amount * gradeCoefficient * difficultyCoefficient
    );

    logger.info('Calculated cleaning cost', {
      unitId: params.unitId,
      grade,
      difficulty,
      mode,
      gradeCoefficient,
      difficultyCoefficient,
      baseAmount: rule.baseCleaningPrice.amount,
      totalAmount,
    });

    return {
      unitId: params.unitId,
      grade,
      difficulty,
      mode,
      base: rule.baseCleaningPrice,
      gradeCoefficient,
      difficultyCoefficient,
      total: {
        amount: totalAmount,
        currency: rule.baseCleaningPrice.currency,
      },
    };
  }

  private getDefaultRule(orgId: string): CleaningPricingRule {
    // Дефолтные значения (можно из env или конфига)
    return {
      id: 'default',
      orgId,
      unitId: null,
      mode: 'BASIC',
      baseCleaningPrice: { amount: 200000, currency: 'RUB' }, // 2000 RUB
      gradeStep: 0.1,
      difficultyStep: 0.2,
      increasedDifficultyDelta: 0.1,
      extras: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

