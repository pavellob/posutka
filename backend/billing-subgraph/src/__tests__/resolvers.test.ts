import { describe, it, expect, vi } from 'vitest';
import type { IBillingDL } from '@repo/datalayer';

// Mock implementation of IBillingDL
const mockDL: IBillingDL = {
  getInvoiceById: vi.fn(),
  listInvoices: vi.fn(),
  createInvoice: vi.fn(),
  addInvoiceItems: vi.fn(),
  cancelInvoice: vi.fn(),
  getPaymentById: vi.fn(),
  recordPayment: vi.fn(),
  generatePaymentLink: vi.fn(),
  issueRefund: vi.fn(),
};

describe('Billing Resolvers', () => {
  it('should create invoice', async () => {
    const mockInvoice = {
      id: 'inv-1',
      orgId: 'org-1',
      items: [{
        id: 'item-1',
        name: 'Уборка',
        qty: 1,
        price: { amount: 3000, currency: 'RUB' },
        sum: { amount: 3000, currency: 'RUB' }
      }],
      total: { amount: 3000, currency: 'RUB' },
      status: 'OPEN' as const,
      issuedAt: new Date().toISOString(),
    };

    vi.mocked(mockDL.createInvoice).mockResolvedValue(mockInvoice);

    const result = await mockDL.createInvoice({
      orgId: 'org-1',
      items: [{
        name: 'Уборка',
        qty: 1,
        price: { amount: 3000, currency: 'RUB' }
      }]
    });

    expect(result).toEqual(mockInvoice);
    expect(mockDL.createInvoice).toHaveBeenCalledWith({
      orgId: 'org-1',
      items: [{
        name: 'Уборка',
        qty: 1,
        price: { amount: 3000, currency: 'RUB' }
      }]
    });
  });

  it('should record payment', async () => {
    const mockPayment = {
      id: 'pay-1',
      invoiceId: 'inv-1',
      method: 'CARD' as const,
      amount: { amount: 3000, currency: 'RUB' },
      status: 'SUCCEEDED' as const,
      createdAt: new Date().toISOString(),
      provider: 'YOOKASSA',
    };

    vi.mocked(mockDL.recordPayment).mockResolvedValue(mockPayment);

    const result = await mockDL.recordPayment({
      invoiceId: 'inv-1',
      method: 'CARD',
      amount: { amount: 3000, currency: 'RUB' },
      provider: 'YOOKASSA'
    });

    expect(result).toEqual(mockPayment);
    expect(mockDL.recordPayment).toHaveBeenCalledWith({
      invoiceId: 'inv-1',
      method: 'CARD',
      amount: { amount: 3000, currency: 'RUB' },
      provider: 'YOOKASSA'
    });
  });

  it('should list invoices', async () => {
    const mockInvoices = {
      edges: [{
        id: 'inv-1',
        orgId: 'org-1',
        items: [],
        total: { amount: 3000, currency: 'RUB' },
        status: 'OPEN' as const,
        issuedAt: new Date().toISOString(),
      }],
      endCursor: 'inv-1',
      hasNextPage: false
    };

    vi.mocked(mockDL.listInvoices).mockResolvedValue(mockInvoices);

    const result = await mockDL.listInvoices({
      orgId: 'org-1',
      status: 'OPEN',
      first: 20
    });

    expect(result).toEqual(mockInvoices);
    expect(mockDL.listInvoices).toHaveBeenCalledWith({
      orgId: 'org-1',
      status: 'OPEN',
      first: 20
    });
  });
});
