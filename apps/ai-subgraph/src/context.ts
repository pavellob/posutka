import type { IAIOrchestrator } from '@repo/datalayer';

export type Context = {
  orchestrator: IAIOrchestrator;
  userId?: string;
  orgId?: string;
};
