import type { UUID, DateTime, Money } from '@repo/shared/types-only';

export type { UUID, DateTime, Money };

export type CleaningCoeffMode = 'BASIC' | 'INCREASED';

export type UnitGrade = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type CleaningDifficulty = 0 | 1 | 2 | 3 | 4 | 5;

export interface CleaningPricingRule {
  id: UUID;
  orgId: UUID;
  unitId: UUID | null;
  mode: CleaningCoeffMode;
  baseCleaningPrice: Money;
  gradeStep: number;
  difficultyStep: number;
  increasedDifficultyDelta: number;
  extras: any;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface CleaningCostQuote {
  unitId: UUID;
  grade: UnitGrade;
  difficulty: CleaningDifficulty;
  mode: CleaningCoeffMode;
  base: Money;
  gradeCoefficient: number;
  difficultyCoefficient: number;
  total: Money;
}

export interface UpsertCleaningPricingRuleInput {
  orgId: UUID;
  unitId?: UUID | null;
  mode: CleaningCoeffMode;
  baseCleaningPrice: Money;
  gradeStep?: number;
  difficultyStep?: number;
  increasedDifficultyDelta?: number;
  extras?: any;
}

export type RepairCoeffMode = 'BASIC' | 'INCREASED';

export type RepairSize = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type RepairDifficulty = 0 | 1 | 2 | 3 | 4 | 5;

export interface RepairPricingRule {
  id: UUID;
  orgId: UUID;
  unitId: UUID | null;
  mode: RepairCoeffMode;
  baseRepairPrice: Money;
  gradeStep: number; // для size (0-10)
  difficultyStep: number; // для difficulty (0-5)
  increasedDifficultyDelta: number;
  extras: any;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface RepairCostQuote {
  unitId: UUID;
  size: RepairSize;
  difficulty: RepairDifficulty;
  mode: RepairCoeffMode;
  base: Money;
  sizeCoefficient: number;
  difficultyCoefficient: number;
  materialsCost: Money; // Сумма расходников (shoppingItems)
  total: Money;
}

export interface UpsertRepairPricingRuleInput {
  orgId: UUID;
  unitId?: UUID | null;
  mode: RepairCoeffMode;
  baseRepairPrice: Money;
  gradeStep?: number;
  difficultyStep?: number;
  increasedDifficultyDelta?: number;
  extras?: any;
}

