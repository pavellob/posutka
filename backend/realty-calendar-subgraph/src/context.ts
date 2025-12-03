import { RealtyCalendarService } from './realty-calendar.service.js';
import { XmlFeedService } from './services/xml-feed.service.js';
import type { GrpcClients } from './clients/grpc-clients.factory.js';

export interface Context {
  realtyCalendarService: RealtyCalendarService;
  xmlFeedService: XmlFeedService;
  grpcClients: GrpcClients;
}

export type Resolvers = {
  Query: {
    _empty: () => boolean;
  };
  Mutation: {
    importRealtyCalendarFeed: (
      _: unknown,
      args: { orgId: string; xmlContent: string },
      context: Context
    ) => Promise<{
      success: boolean;
      outcome: 'SUCCESS' | 'PARTIAL' | 'ERROR';
      processed: number;
      created: number;
      updated: number;
      errors: Array<{ offerId: string; message: string }>;
    }>;
  };
};

