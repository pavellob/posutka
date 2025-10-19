# 🔍 Отладка gRPC сервера Notifications

## Проблема

При отправке уведомлений через gRPC возникает ошибка:

```
[notifications-grpc] Received notification request via gRPC
channels: [0, 4]
[notifications-grpc] Failed to process notification request:
error: {}
```

## Улучшенное логирование

### Внесенные изменения для отладки:

1. **`grpc/notifications.grpc.service.ts`:**
   - Добавлено детальное логирование ошибок (stack trace, request details)
   - Добавлена обработка некорректного JSON в metadata
   - Добавлено логирование на каждом этапе обработки

2. **`services/notification.service.ts`:**
   - Улучшено логирование ошибок при создании уведомления в БД

## Как отладить

### 1. Проверить миграции БД

Убедитесь, что таблицы `Notification` и `NotificationDelivery` созданы:

```bash
cd packages/datalayer-prisma

# Проверить статус миграций
pnpm prisma migrate status

# Если миграции не применены, применить
pnpm prisma migrate deploy

# Или в dev-режиме
pnpm prisma migrate dev
```

### 2. Проверить подключение к БД

Убедитесь, что `DATABASE_URL` в `.env` правильный:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/posutka
```

Проверить подключение:

```bash
cd packages/datalayer-prisma
pnpm prisma db pull
```

### 3. Просмотреть полные логи

После улучшений логирования, запустите сервер и посмотрите детали:

```bash
cd backend/notifications-subgraph
pnpm dev
```

Теперь вы увидите:

```
[notifications-grpc] Received notification request via gRPC
[notifications-grpc] Creating notification in DB via gRPC
[notification-service] Creating notification in DB
[notification-service] ✅ Notification created in DB (если успешно)
[notification-service] ❌ Failed to create notification (если ошибка + stack trace)
```

### 4. Частые ошибки

#### Ошибка: `Unknown column 'Notification.xxx'`
**Причина:** Миграции не применены  
**Решение:** Запустить `prisma migrate deploy`

#### Ошибка: `Cannot read property 'xxx' of undefined`
**Причина:** Неправильная структура запроса  
**Решение:** Проверить формат gRPC запроса

#### Ошибка: `Invalid JSON in metadata`
**Причина:** Metadata содержит некорректный JSON  
**Решение:** Теперь автоматически обрабатывается (логируется warning)

#### Ошибка: `Connection refused`
**Причина:** БД не запущена или неправильный URL  
**Решение:** Проверить DATABASE_URL и запустить PostgreSQL

### 5. Тестовый gRPC запрос

Из `cleaning-subgraph` или другого субграфа:

```typescript
import { createNotificationsGrpcClient, EventType, Priority, NotificationChannel } from '@repo/grpc-sdk';

const client = createNotificationsGrpcClient({
  host: 'localhost',
  port: 4111,
});

await client.connect();

const response = await client.sendNotification({
  eventType: EventType.EVENT_TYPE_CLEANING_ASSIGNED,
  recipientIds: ['123456789'], // Telegram chat ID
  channels: [NotificationChannel.CHANNEL_TELEGRAM],
  priority: Priority.PRIORITY_HIGH,
  title: 'Test',
  message: 'Test message',
  metadata: JSON.stringify({ test: true }), // Должен быть JSON string
});

console.log('Response:', response);
```

### 6. Проверить Prisma Client

Убедитесь, что Prisma Client сгенерирован:

```bash
cd packages/datalayer-prisma
pnpm prisma generate
```

### 7. Проверить схему БД

Посмотрите, есть ли таблицы:

```sql
-- Подключитесь к PostgreSQL
psql -U user -d posutka

-- Проверьте таблицы
\dt

-- Должны быть:
-- Notification
-- NotificationDelivery
-- UserNotificationSettings

-- Посмотрите структуру
\d "Notification"
\d "NotificationDelivery"
```

## Ожидаемые логи при успешной работе

```
[notifications-grpc] Received notification request via gRPC
  eventType: 14 (CLEANING_ASSIGNED)
  recipients: ["123456789"]
  channels: [0, 4] (TELEGRAM, WEBSOCKET)

[notifications-grpc] Creating notification in DB via gRPC
  orgId: org_xxx
  eventType: CLEANING_ASSIGNED
  deliveryTargetsCount: 2

[notification-service] Creating notification in DB
  eventType: CLEANING_ASSIGNED
  deliveryTargetsCount: 2
  channels: ["TELEGRAM", "WEBSOCKET"]

[notification-service] ✅ Notification created in DB
  notificationId: notif_xxx
  status: PENDING
  deliveriesCount: 2

[notifications-grpc] Notification created, sending through providers
  notificationId: notif_xxx

[notifications-grpc] Sending notification through provider manager
  channels: ["TELEGRAM", "WEBSOCKET"]
  recipientId: 123456789

[telegram-provider] Sending message to chat 123456789
[websocket-provider] Broadcasting to user...

[notifications-grpc] Provider manager returned results
  resultsCount: 2
  channels: ["TELEGRAM", "WEBSOCKET"]

[notifications-grpc] Notification processed
  notificationId: notif_xxx
  sentCount: 2
  failedCount: 0
```

## Следующие шаги

После применения этих изменений:

1. Перезапустить notifications-subgraph
2. Отправить тестовый запрос
3. Просмотреть логи и найти место ошибки
4. Использовать stack trace для диагностики

---

**Дата:** 19 октября 2025  
**Статус:** Улучшенное логирование добавлено, ожидание тестирования

