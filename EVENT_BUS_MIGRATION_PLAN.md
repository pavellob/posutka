# 🚀 Event Bus Migration Plan

## ✅ Phase 1: Infrastructure (COMPLETED)

- [x] Создан events-subgraph
- [x] Добавлены Prisma модели (Event, EventSubscription, EventNotification)
- [x] Создана GraphQL схема
- [x] Создан gRPC протокол (events.proto)
- [x] Реализован EventBusService
- [x] Применена миграция БД
- [x] Созданы начальные подписки

## ⏳ Phase 2: Integration (IN PROGRESS)

### Step 1: Генерация gRPC кода
```bash
cd packages/grpc-sdk
pnpm proto:generate  # Генерирует код из events.proto
```

### Step 2: Обновить cleaning-subgraph

**Файлы для изменения:**
- `src/services/events-client.ts` ✅ СОЗДАН
- `src/resolvers/index.ts` - заменить прямые вызовы notifications на events

**Было:**
```typescript
scheduleCleaning(input) {
  const cleaning = await dl.scheduleCleaning(input);
  
  // Прямой вызов notifications
  await notificationClient.notifyCleaningAssigned({ ... });
  
  return cleaning;
}
```

**Станет:**
```typescript
scheduleCleaning(input) {
  const cleaning = await dl.scheduleCleaning(input);
  
  // Публикация события
  await eventsClient.publishCleaningAssigned({
    cleaningId: cleaning.id,
    cleanerId: cleaning.cleanerId,
    unitName: unit.name,
    scheduledAt: cleaning.scheduledAt,
    orgId: cleaning.orgId
  });
  
  return cleaning; // ✅ Чистый код!
}
```

### Step 3: Добавить event handler в notifications-subgraph

**Создать:**
- `src/handlers/event-handler.ts` - обработчик событий
- Регистрация в `server.ts`

**Логика:**
```typescript
async handleEvent(event: Event) {
  for (const userId of event.targetUserIds) {
    // 1. Загрузить настройки
    const settings = await getUserSettings(userId);
    
    // 2. Проверить подписку
    if (!shouldNotify(settings, event.type)) continue;
    
    // 3. Рендерить шаблон
    const { title, message } = renderTemplate(event);
    
    // 4. Создать Notification + Deliveries
    const notification = await createNotification(event, userId, title, message);
    
    // 5. Создать связь Event ← → Notification
    await linkEventToNotification(event.id, notification.id);
    
    // 6. Отправить
    await deliverNotification(notification);
  }
}
```

### Step 4: Зарегистрировать handler в events-subgraph

**В `events-subgraph/src/server.ts`:**
```typescript
import { NotificationsHandler } from './handlers/notifications-handler.js';

const notificationsHandler = new NotificationsHandler(prisma);
eventBus.registerHandler({
  type: 'NOTIFICATION',
  handle: notificationsHandler.handle.bind(notificationsHandler)
});
```

### Step 5: Обновить gateway-mesh

**Добавить events-subgraph:**
```typescript
// mesh.config.ts
{
  sourceHandler: loadGraphQLHTTPSubgraph('events-subgraph', {
    endpoint: 'http://localhost:4012/graphql'
  })
}
```

## 📋 Phase 3: Testing

### Test 1: Публикация события

```bash
# Запустить events-subgraph
cd backend/events-subgraph
pnpm dev  # Порт 4012

# Проверить GraphiQL
open http://localhost:4012/graphql
```

**GraphQL запрос:**
```graphql
mutation {
  publishEvent(input: {
    type: CLEANING_ASSIGNED
    sourceSubgraph: "test"
    entityType: "Cleaning"
    entityId: "test_123"
    targetUserIds: ["user_123"]
    payload: {
      cleaningId: "test_123"
      unitName: "Test Unit"
    }
  }) {
    id
    status
    createdAt
  }
}
```

### Test 2: Проверка Event Store

```graphql
query {
  events(first: 10) {
    edges {
      node {
        id
        type
        entityType
        status
        createdAt
      }
    }
  }
}
```

### Test 3: Проверка подписок

```graphql
query {
  subscriptions {
    id
    handlerType
    eventTypes
    isActive
  }
}
```

### Test 4: End-to-end с уборкой

1. Создать уборку через backoffice
2. Проверить, что событие создано в Event таблице
3. Проверить, что уведомление создано
4. Проверить, что deliveries созданы и отправлены
5. Проверить Telegram сообщение

## 🔧 Phase 4: Cleanup (опционально)

После успешного тестирования можно:
- Убрать старые прямые вызовы notifications
- Удалить notification-client.ts из cleaning-subgraph
- Обновить документацию

## 📊 Мониторинг

### Event Stats
```graphql
query {
  eventStats(from: "2025-10-26T00:00:00Z") {
    totalEvents
    processedEvents
    failedEvents
    eventsByType {
      type
      count
    }
  }
}
```

### Failed Events
```graphql
query {
  events(status: FAILED, first: 10) {
    edges {
      node {
        id
        type
        entityId
        createdAt
        metadata  # Содержит ошибки
      }
    }
  }
}
```

## 🎯 Следующие шаги

1. ⏳ Сгенерировать gRPC код из events.proto
2. ⏳ Раскомментировать gRPC вызовы в EventsClient
3. ⏳ Обновить scheduleCleaning резолвер
4. ⏳ Создать NotificationsHandler для обработки событий
5. ⏳ Протестировать

## 📝 Примечания

- Events-subgraph работает асинхронно (не блокирует основной flow)
- Старая логика уведомлений продолжит работать (обратная совместимость)
- Миграция может быть постепенной (subgraph за subgraph)
- Event Store дает полную историю для отладки

Готовы к следующему шагу? 🚀

