# Realty Calendar Adapter - Реализация

## Выполненные задачи

### 1. Обновлен `bookings.proto`
- ✅ Добавлены поля `external_source` и `external_id` в `Booking` и `CreateBookingRequest`
- ✅ Добавлен метод `GetBookingByExternalRef`
- ✅ Добавлен метод `UpdateBooking`

### 2. Создан `inventory.proto`
- ✅ Полный gRPC сервис для управления недвижимостью
- ✅ Методы для Property: GetProperty, GetPropertyByExternalRef, SearchPropertyByAddress, CreateProperty
- ✅ Методы для Unit: GetUnit, GetUnitByExternalRef, GetUnitsByProperty, CreateUnit
- ✅ Поддержка универсальных external references

### 3. Обновлен gRPC SDK
- ✅ Создан `InventoryGrpcClient` в `packages/grpc-sdk/src/clients/inventory.client.ts`
- ✅ Обновлен `BookingsGrpcClient` с новыми методами
- ✅ Обновлены экспорты в `packages/grpc-sdk/src/index.ts`
- ✅ Регенерированы TypeScript типы из proto файлов

### 4. Добавлен gRPC transport в `inventory-subgraph`
- ✅ Создан `src/grpc/inventory.grpc.service.ts` - обработчик gRPC запросов
- ✅ Создан `src/transport/grpc.transport.ts` - транспорт для запуска gRPC сервера
- ✅ Обновлен `src/server.ts` для запуска gRPC сервера на порту 4101
- ✅ Добавлены зависимости в `package.json`

### 5. Создан микросервис `realty-calendar-adapter`
- ✅ Структура проекта:
  - `src/main.ts` - HTTP сервер без Express
  - `src/config/env.ts` - конфигурация из ENV
  - `src/clients/grpc-clients.factory.ts` - фабрика gRPC клиентов
  - `src/realty-calendar/realty-calendar.controller.ts` - HTTP endpoint handler
  - `src/realty-calendar/realty-calendar.service.ts` - основная бизнес-логика
  - `src/realty-calendar/dto/` - типы для webhook и внутренние DTO
  - `src/realty-calendar/mappers/` - маппинг webhook → внутренние DTO

### 6. Реализован основной flow
- ✅ Парсинг webhook от RealtyCalendar
- ✅ Поиск/создание Property/Unit по externalRef или адресу
- ✅ Upsert брони (CREATE/UPDATE) с поддержкой externalRef
- ✅ Отмена брони (CANCEL)
- ✅ Удаление брони (DELETE)

### 7. Обновлен `bookings-subgraph`
- ✅ Добавлены методы `getBookingByExternalRef` и `updateBooking` в `BookingService`
- ✅ Обновлен `BookingsGrpcService` с новыми методами
- ✅ Обновлен `GrpcTransport` для регистрации новых методов

## Структура проекта

```
backend/realty-calendar-adapter/
├── package.json
├── tsconfig.json
├── env.example
└── src/
    ├── main.ts
    ├── config/
    │   └── env.ts
    ├── clients/
    │   └── grpc-clients.factory.ts
    └── realty-calendar/
        ├── realty-calendar.controller.ts
        ├── realty-calendar.service.ts
        ├── dto/
        │   ├── webhook.dto.ts
        │   └── internal.dto.ts
        └── mappers/
            └── webhook.mapper.ts
```

## Endpoints

- `POST /webhooks/realty-calendar` - основной webhook endpoint
- `GET /health` - health check

## Переменные окружения

См. `backend/realty-calendar-adapter/env.example`

## Следующие шаги

1. **Добавить поддержку externalRef в Prisma схему** (если еще не добавлено):
   - Добавить поля `externalSource` и `externalId` в модель `Booking`
   - Добавить поля `externalSource` и `externalId` в модели `Property` и `Unit`

2. **Улучшить поиск брони по externalRef**:
   - Добавить метод в `BookingsDLPrisma` для поиска по externalRef
   - Оптимизировать поиск через индексы в БД

3. **Добавить проверку доступности**:
   - Реализовать метод `checkAvailability` в bookings gRPC
   - Использовать его перед созданием/обновлением брони

4. **Добавить тесты**:
   - Unit-тесты для `RealtyCalendarService`
   - E2E тесты для webhook endpoint

5. **Добавить валидацию**:
   - Валидация входящего webhook payload
   - Валидация дат и времени

6. **Добавить обработку ошибок**:
   - Более детальная обработка конфликтов
   - Retry логика для gRPC вызовов

## Запуск

```bash
# Установить зависимости
pnpm install

# Запустить в dev режиме
cd backend/realty-calendar-adapter
pnpm dev

# Или через корневой скрипт
pnpm --filter realty-calendar-adapter dev
```

## Тестирование webhook

```bash
curl -X POST http://localhost:4012/webhooks/realty-calendar \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_booking",
    "booking": {
      "id": "rc-123",
      "address": "Москва, ул. Ленина, 1",
      "begin_date": "2024-12-01",
      "end_date": "2024-12-05",
      "arrival_time": "14:00",
      "departure_time": "11:00",
      "realty_id": "prop-123",
      "realty_room_id": "unit-123"
    },
    "client": {
      "fio": "Иван Иванов",
      "phone": "+79001234567",
      "email": "ivan@example.com"
    }
  }'
```

## Архитектурные решения

1. **Отдельный микросервис** - изоляция логики интеграции с RealtyCalendar
2. **gRPC для межсервисного взаимодействия** - использует существующий SDK
3. **Универсальные externalRef** - поддержка любых внешних систем, не только RealtyCalendar
4. **HTTP без Express** - минималистичный подход, нативный Node.js HTTP сервер
5. **Inventory gRPC сервис** - правильная архитектура, отдельный gRPC сервис вместо прямого доступа к БД

