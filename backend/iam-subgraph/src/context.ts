import type { IdentityDLPrisma } from '@repo/datalayer-prisma';

export interface Context {
  dl: IdentityDLPrisma;
  request?: any;
  user?: any;
}
