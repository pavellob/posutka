import type { Property, Unit, UUID, DateTime, CalendarDay } from './types.js';

export interface IDataLayerInventory {
  getPropertyById(id: UUID): Promise<Property | null>;
  getPropertiesByOrgId(orgId: UUID): Promise<Property[]>;
  createProperty(input: Pick<Property, 'orgId' | 'title' | 'address' | 'amenities' | 'externalSource' | 'externalId'>): Promise<Property>;
  updateProperty(input: any): Promise<Property>;

  getUnitById(id: UUID): Promise<Unit | null>;
  getUnitsByPropertyId(propertyId: UUID): Promise<Unit[]>;
  createUnit(input: Pick<Unit, 'propertyId' | 'name' | 'capacity' | 'beds' | 'bathrooms' | 'amenities' | 'images' | 'externalSource' | 'externalId'>): Promise<Unit>;
  updateUnit(id: UUID, input: Partial<Pick<Unit, 'name' | 'capacity' | 'beds' | 'bathrooms' | 'amenities' | 'grade' | 'cleaningDifficulty' | 'checkInInstructions'>>): Promise<Unit>;

  blockDates(unitId: UUID, from: DateTime, to: DateTime, note?: string): Promise<CalendarDay[]>;
  getCalendar(unitId: UUID, rangeStart: DateTime, rangeEnd: DateTime): Promise<CalendarDay[]>;
}
