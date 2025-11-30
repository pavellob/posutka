# Mock Server для RealtyCalendar Webhooks

Mock сервер эмулирует webhook'и от RealtyCalendar для тестирования адаптера.

## Быстрый старт

1. **Запустите основной сервис** (в одном терминале):
```bash
cd backend/realty-calendar-adapter
pnpm dev
```

2. **Запустите mock server** (в другом терминале):
```bash
cd backend/realty-calendar-adapter
pnpm mock
```

3. **Откройте в браузере**: http://localhost:5101/

## Использование

### Web UI

Mock server предоставляет простой веб-интерфейс с кнопками для отправки различных типов webhook'ов:

- **📝 Create Booking** - создание новой брони
- **✏️ Update Booking** - обновление существующей брони
- **❌ Cancel Booking** - отмена брони
- **🗑️ Delete Booking** - удаление брони
- **🆕 Create Booking (New Property)** - создание брони для нового объекта (без realty_id)

### API Endpoint

Можно также отправлять webhook'и через API:

```bash
curl -X POST http://localhost:5101/send \
  -H "Content-Type: application/json" \
  -d '{"type": "create_booking"}'
```

Доступные типы:
- `create_booking`
- `update_booking`
- `cancel_booking`
- `delete_booking`
- `create_booking_new_property`

## Примеры Payload'ов

### Create Booking

```json
{
  "action": "create_booking",
  "status": "confirmed",
  "booking": {
    "id": "rc-booking-001",
    "address": "Москва, ул. Тверская, д. 10, кв. 5",
    "begin_date": "2024-12-15",
    "end_date": "2024-12-20",
    "arrival_time": "14:00",
    "departure_time": "11:00",
    "amount": 15000,
    "prepayment": 5000,
    "deposit": 3000,
    "realty_id": "rc-property-001",
    "realty_room_id": "rc-unit-001"
  },
  "client": {
    "fio": "Иванов Иван Иванович",
    "name": "Иван Иванов",
    "phone": "+79001234567",
    "email": "ivan.ivanov@example.com"
  }
}
```

### Update Booking

Отличается от create_booking:
- `action: "update_booking"`
- Измененные даты: `begin_date: "2024-12-16"`, `end_date: "2024-12-21"`
- Измененная сумма: `amount: 18000`

### Cancel Booking

Отличается от create_booking:
- `action: "cancel_booking"`
- `status: "cancelled"`

### Create Booking (New Property)

Отличается от create_booking:
- Нет полей `realty_id` и `realty_room_id`
- Новый адрес: `"address": "Санкт-Петербург, Невский проспект, д. 25, кв. 12"`
- Новый booking ID: `"id": "rc-booking-002"`

## Настройка

Переменные окружения находятся в корневом `.env` файле проекта:

```bash
# Порт mock server (по умолчанию 5101)
REALTY_CALENDAR_MOCK_SERVER_PORT=5101

# URL целевого адаптера (по умолчанию http://localhost:4201/webhooks/realty-calendar)
REALTY_CALENDAR_TARGET_URL=http://localhost:4201/webhooks/realty-calendar
```

## Структура ответа

Mock server возвращает:

```json
{
  "success": true,
  "payload": { /* исходный webhook payload */ },
  "response": {
    "status": 200,
    "body": { /* ответ от адаптера */ }
  }
}
```

## Логирование

Mock server логирует все отправленные webhook'и и ответы от адаптера через `@repo/shared-logger`.

## Расширение

Для добавления новых типов webhook'ов отредактируйте объект `mockWebhooks` в `src/mock-server.ts`.

