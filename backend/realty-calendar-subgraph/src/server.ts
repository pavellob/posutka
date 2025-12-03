import { readFileSync } from 'fs';
import path from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer, IncomingMessage, ServerResponse } from 'http';

import { resolvers } from './resolvers/index.js';
import { createGraphQLLogger } from '@repo/shared-logger';
import { GrpcClientsFactory } from './clients/grpc-clients.factory.js';
import { RealtyCalendarService } from './realty-calendar.service.js';
import { XmlFeedService } from './services/xml-feed.service.js';
import type { Context } from './context.js';

const logger = createGraphQLLogger('realty-calendar-subgraph');

async function startServer() {
  try {
    logger.info('Starting Realty Calendar Subgraph');

    // Инициализируем gRPC клиенты
    const grpcClients = await GrpcClientsFactory.create();
    logger.info('gRPC clients initialized');

    // Создаем сервисы
    const realtyCalendarService = new RealtyCalendarService(
      grpcClients.bookings,
      grpcClients.inventory
    );
    const xmlFeedService = new XmlFeedService(grpcClients.inventory);

    // Создаем GraphQL схему
    const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Создаем контекст для GraphQL
    const context: Context = {
      realtyCalendarService,
      xmlFeedService,
      grpcClients,
    };

    const yoga = createYoga({
      schema,
      context: () => context,
    });

    // Создаем HTTP сервер для GraphQL
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Health check
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      // GraphQL endpoint (все остальные запросы)
      if (req.url === '/graphql' || req.url?.startsWith('/graphql')) {
        return yoga(req, res);
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    const PORT = parseInt(process.env.REALTY_CALENDAR_SUBGRAPH_PORT || '4013');
    server.listen(PORT, () => {
      logger.info(`Realty Calendar Subgraph started on port ${PORT}`);
      logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      await grpcClients.disconnect();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down...');
      await grpcClients.disconnect();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

