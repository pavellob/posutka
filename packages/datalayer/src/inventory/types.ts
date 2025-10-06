import type { UUID, DateTime } from '@repo/shared/types-only';

export type { UUID, DateTime };

export interface OrganizationRef {
  id: UUID;
}

export interface Property {
  id: UUID;
  orgId: UUID;
  title: string;
  address: string;
  amenities: string[];
  org: OrganizationRef;
  units: Unit[];
  // Яндекс.Недвижимость поля
  propertyType?: string;
  category?: string;
  dealStatus?: string;
  country?: string;
  region?: string;
  district?: string;
  localityName?: string;
  apartment?: string;
  metroName?: string;
  metroTimeOnFoot?: number;
  metroTimeOnTransport?: number;
  latitude?: number;
  longitude?: number;
  totalArea?: number;
  livingArea?: number;
  kitchenArea?: number;
  rooms?: number;
  roomsOffered?: number;
  floor?: number;
  floorsTotal?: number;
  buildingType?: string;
  buildingYear?: number;
  buildingSeries?: string;
  elevator?: boolean;
  parking?: boolean;
  security?: boolean;
  concierge?: boolean;
  playground?: boolean;
  gym?: boolean;
  balcony?: boolean;
  loggia?: boolean;
  airConditioning?: boolean;
  internet?: boolean;
  washingMachine?: boolean;
  dishwasher?: boolean;
  tv?: boolean;
  renovation?: string;
  furniture?: boolean;
  isElite?: boolean;
  yandexBuildingId?: string;
  yandexHouseId?: string;
}

export interface Unit {
  id: UUID;
  propertyId: UUID;
  name: string;
  capacity: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  property?: Property;
}

export type AvailabilityStatus = 'AVAILABLE' | 'BLOCKED' | 'BOOKED';

export interface CalendarDay {
  date: DateTime;
  status: AvailabilityStatus;
  bookingId?: UUID;
  note?: string;
}
