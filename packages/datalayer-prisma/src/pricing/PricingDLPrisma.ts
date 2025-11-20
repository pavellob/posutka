// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';
import type {
  IPricingDL,
  CleaningPricingRule,
  UpsertCleaningPricingRuleInput,
  UUID,
} from '@repo/datalayer';

export class PricingDLPrisma implements IPricingDL {
  constructor(private readonly prisma: PrismaClient) {}

  async getPricingRule(orgId: string, unitId?: string | null): Promise<CleaningPricingRule | null> {
    try {
      // Сначала пытаемся найти unit-specific правило
      if (unitId) {
        const unitRule = await this.prisma.cleaningPricingRule.findUnique({
          where: {
            orgId_unitId: {
              orgId,
              unitId,
            },
          },
        });

        if (unitRule) {
          return this.mapRuleFromPrisma(unitRule);
        }
      }

      // Затем пытаемся найти org-level правило (unitId = null)
      const orgRule = await this.prisma.cleaningPricingRule.findFirst({
        where: {
          orgId,
          unitId: null,
        },
      });

      if (orgRule) {
        return this.mapRuleFromPrisma(orgRule);
      }

      return null;
    } catch (error) {
      console.error('Error in getPricingRule:', { orgId, unitId, error });
      throw error;
    }
  }

  async getPricingRules(orgId: string, unitId?: string | null): Promise<CleaningPricingRule[]> {
    try {
      const where: any = { orgId };
      if (unitId !== undefined) {
        where.unitId = unitId;
      }

      const rules = await this.prisma.cleaningPricingRule.findMany({
        where,
        orderBy: [{ unitId: 'asc' }, { createdAt: 'desc' }],
      });

      return rules.map((rule) => this.mapRuleFromPrisma(rule));
    } catch (error) {
      console.error('Error in getPricingRules:', { orgId, unitId, error });
      throw error;
    }
  }

  async upsertPricingRule(input: UpsertCleaningPricingRuleInput): Promise<CleaningPricingRule> {
    try {
      const unitIdValue = input.unitId ?? null;
      
      // Сначала пытаемся найти существующее правило
      const existingRule = unitIdValue === null
        ? await this.prisma.cleaningPricingRule.findFirst({
            where: {
              orgId: input.orgId,
              unitId: null,
            },
          })
        : await this.prisma.cleaningPricingRule.findUnique({
            where: {
              orgId_unitId: {
                orgId: input.orgId,
                unitId: unitIdValue,
              },
            },
          });

      const ruleData = {
        orgId: input.orgId,
        unitId: unitIdValue,
        mode: input.mode,
        baseCleaningPrice: input.baseCleaningPrice.amount,
        baseCleaningCurrency: input.baseCleaningPrice.currency,
        gradeStep: input.gradeStep ?? 0.1,
        difficultyStep: input.difficultyStep ?? 0.2,
        increasedDifficultyDelta: input.increasedDifficultyDelta ?? 0.1,
        extras: input.extras || null,
      };

      let rule;
      if (existingRule) {
        // Обновляем существующее правило
        rule = await this.prisma.cleaningPricingRule.update({
          where: { id: existingRule.id },
          data: ruleData,
        });
      } else {
        // Создаём новое правило
        rule = await this.prisma.cleaningPricingRule.create({
          data: ruleData,
        });
      }

      return this.mapRuleFromPrisma(rule);
    } catch (error) {
      console.error('Error in upsertPricingRule:', { input, error });
      throw error;
    }
  }

  async deletePricingRule(id: string): Promise<boolean> {
    try {
      await this.prisma.cleaningPricingRule.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      console.error('Error in deletePricingRule:', { id, error });
      throw error;
    }
  }

  private mapRuleFromPrisma(rule: any): CleaningPricingRule {
    return {
      id: rule.id,
      orgId: rule.orgId,
      unitId: rule.unitId,
      mode: rule.mode as 'BASIC' | 'INCREASED',
      baseCleaningPrice: {
        amount: rule.baseCleaningPrice,
        currency: rule.baseCleaningCurrency,
      },
      gradeStep: rule.gradeStep,
      difficultyStep: rule.difficultyStep,
      increasedDifficultyDelta: rule.increasedDifficultyDelta,
      extras: rule.extras,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }
}

