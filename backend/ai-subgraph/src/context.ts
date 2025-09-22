import type { IAIOrchestrator } from '@repo/datalayer';
import { AIOrchestratorService } from './services/ai-orchestrator.service.js';

export type Context = {
  orchestrator: IAIOrchestrator;
  userId?: string;
  orgId?: string;
};

// Создаем экземпляр сервиса для использования в контексте
export const createContext = (): Context => ({
  orchestrator: new AIOrchestratorService(),
});
