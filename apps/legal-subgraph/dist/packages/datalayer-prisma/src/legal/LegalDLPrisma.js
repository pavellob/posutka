export class LegalDLPrisma {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateContract(bookingId, template) {
        const document = await this.prisma.legalDocument.create({
            data: {
                id: crypto.randomUUID(),
                type: 'CONTRACT',
                url: `https://docs.example.com/contracts/${bookingId}/${crypto.randomUUID()}.pdf`,
                bookingId,
                meta: {
                    template: template || 'default',
                    generatedAt: new Date().toISOString(),
                    version: '1.0'
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
        });
        return this.mapDocumentFromPrisma(document);
    }
    async getDocument(id) {
        const document = await this.prisma.legalDocument.findUnique({
            where: { id }
        });
        if (!document)
            return null;
        return this.mapDocumentFromPrisma(document);
    }
    async depositAction(bookingId, action, amount) {
        // Находим существующую транзакцию или создаем новую
        let transaction = await this.prisma.legalDepositTransaction.findFirst({
            where: { bookingId }
        });
        if (!transaction) {
            // Создаем новую транзакцию
            transaction = await this.prisma.legalDepositTransaction.create({
                data: {
                    id: crypto.randomUUID(),
                    bookingId,
                    holdAmount: amount?.amount || 0,
                    holdCurrency: amount?.currency || 'RUB',
                    method: 'CARD',
                    status: 'PENDING',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }
            });
        }
        // Обновляем транзакцию в зависимости от действия
        const updateData = {
            updatedAt: new Date().toISOString(),
        };
        switch (action) {
            case 'HOLD':
                updateData.holdAmount = amount?.amount || transaction.holdAmount;
                updateData.holdCurrency = amount?.currency || transaction.holdCurrency;
                updateData.status = 'HELD';
                break;
            case 'CAPTURE':
                updateData.capturedAmount = amount?.amount || transaction.holdAmount;
                updateData.capturedCurrency = amount?.currency || transaction.holdCurrency;
                updateData.status = 'CAPTURED';
                break;
            case 'REFUND':
                updateData.refundedAmount = amount?.amount || transaction.capturedAmount;
                updateData.refundedCurrency = amount?.currency || transaction.capturedCurrency;
                updateData.status = 'REFUNDED';
                break;
            case 'RELEASE':
                updateData.status = 'RELEASED';
                break;
        }
        const updatedTransaction = await this.prisma.legalDepositTransaction.update({
            where: { id: transaction.id },
            data: updateData
        });
        return this.mapDepositTransactionFromPrisma(updatedTransaction);
    }
    async getDepositTx(id) {
        const transaction = await this.prisma.legalDepositTransaction.findUnique({
            where: { id }
        });
        if (!transaction)
            return null;
        return this.mapDepositTransactionFromPrisma(transaction);
    }
    mapDocumentFromPrisma(document) {
        return {
            id: document.id,
            type: document.type,
            url: document.url,
            createdAt: document.createdAt,
            bookingId: document.bookingId,
            meta: document.meta
        };
    }
    mapDepositTransactionFromPrisma(transaction) {
        return {
            id: transaction.id,
            bookingId: transaction.bookingId,
            hold: { amount: transaction.holdAmount, currency: transaction.holdCurrency },
            captured: transaction.capturedAmount ? {
                amount: transaction.capturedAmount,
                currency: transaction.capturedCurrency
            } : undefined,
            refunded: transaction.refundedAmount ? {
                amount: transaction.refundedAmount,
                currency: transaction.refundedCurrency
            } : undefined,
            method: transaction.method,
            status: transaction.status,
            createdAt: transaction.createdAt
        };
    }
}
