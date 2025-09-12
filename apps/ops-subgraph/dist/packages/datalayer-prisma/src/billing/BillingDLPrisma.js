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
        const where = { orgId: params.orgId };
        if (params.status)
            where.status = params.status;
        const first = params.first || 10;
        const skip = params.after ? 1 : 0;
        const cursor = params.after ? { id: params.after } : undefined;
        const invoices = await this.prisma.invoice.findMany({
            where,
            include: { items: true },
            take: first + 1,
            skip,
            cursor,
            orderBy: { issuedAt: 'desc' }
        });
        const hasNextPage = invoices.length > first;
        const edges = hasNextPage ? invoices.slice(0, -1) : invoices;
        const endCursor = edges.length > 0 ? edges[edges.length - 1].id : undefined;
        return {
            edges: edges.map(invoice => this.mapInvoiceFromPrisma(invoice)),
            endCursor,
            hasNextPage
        };
    }
    async createInvoice(input) {
        const items = input.items.map(item => ({
            name: item.name,
            qty: item.qty,
            priceAmount: item.price.amount,
            priceCurrency: item.price.currency,
            sumAmount: item.qty * item.price.amount,
            sumCurrency: item.price.currency,
        }));
        const totalAmount = items.reduce((sum, item) => sum + item.sumAmount, 0);
        const totalCurrency = items[0]?.priceCurrency || 'RUB';
        const invoice = await this.prisma.invoice.create({
            data: {
                id: crypto.randomUUID(),
                orgId: input.orgId,
                orderId: input.orderId,
                totalAmount,
                totalCurrency,
                status: 'OPEN',
                issuedAt: new Date().toISOString(),
                dueAt: input.dueAt,
                items: {
                    create: items
                }
            },
            include: { items: true }
        });
        return this.mapInvoiceFromPrisma(invoice);
    }
    async addInvoiceItems(input) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: input.invoiceId },
            include: { items: true }
        });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        if (invoice.status !== 'OPEN') {
            throw new Error('Cannot add items to non-open invoice');
        }
        const newItems = input.items.map(item => ({
            name: item.name,
            qty: item.qty,
            priceAmount: item.price.amount,
            priceCurrency: item.price.currency,
            sumAmount: item.qty * item.price.amount,
            sumCurrency: item.price.currency,
        }));
        const newTotalAmount = invoice.totalAmount + newItems.reduce((sum, item) => sum + item.sumAmount, 0);
        const updatedInvoice = await this.prisma.invoice.update({
            where: { id: input.invoiceId },
            data: {
                totalAmount: newTotalAmount,
                items: {
                    create: newItems
                }
            },
            include: { items: true }
        });
        return this.mapInvoiceFromPrisma(updatedInvoice);
    }
    async cancelInvoice(id) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        if (invoice.status !== 'OPEN') {
            throw new Error('Cannot cancel non-open invoice');
        }
        const updatedInvoice = await this.prisma.invoice.update({
            where: { id },
            data: { status: 'CANCELED' },
            include: { items: true }
        });
        return this.mapInvoiceFromPrisma(updatedInvoice);
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
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: input.invoiceId }
        });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        if (invoice.status !== 'OPEN') {
            throw new Error('Cannot record payment for non-open invoice');
        }
        const payment = await this.prisma.payment.create({
            data: {
                id: crypto.randomUUID(),
                invoiceId: input.invoiceId,
                method: input.method,
                amountAmount: input.amount.amount,
                amountCurrency: input.amount.currency,
                status: 'SUCCEEDED',
                createdAt: new Date().toISOString(),
                provider: input.provider,
                providerRef: input.providerRef,
                receiptUrl: input.receiptUrl,
            }
        });
        // Check if payment covers the full invoice amount
        const totalPaid = await this.prisma.payment.aggregate({
            where: {
                invoiceId: input.invoiceId,
                status: 'SUCCEEDED'
            },
            _sum: { amountAmount: true }
        });
        const totalPaidAmount = totalPaid._sum.amountAmount || 0;
        if (totalPaidAmount >= invoice.totalAmount) {
            await this.prisma.invoice.update({
                where: { id: input.invoiceId },
                data: { status: 'PAID' }
            });
        }
        return this.mapPaymentFromPrisma(payment);
    }
    async generatePaymentLink(input) {
        // В MVP возвращаем тестовую ссылку
        // В реальной реализации здесь будет интеграция с провайдерами
        const url = `https://pay.example.com/invoice/${input.invoiceId}?provider=${input.provider}`;
        return {
            url,
            provider: input.provider,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 часа
        };
    }
    async issueRefund(input) {
        const originalPayment = await this.prisma.payment.findUnique({
            where: { id: input.paymentId }
        });
        if (!originalPayment) {
            throw new Error('Payment not found');
        }
        if (originalPayment.status !== 'SUCCEEDED') {
            throw new Error('Cannot refund non-succeeded payment');
        }
        // Создаём новый payment с отрицательной суммой как refund
        const refund = await this.prisma.payment.create({
            data: {
                id: crypto.randomUUID(),
                invoiceId: originalPayment.invoiceId,
                method: originalPayment.method,
                amountAmount: -input.amount.amount, // отрицательная сумма
                amountCurrency: input.amount.currency,
                status: 'SUCCEEDED',
                createdAt: new Date().toISOString(),
                provider: originalPayment.provider,
                providerRef: `refund_${originalPayment.providerRef}`,
                receiptUrl: input.reason ? `Refund reason: ${input.reason}` : undefined,
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
                name: item.name,
                qty: item.qty,
                price: { amount: item.priceAmount, currency: item.priceCurrency },
                sum: { amount: item.sumAmount, currency: item.sumCurrency }
            })),
            total: { amount: invoice.totalAmount, currency: invoice.totalCurrency },
            status: invoice.status,
            issuedAt: invoice.issuedAt,
            dueAt: invoice.dueAt
        };
    }
    mapPaymentFromPrisma(payment) {
        return {
            id: payment.id,
            invoiceId: payment.invoiceId,
            method: payment.method,
            amount: { amount: payment.amountAmount, currency: payment.amountCurrency },
            status: payment.status,
            createdAt: payment.createdAt,
            provider: payment.provider,
            providerRef: payment.providerRef,
            receiptUrl: payment.receiptUrl
        };
    }
}
