# gRPC Architecture - Межсервисное общение

## 📋 Общие принципы

**Все сервисы общаются между собой ТОЛЬКО через gRPC**, а не через HTTP/GraphQL запросы.

---

## 🔧 Структура gRPC сервисов

### **1. ops-subgraph** (Клиент)
- **GraphQL порт**: `4003`
- **gRPC клиенты**:
  - `cleaning-grpc-client` → подключается к `cleaning-subgraph:4110`

### **2. cleaning-subgraph** (Сервер + Клиент)
- **GraphQL порт**: `4010`
- **gRPC порт**: `4110` ← **СЕРВЕР**
- **gRPC клиенты**:
  - `notifications-grpc-client` → подключается к `notifications-subgraph:4111`

### **3. notifications-subgraph** (Сервер)
- **GraphQL порт**: `4011`
- **gRPC порт**: `4111` ← **СЕРВЕР**
- **WebSocket порт**: `4020`

---

## 📁 Файловая структура

### Proto файлы (схемы gRPC):
```
packages/grpc-sdk/src/proto/
├── cleaning.proto        # ← НОВЫЙ! Cleaning сервис
├── notifications.proto   # Notifications сервис
├── ops.proto            # Ops сервис
└── bookings.proto       # Bookings сервис
```

### gRPC клиенты:
```
packages/grpc-sdk/src/clients/
├── cleaning.client.ts        # ← НОВЫЙ! Клиент для cleaning
├── notifications.client.ts   # Клиент для notifications
├── ops.client.ts            # Клиент для ops
└── bookings.client.ts       # Клиент для bookings
```

### gRPC серверы:
```
backend/cleaning-subgraph/src/grpc/
├── cleaning.grpc.service.ts  # ← НОВЫЙ! Реализация CleaningService
└── grpc.transport.ts         # ← НОВЫЙ! gRPC транспорт

backend/notifications-subgraph/src/grpc/
├── notifications.grpc.service.ts  # Реализация NotificationsService
└── ...
```

---

## 🔄 Примеры использования

### **ops-subgraph → cleaning-subgraph** (создание уборки)

```typescript
// backend/ops-subgraph/src/resolvers/index.ts
import { createCleaningGrpcClient } from '@repo/grpc-sdk';

const cleaningGrpcClient = createCleaningGrpcClient({
  host: process.env.CLEANING_GRPC_HOST || 'localhost',
  port: parseInt(process.env.CLEANING_GRPC_PORT || '4110'),
});

// Создание уборки через gRPC
const response = await cleaningGrpcClient.scheduleCleaning({
  orgId: 'org-123',
  unitId: 'unit-456',
  taskId: 'task-789',
  scheduledAt: new Date(),
  requiresLinenChange: false,
  notes: 'Deep cleaning',
});
```

### **cleaning-subgraph → notifications-subgraph** (отправка уведомления)

```typescript
// backend/cleaning-subgraph/src/services/notification-client.ts
import { createNotificationsGrpcClient } from '@repo/grpc-sdk';

const notificationsClient = createNotificationsGrpcClient({
  host: process.env.NOTIFICATIONS_GRPC_HOST || 'localhost',
  port: parseInt(process.env.NOTIFICATIONS_GRPC_PORT || '4111'),
});

// Отправка уведомления через gRPC
const response = await notificationsClient.sendNotification({
  eventType: EventType.EVENT_TYPE_CLEANING_ASSIGNED,
  recipientIds: [userId],
  channels: [NotificationChannel.CHANNEL_TELEGRAM],
  priority: Priority.PRIORITY_HIGH,
  title: '🧹 Новая уборка назначена!',
  message: 'Вам назначена уборка...',
  actionUrl: 'https://...',
});
```

---

## ⚙️ Переменные окружения

### Для всех сервисов добавлено в `turbo.json`:
```json
{
  "globalEnv": [
    "CLEANING_GRPC_HOST",
    "CLEANING_GRPC_PORT",
    "NOTIFICATIONS_GRPC_HOST",
    "NOTIFICATIONS_GRPC_PORT",
    "OPS_GRPC_HOST",
    "OPS_GRPC_PORT",
    // ...
  ]
}
```

### В `.env`:
```bash
# Cleaning gRPC
CLEANING_GRPC_HOST=localhost
CLEANING_GRPC_PORT=4110

# Notifications gRPC
NOTIFICATIONS_GRPC_HOST=localhost
NOTIFICATIONS_GRPC_PORT=4111

# Ops gRPC
OPS_GRPC_HOST=localhost
OPS_GRPC_PORT=4103
```

---

## 🚀 Запуск gRPC серверов

### **cleaning-subgraph**:
```typescript
// backend/cleaning-subgraph/src/server.ts
import { GrpcTransport } from './grpc/grpc.transport.js';

const grpcTransport = new GrpcTransport(dl, GRPC_HOST, GRPC_PORT);
await grpcTransport.start();
// ✅ GRPC transport started successfully { host: 'localhost', port: 4110 }
```

### **notifications-subgraph**:
```typescript
// backend/notifications-subgraph/src/server.ts
import { GrpcTransport } from './transport/grpc.transport.js';

const grpcTransport = new GrpcTransport(...);
await grpcTransport.start();
// ✅ GRPC transport started successfully { host: 'localhost', port: 4111 }
```

---

## 📊 Схема взаимодействия

```
ops-subgraph (4003)
    │
    │ gRPC → scheduleCleaning()
    ↓
cleaning-subgraph (4010 GraphQL, 4110 gRPC)
    │
    │ gRPC → sendNotification()
    ↓
notifications-subgraph (4011 GraphQL, 4111 gRPC, 4020 WebSocket)
    │
    ├─→ Telegram Bot API
    └─→ WebSocket clients
```

---

## 🔧 Генерация proto файлов

После изменения `.proto` файлов нужно перегенерировать типы:

```bash
cd packages/grpc-sdk
pnpm build
```

Это запустит:
1. `buf generate` - генерация TypeScript типов из proto
2. Компиляция клиентов и экспорт типов

---

## ✅ Преимущества gRPC

1. **Типобезопасность** - proto файлы генерируют TypeScript типы
2. **Производительность** - бинарный протокол Protocol Buffers
3. **Streaming** - возможность двунаправленных стримов
4. **Ретраи** - встроенная логика повторных попыток
5. **Таймауты** - контроль времени выполнения запросов
6. **Документирование** - proto файлы = документация API

---

## 📝 Checklist для добавления нового gRPC сервиса

1. ✅ Создать `.proto` файл в `packages/grpc-sdk/src/proto/`
2. ✅ Создать gRPC клиент в `packages/grpc-sdk/src/clients/`
3. ✅ Экспортировать клиент из `packages/grpc-sdk/src/index.ts`
4. ✅ Создать gRPC сервис в `backend/<service>/src/grpc/<service>.grpc.service.ts`
5. ✅ Создать gRPC транспорт в `backend/<service>/src/grpc/grpc.transport.ts`
6. ✅ Запустить gRPC сервер в `backend/<service>/src/server.ts`
7. ✅ Добавить переменные окружения в `.env` и `turbo.json`
8. ✅ Собрать proto: `cd packages/grpc-sdk && pnpm build`
9. ✅ Протестировать gRPC вызовы

---

## 📚 См. также:
- [TASK_TO_CLEANING_AUTO_CREATE.md](./TASK_TO_CLEANING_AUTO_CREATE.md) - Автосоздание Cleaning из Task
- [NOTIFICATION_ARCHITECTURE.md](./NOTIFICATION_ARCHITECTURE.md) - Архитектура уведомлений
- [nice-grpc документация](https://github.com/deeplay-io/nice-grpc)
- [Protocol Buffers](https://developers.google.com/protocol-buffers)

