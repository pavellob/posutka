import { IncomingMessage, ServerResponse } from 'http';
import { createGraphQLLogger } from '@repo/shared-logger';
import { GrpcClients } from '../clients/grpc-clients.factory.js';
import { RealtyCalendarService } from './realty-calendar.service.js';
import { XmlFeedService } from './services/xml-feed.service.js';
import { WebhookMapper } from './mappers/webhook.mapper.js';
import { WebhookResponse } from './dto/internal.dto.js';
import { XmlFeedParser } from './parsers/xml-feed.parser.js';
import { ZodError } from 'zod';
import { RealtyCalendarWebhookSchema, type RealtyCalendarWebhook } from './schemas/webhook.schema.js';

const logger = createGraphQLLogger('realty-calendar-controller');

export class RealtyCalendarController {
  private service: RealtyCalendarService;
  private xmlFeedService: XmlFeedService;

  constructor(grpcClients: GrpcClients) {
    this.service = new RealtyCalendarService(
      grpcClients.bookings,
      grpcClients.inventory
    );
    this.xmlFeedService = new XmlFeedService(grpcClients.inventory);
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
      
      const bodyLength = body?.length || 0;
      logger.info('Webhook body received', {
        bodyLength,
        body,
        isJson: this.isValidJson(body),
      });

      // Парсим JSON безопасно
      let rawWebhook: any;
      try {
        rawWebhook = JSON.parse(body);
      } catch (parseError: any) {
        logger.error('Failed to parse webhook JSON', {
          error: parseError?.message || 'Unknown parse error',
          bodyLength,
          body: body?.substring(0, 500),
        });
        throw new Error(`Invalid JSON: ${parseError?.message || 'Unknown error'}`);
      }

      // Безопасное логирование структуры webhook до валидации
      const safeWebhookInfo = this.safeLogWebhook(rawWebhook);
      logger.info('Webhook parsed successfully, validating...', safeWebhookInfo);

      // Валидация через Zod
      let validatedWebhook: RealtyCalendarWebhook;
      try {
        validatedWebhook = RealtyCalendarWebhookSchema.parse(rawWebhook) as RealtyCalendarWebhook;
        logger.info('Webhook validated successfully', {
          action: validatedWebhook.action,
          bookingId: validatedWebhook.booking.id,
          hasRealtyId: !!validatedWebhook.booking.realty_id,
          hasRealtyRoomId: !!validatedWebhook.booking.realty_room_id,
          realtyId: validatedWebhook.booking.realty_id,
        });
      } catch (validationError: any) {
        if (validationError instanceof ZodError) {
          const errorDetails = validationError.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
          }));
          logger.error('Webhook validation failed', {
            errors: errorDetails,
            webhookKeys: Object.keys(rawWebhook || {}),
          });
          throw new Error(`Validation failed: ${errorDetails.map(e => `${e.path}: ${e.message}`).join(', ')}`);
        }
        throw validationError;
      }

      // Маппим в внутренний DTO
      const dto = WebhookMapper.toInternal(validatedWebhook);
      
      webhook = validatedWebhook; // Для логирования в catch блоке

      // TODO: Получить orgId из конфига или из webhook
      // Используем petroga как fallback, так как она точно существует в базе
      const defaultOrgId = process.env.REALTY_CALENDAR_DEFAULT_ORG_ID || 'petroga';
      
      logger.info('Processing booking', { 
        action: validatedWebhook.action,
        bookingId: validatedWebhook.booking.id,
        realtyId: validatedWebhook.booking.realty_id,
        realtyRoomId: validatedWebhook.booking.realty_room_id,
        defaultOrgId,
        hasClient: !!validatedWebhook.client,
        address: validatedWebhook.booking.address,
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
      hasData: !!webhook.data,
      hasClient: !!webhook.client,
    };

    // Поддерживаем оба формата: прямой booking и data.booking
    const booking = webhook.data?.booking || webhook.booking;

    // Безопасно извлекаем данные из booking
    if (booking && typeof booking === 'object') {
      info.booking = {
        id: booking.id || null,
        hasAddress: !!booking.address,
        address: booking.address ? booking.address.substring(0, 100) : null,
        hasBeginDate: !!booking.begin_date,
        hasEndDate: !!booking.end_date,
        hasRealtyId: !!booking.realty_id,
        realtyId: booking.realty_id || null,
        hasRealtyRoomId: !!booking.realty_room_id,
        realtyRoomId: booking.realty_room_id || null,
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
    if (webhook.data && typeof webhook.data === 'object') {
      info.dataKeys = Object.keys(webhook.data);
    }

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

  async handleXmlFeed(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body: string | null = null;
    
    try {
      logger.info('XML feed request received', {
        method: req.method,
        url: req.url,
        headers: {
          'content-type': req.headers['content-type'],
          'content-length': req.headers['content-length'],
        },
      });

      // Читаем body
      body = await this.readBody(req);
      
      if (!body) {
        throw new Error('Empty request body');
      }

      // Парсим XML
      const feed = XmlFeedParser.parse(body);
      
      logger.info('XML feed parsed successfully', {
        agencyId: feed.agencyId,
        offersCount: feed.offers.length,
      });

      // Получаем orgId из конфига
      const defaultOrgId = process.env.REALTY_CALENDAR_DEFAULT_ORG_ID || 'petroga';
      
      // Обрабатываем feed
      const result = await this.xmlFeedService.processFeed(feed, defaultOrgId);

      // Отправляем ответ
      this.sendResponse(res, result.ok ? 200 : 500, result);

    } catch (error: any) {
      logger.error('XML feed handling failed', {
        error: error?.message || 'Unknown error',
        errorName: error?.name || 'Unknown',
        hasStack: !!error?.stack,
        hasBody: !!body,
        bodyLength: body?.length || 0,
      });

      let errorMessage = error?.message || 'Internal server error';
      
      // Форматируем ошибки Zod
      if (error instanceof ZodError) {
        errorMessage = `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
      }

      const errorResponse = {
        ok: false,
        outcome: 'ERROR' as const,
        reason: errorMessage,
        processed: 0,
        created: 0,
        updated: 0,
        errors: [],
      };
      
      this.sendResponse(res, 500, errorResponse);
    }
  }

  private sendResponse(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
}

