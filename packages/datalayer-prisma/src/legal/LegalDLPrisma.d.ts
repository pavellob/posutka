import { PrismaClient } from '@prisma/client';
import type { ILegalDL, LegalDocument, LegalDepositTransaction, Money } from '@repo/datalayer';
export declare class LegalDLPrisma implements ILegalDL {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    generateContract(bookingId: string, template?: string): Promise<LegalDocument>;
    getDocument(id: string): Promise<LegalDocument | null>;
    depositAction(bookingId: string, action: 'HOLD' | 'CAPTURE' | 'REFUND' | 'RELEASE', amount?: Money): Promise<LegalDepositTransaction>;
    getDepositTx(id: string): Promise<LegalDepositTransaction | null>;
    private mapDocumentFromPrisma;
    private mapDepositTransactionFromPrisma;
}
