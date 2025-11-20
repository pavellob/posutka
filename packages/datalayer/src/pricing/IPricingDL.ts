import type {
  CleaningPricingRule,
  CleaningCostQuote,
  UpsertCleaningPricingRuleInput,
  UUID,
} from './types.js';

export interface IPricingDL {
  /**
   * Получить правило ценообразования с приоритетом: unit → org → null
   */
  getPricingRule(orgId: UUID, unitId?: UUID | null): Promise<CleaningPricingRule | null>;

  /**
   * Получить все правила для организации/юнита
   */
  getPricingRules(orgId: UUID, unitId?: UUID | null): Promise<CleaningPricingRule[]>;

  /**
   * Создать или обновить правило ценообразования
   */
  upsertPricingRule(input: UpsertCleaningPricingRuleInput): Promise<CleaningPricingRule>;

  /**
   * Удалить правило ценообразования
   */
  deletePricingRule(id: UUID): Promise<boolean>;
}

