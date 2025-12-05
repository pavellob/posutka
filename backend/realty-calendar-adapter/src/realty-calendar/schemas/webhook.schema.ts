import { z } from 'zod';

// Схема для apartment (недвижимость)
const ApartmentSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string().optional(),
  address: z.string().optional(),
}).optional();

// Схема для booking_origin
const BookingOriginSchema = z.object({
  id: z.union([z.string(), z.number(), z.null()]).nullable().optional(),
  title: z.string().nullable().optional(),
}).optional();

// Схема для booking (основная информация о бронировании)
const BookingDataSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  begin_date: z.string(),
  end_date: z.string(),
  realty_id: z.union([z.string(), z.number(), z.null()]).nullable().optional().transform((val) => val === null || val === undefined ? undefined : String(val)),
  realty_room_id: z.union([z.string(), z.number(), z.null()]).nullable().optional().transform((val) => val === null || val === undefined ? undefined : String(val)),
  user_id: z.union([z.string(), z.number()]).optional(),
  address: z.string(),
  amount: z.number().optional(),
  prepayment: z.number().optional(),
  deposit: z.number().nullable().optional(),
  arrival_time: z.string().nullable().optional(),
  departure_time: z.string().nullable().optional(),
  status_cd: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  canceled_date: z.string().nullable().optional(), // Дата отмены
  notes: z.string().nullable().optional(), // Заметки (могут содержать причину отмены)
  apartment: ApartmentSchema,
  booking_origin: BookingOriginSchema.optional(),
  // Пропускаем остальные поля, которые не нужны для валидации
}).passthrough();

// Схема для клиента (может приходить отдельно или в data)
const ClientSchema = z.object({
  fio: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
}).optional();

// Схема для data объекта (обертка для booking)
const WebhookDataSchema = z.object({
  booking: BookingDataSchema,
  crm_entity_id: z.union([z.string(), z.number(), z.null()]).nullable().optional(),
  bitrix_lead_id: z.union([z.string(), z.number(), z.null()]).nullable().optional(),
}).passthrough();

// Нормализованная схема вебхука (результат)
const NormalizedWebhookSchema = z.object({
  action: z.enum(['create_booking', 'update_booking', 'cancel_booking', 'delete_booking']),
  status: z.string().optional(),
  booking: BookingDataSchema,
  client: ClientSchema,
});

// Схема с data оберткой
const WebhookWithDataSchema = z.object({
  action: z.enum(['create_booking', 'update_booking', 'cancel_booking', 'delete_booking']),
  status: z.string().optional(),
  data: WebhookDataSchema,
  client: ClientSchema,
});

// Схема без data обертки (старый формат)
const WebhookDirectSchema = z.object({
  action: z.enum(['create_booking', 'update_booking', 'cancel_booking', 'delete_booking']),
  status: z.string().optional(),
  booking: BookingDataSchema,
  client: ClientSchema,
});

// Основная схема вебхука - поддерживаем оба формата и нормализуем
export const RealtyCalendarWebhookSchema = z.union([
  WebhookWithDataSchema,
  WebhookDirectSchema,
]).transform((webhook) => {
  // Нормализуем структуру: если есть data.booking, извлекаем его
  if ('data' in webhook && webhook.data?.booking) {
    return {
      action: webhook.action,
      status: webhook.status,
      booking: webhook.data.booking,
      client: webhook.client,
    };
  }
  // Если booking уже на верхнем уровне, возвращаем как есть
  // TypeScript знает, что здесь webhook имеет тип WebhookDirectSchema
  const directWebhook = webhook as Extract<typeof webhook, { booking: unknown }>;
  return {
    action: directWebhook.action,
    status: directWebhook.status,
    booking: directWebhook.booking,
    client: directWebhook.client,
  };
}).pipe(NormalizedWebhookSchema);

// Тип TypeScript, выведенный из схемы
export type RealtyCalendarWebhook = z.infer<typeof NormalizedWebhookSchema>;

