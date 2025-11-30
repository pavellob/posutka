import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createGraphQLLogger } from '@repo/shared-logger';
import { RealtyCalendarController } from './realty-calendar/realty-calendar.controller.js';
import { GrpcClientsFactory } from './clients/grpc-clients.factory.js';

const logger = createGraphQLLogger('realty-calendar-adapter');

async function startServer() {
  try {
    logger.info('Starting Realty Calendar Adapter');

    // Инициализируем gRPC клиенты
    const grpcClients = await GrpcClientsFactory.create();
    logger.info('gRPC clients initialized');

    // Создаем контроллер
    const controller = new RealtyCalendarController(grpcClients);

    // Создаем HTTP сервер
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Обработка webhook endpoint
      if (req.method === 'POST' && req.url === '/webhooks/realty-calendar') {
        await controller.handleWebhook(req, res);
        return;
      }

      // Health check
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    const PORT = parseInt(process.env.REALTY_CALENDAR_ADAPTER_PORT || '4201');
    server.listen(PORT, () => {
      logger.info(`Realty Calendar Adapter started on port ${PORT}`);
      logger.info(`Webhook endpoint: http://localhost:${PORT}/webhooks/realty-calendar`);
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

  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

