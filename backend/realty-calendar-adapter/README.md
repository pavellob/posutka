# Realty Calendar Adapter

Микросервис для интеграции с RealtyCalendar через webhook'и.

## Запуск

### Основной сервис

```bash
# Установить зависимости
pnpm install

# Запустить в dev режиме
pnpm dev

# Или через корневой скрипт
pnpm --filter realty-calendar-adapter dev
```

### Mock Server (для тестирования)

Mock сервер эмулирует webhook'и от RealtyCalendar для тестирования адаптера.

```bash
# Запустить mock server
pnpm mock

# Или в watch режиме
pnpm mock:dev
```

Mock server запустится на порту `5101` (или `REALTY_CALENDAR_MOCK_SERVER_PORT` из env).

Откройте в браузере: http://localhost:5101/

## Переменные окружения

Все переменные окружения находятся в корневом `.env` файле проекта. Добавьте следующие переменные в корневой `.env`:

```bash
# Realty Calendar Adapter
REALTY_CALENDAR_ADAPTER_PORT=4201
REALTY_CALENDAR_DEFAULT_ORG_ID=default-org
REALTY_CALENDAR_MOCK_SERVER_PORT=5101
REALTY_CALENDAR_TARGET_URL=http://localhost:4201/webhooks/realty-calendar

# Bookings gRPC (если еще не добавлены)
BOOKINGS_GRPC_HOST=localhost
BOOKINGS_GRPC_PORT=4102

# Inventory gRPC (если еще не добавлены)
INVENTORY_GRPC_HOST=localhost
INVENTORY_GRPC_PORT=4101

# gRPC общие настройки (если еще не добавлены)
GRPC_TIMEOUT=5000
GRPC_RETRY_ATTEMPTS=3
GRPC_RETRY_DELAY=1000
```

## Endpoints

### Основной сервис

- `POST /webhooks/realty-calendar` - основной webhook endpoint
- `GET /health` - health check

### Mock Server

- `GET /` - Web UI для отправки тестовых webhook'ов
- `POST /send` - API для отправки webhook'а
- `GET /health` - health check

## Примеры webhook'ов

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

```json
{
  "action": "update_booking",
  "status": "confirmed",
  "booking": {
    "id": "rc-booking-001",
    "address": "Москва, ул. Тверская, д. 10, кв. 5",
    "begin_date": "2024-12-16",
    "end_date": "2024-12-21",
    "arrival_time": "15:00",
    "departure_time": "12:00",
    "amount": 18000,
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

### Cancel Booking

```json
{
  "action": "cancel_booking",
  "status": "cancelled",
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

## Тестирование

### Через Mock Server UI

1. Запустите основной сервис: `pnpm dev`
2. Запустите mock server: `pnpm mock`
3. Откройте http://localhost:5101/
4. Нажмите на кнопки для отправки различных типов webhook'ов

### Через curl

```bash
# Create booking
curl -X POST http://localhost:4012/webhooks/realty-calendar \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

## Архитектура

- **HTTP Server** - нативный Node.js HTTP сервер (без Express)
- **gRPC Clients** - использование `@repo/grpc-sdk` для общения с core-сервисами
- **External References** - универсальная поддержка внешних систем через `externalSource` и `externalId`

## Структура проекта

```
src/
├── main.ts                          # HTTP сервер
├── mock-server.ts                   # Mock server для тестирования
├── config/
│   └── env.ts                       # Конфигурация
├── clients/
│   └── grpc-clients.factory.ts      # Фабрика gRPC клиентов
└── realty-calendar/
    ├── realty-calendar.controller.ts
    ├── realty-calendar.service.ts
    ├── dto/
    │   ├── webhook.dto.ts
    │   └── internal.dto.ts
    └── mappers/
        └── webhook.mapper.ts
```

