# ✅ Исправление: snake_case → camelCase в gRPC

## Проблема

При попытке отправить уведомление через gRPC возникала ошибка:

```
TypeError: Cannot read properties of undefined (reading '0')
at NotificationsGrpcService.SendNotification (...:45:30)
```

**Причина:** В коде использовались поля в snake_case (`recipient_ids`, `event_type`), но gRPC библиотека `ts-proto` генерирует типы в **camelCase** (`recipientIds`, `eventType`).

## Исправление

### Файл: `src/grpc/notifications.grpc.service.ts`

**Было (snake_case):**
```typescript
request.recipient_ids   ❌
request.event_type      ❌
request.org_id          ❌
request.user_id         ❌
request.action_url      ❌
request.action_text     ❌
request.scheduled_at    ❌
notification_id         ❌
sent_count              ❌
failed_count            ❌
```

**Стало (camelCase):**
```typescript
request.recipientIds    ✅
request.eventType       ✅
request.orgId           ✅
request.userId          ✅
request.actionUrl       ✅
request.actionText      ✅
request.scheduledAt     ✅
notificationId          ✅
sentCount               ✅
failedCount             ✅
```

## Изменения

### 1. Request Fields (входящие параметры)

```typescript
// БЫЛО:
recipientId: request.recipient_ids[0]
eventType: this.mapEventType(request.event_type)
orgId: request.org_id
actionUrl: request.action_url

// СТАЛО:
recipientId: request.recipientIds[0]
eventType: this.mapEventType(request.eventType)
orgId: request.orgId
actionUrl: request.actionUrl
```

### 2. Response Fields (возвращаемые значения)

```typescript
// БЫЛО:
return {
  notification_id: notification.id,
  sent_count: sentCount,
  failed_count: failedCount,
}

// СТАЛО:
return {
  notificationId: notification.id,
  sentCount: sentCount,
  failedCount: failedCount,
}
```

### 3. Добавлена типизация

```typescript
import type { 
  NotificationRequest, 
  NotificationResponse,
  BulkNotificationRequest,
  BulkNotificationResponse,
  NotificationStatusRequest,
  NotificationStatusResponse
} from '@repo/grpc-sdk';

// Методы теперь типизированы:
async SendNotification(request: NotificationRequest): Promise<NotificationResponse>
async SendBulkNotifications(request: BulkNotificationRequest): Promise<BulkNotificationResponse>
async GetNotificationStatus(request: NotificationStatusRequest): Promise<NotificationStatusResponse>
```

## Почему так?

### ts-proto генерирует camelCase

Библиотека `ts-proto` автоматически конвертирует proto файлы в TypeScript и использует **camelCase** для соответствия JavaScript конвенциям:

```proto
// В notifications.proto (snake_case):
message NotificationRequest {
  EventType event_type = 1;
  string org_id = 2;
  repeated string recipient_ids = 3;
}
```

```typescript
// В generated/notifications.ts (camelCase):
export interface NotificationRequest {
  eventType: EventType;
  orgId: string;
  recipientIds: string[];
}
```

### nice-grpc использует TypeScript типы

Когда `nice-grpc` передает данные, они уже в **camelCase** формате.

## Тестирование

После исправления gRPC сервер должен корректно принимать запросы:

```typescript
// Клиент отправляет (через grpc-sdk):
await client.sendNotification({
  eventType: EventType.EVENT_TYPE_CLEANING_ASSIGNED,
  recipientIds: ['123456789'],
  channels: [NotificationChannel.CHANNEL_TELEGRAM],
  // ...
});

// Сервер получает (в notifications-subgraph):
async SendNotification(request: NotificationRequest) {
  const recipients = request.recipientIds; // ✅ работает!
}
```

## Ожидаемые логи

После исправления при успешной обработке:

```
[notifications-grpc] Received notification request via gRPC
  eventType: 14
  recipients: ["123456789"]
  channels: [0, 4]

[notifications-grpc] Creating notification in DB via gRPC
  orgId: org_xxx
  eventType: CLEANING_ASSIGNED
  deliveryTargetsCount: 2

[notification-service] ✅ Notification created in DB
  notificationId: notif_xxx
  status: PENDING
  deliveriesCount: 2

[notifications-grpc] Notification processed
  notificationId: notif_xxx
  sentCount: 2
  failedCount: 0
```

## Дополнительные улучшения

Вместе с этим исправлением также:

1. ✅ Добавлено детальное логирование ошибок
2. ✅ Добавлена обработка некорректного JSON в metadata
3. ✅ Улучшено логирование на каждом этапе обработки
4. ✅ Добавлена строгая типизация для всех методов

## Проверка

Перезапустите сервер и проверьте:

```bash
cd backend/notifications-subgraph
pnpm dev
```

Отправьте тестовое уведомление из `cleaning-subgraph` или другого субграфа - теперь должно работать! 🚀

---

**Дата:** 19 октября 2025  
**Статус:** ✅ ИСПРАВЛЕНО

