import { PrismaClient } from '@prisma/client';
import type { IBillingDL, Invoice, Payment, PaymentLink, CreateInvoiceInput, AddInvoiceItemsInput, RecordPaymentInput, GeneratePaymentLinkInput, IssueRefundInput, InvoiceConnection } from '@repo/datalayer';
export declare class BillingDLPrisma implements IBillingDL {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    getInvoiceById(id: string): Promise<Invoice | null>;
    listInvoices(params: {
        orgId: string;
        status?: string;
        first?: number;
        after?: string;
    }): Promise<InvoiceConnection>;
    createInvoice(input: CreateInvoiceInput): Promise<Invoice>;
    addInvoiceItems(input: AddInvoiceItemsInput): Promise<Invoice>;
    cancelInvoice(id: string): Promise<Invoice>;
    getPaymentById(id: string): Promise<Payment | null>;
    recordPayment(input: RecordPaymentInput): Promise<Payment>;
    generatePaymentLink(input: GeneratePaymentLinkInput): Promise<PaymentLink>;
    issueRefund(input: IssueRefundInput): Promise<Payment>;
    private mapInvoiceFromPrisma;
    private mapPaymentFromPrisma;
}
