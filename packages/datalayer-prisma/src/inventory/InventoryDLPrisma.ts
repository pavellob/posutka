// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';
import type {
  IDataLayerInventory,
  Property,
  Unit,
  CalendarDay,
} from '@repo/datalayer';

export class InventoryDLPrisma implements IDataLayerInventory {
  constructor(private readonly prisma: PrismaClient) {}

  async getPropertyById(id: string): Promise<Property | null> {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        org: true,
        units: true,
      }
    });
    
    if (!property) return null;
    
    return this.mapPropertyFromPrisma(property);
  }

  async getPropertiesByOrgId(orgId: string): Promise<Property[]> {
    console.log('🔍 InventoryDLPrisma.getPropertiesByOrgId called with orgId:', orgId);
    
    const properties = await this.prisma.property.findMany({
      where: { orgId },
      include: {
        org: true,
        units: true,
      }
    });
    
    console.log('📊 Found properties:', properties.length, properties);
    
    const mappedProperties = properties.map((p: any) => this.mapPropertyFromPrisma(p));
    console.log('🔄 Mapped properties:', mappedProperties);
    
    return mappedProperties;
  }

  async createProperty(input: Pick<Property, 'orgId' | 'title' | 'address' | 'amenities'>): Promise<Property> {
    const property = await this.prisma.property.create({
      data: {
        orgId: input.orgId,
        title: input.title,
        address: input.address,
        amenities: input.amenities,
      },
      include: {
        org: true,
        units: true,
      }
    });
    
    return this.mapPropertyFromPrisma(property);
  }

  async getUnitById(id: string): Promise<Unit | null> {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        property: true,
      }
    });
    
    if (!unit) return null;
    
    return this.mapUnitFromPrisma(unit);
  }

  async getUnitsByPropertyId(propertyId: string): Promise<Unit[]> {
    console.log('🔍 InventoryDLPrisma.getUnitsByPropertyId called with propertyId:', propertyId);
    
    const units = await this.prisma.unit.findMany({
      where: { propertyId },
      include: {
        property: true,
      }
    });
    
    console.log('📊 Found units:', units.length, units);
    
    const mappedUnits = units.map((u: any) => this.mapUnitFromPrisma(u));
    console.log('🔄 Mapped units:', mappedUnits);
    
    return mappedUnits;
  }

  async createUnit(input: Pick<Unit, 'propertyId' | 'name' | 'capacity' | 'beds' | 'bathrooms' | 'amenities'>): Promise<Unit> {
    const unit = await this.prisma.unit.create({
      data: {
        propertyId: input.propertyId,
        name: input.name,
        capacity: input.capacity,
        beds: input.beds,
        bathrooms: input.bathrooms,
        amenities: input.amenities,
      },
      include: {
        property: true,
      }
    });
    
    return this.mapUnitFromPrisma(unit);
  }

  async blockDates(unitId: string, from: string, to: string, note?: string): Promise<CalendarDay[]> {
    const block = await this.prisma.calendarBlock.create({
      data: {
        unitId,
        from: new Date(from),
        to: new Date(to),
        note,
      }
    });

    // Return calendar days for the blocked period
    const days: CalendarDay[] = [];
    const startDate = new Date(from);
    const endDate = new Date(to);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push({
        date: d.toISOString(),
        status: 'BLOCKED',
        bookingId: undefined,
        note: note || 'Blocked',
      });
    }
    
    return days;
  }

  async getCalendar(unitId: string, rangeStart: string, rangeEnd: string): Promise<CalendarDay[]> {
    // Get all bookings for this unit in the range
    const bookings = await this.prisma.booking.findMany({
      where: {
        unitId,
        checkIn: { lte: new Date(rangeEnd) },
        checkOut: { gte: new Date(rangeStart) },
      }
    });

    // Get all calendar blocks for this unit in the range
    const blocks = await this.prisma.calendarBlock.findMany({
      where: {
        unitId,
        from: { lte: new Date(rangeEnd) },
        to: { gte: new Date(rangeStart) },
      }
    });

    const days: CalendarDay[] = [];
    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString();
      
      // Check if there's a booking for this date
      const booking = bookings.find((b: any) => 
        new Date(b.checkIn) <= d && new Date(b.checkOut) > d
      );
      
      if (booking) {
        days.push({
          date: dateStr,
          status: 'BOOKED',
          bookingId: booking.id,
          note: undefined,
        });
        continue;
      }
      
      // Check if there's a block for this date
      const block = blocks.find((b: any) => 
        new Date(b.from) <= d && new Date(b.to) > d
      );
      
      if (block) {
        days.push({
          date: dateStr,
          status: 'BLOCKED',
          bookingId: undefined,
          note: block.note || undefined,
        });
        continue;
      }
      
      // Available
      days.push({
        date: dateStr,
        status: 'AVAILABLE',
        bookingId: undefined,
        note: undefined,
      });
    }
    
    return days;
  }

  private mapPropertyFromPrisma(property: any): Property {
    return {
      id: property.id,
      orgId: property.orgId,
      title: property.title,
      address: property.address,
      amenities: property.amenities,
      org: property.org,
      units: property.units,
    };
  }

  private mapUnitFromPrisma(unit: any): Unit {
    return {
      id: unit.id,
      propertyId: unit.propertyId,
      name: unit.name,
      capacity: unit.capacity,
      beds: unit.beds,
      bathrooms: unit.bathrooms,
      amenities: unit.amenities,
      property: unit.property,
    };
  }
}
