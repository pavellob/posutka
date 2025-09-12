import type { UUID, DateTime, Money } from '@repo/shared/types-only';

export type { UUID, DateTime, Money }; // Re-exporting types from shared

export type InvoiceStatus = 'OPEN' | 'PAID' | 'CANCELED';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
export type PaymentMethod = 'CARD' | 'CASH' | 'TRANSFER' | 'OTHER';

export interface InvoiceItem {
  id: UUID;
  name: string;
  qty: number;
  price: Money;
  sum: Money;
}

export interface Invoice {
  id: UUID;
  orgId: UUID;
  orderId?: UUID;
  items: InvoiceItem[];
  total: Money;
  status: InvoiceStatus;
  issuedAt: DateTime;
  dueAt?: DateTime;
}

export interface Payment {
  id: UUID;
  invoiceId: UUID;
  method: PaymentMethod;
  amount: Money;
  status: PaymentStatus;
  createdAt: DateTime;
  provider?: string;
  providerRef?: string;
  receiptUrl?: string;
}

export interface PaymentLink {
  url: string;
  provider: string;
  expiresAt?: DateTime;
}

export interface InvoiceConnection {
  edges: Invoice[];
  endCursor?: string;
  hasNextPage: boolean;
}