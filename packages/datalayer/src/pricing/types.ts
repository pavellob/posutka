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

