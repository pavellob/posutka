import { IncomingMessage, ServerResponse } from 'http';
import { createGraphQLLogger } from '@repo/shared-logger';
import { GrpcClients } from '../clients/grpc-clients.factory.js';
import { RealtyCalendarService } from './realty-calendar.service.js';
import { WebhookMapper } from './mappers/webhook.mapper.js';
import { RealtyCalendarWebhook } from './dto/webhook.dto.js';
import { WebhookResponse } from './dto/internal.dto.js';

const logger = createGraphQLLogger('realty-calendar-controller');

export class RealtyCalendarController {
  private service: RealtyCalendarService;

  constructor(grpcClients: GrpcClients) {
    this.service = new RealtyCalendarService(
      grpcClients.bookings,
      grpcClients.inventory
    );
  }

  async handleWebhook(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // Читаем body
      const body = await this.readBody(req);
      const webhook: RealtyCalendarWebhook = JSON.parse(body);

      logger.info('Received webhook', { action: webhook.action, bookingId: webhook.booking.id });

      // Маппим в внутренний DTO
      const dto = WebhookMapper.toInternal(webhook);

      // TODO: Получить orgId из конфига или из webhook
      // Используем petroga как fallback, так как она точно существует в базе
      const defaultOrgId = process.env.REALTY_CALENDAR_DEFAULT_ORG_ID || 'petroga';
      
      logger.info('Processing booking with default orgId', { 
        defaultOrgId,
        envValue: process.env.REALTY_CALENDAR_DEFAULT_ORG_ID 
      });

      // Обрабатываем
      const result = await this.service.processBooking(dto, defaultOrgId);

      // Отправляем ответ
      this.sendResponse(res, 200, result);

    } catch (error: any) {
      logger.error('Webhook handling failed', { error: error.message });
      const errorResponse: WebhookResponse = {
        ok: false,
        outcome: 'ERROR',
        reason: error.message,
      };
      this.sendResponse(res, 500, errorResponse);
    }
  }

  private async readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }

  private sendResponse(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
}

