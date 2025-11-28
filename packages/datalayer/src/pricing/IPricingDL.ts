import type {
  CleaningPricingRule,
  CleaningCostQuote,
  UpsertCleaningPricingRuleInput,
  RepairPricingRule,
  RepairCostQuote,
  UpsertRepairPricingRuleInput,
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

  /**
   * Получить правило ценообразования для ремонта с приоритетом: unit → org → null
   */
  getRepairPricingRule(orgId: UUID, unitId?: UUID | null): Promise<RepairPricingRule | null>;

  /**
   * Получить все правила ценообразования для ремонта
   */
  getRepairPricingRules(orgId: UUID, unitId?: UUID | null): Promise<RepairPricingRule[]>;

  /**
   * Создать или обновить правило ценообразования для ремонта
   */
  upsertRepairPricingRule(input: UpsertRepairPricingRuleInput): Promise<RepairPricingRule>;

  /**
   * Удалить правило ценообразования для ремонта
   */
  deleteRepairPricingRule(id: UUID): Promise<boolean>;
}

