// Типы для входящего webhook от RealtyCalendar
export interface RealtyCalendarWebhook {
  action: 'create_booking' | 'update_booking' | 'cancel_booking' | 'delete_booking';
  status?: string;
  booking: {
    id: string;
    address: string;
    begin_date: string;  // ISO date
    end_date: string;    // ISO date
    arrival_time?: string;  // HH:mm
    departure_time?: string; // HH:mm
    amount?: number;
    prepayment?: number;
    deposit?: number;
    realty_id?: string;
    realty_room_id?: string;
  };
  client?: {
    fio?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
}

