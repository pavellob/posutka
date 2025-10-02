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
