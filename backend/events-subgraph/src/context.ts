// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import type { PrismaClient } from '@prisma/client';
import type { EventBusService } from './services/event-bus.service.js';

export interface Context {
  prisma: PrismaClient;
  eventBus: EventBusService;
}

