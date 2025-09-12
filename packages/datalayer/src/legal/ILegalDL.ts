import type {
  UUID,
  Money,
  LegalDocument,
  LegalDepositTransaction,
} from './types.js';

export interface ILegalDL {
  generateContract(bookingId: UUID, template?: string): Promise<LegalDocument>;
  getDocument(id: UUID): Promise<LegalDocument | null>;
  depositAction(bookingId: UUID, action: 'HOLD' | 'CAPTURE' | 'REFUND' | 'RELEASE', amount?: Money): Promise<LegalDepositTransaction>;
  getDepositTx(id: UUID): Promise<LegalDepositTransaction | null>;
}
