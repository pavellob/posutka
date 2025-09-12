import type {
  UUID,
  AICommandResult,
} from './types.js';

export interface IAIOrchestrator {
  run(orgId: UUID, command: string, context?: unknown): Promise<AICommandResult>;
}
