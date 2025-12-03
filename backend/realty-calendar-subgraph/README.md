# Realty Calendar Subgraph

GraphQL subgraph для интеграции с Calendar Realty. Обрабатывает импорт XML feed для синхронизации объектов недвижимости через GraphQL API.

## Возможности

1. **XML Feed импорт** - импорт объектов недвижимости через XML feed
2. **GraphQL API** - мутации для импорта через единый GraphQL endpoint

> **Примечание**: Webhook обработка перенесена в `realty-calendar-adapter` (порт 4201). Этот subgraph обрабатывает только GraphQL запросы.

## Структура

```
src/
├── schema/
│   └── index.gql              # GraphQL схема
├── resolvers/
│   └── index.ts               # GraphQL резолверы
├── services/
│   └── xml-feed.service.ts    # Сервис обработки XML feed
├── parsers/
│   └── xml-feed.parser.ts     # Парсер XML с Zod валидацией
├── mappers/
│   └── xml-feed.mapper.ts     # Маппинг XML → Property/Unit
├── schemas/
│   └── xml-feed.schema.ts     # Zod схемы валидации
├── dto/                       # Data Transfer Objects
├── clients/
│   └── grpc-clients.factory.ts # gRPC клиенты
├── realty-calendar.service.ts    # Сервис обработки бронирований
└── server.ts                     # GraphQL сервер
```

## Запуск

```bash
# Установить зависимости
pnpm install

# Запустить в dev режиме
pnpm dev

# Или через корневой скрипт
pnpm --filter realty-calendar-subgraph dev
```

## Переменные окружения

```bash
REALTY_CALENDAR_SUBGRAPH_PORT=4013
REALTY_CALENDAR_DEFAULT_ORG_ID=petroga

# gRPC настройки
BOOKINGS_GRPC_HOST=localhost
BOOKINGS_GRPC_PORT=4102
INVENTORY_GRPC_HOST=localhost
INVENTORY_GRPC_PORT=4101
GRPC_TIMEOUT=5000
GRPC_RETRY_ATTEMPTS=3
GRPC_RETRY_DELAY=1000
```

## Endpoints

### GraphQL

- `POST /graphql` - GraphQL endpoint
- `GET /health` - health check
- Мутация `importRealtyCalendarFeed` - импорт XML feed

> **Примечание**: Webhook и XML feed HTTP endpoints перенесены в `realty-calendar-adapter` (порт 4201).

## GraphQL Мутация

```graphql
mutation ImportRealtyCalendarFeed($orgId: String!, $xmlContent: String!) {
  importRealtyCalendarFeed(orgId: $orgId, xmlContent: $xmlContent) {
    success
    outcome
    processed
    created
    updated
    errors {
      offerId
      message
    }
  }
}
```

## Интеграция в Gateway Mesh

Subgraph автоматически интегрирован в gateway-mesh через конфигурацию в `mesh.config.ts`.

## Архитектура

- **GraphQL Subgraph** - для интеграции в общую GraphQL архитектуру
- **gRPC Clients** - для общения с inventory и bookings сервисами
- **Zod валидация** - типобезопасная валидация XML данных
- **External References** - поддержка внешних ID для синхронизации

## Разделение ответственности

- **realty-calendar-subgraph** (порт 4013) - GraphQL API для импорта XML feed
- **realty-calendar-adapter** (порт 4201) - HTTP webhook и XML feed endpoints

