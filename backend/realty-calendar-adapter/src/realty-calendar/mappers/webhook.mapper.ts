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

    // Извлекаем данные клиента
    const clientFio = webhook.client?.fio;
    const clientName = webhook.client?.name;
    const clientPhone = webhook.client?.phone ?? undefined;
    const clientEmail = webhook.client?.email ?? undefined;
    const guestName = clientFio || clientName || 'Guest';

    // Финансовые данные (в копейках)
    const toCents = (value?: number | string | null): number | undefined => {
      if (value === null || value === undefined) return undefined;
      const num = Number(value);
      if (Number.isNaN(num)) return undefined;
      return Math.round(num * 100);
    };

    const totalAmount = toCents(webhook.booking.booking_amount ?? webhook.booking.amount);
    const amount = toCents(webhook.booking.amount);
    const pricePerDay = toCents(webhook.booking.price_per_day);
    const platformTax = toCents(webhook.booking.platform_tax);
    const prepayment = toCents(webhook.booking.prepayment);
    const deposit = toCents(webhook.booking.deposit);
    const guestsCount = webhook.booking.guests_count ?? webhook.booking.partner_guests_count ?? 1;
    const source = webhook.booking.source || webhook.booking.booking_origin?.title || undefined;
    const notes = webhook.booking.notes ?? undefined;

    return {
      action: actionMap[webhook.action] || 'CREATE',
      externalRef: {
        source: 'REALTY_CALENDAR',
        id: webhook.booking.id,
      },
      source,
      checkIn,
      checkOut,
      guest: {
        name: guestName,
        phone: clientPhone,
        email: clientEmail,
      },
      notes,
      arrivalTime: webhook.booking.arrival_time ?? undefined,
      departureTime: webhook.booking.departure_time ?? undefined,
      propertyExternalRef: webhook.booking.realty_id ? {
        source: 'REALTY_CALENDAR',
        id: webhook.booking.realty_id,
      } : undefined,
      unitExternalRef: webhook.booking.realty_room_id ? {
        source: 'REALTY_CALENDAR',
        id: webhook.booking.realty_room_id,
      } : undefined,
      address: webhook.booking.address || 'Адрес не указан', // Предоставляем дефолтное значение, если address отсутствует
      amount,
      totalAmount,
      pricePerDay,
      platformTax,
      guestsCount,
      prepayment,
      deposit,
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

