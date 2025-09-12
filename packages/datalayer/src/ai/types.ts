import type { UUID } from '@repo/shared';

export type { UUID };

export interface AICommandResult {
  ok: boolean;
  message?: string;
  affectedIds: string[];
  preview?: unknown;
}
