import { PrismaClient } from '@prisma/client';
import type { IDataLayerInventory, Property, Unit, CalendarDay } from '@repo/datalayer';

export class DataLayerInventoryPrisma implements IDataLayerInventory {
  constructor(private readonly prisma: PrismaClient) {}

  async getPropertyById(id: string): Promise<Property | null> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    return property as Property | null;
  }

  async createProperty(input: Pick<Property, 'orgId' | 'title' | 'address' | 'amenities'>): Promise<Property> {
    const property = await this.prisma.property.create({ data: input });
    return property as Property;
  }

  async getUnitById(id: string): Promise<Unit | null> {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    return unit as Unit | null;
  }

  async createUnit(input: Pick<Unit, 'propertyId' | 'name' | 'capacity' | 'beds' | 'bathrooms' | 'amenities'>): Promise<Unit> {
    const unit = await this.prisma.unit.create({ data: input });
    return unit as Unit;
  }

  async blockDates(unitId: string, from: string, to: string, note?: string): Promise<CalendarDay[]> {
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

  async getCalendar(unitId: string, rangeStart: string, rangeEnd: string): Promise<CalendarDay[]> {
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
      status: 'BLOCKED' as const, 
      note: b.note || undefined 
    }));
  }
}
