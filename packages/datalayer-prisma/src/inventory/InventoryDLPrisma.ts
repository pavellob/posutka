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

  async createProperty(input: any): Promise<Property> {
    const property = await this.prisma.property.create({
      data: {
        orgId: input.orgId,
        title: input.title,
        address: input.address,
        amenities: input.amenities,
        // Яндекс.Недвижимость поля
        propertyType: input.propertyType,
        category: input.category,
        dealStatus: input.dealStatus,
        country: input.country,
        region: input.region,
        district: input.district,
        localityName: input.localityName,
        apartment: input.apartment,
        metroName: input.metroName,
        metroTimeOnFoot: input.metroTimeOnFoot,
        metroTimeOnTransport: input.metroTimeOnTransport,
        latitude: input.latitude,
        longitude: input.longitude,
        totalArea: input.totalArea,
        livingArea: input.livingArea,
        kitchenArea: input.kitchenArea,
        rooms: input.rooms,
        roomsOffered: input.roomsOffered,
        floor: input.floor,
        floorsTotal: input.floorsTotal,
        buildingType: input.buildingType,
        buildingYear: input.buildingYear,
        buildingSeries: input.buildingSeries,
        elevator: input.elevator,
        parking: input.parking,
        security: input.security,
        concierge: input.concierge,
        playground: input.playground,
        gym: input.gym,
        balcony: input.balcony,
        loggia: input.loggia,
        airConditioning: input.airConditioning,
        internet: input.internet,
        washingMachine: input.washingMachine,
        dishwasher: input.dishwasher,
        tv: input.tv,
        renovation: input.renovation,
        furniture: input.furniture,
        isElite: input.isElite,
        yandexBuildingId: input.yandexBuildingId,
        yandexHouseId: input.yandexHouseId,
      },
      include: {
        org: true,
        units: true,
      }
    });
    
    return this.mapPropertyFromPrisma(property);
  }

  async updateProperty(input: any): Promise<Property> {
    const { id, ...updateData } = input;
    
    console.log('🔄 InventoryDLPrisma.updateProperty called with:', { id, updateData });
    
    const property = await this.prisma.property.update({
      where: { id },
      data: {
        title: updateData.title,
        address: updateData.address,
        propertyType: updateData.propertyType,
        category: updateData.category,
        dealStatus: updateData.dealStatus,
        country: updateData.country,
        region: updateData.region,
        district: updateData.district,
        localityName: updateData.localityName,
        apartment: updateData.apartment,
        metroName: updateData.metroName,
        metroTimeOnFoot: updateData.metroTimeOnFoot,
        metroTimeOnTransport: updateData.metroTimeOnTransport,
        latitude: updateData.latitude,
        longitude: updateData.longitude,
        totalArea: updateData.totalArea,
        livingArea: updateData.livingArea,
        kitchenArea: updateData.kitchenArea,
        rooms: updateData.rooms,
        roomsOffered: updateData.roomsOffered,
        floor: updateData.floor,
        floorsTotal: updateData.floorsTotal,
        buildingType: updateData.buildingType,
        buildingYear: updateData.buildingYear,
        buildingSeries: updateData.buildingSeries,
        elevator: updateData.elevator,
        parking: updateData.parking,
        security: updateData.security,
        concierge: updateData.concierge,
        playground: updateData.playground,
        gym: updateData.gym,
        balcony: updateData.balcony,
        loggia: updateData.loggia,
        airConditioning: updateData.airConditioning,
        internet: updateData.internet,
        washingMachine: updateData.washingMachine,
        dishwasher: updateData.dishwasher,
        tv: updateData.tv,
        renovation: updateData.renovation,
        furniture: updateData.furniture,
        isElite: updateData.isElite,
        yandexBuildingId: updateData.yandexBuildingId,
        yandexHouseId: updateData.yandexHouseId,
      },
      include: {
        org: true,
        units: true,
      }
    });
    
    console.log('✅ InventoryDLPrisma.updateProperty completed:', property);
    
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

  async updateUnit(id: string, input: Partial<Pick<Unit, 'name' | 'capacity' | 'beds' | 'bathrooms' | 'amenities' | 'grade' | 'cleaningDifficulty'>>): Promise<Unit> {
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    if (input.beds !== undefined) updateData.beds = input.beds;
    if (input.bathrooms !== undefined) updateData.bathrooms = input.bathrooms;
    if (input.amenities !== undefined) updateData.amenities = input.amenities;
    if (input.grade !== undefined) updateData.grade = input.grade;
    if (input.cleaningDifficulty !== undefined) updateData.cleaningDifficulty = input.cleaningDifficulty;

    const unit = await this.prisma.unit.update({
      where: { id },
      data: updateData,
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
      // Яндекс.Недвижимость поля
      propertyType: property.propertyType,
      category: property.category,
      dealStatus: property.dealStatus,
      country: property.country,
      region: property.region,
      district: property.district,
      localityName: property.localityName,
      apartment: property.apartment,
      metroName: property.metroName,
      metroTimeOnFoot: property.metroTimeOnFoot,
      metroTimeOnTransport: property.metroTimeOnTransport,
      latitude: property.latitude,
      longitude: property.longitude,
      totalArea: property.totalArea,
      livingArea: property.livingArea,
      kitchenArea: property.kitchenArea,
      rooms: property.rooms,
      roomsOffered: property.roomsOffered,
      floor: property.floor,
      floorsTotal: property.floorsTotal,
      buildingType: property.buildingType,
      buildingYear: property.buildingYear,
      buildingSeries: property.buildingSeries,
      elevator: property.elevator,
      parking: property.parking,
      security: property.security,
      concierge: property.concierge,
      playground: property.playground,
      gym: property.gym,
      balcony: property.balcony,
      loggia: property.loggia,
      airConditioning: property.airConditioning,
      internet: property.internet,
      washingMachine: property.washingMachine,
      dishwasher: property.dishwasher,
      tv: property.tv,
      renovation: property.renovation,
      furniture: property.furniture,
      isElite: property.isElite,
      yandexBuildingId: property.yandexBuildingId,
      yandexHouseId: property.yandexHouseId,
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
      grade: unit.grade ?? 0,
      cleaningDifficulty: unit.cleaningDifficulty ?? 0,
      property: unit.property,
    };
  }
}
