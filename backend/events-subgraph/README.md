# 🎯 Events Subgraph

Централизованная шина событий (Event Bus) для системы POSUTKA.

## Назначение

Events Subgraph - это центральный компонент event-driven архитектуры, который:

- 📥 **Принимает** события от всех subgraphs
- 💾 **Хранит** полную историю событий (Event Store)
- 🔀 **Маршрутизирует** события к обработчикам (Notifications, Analytics, Audit)
- 🔄 **Обеспечивает** надежность доставки и retry logic

## Архитектура

```
Domain Subgraphs → Events Subgraph → Handler Subgraphs
(cleaning, bookings)   (Event Bus)   (notifications, analytics)
```

## Ключевые концепции

### Event (Событие)
- **Что произошло** в системе
- **Кто** инициировал
- **Кого** это затронуло
- **Когда** и **где** (org context)
- **Данные** события (payload)

### EventSubscription (Подписка)
- **Кто** обрабатывает события
- **Какие** типы событий
- **Как** обрабатывать (config)

### Event Handlers
- **NOTIFICATION** - отправка уведомлений
- **ANALYTICS** - сбор аналитики
- **AUDIT** - аудит действий
- **WEBHOOK** - внешние интеграции

## Установка

```bash
cd backend/events-subgraph
pnpm install
```

## Запуск

```bash
# Development
pnpm dev

# Production
pnpm build && pnpm start
```

## Использование

### Публикация события (gRPC)

```typescript
import { createEventsGrpcClient } from '@repo/grpc-sdk';

const client = createEventsGrpcClient({
  host: 'localhost',
  port: 4112
});

await client.publishEvent({
  eventType: 2, // CLEANING_ASSIGNED
  sourceSubgraph: 'cleaning-subgraph',
  entityType: 'Cleaning',
  entityId: 'clean_123',
  orgId: 'org_abc',
  actorUserId: 'user_admin',
  targetUserIds: ['user_cleaner'],
  payloadJson: JSON.stringify({
    cleaningId: 'clean_123',
    unitName: 'Квартира 101',
    scheduledAt: '2025-10-26T10:00:00Z'
  })
});
```

### Публикация события (GraphQL)

```graphql
mutation {
  publishEvent(input: {
    type: CLEANING_ASSIGNED
    sourceSubgraph: "cleaning-subgraph"
    entityType: "Cleaning"
    entityId: "clean_123"
    orgId: "org_abc"
    targetUserIds: ["user_cleaner"]
    payload: {
      cleaningId: "clean_123"
      unitName: "Квартира 101"
    }
  }) {
    id
    status
    createdAt
  }
}
```

### Создание подписки

```graphql
mutation {
  createSubscription(input: {
    handlerType: NOTIFICATION
    eventTypes: [
      CLEANING_ASSIGNED
      CLEANING_STARTED
      CLEANING_COMPLETED
    ]
  }) {
    id
    handlerType
    isActive
  }
}
```

## Порты

- **4012** - GraphQL HTTP
- **4112** - gRPC Server

## Обработчики событий

Обработчики регистрируются в `server.ts`:

```typescript
// Notification handler
eventBus.registerHandler({
  type: 'NOTIFICATION',
  handle: async (event) => {
    await notificationsClient.handleEvent(event);
  }
});

// Analytics handler  
eventBus.registerHandler({
  type: 'ANALYTICS',
  handle: async (event) => {
    await analyticsClient.trackEvent(event);
  }
});
```

## Преимущества

1. **Разделение ответственности** - domain subgraphs не знают о notifications
2. **Event Sourcing** - полная история всех событий
3. **Гибкая маршрутизация** - легко добавить новые обработчики
4. **Replay** - можно переотправить события
5. **Мониторинг** - централизованная точка для отладки

