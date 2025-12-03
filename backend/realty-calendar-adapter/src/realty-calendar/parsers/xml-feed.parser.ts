import { XMLParser } from 'fast-xml-parser';
import { RealtyFeedSchema, RealtyOfferSchema, type RealtyFeed, type RealtyOffer } from '../schemas/xml-feed.schema.js';
import { createGraphQLLogger } from '@repo/shared-logger';
import { ZodError } from 'zod';

const logger = createGraphQLLogger('xml-feed-parser');

export class XmlFeedParser {
  private static parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    trimValues: true,
  });

  /**
   * Парсит XML строку и валидирует через Zod
   */
  static parse(xmlString: string): RealtyFeed {
    try {
      const result = this.parser.parse(xmlString);
      
      if (!result['realty-feed']) {
        throw new Error('Invalid XML feed: missing realty-feed element');
      }

      const feed = result['realty-feed'];
      const offers: RealtyOffer[] = [];

      // Парсим offers
      const offersArray = Array.isArray(feed.offer) ? feed.offer : (feed.offer ? [feed.offer] : []);
      
      for (const offerXml of offersArray) {
        if (!offerXml) continue;
        
        try {
          const parsedOffer = this.parseOffer(offerXml);
          
          // Валидируем через Zod
          const validatedOffer = RealtyOfferSchema.parse(parsedOffer);
          offers.push(validatedOffer);
        } catch (error: any) {
          if (error instanceof ZodError) {
            logger.error('Offer validation failed', {
              offerId: offerXml['@_internal-id'],
              errors: error.errors,
            });
          } else {
            logger.error('Failed to parse offer', {
              error: error.message,
              offerXml,
            });
          }
          // Пропускаем некорректные offers, но продолжаем обработку остальных
        }
      }

      // Валидируем весь feed
      const feedData = {
        generationDate: feed['generation-date'] || new Date().toISOString(),
        agencyId: feed['agency-id'] || '',
        offers,
      };

      const validatedFeed = RealtyFeedSchema.parse(feedData);
      
      logger.info('XML feed parsed and validated successfully', {
        agencyId: validatedFeed.agencyId,
        offersCount: validatedFeed.offers.length,
      });

      return validatedFeed;
    } catch (error: any) {
      if (error instanceof ZodError) {
        logger.error('Feed validation failed', {
          errors: error.errors,
        });
        throw new Error(`Feed validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
      
      logger.error('Failed to parse XML feed', { error: error.message });
      throw new Error(`XML parsing failed: ${error.message}`);
    }
  }

  /**
   * Парсит один offer из XML в объект для валидации
   */
  private static parseOffer(offerXml: any): Partial<RealtyOffer> {
    const internalId = offerXml['@_internal-id'];
    if (!internalId) {
      throw new Error('Offer missing internal-id');
    }

    // Парсим images
    const images: string[] = [];
    if (offerXml.image) {
      const imageArray = Array.isArray(offerXml.image) 
        ? offerXml.image 
        : [offerXml.image];
      
      for (const img of imageArray) {
        if (!img) continue;
        const imageUrl = typeof img === 'string' 
          ? img 
          : (img['#text'] || img['@_'] || img);
        
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
          images.push(imageUrl.trim());
        }
      }
    }

    // Парсим amenities (все флаги 0/1)
    const parseBoolean = (value: any): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === '1' || normalized === 'true' || normalized === 'yes';
      }
      if (typeof value === 'number') return value === 1;
      return false;
    };

    // Парсим location
    const locationXml = offerXml.location || {};
    const metroArray = locationXml.metro 
      ? (Array.isArray(locationXml.metro) ? locationXml.metro : [locationXml.metro])
      : [];

    // Парсим area
    const areaXml = offerXml.area;
    const area = areaXml ? {
      value: parseFloat(areaXml.value) || 0,
      unit: areaXml.unit || 'кв.м',
    } : undefined;

    // Парсим price
    const priceXml = offerXml.price;
    const price = priceXml ? {
      value: parseFloat(priceXml.value) || 0,
      currency: priceXml.currency || 'RUB',
      period: priceXml.period || 'день',
    } : undefined;

    // Парсим deposit
    const depositXml = offerXml.deposit;
    const deposit = depositXml ? {
      value: parseFloat(depositXml.value) || 0,
      currency: depositXml.currency || 'RUB',
    } : undefined;

    // Парсим check-in/check-out time
    const checkInTimeXml = offerXml['check-in-time'];
    const checkInTime = checkInTimeXml ? {
      startTime: checkInTimeXml['start-time'] || '',
      endTime: checkInTimeXml['end-time'] || '',
    } : undefined;

    const checkOutTimeXml = offerXml['check-out-time'];
    const checkOutTime = checkOutTimeXml ? {
      startTime: checkOutTimeXml['start-time'] || '',
      endTime: checkOutTimeXml['end-time'] || '',
    } : undefined;

    // Парсим sales-agent
    const salesAgentXml = offerXml['sales-agent'];
    const salesAgent = salesAgentXml ? {
      name: salesAgentXml.name || undefined,
      phone: salesAgentXml.phone || undefined,
      email: salesAgentXml.email || undefined,
      inn: salesAgentXml.inn || undefined,
      kpp: salesAgentXml.kpp || undefined,
      organization: salesAgentXml.organization || undefined,
      currency: salesAgentXml.currency || undefined,
    } : undefined;

    return {
      internalId,
      type: offerXml.type || 'аренда',
      propertyType: offerXml['property-type'] || 'жилая',
      title: offerXml.title || '',
      category: offerXml.category || 'квартира',
      creationDate: offerXml['creation-date'] || undefined,
      lastUpdateDate: offerXml['last-update-date'] || undefined,
      salesAgent,
      price,
      description: offerXml.description || '',
      minStay: offerXml['min-stay'] ? parseInt(offerXml['min-stay'], 10) : undefined,
      images: images.filter(img => img && img.length > 0),
      location: {
        country: locationXml.country || undefined,
        region: locationXml.region || undefined,
        localityName: locationXml['locality-name'] || undefined,
        address: locationXml.address || '',
        latitude: locationXml.latitude ? parseFloat(locationXml.latitude) : undefined,
        longitude: locationXml.longitude ? parseFloat(locationXml.longitude) : undefined,
        timezone: locationXml.timezone || undefined,
        metro: metroArray.length > 0 
          ? metroArray.map((m: any) => ({
              name: typeof m === 'string' ? m : (m.name || ''),
            }))
          : undefined,
      },
      amenities: {
        washingMachine: parseBoolean(offerXml['washing-machine']),
        wiFi: parseBoolean(offerXml['wi-fi']),
        tv: parseBoolean(offerXml.tv),
        airConditioner: parseBoolean(offerXml['air-conditioner']),
        kidsFriendly: parseBoolean(offerXml['kids-friendly']),
        party: parseBoolean(offerXml.party),
        refrigerator: parseBoolean(offerXml.refrigerator),
        phone: parseBoolean(offerXml.phone),
        stove: parseBoolean(offerXml.stove),
        dishwasher: parseBoolean(offerXml.dishwasher),
        musicCenter: parseBoolean(offerXml['music-center']),
        microwave: parseBoolean(offerXml.microwave),
        iron: parseBoolean(offerXml.iron),
        concierge: parseBoolean(offerXml.concierge),
        parking: parseBoolean(offerXml.parking),
        safe: parseBoolean(offerXml.safe),
        waterHeater: parseBoolean(offerXml['water-heater']),
        television: parseBoolean(offerXml.television),
        bathroom: parseBoolean(offerXml.bathroom),
        petFriendly: parseBoolean(offerXml['pet-friendly']),
        smoke: parseBoolean(offerXml.smoke),
        romantic: parseBoolean(offerXml.romantic),
        jacuzzi: parseBoolean(offerXml.jacuzzi),
        balcony: parseBoolean(offerXml.balcony),
        elevator: parseBoolean(offerXml.elevator),
        seaview: parseBoolean(offerXml.seaview),
        mountainview: parseBoolean(offerXml.mountainview),
        seafront: parseBoolean(offerXml.seafront),
        pool: parseBoolean(offerXml.pool),
        playground: parseBoolean(offerXml.playground),
        transfer: parseBoolean(offerXml.transfer),
        crib: parseBoolean(offerXml.crib),
        sauna: parseBoolean(offerXml.sauna),
      },
      sleeps: offerXml.sleeps || '2',
      rooms: offerXml.rooms ? parseInt(offerXml.rooms, 10) : 1,
      area,
      checkInTime,
      checkOutTime,
      deposit,
    };
  }
}

