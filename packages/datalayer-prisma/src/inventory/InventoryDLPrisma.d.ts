import { PrismaClient } from '@prisma/client';
import type { IDataLayerInventory, Property, Unit, CalendarDay } from '@repo/datalayer';
export declare class InventoryDLPrisma implements IDataLayerInventory {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    getPropertyById(id: string): Promise<Property | null>;
    getPropertiesByOrgId(orgId: string): Promise<Property[]>;
    createProperty(input: any): Promise<Property>;
    updateProperty(input: any): Promise<Property>;
    getUnitById(id: string): Promise<Unit | null>;
    getUnitsByPropertyId(propertyId: string): Promise<Unit[]>;
    createUnit(input: Pick<Unit, 'propertyId' | 'name' | 'capacity' | 'beds' | 'bathrooms' | 'amenities'>): Promise<Unit>;
    blockDates(unitId: string, from: string, to: string, note?: string): Promise<CalendarDay[]>;
    getCalendar(unitId: string, rangeStart: string, rangeEnd: string): Promise<CalendarDay[]>;
    private mapPropertyFromPrisma;
    private mapUnitFromPrisma;
}
