import { createGraphQLLogger } from '@repo/shared-logger';
import type { IDataLayerInventory } from '@repo/datalayer';
import type {
  GetPropertyRequest,
  GetPropertyByExternalRefRequest,
  SearchPropertyByAddressRequest,
  CreatePropertyRequest,
  GetUnitRequest,
  GetUnitByExternalRefRequest,
  GetUnitsByPropertyRequest,
  CreateUnitRequest,
  PropertyResponse,
  UnitResponse,
  UnitsResponse,
  PropertiesResponse,
  Property,
  Unit
} from '@repo/grpc-sdk';
// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import type { PrismaClient } from '@prisma/client';

const logger = createGraphQLLogger('inventory-grpc-service');

export class InventoryGrpcService {
  constructor(
    private readonly dl: IDataLayerInventory,
    private readonly prisma: PrismaClient
  ) {}

  async GetProperty(request: GetPropertyRequest): Promise<PropertyResponse> {
    try {
      logger.info('GRPC GetProperty called', request);
      
      const property = await this.dl.getPropertyById(request.id);
      
      if (!property) {
        return {
          property: undefined as any,
          success: false,
          message: 'Property not found'
        };
      }

      const grpcProperty = this.mapPropertyToGrpc(property);
      
      return {
        property: grpcProperty,
        success: true,
        message: 'Property retrieved successfully'
      };
    } catch (error: any) {
      logger.error('GRPC GetProperty failed', { error: error.message });
      throw error;
    }
  }

  async GetPropertyByExternalRef(request: GetPropertyByExternalRefRequest): Promise<PropertyResponse> {
    try {
      logger.info('GRPC GetPropertyByExternalRef called', request);
      
      let property: any = null;
      
      // Если orgId указан - ищем в конкретной организации
      if (request.orgId) {
        const properties = await this.dl.getPropertiesByOrgId(request.orgId);
        property = properties.find(
          p => (p as any).externalSource === request.externalSource && 
               (p as any).externalId === request.externalId
        );
      } else {
        // Если orgId не указан - ищем по всем организациям
        // Получаем все properties через Prisma и фильтруем в памяти
        // (так как externalSource/externalId не в схеме Prisma)
        const allProperties = await this.prisma.property.findMany({
          include: {
            org: true,
            units: true,
          }
        });
        
        // Маппим и фильтруем в памяти
        const mappedProperties = allProperties.map(p => this.mapPropertyFromPrisma(p));
        property = mappedProperties.find(
          p => (p as any).externalSource === request.externalSource && 
               (p as any).externalId === request.externalId
        );
      }
      
      if (!property) {
        return {
          property: undefined as any,
          success: false,
          message: 'Property not found by external reference'
        };
      }

      const grpcProperty = this.mapPropertyToGrpc(property);
      
      return {
        property: grpcProperty,
        success: true,
        message: 'Property retrieved successfully'
      };
    } catch (error: any) {
      logger.error('GRPC GetPropertyByExternalRef failed', { error: error.message });
      throw error;
    }
  }

  async SearchPropertyByAddress(request: SearchPropertyByAddressRequest): Promise<PropertiesResponse> {
    try {
      logger.info('GRPC SearchPropertyByAddress called', request);
      
      let properties: any[] = [];
      
      // Если orgId указан - ищем в конкретной организации
      if (request.orgId) {
        const orgProperties = await this.dl.getPropertiesByOrgId(request.orgId);
        properties = orgProperties.filter(p => 
          p.address.toLowerCase().includes(request.address.toLowerCase())
        );
      } else {
        // Если orgId не указан - ищем по всем организациям
        const prismaProperties = await this.prisma.property.findMany({
          where: {
            address: {
              contains: request.address,
              mode: 'insensitive',
            }
          },
          include: {
            org: true,
            units: true,
          }
        });
        
        // Маппим из Prisma формата в наш формат
        properties = prismaProperties.map(p => this.mapPropertyFromPrisma(p));
      }
      
      const grpcProperties = properties.map(p => this.mapPropertyToGrpc(p));
      
      return {
        properties: grpcProperties,
        success: true,
        message: `Found ${grpcProperties.length} properties`
      };
    } catch (error: any) {
      logger.error('GRPC SearchPropertyByAddress failed', { error: error.message });
      throw error;
    }
  }

  async CreateProperty(request: CreatePropertyRequest): Promise<PropertyResponse> {
    try {
      logger.info('GRPC CreateProperty called', request);
      
      const property = await this.dl.createProperty({
        orgId: request.orgId,
        title: request.title,
        address: request.address,
        amenities: request.amenities || [],
        ...(request.externalSource && { externalSource: request.externalSource }),
        ...(request.externalId && { externalId: request.externalId }),
        ...(request.latitude && { latitude: request.latitude }),
        ...(request.longitude && { longitude: request.longitude }),
      } as any);
      
      const grpcProperty = this.mapPropertyToGrpc(property);
      
      return {
        property: grpcProperty,
        success: true,
        message: 'Property created successfully'
      };
    } catch (error: any) {
      logger.error('GRPC CreateProperty failed', { error: error.message });
      throw error;
    }
  }

  async GetUnit(request: GetUnitRequest): Promise<UnitResponse> {
    try {
      logger.info('GRPC GetUnit called', request);
      
      const unit = await this.dl.getUnitById(request.id);
      
      if (!unit) {
        return {
          unit: undefined as any,
          success: false,
          message: 'Unit not found'
        };
      }

      const grpcUnit = this.mapUnitToGrpc(unit);
      
      return {
        unit: grpcUnit,
        success: true,
        message: 'Unit retrieved successfully'
      };
    } catch (error: any) {
      logger.error('GRPC GetUnit failed', { error: error.message });
      throw error;
    }
  }

  async GetUnitByExternalRef(request: GetUnitByExternalRefRequest): Promise<UnitResponse> {
    try {
      logger.info('GRPC GetUnitByExternalRef called', request);
      
      // Получаем все units property и ищем по externalRef
      const units = await this.dl.getUnitsByPropertyId(request.propertyId);
      const unit = units.find(
        u => (u as any).externalSource === request.externalSource && 
             (u as any).externalId === request.externalId
      );
      
      if (!unit) {
        return {
          unit: undefined as any,
          success: false,
          message: 'Unit not found by external reference'
        };
      }

      const grpcUnit = this.mapUnitToGrpc(unit);
      
      return {
        unit: grpcUnit,
        success: true,
        message: 'Unit retrieved successfully'
      };
    } catch (error: any) {
      logger.error('GRPC GetUnitByExternalRef failed', { error: error.message });
      throw error;
    }
  }

  async GetUnitsByProperty(request: GetUnitsByPropertyRequest): Promise<UnitsResponse> {
    try {
      logger.info('GRPC GetUnitsByProperty called', request);
      
      const units = await this.dl.getUnitsByPropertyId(request.propertyId);
      const grpcUnits = units.map(u => this.mapUnitToGrpc(u));
      
      return {
        units: grpcUnits,
        success: true,
        message: `Found ${grpcUnits.length} units`
      };
    } catch (error: any) {
      logger.error('GRPC GetUnitsByProperty failed', { error: error.message });
      throw error;
    }
  }

  async CreateUnit(request: CreateUnitRequest): Promise<UnitResponse> {
    try {
      logger.info('GRPC CreateUnit called', request);
      
      const unit = await this.dl.createUnit({
        propertyId: request.propertyId,
        name: request.name,
        capacity: request.capacity,
        beds: request.beds,
        bathrooms: request.bathrooms,
        amenities: request.amenities || [],
        ...(request.externalSource && { externalSource: request.externalSource }),
        ...(request.externalId && { externalId: request.externalId }),
        ...(request.grade !== undefined && { grade: request.grade }),
        ...(request.cleaningDifficulty !== undefined && { cleaningDifficulty: request.cleaningDifficulty }),
      } as any);
      
      const grpcUnit = this.mapUnitToGrpc(unit);
      
      return {
        unit: grpcUnit,
        success: true,
        message: 'Unit created successfully'
      };
    } catch (error: any) {
      logger.error('GRPC CreateUnit failed', { error: error.message });
      throw error;
    }
  }

  private mapPropertyFromPrisma(property: any): any {
    return {
      id: property.id,
      orgId: property.orgId,
      title: property.title,
      address: property.address,
      amenities: property.amenities || [],
      // externalSource и externalId пока не в Prisma схеме, поэтому undefined
      // TODO: добавить эти поля в Prisma схему для поддержки поиска по externalRef
      externalSource: property.externalSource || undefined,
      externalId: property.externalId || undefined,
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
      org: property.org,
      units: property.units || [],
    };
  }

  private mapPropertyToGrpc(property: any): Property {
    return {
      id: property.id,
      orgId: property.orgId,
      title: property.title,
      address: property.address,
      amenities: property.amenities || [],
      externalSource: (property as any).externalSource,
      externalId: (property as any).externalId,
      propertyType: property.propertyType,
      latitude: property.latitude,
      longitude: property.longitude,
    };
  }

  private mapUnitToGrpc(unit: any): Unit {
    return {
      id: unit.id,
      propertyId: unit.propertyId,
      name: unit.name,
      capacity: unit.capacity,
      beds: unit.beds,
      bathrooms: unit.bathrooms,
      amenities: unit.amenities || [],
      externalSource: (unit as any).externalSource,
      externalId: (unit as any).externalId,
      grade: unit.grade,
      cleaningDifficulty: unit.cleaningDifficulty,
    };
  }
}

