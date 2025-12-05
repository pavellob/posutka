import { RealtyCalendarWebhook } from '../dto/webhook.dto.js';
import { InternalBookingDTO, BookingAction } from '../dto/internal.dto.js';

export class WebhookMapper {
  static toInternal(webhook: RealtyCalendarWebhook): InternalBookingDTO {
    const actionMap: Record<string, BookingAction> = {
      'create_booking': 'CREATE',
      'update_booking': 'UPDATE',
      'cancel_booking': 'CANCEL',
      'delete_booking': 'DELETE',
    };

    // Парсим даты и время
    const checkIn = this.parseDateTime(webhook.booking.begin_date, webhook.booking.arrival_time ?? undefined);
    const checkOut = this.parseDateTime(webhook.booking.end_date, webhook.booking.departure_time ?? undefined);

    return {
      action: actionMap[webhook.action] || 'CREATE',
      externalRef: {
        source: 'REALTY_CALENDAR',
        id: webhook.booking.id,
      },
      checkIn,
      checkOut,
      guest: {
        name: webhook.client?.fio || webhook.client?.name || 'Guest',
        phone: webhook.client?.phone ?? undefined, // Преобразуем null в undefined
        email: webhook.client?.email ?? undefined, // Преобразуем null в undefined
      },
      propertyExternalRef: webhook.booking.realty_id ? {
        source: 'REALTY_CALENDAR',
        id: webhook.booking.realty_id,
      } : undefined,
      unitExternalRef: webhook.booking.realty_room_id ? {
        source: 'REALTY_CALENDAR',
        id: webhook.booking.realty_room_id,
      } : undefined,
      address: webhook.booking.address || 'Адрес не указан', // Предоставляем дефолтное значение, если address отсутствует
      amount: webhook.booking.amount,
      prepayment: webhook.booking.prepayment,
      deposit: webhook.booking.deposit ?? undefined,
      cancellationReason: this.buildCancellationReason(webhook),
      canceledDate: webhook.booking.canceled_date ?? undefined,
    };
  }

  private static buildCancellationReason(webhook: RealtyCalendarWebhook): string | undefined {
    if (webhook.action !== 'cancel_booking') {
      return undefined;
    }

    const parts: string[] = [];
    
    if (webhook.booking.canceled_date) {
      parts.push(`Отменено: ${webhook.booking.canceled_date}`);
    }
    
    if (webhook.booking.notes) {
      parts.push(`Примечание: ${webhook.booking.notes}`);
    }
    
    if (webhook.status) {
      parts.push(`Статус: ${webhook.status}`);
    }

    return parts.length > 0 ? parts.join('; ') : 'Отменено через RealtyCalendar';
  }

  private static parseDateTime(dateStr: string, timeStr?: string): Date {
    const date = new Date(dateStr);
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours || 0, minutes || 0, 0, 0);
    }
    return date;
  }
}

