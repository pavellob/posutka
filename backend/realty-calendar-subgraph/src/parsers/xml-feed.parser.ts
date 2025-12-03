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
    textNodeName: '#text',
    isArray: (name: string, jPath: string, isLeafNode: boolean, isAttribute: boolean) => {
      // Массивы для тегов, которые могут повторяться
      return ['offer', 'image', 'metro'].includes(name);
    },
  } as any);

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
        agencyId: String(feed['agency-id'] || ''),
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
    const internalIdRaw = offerXml['@_internal-id'];
    if (!internalIdRaw) {
      throw new Error('Offer missing internal-id');
    }
    const internalId = String(internalIdRaw);

    // Парсим images
    const images: string[] = [];
    if (offerXml.image) {
      const imageArray = Array.isArray(offerXml.image) 
        ? offerXml.image 
        : [offerXml.image];
      
      logger.debug(`Parsing ${imageArray.length} images for offer ${internalId}`);
      
      for (const img of imageArray) {
        if (!img) continue;
        
        // Извлекаем URL изображения
        let imageUrl: string | undefined;
        
        if (typeof img === 'string') {
          // Просто строка (текстовое содержимое тега)
          imageUrl = img;
        } else if (img && typeof img === 'object') {
          // Может быть объект с текстом в #text или просто значение
          imageUrl = img['#text'] || img.value || img.url || img.href;
          
          // Если это объект, но не нашли текст, попробуем найти строковое значение
          if (!imageUrl) {
            const values = Object.values(img).filter(v => typeof v === 'string' && v.trim().startsWith('http'));
            if (values.length > 0) {
              imageUrl = values[0] as string;
            } else {
              // Последняя попытка - проверим все строковые значения
              const allStringValues = Object.values(img).filter(v => typeof v === 'string' && v.trim().length > 0);
              if (allStringValues.length > 0) {
                imageUrl = allStringValues[0] as string;
              }
            }
          }
        }
        
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
          const trimmedUrl = imageUrl.trim();
          // Проверяем, что это валидный URL
          if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
            images.push(trimmedUrl);
          } else {
            logger.debug(`Skipping invalid image URL: ${trimmedUrl}`);
          }
        } else {
          logger.debug(`Could not extract image URL from:`, img);
        }
      }
      
      logger.debug(`Extracted ${images.length} valid images for offer ${internalId}`);
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
      value: typeof areaXml.value === 'number' ? areaXml.value : (parseFloat(String(areaXml.value)) || 0),
      unit: String(areaXml.unit || 'кв.м'),
    } : undefined;

    // Парсим price
    const priceXml = offerXml.price;
    const price = priceXml ? {
      value: typeof priceXml.value === 'number' ? priceXml.value : (parseFloat(String(priceXml.value)) || 0),
      currency: String(priceXml.currency || 'RUB'),
      period: String(priceXml.period || 'день'),
    } : undefined;

    // Парсим deposit
    const depositXml = offerXml.deposit;
    const deposit = depositXml ? {
      value: typeof depositXml.value === 'number' ? depositXml.value : (parseFloat(String(depositXml.value)) || 0),
      currency: String(depositXml.currency || 'RUB'),
    } : undefined;

    // Парсим check-in/check-out time
    const checkInTimeXml = offerXml['check-in-time'];
    const checkInTime = checkInTimeXml ? {
      startTime: String(checkInTimeXml['start-time'] || ''),
      endTime: String(checkInTimeXml['end-time'] || ''),
    } : undefined;

    const checkOutTimeXml = offerXml['check-out-time'];
    const checkOutTime = checkOutTimeXml ? {
      startTime: String(checkOutTimeXml['start-time'] || ''),
      endTime: String(checkOutTimeXml['end-time'] || ''),
    } : undefined;

    // Парсим sales-agent
    const salesAgentXml = offerXml['sales-agent'];
    const salesAgent = salesAgentXml ? {
      name: salesAgentXml.name && salesAgentXml.name.trim() ? salesAgentXml.name.trim() : undefined,
      phone: salesAgentXml.phone && salesAgentXml.phone.trim() ? salesAgentXml.phone.trim() : undefined,
      email: salesAgentXml.email && salesAgentXml.email.trim() ? salesAgentXml.email.trim() : undefined,
      inn: salesAgentXml.inn && salesAgentXml.inn.trim() ? salesAgentXml.inn.trim() : undefined,
      kpp: salesAgentXml.kpp && salesAgentXml.kpp.trim() ? salesAgentXml.kpp.trim() : undefined,
      organization: salesAgentXml.organization && salesAgentXml.organization.trim() ? salesAgentXml.organization.trim() : undefined,
      currency: salesAgentXml.currency && salesAgentXml.currency.trim() ? salesAgentXml.currency.trim() : undefined,
    } : undefined;

    return {
      internalId,
      type: String(offerXml.type || 'аренда'),
      propertyType: String(offerXml['property-type'] || 'жилая'),
      title: String(offerXml.title || ''),
      category: String(offerXml.category || 'квартира'),
      creationDate: offerXml['creation-date'] ? String(offerXml['creation-date']) : undefined,
      lastUpdateDate: offerXml['last-update-date'] ? String(offerXml['last-update-date']) : undefined,
      salesAgent,
      price,
      description: String(offerXml.description || ''),
      minStay: offerXml['min-stay'] ? parseInt(String(offerXml['min-stay']), 10) : undefined,
      images: images.filter(img => img && img.length > 0),
      location: {
        country: locationXml.country ? String(locationXml.country) : undefined,
        region: locationXml.region ? String(locationXml.region) : undefined,
        localityName: locationXml['locality-name'] ? String(locationXml['locality-name']) : undefined,
        address: String(locationXml.address || ''),
        latitude: locationXml.latitude ? (typeof locationXml.latitude === 'number' ? locationXml.latitude : parseFloat(String(locationXml.latitude))) : undefined,
        longitude: locationXml.longitude ? (typeof locationXml.longitude === 'number' ? locationXml.longitude : parseFloat(String(locationXml.longitude))) : undefined,
        timezone: locationXml.timezone ? String(locationXml.timezone) : undefined,
        metro: metroArray.length > 0 
          ? metroArray.map((m: any) => ({
              name: typeof m === 'string' ? m : String(m.name || ''),
            })).filter((m: { name: string }) => m.name.length > 0)
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
      sleeps: String(offerXml.sleeps || '2'),
      rooms: offerXml.rooms ? parseInt(String(offerXml.rooms), 10) : 1,
      area,
      checkInTime,
      checkOutTime,
      deposit,
    };
  }
}

