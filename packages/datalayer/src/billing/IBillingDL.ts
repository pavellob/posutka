import type { 
  UUID, 
  DateTime, 
  Invoice, 
  InvoiceItem, 
  Payment, 
  Money, 
  PaymentLink,
  InvoiceStatus, 
  PaymentMethod,
  InvoiceConnection
} from './types';

export interface CreateInvoiceInput {
  orgId: UUID;
  orderId?: UUID;
  items: Array<Omit<InvoiceItem, 'id' | 'sum'>>;
  dueAt?: DateTime;
}

export interface AddInvoiceItemsInput {
  invoiceId: UUID;
  items: Array<Omit<InvoiceItem, 'id' | 'sum'>>;
}

export interface RecordPaymentInput {
  invoiceId: UUID;
  method: PaymentMethod;
  amount: Money;
  provider?: string;
  providerRef?: string;
  receiptUrl?: string;
}

export interface GeneratePaymentLinkInput {
  invoiceId: UUID;
  provider: string;
  successUrl: string;
  cancelUrl?: string;
}

export interface IssueRefundInput {
  paymentId: UUID;
  amount: Money;
  reason?: string;
}

export interface IBillingDL {
  // Invoices
  getInvoiceById(id: UUID): Promise<Invoice | null>;
  listInvoices(params: { 
    orgId: UUID; 
    status?: InvoiceStatus; 
    first?: number; 
    after?: string 
  }): Promise<InvoiceConnection>;
  createInvoice(input: CreateInvoiceInput): Promise<Invoice>;
  addInvoiceItems(input: AddInvoiceItemsInput): Promise<Invoice>;
  cancelInvoice(id: UUID): Promise<Invoice>;

  // Payments
  getPaymentById(id: UUID): Promise<Payment | null>;
  recordPayment(input: RecordPaymentInput): Promise<Payment>;
  generatePaymentLink(input: GeneratePaymentLinkInput): Promise<PaymentLink>;
  issueRefund(input: IssueRefundInput): Promise<Payment>;
}