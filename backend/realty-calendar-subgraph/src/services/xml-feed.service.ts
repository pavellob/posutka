import { createGraphQLLogger } from '@repo/shared-logger';
import { InventoryGrpcClient } from '@repo/grpc-sdk';
import { RealtyFeed, RealtyOffer, FeedProcessResponse } from '../dto/xml-feed.dto.js';
import { XmlFeedMapper } from '../mappers/xml-feed.mapper.js';

const logger = createGraphQLLogger('xml-feed-service');

export class XmlFeedService {
  constructor(
    private readonly inventoryClient: InventoryGrpcClient
  ) {}

  async processFeed(feed: RealtyFeed, orgId: string): Promise<FeedProcessResponse> {
    const result: FeedProcessResponse = {
      ok: true,
      outcome: 'SUCCESS',
      processed: 0,
      created: 0,
      updated: 0,
      errors: [],
    };

    logger.info(`Processing feed with ${feed.offers.length} offers`, {
      agencyId: feed.agencyId,
      generationDate: feed.generationDate,
      orgId,
    });

    for (const offer of feed.offers) {
      try {
        const wasUpdated = await this.processOffer(offer, orgId);
        result.processed++;
        
        if (wasUpdated) {
          result.updated++;
        } else {
          result.created++;
        }
      } catch (error: any) {
        logger.error(`Failed to process offer ${offer.internalId}`, {
          error: error.message,
          offerId: offer.internalId,
        });
        
        result.errors.push({
          offerId: offer.internalId,
          error: error.message || 'Unknown error',
        });
      }
    }

    // Определяем outcome
    if (result.errors.length > 0 && result.errors.length < feed.offers.length) {
      result.outcome = 'PARTIAL';
    } else if (result.errors.length === feed.offers.length) {
      result.outcome = 'ERROR';
      result.ok = false;
    }

    logger.info('Feed processing completed', {
      processed: result.processed,
      created: result.created,
      updated: result.updated,
      errors: result.errors.length,
    });

    return result;
  }

  /**
   * Обрабатывает один offer
   * @returns true если объект был обновлен, false если создан
   */
  private async processOffer(offer: RealtyOffer, orgId: string): Promise<boolean> {
    const externalSource = 'REALTY_CALENDAR';
    const externalId = offer.internalId;

    // 1. Ищем существующую Property по external_ref
    let property = null;
    let propertyWasUpdated = false;
    
    try {
      const propertyResponse = await this.inventoryClient.getPropertyByExternalRef({
        externalSource,
        externalId,
      });
      
      if (propertyResponse.success && propertyResponse.property) {
        property = propertyResponse.property;
        logger.debug(`Found existing property for offer ${externalId}`, {
          propertyId: property.id,
        });
        propertyWasUpdated = true;
      }
    } catch (error: any) {
      logger.debug(`Property not found by external_ref, will create new`, {
        externalId,
        error: error.message,
      });
    }

    // 2. Если Property не найдена, создаем новую
    if (!property) {
      const propertyData = XmlFeedMapper.mapOfferToPropertyData(offer);
      
      const createResponse = await this.inventoryClient.createProperty({
        orgId,
        title: propertyData.title,
        address: propertyData.address,
        amenities: propertyData.amenities,
        externalSource,
        externalId,
        latitude: propertyData.latitude,
        longitude: propertyData.longitude,
      });

      if (!createResponse.success || !createResponse.property) {
        throw new Error(`Failed to create property: ${createResponse.message || 'Unknown error'}`);
      }

      property = createResponse.property;
      logger.info(`Created new property for offer ${externalId}`, {
        propertyId: property.id,
      });
    } else {
      // TODO: Здесь нужен метод updateProperty в gRPC
      // Пока пропускаем обновление
      logger.debug(`Property exists, skipping update (update not implemented in gRPC)`, {
        propertyId: property.id,
      });
    }

    // 3. Ищем существующую Unit по external_ref
    let unit = null;
    let unitWasUpdated = false;
    
    try {
      const unitResponse = await this.inventoryClient.getUnitByExternalRef({
        externalSource,
        externalId,
        propertyId: property.id,
      });
      
      if (unitResponse.success && unitResponse.unit) {
        unit = unitResponse.unit;
        logger.debug(`Found existing unit for offer ${externalId}`, {
          unitId: unit.id,
        });
        unitWasUpdated = true;
      }
    } catch (error: any) {
      logger.debug(`Unit not found by external_ref, will create new`, {
        externalId,
        error: error.message,
      });
    }

    // 4. Если Unit не найдена, создаем новую
    if (!unit) {
      const unitData = XmlFeedMapper.mapOfferToUnitData(offer);
      
      const createResponse = await this.inventoryClient.createUnit({
        propertyId: property.id,
        name: unitData.name,
        capacity: unitData.capacity,
        beds: unitData.beds,
        bathrooms: unitData.bathrooms,
        amenities: unitData.amenities,
        images: unitData.images || [],
        externalSource,
        externalId,
      });

      if (!createResponse.success || !createResponse.unit) {
        throw new Error(`Failed to create unit: ${createResponse.message || 'Unknown error'}`);
      }

      logger.info(`Created new unit for offer ${externalId}`, {
        unitId: createResponse.unit.id,
      });
    } else {
      // TODO: Здесь нужен метод updateUnit в gRPC
      logger.debug(`Unit exists, skipping update (update not implemented in gRPC)`, {
        unitId: unit.id,
      });
    }

    // Возвращаем true если хотя бы один объект был обновлен
    return propertyWasUpdated || unitWasUpdated;
  }
}

