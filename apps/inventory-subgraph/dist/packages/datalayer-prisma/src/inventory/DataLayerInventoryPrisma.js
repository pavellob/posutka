export class DataLayerInventoryPrisma {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPropertyById(id) {
        const property = await this.prisma.property.findUnique({ where: { id } });
        return property;
    }
    async createProperty(input) {
        const property = await this.prisma.property.create({ data: input });
        return property;
    }
    async getUnitById(id) {
        const unit = await this.prisma.unit.findUnique({ where: { id } });
        return unit;
    }
    async createUnit(input) {
        const unit = await this.prisma.unit.create({ data: input });
        return unit;
    }
    async blockDates(unitId, from, to, note) {
        await this.prisma.calendarBlock.create({
            data: {
                unitId,
                from: new Date(from),
                to: new Date(to),
                note
            }
        });
        return this.getCalendar(unitId, from, to);
    }
    async getCalendar(unitId, rangeStart, rangeEnd) {
        // TODO: объединить блокировки с бронями (когда появится bookings DataLayer)
        const blocks = await this.prisma.calendarBlock.findMany({
            where: {
                unitId,
                from: { gte: new Date(rangeStart) },
                to: { lte: new Date(rangeEnd) }
            }
        });
        return blocks.map(b => ({
            date: b.from.toISOString(),
            status: 'BLOCKED',
            note: b.note || undefined
        }));
    }
}
