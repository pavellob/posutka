import type { Context } from '../context.js';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('inventory-resolvers');

logger.debug('Resolvers module loaded');

export const resolvers = {
  Query: {
    property: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getPropertyById(id),
    unit: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getUnitById(id),
  propertiesByOrgId: async (_: unknown, { orgId }: { orgId: string }, { dl }: Context) => {
    logger.resolverStart('propertiesByOrgId', { orgId });
    const startTime = Date.now();
      
      try {
        logger.debug('Calling data layer getPropertiesByOrgId', { orgId });
        const properties = await dl.getPropertiesByOrgId(orgId);
        const executionTime = Date.now() - startTime;
        
        logger.resolverEnd('propertiesByOrgId', properties, executionTime);
        logger.info('GraphQL resolver returning properties', {
          count: properties?.length || 0,
          executionTime: `${executionTime}ms`,
          orgId: orgId
        });
        
        if (properties && properties.length > 0) {
          logger.debug('Properties details', { 
            properties: properties.map(p => ({
              id: p.id,
              title: p.title,
              address: p.address
            }))
          });
        } else {
          logger.warn('No properties found for orgId', { orgId });
        }
        
        // Всегда возвращаем массив, даже если пустой
        return properties || [];
      } catch (error) {
        const executionTime = Date.now() - startTime;
        logger.graphqlError('propertiesByOrgId', error, { orgId });
        logger.error('Error fetching properties by orgId', error, {
          orgId: orgId,
          executionTime: `${executionTime}ms`,
          timestamp: new Date().toISOString()
        });
        // В случае ошибки тоже возвращаем пустой массив, а не null
        return [];
      }
    },
    unitsByPropertyId: async (_: unknown, { propertyId }: { propertyId: string }, { dl }: Context) => {
      try {
        const units = await dl.getUnitsByPropertyId(propertyId);
        return units || [];
      } catch (error) {
        logger.error('Error fetching units by propertyId', error, { propertyId });
        return [];
      }
    },
  },
  
  // Резолверы для связей между типами
  Unit: {
    property: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getPropertyById(parent.propertyId);
    },
  },
  Mutation: {
    createProperty: (_: unknown, args: any, { dl }: Context) => dl.createProperty(args),
    createUnit: (_: unknown, args: any, { dl }: Context) => dl.createUnit(args),
    blockDates: (_: unknown, args: any, { dl }: Context) => dl.blockDates(args.unitId, args.from, args.to, args.note),
  },
  // Все связи между типами будут решаться на уровне mesh через base-schema.gql
  // Здесь оставляем только прямые запросы к данным
};
