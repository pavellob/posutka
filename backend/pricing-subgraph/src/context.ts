import type { IPricingDL } from '@repo/datalayer';
import type { PrismaClient } from '@prisma/client';
import type { PricingService } from './services/pricing.service.js';

export interface Context {
  dl: IPricingDL;
  pricingService: PricingService;
  prisma: PrismaClient;
}

