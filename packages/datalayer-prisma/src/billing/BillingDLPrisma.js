export class BillingDLPrisma {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getInvoiceById(id) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!invoice)
            return null;
        return this.mapInvoiceFromPrisma(invoice);
    }
    async listInvoices(params) {
        const { orgId, status, first = 20, after } = params;
        const where = { orgId };
        if (status)
            where.status = status;
        const invoices = await this.prisma.invoice.findMany({
            where,
            include: { items: true },
            take: first + 1,
            skip: after ? 1 : 0,
            cursor: after ? { id: after } : undefined,
            orderBy: { createdAt: 'desc' }
        });
        const hasNextPage = invoices.length > first;
        const edges = hasNextPage ? invoices.slice(0, -1) : invoices;
        const endCursor = edges.length > 0 ? edges[edges.length - 1].id : undefined;
        return {
            edges: edges.map(this.mapInvoiceFromPrisma),
            endCursor,
            hasNextPage
        };
    }
    async createInvoice(input) {
        const { orgId, orderId, items, dueAt } = input;
        // Calculate total
        const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.price.amount), 0);
        const totalCurrency = items[0]?.price.currency || 'RUB';
        const invoice = await this.prisma.invoice.create({
            data: {
                orgId,
                orderId,
                totalAmount,
                totalCurrency,
                status: 'OPEN',
                issuedAt: new Date(),
                dueAt: dueAt ? new Date(dueAt) : null,
                items: {
                    create: items.map(item => ({
                        name: item.name,
                        qty: item.qty,
                        priceAmount: item.price.amount,
                        priceCurrency: item.price.currency,
                        sumAmount: item.qty * item.price.amount,
                        sumCurrency: item.price.currency
                    }))
                }
            },
            include: { items: true }
        });
        return this.mapInvoiceFromPrisma(invoice);
    }
    async addInvoiceItems(input) {
        const { invoiceId, items } = input;
        // Get current invoice to calculate new total
        const currentInvoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { items: true }
        });
        if (!currentInvoice) {
            throw new Error(`Invoice ${invoiceId} not found`);
        }
        if (currentInvoice.status !== 'OPEN') {
            throw new Error('Cannot add items to non-open invoice');
        }
        // Calculate additional amount
        const additionalAmount = items.reduce((sum, item) => sum + (item.qty * item.price.amount), 0);
        const newTotalAmount = currentInvoice.totalAmount + additionalAmount;
        // Create new items and update total
        const invoice = await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                totalAmount: newTotalAmount,
                items: {
                    create: items.map(item => ({
                        name: item.name,
                        qty: item.qty,
                        priceAmount: item.price.amount,
                        priceCurrency: item.price.currency,
                        sumAmount: item.qty * item.price.amount,
                        sumCurrency: item.price.currency
                    }))
                }
            },
            include: { items: true }
        });
        return this.mapInvoiceFromPrisma(invoice);
    }
    async cancelInvoice(id) {
        const invoice = await this.prisma.invoice.update({
            where: { id },
            data: { status: 'CANCELED' },
            include: { items: true }
        });
        return this.mapInvoiceFromPrisma(invoice);
    }
    async getPaymentById(id) {
        const payment = await this.prisma.payment.findUnique({
            where: { id }
        });
        if (!payment)
            return null;
        return this.mapPaymentFromPrisma(payment);
    }
    async recordPayment(input) {
        const { invoiceId, method, amount, provider, providerRef, receiptUrl } = input;
        // Get invoice to check status and total
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId }
        });
        if (!invoice) {
            throw new Error(`Invoice ${invoiceId} not found`);
        }
        if (invoice.status === 'CANCELED') {
            throw new Error('Cannot record payment for canceled invoice');
        }
        // Create payment
        const payment = await this.prisma.payment.create({
            data: {
                invoiceId,
                method,
                amountAmount: amount.amount,
                amountCurrency: amount.currency,
                status: 'SUCCEEDED',
                provider,
                providerRef,
                receiptUrl
            }
        });
        // Check if invoice should be marked as paid
        const totalPaid = await this.prisma.payment.aggregate({
            where: {
                invoiceId,
                status: 'SUCCEEDED'
            },
            _sum: { amountAmount: true }
        });
        const paidAmount = totalPaid._sum.amountAmount || 0;
        if (paidAmount >= invoice.totalAmount) {
            await this.prisma.invoice.update({
                where: { id: invoiceId },
                data: { status: 'PAID' }
            });
        }
        return this.mapPaymentFromPrisma(payment);
    }
    async generatePaymentLink(input) {
        const { invoiceId, provider, successUrl, cancelUrl } = input;
        // In a real implementation, this would integrate with payment providers
        // For now, return a mock payment link
        const url = `https://pay.${provider.toLowerCase()}.com/invoice/${invoiceId}?success=${encodeURIComponent(successUrl)}${cancelUrl ? `&cancel=${encodeURIComponent(cancelUrl)}` : ''}`;
        return {
            url,
            provider,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };
    }
    async issueRefund(input) {
        const { paymentId, amount, reason } = input;
        // Get original payment
        const originalPayment = await this.prisma.payment.findUnique({
            where: { id: paymentId }
        });
        if (!originalPayment) {
            throw new Error(`Payment ${paymentId} not found`);
        }
        if (originalPayment.status !== 'SUCCEEDED') {
            throw new Error('Can only refund succeeded payments');
        }
        // Create refund as a new payment with negative amount
        const refund = await this.prisma.payment.create({
            data: {
                invoiceId: originalPayment.invoiceId,
                method: originalPayment.method,
                amountAmount: -amount.amount, // Negative amount for refund
                amountCurrency: amount.currency,
                status: 'SUCCEEDED',
                provider: originalPayment.provider,
                providerRef: `refund_${originalPayment.providerRef}`,
                receiptUrl: undefined
            }
        });
        return this.mapPaymentFromPrisma(refund);
    }
    mapInvoiceFromPrisma(invoice) {
        return {
            id: invoice.id,
            orgId: invoice.orgId,
            orderId: invoice.orderId,
            items: invoice.items.map((item) => ({
                id: item.id,
                name: item.name,
                qty: item.qty,
                price: { amount: item.priceAmount, currency: item.priceCurrency },
                sum: { amount: item.sumAmount, currency: item.sumCurrency }
            })),
            total: { amount: invoice.totalAmount, currency: invoice.totalCurrency },
            status: invoice.status,
            issuedAt: invoice.issuedAt.toISOString(),
            dueAt: invoice.dueAt?.toISOString()
        };
    }
    mapPaymentFromPrisma(payment) {
        return {
            id: payment.id,
            invoiceId: payment.invoiceId,
            method: payment.method,
            amount: { amount: payment.amountAmount, currency: payment.amountCurrency },
            status: payment.status,
            createdAt: payment.createdAt.toISOString(),
            provider: payment.provider,
            providerRef: payment.providerRef,
            receiptUrl: payment.receiptUrl
        };
    }
}
