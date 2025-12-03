import { Resolvers } from '../context.js';
import { XmlFeedParser } from '../parsers/xml-feed.parser.js';
import { XmlFeedService } from '../services/xml-feed.service.js';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('realty-calendar-resolvers');

export const resolvers: Resolvers = {
  Query: {
    _empty: () => true,
  },
  Mutation: {
    importRealtyCalendarFeed: async (_, { orgId, xmlContent }, context) => {
      try {
        logger.info('Import Realty Calendar Feed mutation called', {
          orgId,
          xmlContentLength: xmlContent.length,
        });

        // Парсим XML
        const feed = XmlFeedParser.parse(xmlContent);

        logger.info('XML feed parsed successfully', {
          agencyId: feed.agencyId,
          offersCount: feed.offers.length,
        });

        // Обрабатываем через сервис
        const result = await context.xmlFeedService.processFeed(feed, orgId);

        return {
          success: result.ok,
          outcome: result.outcome,
          processed: result.processed,
          created: result.created,
          updated: result.updated,
          errors: result.errors.map(e => ({
            offerId: e.offerId,
            message: e.error,
          })),
        };
      } catch (error: any) {
        logger.error('Import Realty Calendar Feed failed', {
          error: error.message,
          orgId,
        });

        return {
          success: false,
          outcome: 'ERROR' as const,
          processed: 0,
          created: 0,
          updated: 0,
          errors: [{
            offerId: 'unknown',
            message: error.message || 'Internal server error',
          }],
        };
      }
    },
  },
};

