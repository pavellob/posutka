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
    let body: string | null = null;
    let webhook: any = null;
    
    try {
      // Логируем начало обработки
      logger.info('Webhook request received', {
        method: req.method,
        url: req.url,
        headers: {
          'content-type': req.headers['content-type'],
          'content-length': req.headers['content-length'],
          'user-agent': req.headers['user-agent'],
        },
      });

      // Читаем body
      body = await this.readBody(req);
      
      // Безопасное логирование body (первые 1000 символов для безопасности)
      const bodyPreview = body ? body.substring(0, 1000) : 'empty';
      const bodyLength = body?.length || 0;
      logger.info('Webhook body received', {
        bodyLength,
        bodyPreview: bodyLength > 1000 ? `${bodyPreview}...` : bodyPreview,
        isJson: this.isValidJson(body),
      });

      // Парсим JSON безопасно
      try {
        webhook = JSON.parse(body);
      } catch (parseError: any) {
        logger.error('Failed to parse webhook JSON', {
          error: parseError?.message || 'Unknown parse error',
          bodyPreview: bodyPreview,
          bodyLength,
        });
        throw new Error(`Invalid JSON: ${parseError?.message || 'Unknown error'}`);
      }

      // Безопасное логирование структуры webhook
      const safeWebhookInfo = this.safeLogWebhook(webhook);
      logger.info('Webhook parsed successfully', safeWebhookInfo);

      // Валидация обязательных полей
      if (!webhook || typeof webhook !== 'object') {
        throw new Error('Webhook must be an object');
      }

      if (!webhook.action) {
        logger.warn('Webhook missing action field', { webhookKeys: Object.keys(webhook || {}) });
        throw new Error('Webhook missing required field: action');
      }

      if (!webhook.booking || typeof webhook.booking !== 'object') {
        logger.warn('Webhook missing or invalid booking field', {
          hasBooking: !!webhook.booking,
          bookingType: typeof webhook.booking,
        });
        throw new Error('Webhook missing required field: booking');
      }

      // Маппим в внутренний DTO
      const dto = WebhookMapper.toInternal(webhook);

      // TODO: Получить orgId из конфига или из webhook
      // Используем petroga как fallback, так как она точно существует в базе
      const defaultOrgId = process.env.REALTY_CALENDAR_DEFAULT_ORG_ID || 'petroga';
      
      logger.info('Processing booking', { 
        action: webhook.action,
        bookingId: webhook.booking?.id || 'unknown',
        defaultOrgId,
        hasClient: !!webhook.client,
      });

      // Обрабатываем
      const result = await this.service.processBooking(dto, defaultOrgId);

      // Безопасное логирование результата
      logger.info('Booking processed successfully', {
        ok: result?.ok,
        outcome: result?.outcome,
        bookingId: result?.bookingId || 'unknown',
        hasUnitId: !!result?.unitId,
        hasPropertyId: !!result?.propertyId,
      });

      // Отправляем ответ
      this.sendResponse(res, 200, result);

    } catch (error: any) {
      // Безопасное логирование ошибки
      const errorInfo: any = {
        error: error?.message || 'Unknown error',
        errorName: error?.name || 'Unknown',
        hasStack: !!error?.stack,
      };

      // Добавляем информацию о webhook, если она есть
      if (webhook) {
        errorInfo.webhookAction = webhook.action || 'unknown';
        errorInfo.hasBooking = !!webhook.booking;
        errorInfo.bookingId = webhook.booking?.id || 'unknown';
      }

      // Добавляем информацию о body, если парсинг не удался
      if (body && !webhook) {
        errorInfo.bodyLength = body.length;
        errorInfo.bodyPreview = body.substring(0, 200);
      }

      logger.error('Webhook handling failed', errorInfo);

      const errorResponse: WebhookResponse = {
        ok: false,
        outcome: 'ERROR',
        reason: error?.message || 'Internal server error',
      };
      this.sendResponse(res, 500, errorResponse);
    }
  }

  /**
   * Безопасное логирование структуры webhook
   */
  private safeLogWebhook(webhook: any): Record<string, any> {
    if (!webhook || typeof webhook !== 'object') {
      return { isValid: false, type: typeof webhook };
    }

    const info: Record<string, any> = {
      isValid: true,
      action: webhook.action || null,
      status: webhook.status || null,
      hasBooking: !!webhook.booking,
      hasClient: !!webhook.client,
    };

    // Безопасно извлекаем данные из booking
    if (webhook.booking && typeof webhook.booking === 'object') {
      info.booking = {
        id: webhook.booking.id || null,
        hasAddress: !!webhook.booking.address,
        address: webhook.booking.address ? webhook.booking.address.substring(0, 100) : null,
        hasBeginDate: !!webhook.booking.begin_date,
        hasEndDate: !!webhook.booking.end_date,
        hasRealtyId: !!webhook.booking.realty_id,
        hasRealtyRoomId: !!webhook.booking.realty_room_id,
      };
    }

    // Безопасно извлекаем данные из client
    if (webhook.client && typeof webhook.client === 'object') {
      info.client = {
        hasFio: !!webhook.client.fio,
        hasName: !!webhook.client.name,
        hasPhone: !!webhook.client.phone,
        hasEmail: !!webhook.client.email,
        // Не логируем сами данные клиента для безопасности
      };
    }

    // Логируем все ключи для отладки
    info.allKeys = Object.keys(webhook);

    return info;
  }

  /**
   * Проверяет, является ли строка валидным JSON
   */
  private isValidJson(str: string | null | undefined): boolean {
    if (!str || typeof str !== 'string') {
      return false;
    }
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
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

