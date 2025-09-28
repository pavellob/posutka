import { IdentityDLPrisma, prisma } from '@repo/datalayer-prisma';

export interface Context {
  dl: IdentityDLPrisma;
  request?: any;
  user?: any;
}
