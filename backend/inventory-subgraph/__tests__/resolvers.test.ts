import { describe, it, expect, beforeEach } from 'vitest';
import type { IDataLayerInventory, Property, Unit } from '@repo/datalayer';
import { resolvers } from '../src/resolvers/index.js';

// Mock DataLayer implementation
class MockDataLayer implements IDataLayerInventory {
  private properties: Map<string, Property> = new Map();
  private units: Map<string, Unit> = new Map();

  async getPropertyById(id: string): Promise<Property | null> {
    return this.properties.get(id) || null;
  }

  async createProperty(input: Pick<Property, 'orgId' | 'title' | 'address' | 'amenities'>): Promise<Property> {
    const property: Property = {
      id: `prop_${Date.now()}`,
      ...input,
    };
    this.properties.set(property.id, property);
    return property;
  }

  async getUnitById(id: string): Promise<Unit | null> {
    return this.units.get(id) || null;
  }

  async createUnit(input: Pick<Unit, 'propertyId' | 'name' | 'capacity' | 'beds' | 'bathrooms' | 'amenities'>): Promise<Unit> {
    const unit: Unit = {
      id: `unit_${Date.now()}`,
      ...input,
    };
    this.units.set(unit.id, unit);
    return unit;
  }

  async blockDates(unitId: string, from: string, to: string, note?: string): Promise<any[]> {
    return [{ date: from, status: 'BLOCKED', note }];
  }

  async getCalendar(unitId: string, rangeStart: string, rangeEnd: string): Promise<any[]> {
    return [{ date: rangeStart, status: 'AVAILABLE' }];
  }
}

describe('Inventory Resolvers', () => {
  let mockDataLayer: MockDataLayer;
  let context: { dl: IDataLayerInventory };

  beforeEach(() => {
    mockDataLayer = new MockDataLayer();
    context = { dl: mockDataLayer };
  });

  describe('Query', () => {
    it('should get property by id', async () => {
      const property = await mockDataLayer.createProperty({
        orgId: 'org1',
        title: 'Test Property',
        address: 'Test Address',
        amenities: ['wifi', 'parking'],
      });

      const result = await resolvers.Query.property(null, { id: property.id }, context);
      expect(result).toEqual(property);
    });

    it('should return null for non-existent property', async () => {
      const result = await resolvers.Query.property(null, { id: 'non-existent' }, context);
      expect(result).toBeNull();
    });

    it('should get unit by id', async () => {
      const unit = await mockDataLayer.createUnit({
        propertyId: 'prop1',
        name: 'Test Unit',
        capacity: 4,
        beds: 2,
        bathrooms: 1,
        amenities: ['wifi'],
      });

      const result = await resolvers.Query.unit(null, { id: unit.id }, context);
      expect(result).toEqual(unit);
    });
  });

  describe('Mutation', () => {
    it('should create property', async () => {
      const input = {
        orgId: 'org1',
        title: 'New Property',
        address: 'New Address',
        amenities: ['wifi'],
      };

      const result = await resolvers.Mutation.createProperty(null, input, context);
      expect(result).toMatchObject(input);
      expect(result.id).toBeDefined();
    });

    it('should create unit', async () => {
      const input = {
        propertyId: 'prop1',
        name: 'New Unit',
        capacity: 2,
        beds: 1,
        bathrooms: 1,
        amenities: ['wifi'],
      };

      const result = await resolvers.Mutation.createUnit(null, input, context);
      expect(result).toMatchObject(input);
      expect(result.id).toBeDefined();
    });
  });

  describe('Entity Resolvers', () => {
    it('should resolve Property reference', async () => {
      const property = await mockDataLayer.createProperty({
        orgId: 'org1',
        title: 'Test Property',
        address: 'Test Address',
        amenities: ['wifi'],
      });

      const result = await resolvers.Property__resolveReference({ id: property.id }, context);
      expect(result).toEqual(property);
    });

    it('should resolve Unit reference', async () => {
      const unit = await mockDataLayer.createUnit({
        propertyId: 'prop1',
        name: 'Test Unit',
        capacity: 2,
        beds: 1,
        bathrooms: 1,
        amenities: ['wifi'],
      });

      const result = await resolvers.Unit__resolveReference({ id: unit.id }, context);
      expect(result).toEqual(unit);
    });
  });
});
