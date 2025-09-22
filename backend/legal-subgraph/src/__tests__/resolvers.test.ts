import { describe, it, expect, vi } from 'vitest';
import type { ILegalDL } from '@repo/datalayer';

// Mock implementation of ILegalDL
const mockDL: ILegalDL = {
  generateContract: vi.fn(),
  getDocument: vi.fn(),
  depositAction: vi.fn(),
  getDepositTx: vi.fn(),
};

describe('Legal Resolvers', () => {
  it('should generate contract', async () => {
    const mockDocument = {
      id: 'doc-1',
      type: 'CONTRACT',
      url: 'https://docs.example.com/contracts/booking-1/doc-1.pdf',
      createdAt: new Date().toISOString(),
      bookingId: 'booking-1',
      meta: {
        template: 'premium',
        generatedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    vi.mocked(mockDL.generateContract).mockResolvedValue(mockDocument);

    const result = await mockDL.generateContract('booking-1', 'premium');

    expect(result).toEqual(mockDocument);
    expect(mockDL.generateContract).toHaveBeenCalledWith('booking-1', 'premium');
  });

  it('should hold deposit', async () => {
    const mockDepositTransaction = {
      id: 'deposit-1',
      bookingId: 'booking-1',
      hold: { amount: 10000, currency: 'RUB' },
      captured: undefined,
      refunded: undefined,
      method: 'CARD',
      status: 'HELD',
      createdAt: new Date().toISOString(),
    };

    vi.mocked(mockDL.depositAction).mockResolvedValue(mockDepositTransaction);

    const result = await mockDL.depositAction('booking-1', 'HOLD', { amount: 10000, currency: 'RUB' });

    expect(result).toEqual(mockDepositTransaction);
    expect(mockDL.depositAction).toHaveBeenCalledWith('booking-1', 'HOLD', { amount: 10000, currency: 'RUB' });
  });

  it('should capture deposit', async () => {
    const mockDepositTransaction = {
      id: 'deposit-1',
      bookingId: 'booking-1',
      hold: { amount: 10000, currency: 'RUB' },
      captured: { amount: 10000, currency: 'RUB' },
      refunded: undefined,
      method: 'CARD',
      status: 'CAPTURED',
      createdAt: new Date().toISOString(),
    };

    vi.mocked(mockDL.depositAction).mockResolvedValue(mockDepositTransaction);

    const result = await mockDL.depositAction('booking-1', 'CAPTURE', { amount: 10000, currency: 'RUB' });

    expect(result).toEqual(mockDepositTransaction);
    expect(mockDL.depositAction).toHaveBeenCalledWith('booking-1', 'CAPTURE', { amount: 10000, currency: 'RUB' });
  });
});
