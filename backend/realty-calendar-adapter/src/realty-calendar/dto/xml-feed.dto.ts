import { RealtyFeed, RealtyOffer } from '../schemas/xml-feed.schema.js';

// Экспортируем типы из схем
export type { RealtyFeed, RealtyOffer };

// DTO для ответа
export interface FeedProcessResponse {
  ok: boolean;
  outcome: 'SUCCESS' | 'PARTIAL' | 'ERROR';
  processed: number;
  created: number;
  updated: number;
  errors: Array<{
    offerId: string;
    error: string;
  }>;
}


