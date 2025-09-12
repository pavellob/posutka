import type { UUID, DateTime, Money } from '@repo/shared/types-only';

export type { UUID, DateTime, Money };

export interface LegalDocument {
  id: UUID;
  type: string;
  url: string;
  createdAt: DateTime;
  bookingId?: UUID;
  meta?: unknown;
}

export interface LegalDepositTransaction {
  id: UUID;
  bookingId: UUID;
  hold: Money;
  captured?: Money;
  refunded?: Money;
  method: string;
  status: string;
  createdAt: DateTime;
}
