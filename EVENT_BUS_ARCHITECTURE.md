# 🎯 Event Bus Architecture - Полное руководство

## 📌 Проблема в текущей архитектуре

### Было:
```
Cleaning-subgraph → (прямой вызов) → Notifications-subgraph
  - Размытая ответственность
  - Тесная связанность
  - Нет истории событий
  - Сложно добавить новые обработчики
```

### Стало:
```
Cleaning-subgraph → Events-subgraph → {Notifications, Analytics, Audit}
  - Четкое разделение
  - Слабая связанность  
  - Event Store (история всех событий)
  - Легко расширяется
```

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN SUBGRAPHS                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Cleaning    │  │  Bookings    │  │     Ops      │      │
│  │  Subgraph    │  │  Subgraph    │  │  Subgraph    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         │ publishEvent()   │ publishEvent()   │              │
│         │ (gRPC 4112)      │ (gRPC 4112)      │              │
│         └──────────────────┼──────────────────┘              │
│                            ▼                                 │
│              ┌─────────────────────────────┐                │
│              │   EVENTS SUBGRAPH (4012)    │                │
│              │                             │                │
│              │  ┌───────────────────────┐ │                │
│              │  │   gRPC Server (4112)  │ │                │
│              │  └───────────┬───────────┘ │                │
│              │              │             │                │
│              │  ┌───────────▼───────────┐ │                │
│              │  │   EventBusService     │ │                │
│              │  │   1. Store Event      │ │                │
│              │  │   2. Find Subscribers │ │                │
│              │  │   3. Route to Handlers│ │                │
│              │  └───────────┬───────────┘ │                │
│              │              │             │                │
│              │  ┌───────────▼───────────┐ │                │
│              │  │   Event Store (DB)    │ │                │
│              │  │   • Event             │ │                │
│              │  │   • EventSubscription │ │                │
│              │  │   • EventNotification │ │                │
│              │  └───────────────────────┘ │                │
│              └──────────┬──────────────────┘                │
│                         │ handleEvent()                     │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │Notifications│ │  Analytics  │ │   Audit     │          │
│  │  Subgraph   │ │  Subgraph   │ │  Subgraph   │          │
│  │  (4011)     │ │  (TBD)      │ │  (TBD)      │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Модели данных

### 1. Event (Событие)

```typescript
{
  id: 'evt_abc123',
  type: 'CLEANING_ASSIGNED',
  sourceSubgraph: 'cleaning-subgraph',
  entityType: 'Cleaning',
  entityId: 'clean_xyz',
  orgId: 'petroga',
  
  // Участники
  actorUserId: 'user_admin',      // Кто назначил
  targetUserIds: ['user_cleaner'], // Кому назначили
  
  // Данные
  payload: {
    cleaningId: 'clean_xyz',
    unitName: 'Квартира 101',
    scheduledAt: '2025-10-26T10:00:00Z'
  },
  
  // Статус обработки
  status: 'PROCESSED',
  processedAt: '2025-10-26T08:01:23Z',
  createdAt: '2025-10-26T08:01:20Z'
}
```

### 2. EventSubscription (Подписка)

```typescript
{
  id: 'sub_notification_cleaning',
  handlerType: 'NOTIFICATION',
  eventTypes: [
    'CLEANING_SCHEDULED',
    'CLEANING_ASSIGNED',
    'CLEANING_STARTED',
    'CLEANING_COMPLETED'
  ],
  isActive: true,
  config: null
}
```

### 3. EventNotification (Связь)

```typescript
{
  id: 'link_123',
  eventId: 'evt_abc123',
  notificationId: 'notif_xyz789',
  createdAt: '2025-10-26T08:01:21Z'
}
```

---

## 🔄 Полный Flow: Создание уборки

### Шаг 1: Cleaning-subgraph публикует событие

```typescript
// cleaning-subgraph/src/resolvers/index.ts
scheduleCleaning: async (input) => {
  const cleaning = await dl.scheduleCleaning(input);
  
  // 🎯 ПУБЛИКУЕМ СОБЫТИЕ
  await eventsClient.publishEvent({
    eventType: EventType.CLEANING_ASSIGNED,
    sourceSubgraph: 'cleaning-subgraph',
    entityType: 'Cleaning',
    entityId: cleaning.id,
    orgId: cleaning.orgId,
    actorUserId: context.currentUserId,
    targetUserIds: [cleaning.cleanerId],
    payloadJson: JSON.stringify({
      cleaningId: cleaning.id,
      unitId: cleaning.unitId,
      unitName: unit.name,
      scheduledAt: cleaning.scheduledAt
    })
  });
  
  return cleaning; // ✅ Чистый код без логики уведомлений!
}
```

### Шаг 2: Events-subgraph обрабатывает

```typescript
// events-subgraph/src/services/event-bus.service.ts
async publishEvent(input) {
  // 1. Сохраняем событие
  const event = await prisma.event.create({
    data: {
      type: 'CLEANING_ASSIGNED',
      sourceSubgraph: 'cleaning-subgraph',
      entityId: 'clean_xyz',
      targetUserIds: ['user_cleaner'],
      payload: { ... },
      status: 'PENDING'
    }
  });
  
  // 2. Асинхронно обрабатываем
  setImmediate(() => processEvent(event.id));
  
  return event; // ✅ Сразу возвращаем, не ждем обработки
}

async processEvent(eventId) {
  // 3. Находим подписчиков
  const subs = await prisma.eventSubscription.findMany({
    where: {
      isActive: true,
      eventTypes: { has: 'CLEANING_ASSIGNED' }
    }
  });
  // Результат: [
  //   { handlerType: 'NOTIFICATION', ... },
  //   { handlerType: 'AUDIT', ... }
  // ]
  
  // 4. Отправляем каждому обработчику
  for (const sub of subs) {
    const handler = handlers.get(sub.handlerType);
    await handler.handle(event);
  }
  
  // 5. Обновляем статус
  await prisma.event.update({
    where: { id: eventId },
    data: { status: 'PROCESSED', processedAt: new Date() }
  });
}
```

### Шаг 3: Notifications-subgraph обрабатывает

```typescript
// notifications-subgraph/src/handlers/event-handler.ts
async handleEvent(event) {
  logger.info('Handling event', { eventId: event.id, type: event.type });
  
  // Для каждого затронутого пользователя
  for (const userId of event.targetUserIds) {
    // 1. Загружаем настройки
    const settings = await prisma.userNotificationSettings.findUnique({
      where: { userId }
    });
    
    // 2. Проверяем условия
    if (!settings?.enabled) continue;
    if (!settings.subscribedEvents.includes(event.type)) continue;
    
    // 3. Загружаем шаблон (если есть)
    const template = await prisma.notificationTemplate.findFirst({
      where: { eventType: event.type }
    });
    
    // 4. Рендерим сообщение
    const { title, message } = renderTemplate(template, event.payload);
    // Например:
    // title = "🧹 Новая уборка назначена!"
    // message = "Вам назначена уборка в Квартира 101 на 26 октября в 10:00"
    
    // 5. Создаем Notification с Deliveries
    const notification = await prisma.notification.create({
      data: {
        eventId: event.id, // ← Связь с событием!
        userId,
        orgId: event.orgId,
        eventType: event.type,
        title,
        message,
        actionUrl: `/cleanings/${event.payload.cleaningId}`,
        priority: 'HIGH',
        status: 'PENDING',
        
        // Создаем deliveries для каждого канала
        deliveryStatuses: {
          create: settings.enabledChannels.map(channel => ({
            channel,
            recipientType: getRecipientType(channel),
            recipientId: getRecipientId(settings, channel),
            status: 'PENDING'
          }))
        }
      }
    });
    
    // 6. Создаем связь Event ← → Notification
    await prisma.eventNotification.create({
      data: {
        eventId: event.id,
        notificationId: notification.id
      }
    });
    
    // 7. Отправляем через провайдеры
    await deliverNotification(notification);
  }
}
```

### Шаг 4: Provider отправляет

```typescript
async deliverNotification(notification) {
  for (const delivery of notification.deliveryStatuses) {
    // Обновляем delivery → SENDING
    await updateDelivery(delivery.id, { status: 'SENDING' });
    
    try {
      if (delivery.channel === 'TELEGRAM') {
        const result = await telegramProvider.send({
          chatId: delivery.recipientId, // telegramChatId
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl
        });
        
        // Обновляем delivery → SENT
        await updateDelivery(delivery.id, {
          status: 'SENT',
          deliveredAt: new Date(),
          externalId: result.messageId
        });
      }
      
      if (delivery.channel === 'WEBSOCKET') {
        await websocketProvider.broadcast({
          userId: delivery.recipientId,
          notification
        });
        
        await updateDelivery(delivery.id, {
          status: 'SENT',
          deliveredAt: new Date()
        });
      }
    } catch (error) {
      // Обновляем delivery → FAILED
      await updateDelivery(delivery.id, {
        status: 'FAILED',
        failedAt: new Date(),
        error: error.message,
        retryCount: delivery.retryCount + 1
      });
    }
  }
  
  // Агрегируем статус Notification
  await aggregateNotificationStatus(notification.id);
}

async aggregateNotificationStatus(notificationId) {
  const deliveries = await prisma.notificationDelivery.findMany({
    where: { notificationId }
  });
  
  const allSent = deliveries.every(d => d.status === 'SENT');
  const allFailed = deliveries.every(d => d.status === 'FAILED');
  const someSent = deliveries.some(d => d.status === 'SENT');
  
  let status;
  if (allSent) status = 'SENT';
  else if (allFailed) status = 'FAILED';
  else if (someSent) status = 'PARTIAL';
  else status = 'PENDING';
  
  await prisma.notification.update({
    where: { id: notificationId },
    data: { status }
  });
}
```

---

## 📋 Статусы: четкое разделение

### Notification.status (агрегированный)
```typescript
PENDING  // Ни одна delivery не отправлена
SENDING  // Хотя бы одна delivery в процессе
SENT     // ВСЕ deliveries успешны
PARTIAL  // Часть успешна, часть failed
FAILED   // ВСЕ deliveries failed
READ     // Пользователь прочитал
```

### NotificationDelivery.status (конкретный канал)
```typescript
PENDING   // Ожидает отправки
SENDING   // Отправляется сейчас
SENT      // Отправлено успешно
DELIVERED // Доставлено (с подтверждением от провайдера)
FAILED    // Не удалось отправить
BOUNCED   // Отскочило (для email)
```

### Event.status (обработка)
```typescript
PENDING    // Ожидает обработки
PROCESSING // Обрабатывается
PROCESSED  // Все обработчики выполнены успешно
FAILED     // Хотя бы один обработчик failed
CANCELLED  // Отменено
```

---

## 🎯 Пример: Telegram уведомление

### 1. Создается уборка
```typescript
// User ID: user_123
// telegramChatId: 987654321
```

### 2. Событие
```json
{
  "type": "CLEANING_ASSIGNED",
  "targetUserIds": ["user_123"],
  "payload": {
    "cleaningId": "clean_xyz",
    "unitName": "Квартира 101"
  }
}
```

### 3. Notification
```json
{
  "id": "notif_abc",
  "eventId": "evt_xyz",
  "userId": "user_123",
  "title": "🧹 Новая уборка!",
  "message": "Вам назначена уборка в Квартира 101",
  "status": "PENDING"
}
```

### 4. Deliveries
```json
[
  {
    "id": "del_001",
    "notificationId": "notif_abc",
    "channel": "TELEGRAM",
    "recipientType": "TELEGRAM_CHAT_ID",
    "recipientId": "987654321",  ← telegramChatId из settings
    "status": "PENDING"
  },
  {
    "id": "del_002",
    "notificationId": "notif_abc",
    "channel": "WEBSOCKET",
    "recipientType": "USER_ID",
    "recipientId": "user_123",  ← userId
    "status": "PENDING"
  }
]
```

### 5. Отправка

**Telegram delivery:**
```
PENDING → SENDING → (Telegram API) → SENT
                    ↓
                messageId: "12345"
                deliveredAt: 2025-10-26T08:01:22Z
```

**WebSocket delivery:**
```
PENDING → SENDING → (broadcast) → SENT
                    ↓
                deliveredAt: 2025-10-26T08:01:22Z
```

### 6. Агрегация

```
Notification.status:
  Все deliveries SENT → status = 'SENT'
  Telegram SENT + WebSocket SENT → 'SENT' ✅
```

### 7. Telegram бот отправляет

```
📱 Telegram Message:

🧹 Новая уборка назначена!

Вам назначена уборка в Квартира 101 на 26 октября в 10:00

[Открыть детали] ← Кнопка с actionUrl
```

---

## 🔑 Ключевые улучшения

### 1. Четкая ответственность

| Компонент | Ответственность |
|-----------|----------------|
| **Cleaning-subgraph** | Бизнес-логика уборок, публикация событий |
| **Events-subgraph** | Прием, хранение, маршрутизация событий |
| **Notifications-subgraph** | Создание и доставка уведомлений |
| **Telegram Provider** | Только отправка в Telegram API |

### 2. Event Store

- История всех событий системы
- Можно воспроизвести (replay)
- Аудит из коробки
- Отладка и мониторинг

### 3. Гибкость

Добавить новый обработчик:
```typescript
// Просто регистрируем
eventBus.registerHandler({
  type: 'ANALYTICS',
  handle: async (event) => {
    await analyticsClient.trackEvent(event);
  }
});

// И создаем подписку в БД
INSERT INTO "EventSubscription" (...) 
VALUES ('sub_analytics', 'ANALYTICS', [...]);
```

### 4. Надежность

- Retry logic для failed deliveries
- Отдельный статус для каждого канала
- Не теряем события при ошибках
- Можно переотправить (replay)

---

## 🚀 Следующие шаги

1. ✅ Events-subgraph создан
2. ✅ Модели добавлены в Prisma
3. ✅ Миграция применена
4. ✅ Подписки созданы
5. ⏳ Обновить cleaning-subgraph
6. ⏳ Обновить notifications-subgraph (handler)
7. ⏳ Добавить в gateway-mesh
8. ⏳ Тестирование

Готовы продолжить? 🎯

