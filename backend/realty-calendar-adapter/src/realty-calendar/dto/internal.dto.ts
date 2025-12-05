export type BookingAction = 'CREATE' | 'UPDATE' | 'CANCEL' | 'DELETE';

export interface InternalBookingDTO {
  action: BookingAction;
  externalRef: {
    source: 'REALTY_CALENDAR';
    id: string;
  };
  checkIn: Date;
  checkOut: Date;
  guest: {
    name: string;
    phone?: string;
    email?: string;
  };
  propertyExternalRef?: {
    source: 'REALTY_CALENDAR';
    id: string;
  };
  unitExternalRef?: {
    source: 'REALTY_CALENDAR';
    id: string;
  };
  address: string;
  amount?: number;
  prepayment?: number;
  deposit?: number;
  cancellationReason?: string; // Причина отмены (для CANCEL action)
  canceledDate?: string; // Дата отмены (для CANCEL action)
}

export interface WebhookResponse {
  ok: boolean;
  outcome: 'CREATED' | 'UPDATED' | 'CANCELED' | 'DELETED' | 'CONFLICT' | 'IGNORED' | 'ERROR';
  bookingId?: string;
  unitId?: string;
  propertyId?: string;
  reason?: string;
  conflicts?: Array<{
    bookingId: string;
    checkIn: string;
    checkOut: string;
  }>;
}

