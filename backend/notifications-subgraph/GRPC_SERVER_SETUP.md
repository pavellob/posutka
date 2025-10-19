# ✅ gRPC Server для Notifications Subgraph

## Выполненные работы

### 1. Добавлены зависимости
Добавлены `nice-grpc` и `nice-grpc-common` в `package.json`:

```json
"nice-grpc": "^2.1.12",
"nice-grpc-common": "^2.0.2"
```

### 2. Создан gRPC Transport
Создан файл `src/transport/grpc.transport.ts` для запуска gRPC сервера.

**Ключевые особенности:**
- Использует `nice-grpc` для создания сервера
- Регистрирует все методы из `NotificationsServiceDefinition`
- Запускается на порту `4111` (по умолчанию)
- Поддерживает graceful shutdown

**Методы gRPC API:**
1. `SendNotification` - отправка одного уведомления
2. `SendBulkNotifications` - массовая отправка уведомлений
3. `GetNotificationStatus` - получение статуса уведомления

### 3. Обновлен Server.ts
- Создан экземпляр `GrpcTransport`
- Запуск gRPC сервера в функции `start()`
- Добавлен graceful shutdown для gRPC сервера

### 4. Обновлена документация
- `env.example` - добавлена переменная `GRPC_HOST`
- `README.md` - обновлена архитектура и описание

## Архитектура

```
┌─────────────────────────┐
│  Cleaning Subgraph      │
│  Bookings Subgraph      │
│  Ops Subgraph           │
└──────────┬──────────────┘
           │
           │ gRPC Request
           │ (port 4111)
           ▼
┌─────────────────────────────────────┐
│   Notifications Subgraph            │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   GrpcTransport               │ │
│  │   (nice-grpc server)          │ │
│  │   • SendNotification          │ │
│  │   • SendBulkNotifications     │ │
│  │   • GetNotificationStatus     │ │
│  └──────────┬────────────────────┘ │
│             │                       │
│  ┌──────────▼────────────────────┐ │
│  │  NotificationsGrpcService     │ │
│  │  (обработка gRPC запросов)    │ │
│  └──────────┬────────────────────┘ │
│             │                       │
│  ┌──────────▼────────────────────┐ │
│  │   NotificationService         │ │
│  │   (создание в БД)             │ │
│  └──────────┬────────────────────┘ │
│             │                       │
│  ┌──────────▼────────────────────┐ │
│  │   ProviderManager             │ │
│  │   (отправка через каналы)     │ │
│  └──────────┬────────────────────┘ │
│             │                       │
│    ┌────────┼────────┐             │
│    ▼        ▼        ▼             │
│  ┌────┐  ┌────┐  ┌────┐           │
│  │ 📱 │  │ 💬 │  │ 📧 │           │
│  │Tele│  │ WS │  │Email│          │
│  │gram│  │    │  │     │          │
│  └────┘  └────┘  └────┘           │
└─────────────────────────────────────┘
```

## Порты

| Сервис | Порт | Протокол | Описание |
|--------|------|----------|----------|
| GraphQL HTTP | 4011 | HTTP | Queries, Mutations |
| gRPC | 4111 | gRPC | Прием уведомлений от других субграфов |
| WebSocket | 4020 | WS | Real-time subscriptions |

## Переменные окружения

```env
# GraphQL Server
PORT=4011

# gRPC Server
GRPC_HOST=localhost
GRPC_PORT=4111

# WebSocket Server
WS_PORT=4020
```

## Запуск

```bash
cd backend/notifications-subgraph

# Установка зависимостей
pnpm install

# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Логи при запуске

При успешном запуске вы увидите:

```
[notifications-subgraph] Telegram provider registered
[notifications-subgraph] WebSocket provider registered (port: 4020)
[notifications-subgraph] Initializing notification providers...
[telegram-provider] Telegram Bot initialized successfully
[websocket-provider] WebSocket server started on port 4020
[notifications-subgraph] All providers initialized successfully
[notifications-subgraph] Telegram command handlers configured for auto-linking users
[notifications-subgraph] 🚀 Notifications Subgraph GraphQL server ready at http://localhost:4011/graphql
[notifications-grpc-transport] Starting Notifications GRPC transport with nice-grpc
[notifications-grpc-transport] ✅ Notifications GRPC server started on localhost:4111
[notifications-subgraph] 📡 Notifications gRPC service ready at localhost:4111
```

## Пример использования из другого субграфа

### Cleaning Subgraph → Notifications Subgraph

```typescript
import { NotificationsServiceClient } from '@repo/grpc-sdk';

const client = new NotificationsServiceClient('localhost:4111');
await client.connect();

await client.sendNotification({
  eventType: EventType.EVENT_TYPE_CLEANING_ASSIGNED,
  orgId: 'org_123',
  recipientIds: ['123456789'], // Telegram chat ID
  channels: [NotificationChannel.CHANNEL_TELEGRAM, NotificationChannel.CHANNEL_WEBSOCKET],
  priority: Priority.PRIORITY_HIGH,
  title: '🧹 Новая уборка назначена!',
  message: 'Вам назначена уборка в квартире "Москва, Арбат 1"',
  actionUrl: 'https://app.posutka.com/cleanings/clean_123',
  actionText: 'Открыть детали уборки →',
});
```

## Статус

✅ **gRPC сервер полностью работает**

- [x] Добавлены зависимости nice-grpc
- [x] Создан GrpcTransport
- [x] Интегрирован в server.ts
- [x] Обновлена документация
- [x] Поддерживает все методы из proto файла
- [x] Работает graceful shutdown

## Файлы

- `src/transport/grpc.transport.ts` - новый файл gRPC транспорта
- `src/server.ts` - обновлен для запуска gRPC сервера
- `package.json` - добавлены зависимости nice-grpc
- `env.example` - добавлена переменная GRPC_HOST
- `README.md` - обновлена документация

---

**Дата:** 18 октября 2025  
**Автор:** AI Assistant  
**Статус:** ✅ Завершено

