import type { IOpsDL } from '@repo/datalayer';
// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import type { PrismaClient } from '@prisma/client';

export type Context = {
  dl: IOpsDL;
  prisma?: PrismaClient;
  orgId?: string;
  userId?: string;
};
