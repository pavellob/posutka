# 🧪 Event Bus - Руководство по тестированию

## ✅ Что уже сделано

1. ✅ Events Subgraph создан (порт 4013)
2. ✅ Модели Event, EventSubscription, EventNotification в БД
3. ✅ Миграция применена с начальными подписками
4. ✅ Cleaning-subgraph обновлен - теперь публикует события!
5. ✅ Старая логика уведомлений работает как fallback

## 🚀 Как протестировать

### Шаг 1: Проверить подписки в GraphiQL

1. Откройте http://localhost:4013/graphql
2. Выполните запрос:

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

**Ожидается:** 5 подписок
- `sub_notification_cleaning` (NOTIFICATION)
- `sub_notification_booking` (NOTIFICATION)
- `sub_notification_task` (NOTIFICATION)
- `sub_audit_all` (AUDIT)
- `sub_analytics_key_events` (ANALYTICS)

---

### Шаг 2: Создать уборку через backoffice

1. Откройте http://localhost:3001/cleanings
2. Создайте новую уборку с назначенным уборщиком

**Что происходит:**
```
Cleaning создана
  ↓
Event опубликовано в БД
  type: CLEANING_ASSIGNED
  targetUserIds: [cleanerId]
  status: PENDING
  ↓
(Пока без обработки, т.к. handlers не подключены)
```

---

### Шаг 3: Проверить, что событие создано

Откройте http://localhost:4013/graphql и выполните:

```graphql
query {
  events(first: 10) {
    edges {
      node {
        id
        type
        entityType
        entityId
        targetUserIds
        payload
        status
        createdAt
      }
    }
    pageInfo {
      totalCount
    }
  }
}
```

**Ожидается:** 
- Событие CLEANING_ASSIGNED
- targetUserIds содержит ID уборщика
- payload содержит cleaningId, unitName, scheduledAt
- status: PENDING (т.к. обработчики еще не зарегистрированы)

---

### Шаг 4: Проверить статистику

```graphql
query {
  eventStats {
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

---

### Шаг 5: Ручная публикация события

Тест без создания реальной уборки:

```graphql
mutation {
  publishEvent(input: {
    type: CLEANING_ASSIGNED
    sourceSubgraph: "test-manual"
    entityType: "Cleaning"
    entityId: "test_123"
    orgId: "petroga"
    targetUserIds: ["cmfsdpybk0002oelx99yyf53q"]
    payload: {
      cleaningId: "test_123"
      unitName: "Тестовая квартира"
      scheduledAt: "2025-10-26T15:00:00Z"
    }
  }) {
    id
    type
    status
    targetUserIds
    payload
    createdAt
  }
}
```

**Ожидается:**
- Событие создано успешно
- Возвращен ID события
- status: PENDING

---

## 🔍 Что проверить

### ✅ Events создаются
- [x] Event запись в БД при создании уборки
- [x] Правильный eventType (CLEANING_ASSIGNED)
- [x] targetUserIds заполнены
- [x] payload содержит все данные

### ⏳ Events обрабатываются (следующий этап)
- [ ] status меняется PENDING → PROCESSING → PROCESSED
- [ ] Notifications создаются
- [ ] EventNotification связи создаются
- [ ] Deliveries отправляются

### ✅ Подписки работают
- [x] Подписки созданы в БД
- [x] EventSubscription.isActive = true
- [ ] Обработчики вызываются (нужно добавить handlers)

---

## 🎯 Текущее состояние

### ✅ Работает:
1. Event Bus принимает события (GraphQL API)
2. События сохраняются в БД
3. Cleaning-subgraph публикует события
4. Подписки созданы
5. Старые уведомления продолжают работать

### ⏳ В процессе:
1. Регистрация handlers в events-subgraph
2. Notifications-subgraph обработка событий
3. Автоматическая обработка (PENDING → PROCESSED)

---

## 📋 Следующие шаги

### Phase 1: Подключить Notifications handler

**Создать в notifications-subgraph:**
```typescript
// src/handlers/event-handler.ts
export class EventHandler {
  async handle(event: Event) {
    // Логика создания уведомлений из события
  }
}
```

**Зарегистрировать в events-subgraph:**
```typescript
// src/server.ts
import { NotificationsGrpcClient } from '@repo/grpc-sdk';

const notificationsClient = new NotificationsGrpcClient('localhost:4111');

eventBus.registerHandler({
  type: 'NOTIFICATION',
  handle: async (event) => {
    // Вызвать notifications-subgraph для обработки события
    await notificationsClient.handleEvent(event);
  }
});
```

### Phase 2: Тестирование end-to-end

1. Создать уборку
2. Проверить Event (status: PENDING → PROCESSED)
3. Проверить Notification создано
4. Проверить Telegram сообщение получено

---

## 🔧 Отладка

### Логи events-subgraph
```bash
# Смотреть логи
tail -f backend/events-subgraph/logs/events.log
```

### Фильтрация событий
```graphql
query {
  events(
    type: CLEANING_ASSIGNED
    status: PENDING
    first: 5
  ) {
    edges {
      node {
        id
        createdAt
      }
    }
  }
}
```

### Replay failed события
```graphql
mutation {
  replayEvent(id: "evt_xxx") {
    id
    status
  }
}
```

---

## ✨ Готово к тестированию!

Теперь при каждом создании уборки:
1. ✅ Событие публикуется в Event Bus
2. ✅ Событие сохраняется в Event таблице
3. ⏳ Событие будет обработано (когда подключим handlers)
4. ✅ Старые уведомления продолжают работать (fallback)

Откройте GraphiQL и проверьте подписки и события! 🎯

