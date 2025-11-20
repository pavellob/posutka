import { createGraphQLLogger } from '@repo/shared-logger';
import type { 
  CalculateCleaningCostRequest,
  CalculateCleaningCostResponse,
} from '@repo/grpc-sdk';
import { 
  PricingServiceDefinition,
  CoeffMode,
} from '@repo/grpc-sdk';
import type { PricingService } from '../services/pricing.service.js';

const logger = createGraphQLLogger('pricing-grpc-service');

export class PricingGrpcService implements PricingServiceDefinition {
  readonly name = 'PricingService';
  readonly fullName = 'pricing.PricingService';
  readonly methods = PricingServiceDefinition.methods;

  constructor(
    private readonly pricingService: PricingService
  ) {}

  async calculateCleaningCost(request: CalculateCleaningCostRequest): Promise<CalculateCleaningCostResponse> {
    try {
      logger.info('Received CalculateCleaningCost request via gRPC', {
        unitId: request.unitId,
        difficulty: request.difficulty,
        mode: request.mode,
      });

      const quote = await this.pricingService.calculateCost({
        unitId: request.unitId,
        difficulty: request.difficulty !== undefined ? request.difficulty as 0 | 1 | 2 | 3 | 4 | 5 : undefined,
        mode: request.mode === CoeffMode.COEFF_MODE_INCREASED ? 'INCREASED' : 'BASIC',
      });

      logger.info('✅ Cleaning cost calculated via gRPC', {
        unitId: quote.unitId,
        totalAmount: quote.total.amount,
      });

      return {
        quote: {
          unitId: quote.unitId,
          grade: quote.grade,
          difficulty: quote.difficulty,
          mode: quote.mode === 'INCREASED' ? CoeffMode.COEFF_MODE_INCREASED : CoeffMode.COEFF_MODE_BASIC,
          baseAmount: quote.base.amount,
          baseCurrency: quote.base.currency,
          gradeCoefficient: quote.gradeCoefficient,
          difficultyCoefficient: quote.difficultyCoefficient,
          totalAmount: quote.total.amount,
          totalCurrency: quote.total.currency,
        },
        success: true,
        message: '',
      };
    } catch (error: any) {
      logger.error('Error calculating cleaning cost via gRPC', { 
        error: error.message,
        unitId: request.unitId,
      });
      return {
        quote: undefined,
        success: false,
        message: error.message || 'Failed to calculate cleaning cost',
      };
    }
  }
}

