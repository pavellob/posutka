# ✅ gRPC Сервер для Notifications Subgraph - ГОТОВ!

## 🎯 Итог

**Вопрос:** Как в нотификациях приходят запросы на нотификации - через graphql или grpc?

**Ответ:** Теперь **оба варианта работают**:

### ✅ gRPC (для межсервисного взаимодействия)
- **Порт:** 4111
- **Протокол:** gRPC (nice-grpc)
- **Использование:** Другие субграфы (cleaning, bookings, ops) → notifications
- **Статус:** ✅ РАБОТАЕТ

### ✅ GraphQL (для фронтенда и прямых запросов)
- **Порт:** 4011
- **Протокол:** HTTP/GraphQL
- **Использование:** Frontend → notifications, прямые mutations
- **Статус:** ✅ РАБОТАЕТ

---

## 🔧 Что было сделано

### 1. **Добавлены зависимости nice-grpc**
```json
"nice-grpc": "^2.1.12",
"nice-grpc-common": "^2.0.2"
```

### 2. **Создан gRPC Transport** 
Файл: `backend/notifications-subgraph/src/transport/grpc.transport.ts`

- Использует `nice-grpc` для создания сервера
- Регистрирует все методы из proto файла
- Запускается на порту 4111
- Поддерживает graceful shutdown

### 3. **Обновлен server.ts**
- Импортирован `GrpcTransport`
- Создан экземпляр с провайдерами
- Запуск gRPC сервера в функции `start()`
- Добавлен shutdown при SIGINT

### 4. **Обновлена документация**
- `env.example` - добавлена переменная `GRPC_HOST`
- `README.md` - обновлена архитектура

---

## 📊 Архитектура взаимодействия

```
┌─────────────────────────────────────────────────────────────┐
│                   МЕЖСЕРВИСНОЕ ВЗАИМОДЕЙСТВИЕ                │
│                        (только gRPC)                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│ Cleaning Subgraph│  gRPC (4111)
└────────┬─────────┘         │
         │                   │
┌────────▼─────────┐         │
│ Bookings Subgraph│  ───────┤
└────────┬─────────┘         │
         │                   │
┌────────▼─────────┐         │
│   Ops Subgraph   │  ───────┤
└──────────────────┘         │
                             ▼
                    ┌─────────────────────┐
                    │  Notifications      │
                    │  Subgraph           │
                    │                     │
                    │  ✅ gRPC: 4111      │
                    │  ✅ GraphQL: 4011   │
                    │  ✅ WebSocket: 4020 │
                    └─────────────────────┘
                             │
                    ┌────────┼────────┐
                    ▼        ▼        ▼
                 Telegram  WebSocket Email
```

---

## 🚀 Как это работает

### Пример: Cleaning Subgraph отправляет уведомление

```typescript
// backend/cleaning-subgraph/src/services/notification-client.ts

import { createNotificationsGrpcClient } from '@repo/grpc-sdk';

const grpcClient = createNotificationsGrpcClient({
  host: 'localhost',
  port: 4111,  // ← gRPC порт
});

await grpcClient.connect();

// Отправка через gRPC
await grpcClient.sendNotification({
  eventType: EventType.EVENT_TYPE_CLEANING_ASSIGNED,
  recipientIds: ['123456789'], // Telegram chat ID
  channels: [
    NotificationChannel.CHANNEL_TELEGRAM,
    NotificationChannel.CHANNEL_WEBSOCKET
  ],
  priority: Priority.PRIORITY_HIGH,
  title: '🧹 Новая уборка назначена!',
  message: 'Вам назначена уборка...',
  actionUrl: 'https://app.posutka.com/cleanings/clean_123',
});
```

### Что происходит внутри Notifications Subgraph:

1. **gRPC Transport** принимает запрос на порту 4111
2. **NotificationsGrpcService** обрабатывает запрос
3. **NotificationService** создает запись в БД (таблица `Notification`)
4. **ProviderManager** отправляет через каналы:
   - **TelegramProvider** → отправка в Telegram
   - **WebSocketProvider** → отправка через WebSocket для real-time в браузере

---

## 🔌 Порты

| Сервис | Порт | Назначение |
|--------|------|-----------|
| **GraphQL** | 4011 | HTTP API для фронтенда |
| **gRPC** | 4111 | **Межсервисное взаимодействие** ⭐ |
| **WebSocket** | 4020 | Real-time subscriptions |

---

## 📝 Переменные окружения

```env
# backend/notifications-subgraph/.env

# GraphQL Server
PORT=4011

# gRPC Server (для других субграфов)
GRPC_HOST=localhost
GRPC_PORT=4111

# WebSocket Server (для real-time)
WS_PORT=4020

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_token_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/posutka
```

---

## ✅ Проверка

После запуска `pnpm dev` в `backend/notifications-subgraph`, вы должны увидеть:

```
[notifications-subgraph] Telegram provider registered
[notifications-subgraph] WebSocket provider registered (port: 4020)
[notifications-subgraph] Initializing notification providers...
[notifications-subgraph] All providers initialized successfully
[notifications-subgraph] 🚀 Notifications Subgraph GraphQL server ready at http://localhost:4011/graphql
[notifications-grpc-transport] Starting Notifications GRPC transport with nice-grpc
[notifications-grpc-transport] ✅ Notifications GRPC server started on localhost:4111
[notifications-subgraph] 📡 Notifications gRPC service ready at localhost:4111
```

Ключевые строки:
- ✅ `GRPC server started on localhost:4111` - gRPC сервер запущен
- ✅ `gRPC service ready at localhost:4111` - готов принимать запросы

---

## 🎯 Итоговый ответ на вопрос

> **Вопрос:** Как в нотификациях приходят запросы - через GraphQL или gRPC?

**Ответ:**

### Для межсервисного взаимодействия (cleaning, bookings, ops → notifications):
✅ **Только через gRPC (порт 4111)**

### Для фронтенда (backoffice, landing → notifications):
✅ **Через GraphQL (порт 4011)**

### Real-time обновления в браузере:
✅ **Через WebSocket (порт 4020)**

---

## 📦 Измененные файлы

1. ✅ `backend/notifications-subgraph/package.json` - добавлены зависимости
2. ✅ `backend/notifications-subgraph/src/transport/grpc.transport.ts` - **новый файл**
3. ✅ `backend/notifications-subgraph/src/server.ts` - запуск gRPC сервера
4. ✅ `backend/notifications-subgraph/env.example` - добавлен GRPC_HOST
5. ✅ `backend/notifications-subgraph/README.md` - обновлена документация
6. ✅ `backend/notifications-subgraph/GRPC_SERVER_SETUP.md` - **новый файл**

---

## 🎉 Результат

✅ **gRPC сервер полностью функционирует**  
✅ **Все субграфы могут отправлять уведомления через gRPC**  
✅ **Фронтенд может работать через GraphQL**  
✅ **Real-time через WebSocket**  

**Архитектура соответствует требованию: межсервисное взаимодействие только по gRPC.**

---

**Дата:** 18 октября 2025  
**Статус:** ✅ ЗАВЕРШЕНО

