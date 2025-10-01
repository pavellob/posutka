# Деплой с gRPC на Northflank

Этот документ описывает особенности деплоя с поддержкой gRPC.

## Архитектура

### Subgraphs с gRPC

Некоторые subgraph'ы используют gRPC для межсервисного взаимодействия:

- **bookings-subgraph**: 
  - GraphQL: порт 4002
  - gRPC: порт 4102
  - Использует gRPC клиент для вызова ops-subgraph

- **ops-subgraph**:
  - GraphQL: порт 4003  
  - gRPC: порт 4103
  - Предоставляет gRPC API для создания задач

### Порты

| Сервис | GraphQL | gRPC | Описание |
|--------|---------|------|----------|
| Gateway | 4000 | - | GraphQL API Gateway |
| Inventory | 4001 | - | Управление недвижимостью |
| Bookings | 4002 | 4102 | Бронирования + gRPC клиент |
| Ops | 4003 | 4103 | Операции + gRPC сервер |
| Billing | 4004 | - | Биллинг |
| Identity | 4005 | - | Идентификация |
| Listings | 4006 | - | Листинги |
| Legal | 4007 | - | Юридические документы |
| AI | 4008 | - | AI-оркестрация |

## Переменные окружения

### Обязательные

```bash
# База данных
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Окружение
NODE_ENV="production"
```

### Опциональные для gRPC

```bash
# gRPC хосты (по умолчанию localhost в production)
OPS_GRPC_HOST="localhost"
OPS_GRPC_PORT="4103"
```

## Northflank конфигурация

В `northflank.yml` настроены все порты:

```yaml
ports:
  - port: 4000  # Gateway (основной)
    protocol: http
  - port: 4002  # Bookings GraphQL
    protocol: http
  - port: 4102  # Bookings gRPC
    protocol: http
  - port: 4003  # Ops GraphQL
    protocol: http
  - port: 4103  # Ops gRPC
    protocol: http
```

## Docker

### Мульти-стейдж билд

Все subgraph'ы используют multi-stage build для оптимизации:

1. **Base stage**: Установка зависимостей, генерация proto, сборка
2. **Production stage**: Только prod зависимости и билды

### Особенности

- Установлен `protobuf` для генерации proto файлов
- Node 20 Alpine для меньшего размера образа
- Генерация proto происходит на стадии сборки

## Деплой

### Через Docker Compose (локально)

```bash
docker-compose up --build
```

### Через Northflank

1. Пушим в репозиторий
2. Northflank автоматически деплоит из `Dockerfile`
3. Все порты прокидываются согласно `northflank.yml`

### Проверка

После деплоя проверьте:

```bash
# GraphQL Gateway
curl http://your-app.northflank.app:4000/graphql

# Ops Subgraph GraphQL
curl http://your-app.northflank.app:4003/graphql

# gRPC работает внутри контейнера между сервисами
```

## Логирование

Все gRPC вызовы логируются через `@repo/shared-logger`:

- Клиент логирует отправку запроса
- Сервер логирует получение и обработку
- Ошибки логируются с полным контекстом

Пример лога:

```
[grpc-ops-client] Creating cleaning task via GRPC
  bookingId: "cmg7tyknk0002e9gdphw827nw"
  orgId: "org-posutka"
[ops-grpc-service] Received GRPC request
  request: {...}
```

## Миграции

При деплое автоматически:

1. Применяются Prisma миграции
2. Запускаются seeds (если нужно)
3. Генерируется Prisma Client

## Troubleshooting

### gRPC ошибки подключения

Проблема: `GRPC client is not connected`

Решение:
```typescript
await opsClient.connect()
```

### Proto генерация падает

Проблема: `protoc-gen-ts_proto not found`

Решение: Проверьте путь к плагину в package.json:
```json
"generate": "protoc --plugin=../../node_modules/.bin/protoc-gen-ts_proto ..."
```

### Порты заняты

Проблема: `address already in use`

Решение:
```bash
# Убить процесс на порту
lsof -ti:4103 | xargs kill -9
```

## JSON over gRPC

Мы используем JSON сериализацию для простоты:

```typescript
requestSerialize: (value: any) => Buffer.from(JSON.stringify(value))
requestDeserialize: (value: Buffer) => JSON.parse(value.toString())
```

Это упрощает отладку и не требует бинарных protobuf файлов в runtime.

