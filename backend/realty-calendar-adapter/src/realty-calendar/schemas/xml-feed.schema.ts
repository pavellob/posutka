import { z } from 'zod';

// Схема для metro станции
const MetroSchema = z.object({
  name: z.string(),
});

// Схема для location
const LocationSchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  localityName: z.string().optional(),
  address: z.string(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  timezone: z.string().optional().nullable(),
  metro: z.array(MetroSchema).optional(),
});

// Схема для sales-agent
const SalesAgentSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  inn: z.string().optional(),
  kpp: z.string().optional(),
  organization: z.string().optional(),
  currency: z.string().optional(),
}).optional();

// Схема для price
const PriceSchema = z.object({
  value: z.number(),
  currency: z.string(),
  period: z.string(),
}).optional();

// Схема для area
const AreaSchema = z.object({
  value: z.number(),
  unit: z.string(),
}).optional();

// Схема для deposit
const DepositSchema = z.object({
  value: z.number(),
  currency: z.string(),
}).optional();

// Схема для check-in/check-out time
const TimeRangeSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
}).optional();

// Схема для amenities (удобства)
const AmenitiesSchema = z.object({
  washingMachine: z.boolean().optional(),
  wiFi: z.boolean().optional(),
  tv: z.boolean().optional(),
  airConditioner: z.boolean().optional(),
  kidsFriendly: z.boolean().optional(),
  party: z.boolean().optional(),
  refrigerator: z.boolean().optional(),
  phone: z.boolean().optional(),
  stove: z.boolean().optional(),
  dishwasher: z.boolean().optional(),
  musicCenter: z.boolean().optional(),
  microwave: z.boolean().optional(),
  iron: z.boolean().optional(),
  concierge: z.boolean().optional(),
  parking: z.boolean().optional(),
  safe: z.boolean().optional(),
  waterHeater: z.boolean().optional(),
  television: z.boolean().optional(),
  bathroom: z.boolean().optional(),
  petFriendly: z.boolean().optional(),
  smoke: z.boolean().optional(),
  romantic: z.boolean().optional(),
  jacuzzi: z.boolean().optional(),
  balcony: z.boolean().optional(),
  elevator: z.boolean().optional(),
  seaview: z.boolean().optional(),
  mountainview: z.boolean().optional(),
  seafront: z.boolean().optional(),
  pool: z.boolean().optional(),
  playground: z.boolean().optional(),
  transfer: z.boolean().optional(),
  crib: z.boolean().optional(),
  sauna: z.boolean().optional(),
}).default({});

// Схема для одного offer
export const RealtyOfferSchema = z.object({
  internalId: z.string().min(1, 'internal-id is required'),
  type: z.string().optional().default('аренда'),
  propertyType: z.string().optional().default('жилая'),
  title: z.string().min(1, 'title is required'),
  category: z.string().optional().default('квартира'),
  creationDate: z.string().optional(),
  lastUpdateDate: z.string().optional(),
  salesAgent: SalesAgentSchema,
  price: PriceSchema,
  description: z.string().optional().default(''),
  minStay: z.number().int().positive().optional(),
  images: z.array(z.string()).default([]),
  location: LocationSchema,
  amenities: AmenitiesSchema,
  sleeps: z.string().default('2'),
  rooms: z.number().int().positive().default(1),
  area: AreaSchema,
  checkInTime: TimeRangeSchema,
  checkOutTime: TimeRangeSchema,
  deposit: DepositSchema,
});

// Схема для всего feed
export const RealtyFeedSchema = z.object({
  generationDate: z.string(),
  agencyId: z.string().min(1, 'agency-id is required'),
  offers: z.array(RealtyOfferSchema).min(1, 'At least one offer is required'),
});

// Типы TypeScript, выведенные из схем
export type RealtyOffer = z.infer<typeof RealtyOfferSchema>;
export type RealtyFeed = z.infer<typeof RealtyFeedSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Amenities = z.infer<typeof AmenitiesSchema>;

