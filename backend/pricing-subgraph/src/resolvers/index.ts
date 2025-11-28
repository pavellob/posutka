import type { Context } from '../context.js';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('pricing-subgraph-resolvers');

// Конвертация enum значений
function gradeToEnum(grade: number): string {
  return `GRADE_${grade}`;
}

function enumToGrade(gradeEnum: string): number {
  return parseInt(gradeEnum.replace('GRADE_', ''), 10);
}

function difficultyToEnum(difficulty: number): string {
  return `D${difficulty}`;
}

function enumToDifficulty(difficultyEnum: string): number {
  return parseInt(difficultyEnum.replace('D', ''), 10);
}

function sizeToEnum(size: number): string {
  return `SIZE_${size}`;
}

function enumToSize(sizeEnum: string): number {
  return parseInt(sizeEnum.replace('SIZE_', ''), 10);
}

export const resolvers: any = {
  Query: {
    async cleaningPricingRule(_: any, args: { orgId: string; unitId?: string | null }, ctx: Context) {
      return ctx.pricingService.getRule(args.orgId, args.unitId);
    },

    async cleaningPricingRules(_: any, args: { orgId: string; unitId?: string | null }, ctx: Context) {
      return ctx.dl.getPricingRules(args.orgId, args.unitId);
    },

    async calculateCleaningCost(_: any, args: { unitId: string; grade?: string; difficulty?: string; mode?: string }, ctx: Context) {
      const grade = args.grade ? (enumToGrade(args.grade) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) : undefined;
      const difficulty = args.difficulty ? (enumToDifficulty(args.difficulty) as 0 | 1 | 2 | 3 | 4 | 5) : undefined;
      const mode = args.mode as 'BASIC' | 'INCREASED' | undefined;
      
      const quote = await ctx.pricingService.calculateCost({
        unitId: args.unitId,
        grade,
        difficulty,
        mode,
      });

      // Конвертируем обратно в enum для GraphQL
      return {
        ...quote,
        grade: gradeToEnum(quote.grade),
        difficulty: difficultyToEnum(quote.difficulty),
      };
    },

    async repairPricingRule(_: any, args: { orgId: string; unitId?: string | null }, ctx: Context) {
      return ctx.pricingService.getRepairRule(args.orgId, args.unitId);
    },

    async repairPricingRules(_: any, args: { orgId: string; unitId?: string | null }, ctx: Context) {
      return ctx.dl.getRepairPricingRules(args.orgId, args.unitId);
    },

    async calculateRepairCost(_: any, args: { unitId: string; repairId: string; size?: string; difficulty?: string; mode?: string }, ctx: Context) {
      const size = args.size ? (enumToSize(args.size) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) : undefined;
      const difficulty = args.difficulty ? (enumToDifficulty(args.difficulty) as 0 | 1 | 2 | 3 | 4 | 5) : undefined;
      const mode = args.mode as 'BASIC' | 'INCREASED' | undefined;
      
      const quote = await ctx.pricingService.calculateRepairCost({
        unitId: args.unitId,
        repairId: args.repairId,
        size,
        difficulty,
        mode,
      });

      // Конвертируем обратно в enum для GraphQL
      return {
        ...quote,
        size: sizeToEnum(quote.size),
        difficulty: difficultyToEnum(quote.difficulty),
      };
    },
  },

  Mutation: {
    async upsertCleaningPricingRule(_: any, args: { input: any }, ctx: Context) {
      return ctx.dl.upsertPricingRule(args.input);
    },

    async deleteCleaningPricingRule(_: any, args: { id: string }, ctx: Context) {
      return ctx.dl.deletePricingRule(args.id);
    },

    async upsertRepairPricingRule(_: any, args: { input: any }, ctx: Context) {
      return ctx.dl.upsertRepairPricingRule(args.input);
    },

    async deleteRepairPricingRule(_: any, args: { id: string }, ctx: Context) {
      return ctx.dl.deleteRepairPricingRule(args.id);
    },
  },
};

