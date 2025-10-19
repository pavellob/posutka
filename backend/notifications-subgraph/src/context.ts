import type { PrismaClient } from '@prisma/client';
import { ProviderManager } from './providers/provider-manager.js';
import { NotificationService } from './services/notification.service.js';

export interface Context {
  prisma: PrismaClient;
  providerManager: ProviderManager;
  notificationService: NotificationService;
}

