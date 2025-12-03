import { RealtyOffer } from '../schemas/xml-feed.schema.js';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('xml-feed-mapper');

export class XmlFeedMapper {
  /**
   * Маппит XML offer в данные для создания/обновления Property
   */
  static mapOfferToPropertyData(offer: RealtyOffer): {
    title: string;
    address: string;
    amenities: string[];
    propertyType?: string;
    category?: string;
    dealStatus?: string;
    country?: string;
    region?: string;
    localityName?: string;
    latitude?: number;
    longitude?: number;
    totalArea?: number;
    rooms?: number;
    // Яндекс.Недвижимость поля
    elevator?: boolean;
    parking?: boolean;
    concierge?: boolean;
    playground?: boolean;
    balcony?: boolean;
    airConditioning?: boolean;
    internet?: boolean;
    washingMachine?: boolean;
    dishwasher?: boolean;
    tv?: boolean;
    metroName?: string;
  } {
    const amenities: string[] = [];
    
    // Маппим удобства в список строк
    if (offer.amenities.washingMachine) amenities.push('washing-machine');
    if (offer.amenities.wiFi) amenities.push('wi-fi');
    if (offer.amenities.tv || offer.amenities.television) amenities.push('tv');
    if (offer.amenities.airConditioner) amenities.push('air-conditioner');
    if (offer.amenities.refrigerator) amenities.push('refrigerator');
    if (offer.amenities.stove) amenities.push('stove');
    if (offer.amenities.dishwasher) amenities.push('dishwasher');
    if (offer.amenities.microwave) amenities.push('microwave');
    if (offer.amenities.iron) amenities.push('iron');
    if (offer.amenities.parking) amenities.push('parking');
    if (offer.amenities.elevator) amenities.push('elevator');
    if (offer.amenities.balcony) amenities.push('balcony');
    if (offer.amenities.kidsFriendly) amenities.push('kids-friendly');
    if (offer.amenities.petFriendly) amenities.push('pet-friendly');

    // Определяем тип сделки
    const dealStatus = offer.type === 'аренда' ? 'аренда' : undefined;

    // Получаем первое метро если есть
    const metroName = offer.location.metro?.[0]?.name;

    // Формируем полный адрес
    const addressParts = [
      offer.location.address,
      offer.location.localityName,
      offer.location.region,
    ].filter(Boolean);
    
    const fullAddress = addressParts.length > 0 
      ? addressParts.join(', ')
      : offer.title;

    return {
      title: offer.title,
      address: fullAddress,
      amenities,
      propertyType: offer.propertyType,
      category: offer.category,
      dealStatus,
      country: offer.location.country,
      region: offer.location.region,
      localityName: offer.location.localityName,
      latitude: offer.location.latitude ?? undefined,
      longitude: offer.location.longitude ?? undefined,
      totalArea: offer.area?.value,
      rooms: offer.rooms,
      elevator: offer.amenities.elevator,
      parking: offer.amenities.parking,
      concierge: offer.amenities.concierge,
      playground: offer.amenities.playground,
      balcony: offer.amenities.balcony,
      airConditioning: offer.amenities.airConditioner,
      internet: offer.amenities.wiFi,
      washingMachine: offer.amenities.washingMachine,
      dishwasher: offer.amenities.dishwasher,
      tv: offer.amenities.tv || offer.amenities.television,
      metroName,
    };
  }

  /**
   * Маппит XML offer в данные для создания/обновления Unit
   */
  static mapOfferToUnitData(offer: RealtyOffer): {
    name: string;
    capacity: number;
    beds: number;
    bathrooms: number;
    amenities: string[];
  } {
    // Парсим sleeps формат "2+2" или "2+2+1"
    const capacity = this.parseSleeps(offer.sleeps);
    const beds = Math.max(1, Math.ceil(capacity / 2)); // Примерная оценка, минимум 1
    
    const amenities: string[] = [];
    if (offer.amenities.washingMachine) amenities.push('washing-machine');
    if (offer.amenities.wiFi) amenities.push('wi-fi');
    if (offer.amenities.tv || offer.amenities.television) amenities.push('tv');
    if (offer.amenities.refrigerator) amenities.push('refrigerator');
    if (offer.amenities.stove) amenities.push('stove');
    if (offer.amenities.microwave) amenities.push('microwave');
    if (offer.amenities.iron) amenities.push('iron');
    if (offer.amenities.balcony) amenities.push('balcony');
    if (offer.amenities.elevator) amenities.push('elevator');
    if (offer.amenities.airConditioner) amenities.push('air-conditioner');

    return {
      name: offer.title || `Unit ${offer.internalId}`,
      capacity,
      beds,
      bathrooms: offer.amenities.bathroom ? 1 : 0,
      amenities,
    };
  }

  /**
   * Парсит формат "2+2" или "2+2+1" в общее количество гостей
   */
  private static parseSleeps(sleeps: string): number {
    if (!sleeps) return 2; // дефолт
    
    try {
      const parts = sleeps.split('+').map(s => parseInt(s.trim(), 10));
      const total = parts.reduce((sum, num) => sum + (isNaN(num) ? 0 : num), 0);
      return total > 0 ? total : 2; // минимум 2
    } catch {
      return 2; // fallback
    }
  }
}

