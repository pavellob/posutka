# 🧪 Тестовые запросы для Events Subgraph

Откройте GraphiQL: http://localhost:4013/graphql

## 1. Проверить подписки

```graphql
query GetSubscriptions {
  subscriptions {
    id
    handlerType
    eventTypes
    isActive
    createdAt
  }
}
```

**Ожидаемый результат:** 4 подписки (NOTIFICATION x3, AUDIT, ANALYTICS)

---

## 2. Проверить события

```graphql
query GetEvents {
  events(first: 10) {
    edges {
      node {
        id
        type
        entityType
        entityId
        targetUserIds
        status
        createdAt
      }
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
```

**Ожидаемый результат:** События, созданные при создании уборок

---

## 3. Публикация тестового события

```graphql
mutation TestPublishEvent {
  publishEvent(input: {
    type: CLEANING_ASSIGNED
    sourceSubgraph: "test-manual"
    entityType: "Cleaning"
    entityId: "test_cleaning_123"
    orgId: "petroga"
    targetUserIds: ["cmfsdpybk0002oelx99yyf53q"]
    payload: {
      cleaningId: "test_cleaning_123"
      unitName: "Тестовая квартира 101"
      scheduledAt: "2025-10-26T14:00:00Z"
    }
  }) {
    id
    type
    status
    targetUserIds
    createdAt
  }
}
```

**Ожидаемый результат:** Событие создано, status: PENDING

---

## 4. Статистика событий

```graphql
query GetEventStats {
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

## 5. Фильтрация по типу

```graphql
query GetCleaningEvents {
  events(type: CLEANING_ASSIGNED, first: 5) {
    edges {
      node {
        id
        type
        entityId
        targetUserIds
        payload
        status
        createdAt
      }
    }
  }
}
```

---

## 6. Создать новую подписку

```graphql
mutation CreateTestSubscription {
  createSubscription(input: {
    handlerType: CUSTOM
    eventTypes: [CLEANING_COMPLETED]
  }) {
    id
    handlerType
    eventTypes
    isActive
  }
}
```

---

## 7. Replay события

```graphql
mutation ReplayEvent {
  replayEvent(id: "YOUR_EVENT_ID_HERE") {
    id
    status
    processedAt
  }
}
```

---

## Проверка в БД (через другие tools)

Если нужно проверить напрямую в БД:

```sql
-- Подписки
SELECT * FROM "EventSubscription";

-- События
SELECT * FROM "Event" ORDER BY "createdAt" DESC LIMIT 10;

-- Связи событий с уведомлениями
SELECT * FROM "EventNotification";
```

