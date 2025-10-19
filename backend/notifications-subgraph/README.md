# 📢 Notifications Subgraph

Микросервис для управления уведомлениями с поддержкой множественных каналов доставки (Telegram, WebSocket, Email и т.д.).

## Особенности

✨ **Provider Pattern** - легко добавлять новые каналы доставки
🤖 **Telegram Bot** - встроенная поддержка Telegram
⚡ **WebSocket Real-time** - мгновенные уведомления через WebSocket
🔌 **gRPC Server** - ✅ работает на порту 4111 (nice-grpc)
📊 **GraphQL API** - управление уведомлениями через GraphQL
🎯 **Event-driven** - реагирует на события из всей системы

## Архитектура

```
┌─────────────────┐
│  Other Subgraphs│
│  (cleaning,     │
│   bookings, etc)│
└────────┬────────┘
         │ gRPC (port 4111) ✅ РАБОТАЕТ
         ▼
┌─────────────────────────────────────┐
│   Notifications Subgraph            │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   gRPC Transport              │ │
│  │   (nice-grpc server)          │ │
│  └──────────┬────────────────────┘ │
│             │                       │
│  ┌──────────▼────────────────────┐ │
│  │   Notification Service        │ │
│  └──────────┬────────────────────┘ │
│             │                       │
│  ┌──────────▼────────────────────┐ │
│  │   Provider Manager            │ │
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
         │         │         │
         ▼         ▼         ▼
    Users    Browsers    Email
```

## Установка

```bash
cd backend/notifications-subgraph
pnpm install
```

## Конфигурация

Создайте `.env` файл:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/posutka

# GraphQL Server
PORT=4011

# gRPC Server
GRPC_HOST=localhost
GRPC_PORT=4111

# WebSocket Server
WS_PORT=4020

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Logging
LOG_LEVEL=info
```

### Получение Telegram Bot Token

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен и добавьте в `.env`

## Запуск

### Development

```bash
pnpm dev
```

### Production

```bash
pnpm build
pnpm start
```

## Использование

### 1. Отправка через gRPC (из других subgraphs)

```typescript
import { NotificationsServiceClient } from '@repo/grpc-sdk';

const client = new NotificationsServiceClient('localhost:4111');

await client.SendNotification({
  event_type: 14, // CLEANING_ASSIGNED
  org_id: 'org_123',
  recipient_ids: ['123456789'], // Telegram chat ID
  channels: [0], // TELEGRAM
  priority: 1, // NORMAL
  title: 'Уборка назначена!',
  message: 'На вас назначена уборка в квартире "Москва, Арбат 1"',
  metadata: JSON.stringify({
    cleaningId: 'clean_123',
    unitName: 'Москва, Арбат 1',
    scheduledAt: '2025-10-14T10:00:00Z',
  }),
  action_url: 'https://app.posutka.com/cleanings/clean_123',
  action_text: 'Открыть уборку',
});
```

### 2. Отправка через GraphQL

```graphql
mutation SendNotification {
  sendNotification(input: {
    eventType: CLEANING_ASSIGNED
    orgId: "org_123"
    recipientIds: ["123456789"]
    channels: [TELEGRAM, WEBSOCKET]
    priority: NORMAL
    title: "Уборка назначена!"
    message: "На вас назначена уборка в квартире \"Москва, Арбат 1\""
    actionUrl: "https://app.posutka.com/cleanings/clean_123"
    actionText: "Открыть уборку"
  }) {
    id
    status
    createdAt
  }
}
```

### 3. Подписка на уведомления (WebSocket)

**Через GraphQL Subscriptions:**

```graphql
subscription {
  notificationReceived(userId: "user_123") {
    id
    title
    message
    priority
    actionUrl
    actionText
  }
}
```

**Через нативный WebSocket:**

```javascript
const ws = new WebSocket('ws://localhost:4020');

ws.onopen = () => {
  // Подписываемся на уведомления пользователя
  ws.send(JSON.stringify({
    type: 'subscribe',
    userId: 'user_123',
    events: ['CLEANING_ASSIGNED', 'TASK_CREATED']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'notification') {
    console.log('Notification received:', data.data);
    // Показать уведомление в UI
  }
};
```

## Добавление нового провайдера

Создайте класс, реализующий `INotificationProvider`:

```typescript
// src/providers/email-provider.ts
import { BaseNotificationProvider, Channel } from './base-provider.js';

export class EmailProvider extends BaseNotificationProvider {
  readonly channel = Channel.EMAIL;
  readonly name = 'Email';
  
  async initialize(): Promise<void> {
    // Подключение к SMTP серверу
    await super.initialize();
  }
  
  async send(message: NotificationMessage): Promise<DeliveryResult> {
    // Отправка email
    // ...
    return { success: true, deliveredAt: new Date() };
  }
}
```

Зарегистрируйте провайдер в `server.ts`:

```typescript
const emailProvider = new EmailProvider();
providerManager.registerProvider(emailProvider);
```

## Интеграция с другими subgraphs

### Пример: Отправка уведомления при назначении уборки

**В `cleaning-subgraph/src/resolvers/index.ts`:**

```typescript
import { NotificationsServiceClient } from '@repo/grpc-sdk';

const notificationsClient = new NotificationsServiceClient('localhost:4111');

export const resolvers = {
  Mutation: {
    scheduleCleaning: async (_: unknown, { input }: any, { dl, prisma }: Context) => {
      const cleaning = await dl.scheduleCleaning(input);
      const cleaner = await dl.getCleaner(cleaning.cleanerId);
      
      // Определяем userId для получения настроек уведомлений
      const targetUserId = cleaner.userId || cleaner.id;
      
      // Получаем настройки уведомлений пользователя
      const userSettings = await prisma.userNotificationSettings.findUnique({
        where: { userId: targetUserId }
      });
      
      // Отправляем уведомление пользователю (ассоциированному с уборщиком)
      if (userSettings?.telegramChatId) {
        await notificationsClient.SendNotification({
          event_type: 14, // CLEANING_ASSIGNED
          org_id: cleaning.orgId,
          recipient_ids: [userSettings.telegramChatId],
          channels: [0, 4], // TELEGRAM + WEBSOCKET
          priority: 2, // HIGH
          title: '🧹 Новая уборка!',
          message: `Вам назначена уборка в ${cleaning.unit.name}`,
          metadata: JSON.stringify({
            cleaningId: cleaning.id,
            scheduledAt: cleaning.scheduledAt,
            userId: targetUserId,
          }),
          action_url: `https://app.posutka.com/cleanings/${cleaning.id}`,
          action_text: 'Открыть детали',
        });
      }
      
      return cleaning;
    },
  },
};
```

## Типы событий

### Booking Events
- `BOOKING_CREATED` - Создано бронирование
- `BOOKING_CONFIRMED` - Бронирование подтверждено
- `BOOKING_CANCELLED` - Бронирование отменено
- `BOOKING_CHECKIN` - Заселение гостя
- `BOOKING_CHECKOUT` - Выселение гостя

### Cleaning Events
- `CLEANING_SCHEDULED` - Уборка запланирована
- `CLEANING_STARTED` - Уборка начата
- `CLEANING_COMPLETED` - Уборка завершена
- `CLEANING_CANCELLED` - Уборка отменена
- `CLEANING_ASSIGNED` - Уборщик назначен ⭐

### Task Events
- `TASK_CREATED` - Задача создана
- `TASK_ASSIGNED` - Задача назначена
- `TASK_STATUS_CHANGED` - Статус задачи изменен
- `TASK_COMPLETED` - Задача завершена

### Payment Events
- `PAYMENT_RECEIVED` - Платеж получен
- `PAYMENT_FAILED` - Платеж не прошел
- `INVOICE_CREATED` - Счет создан
- `INVOICE_OVERDUE` - Счет просрочен

## Каналы доставки

- 📱 **TELEGRAM** - Telegram бот
- ⚡ **WEBSOCKET** - Real-time WebSocket
- 📧 **EMAIL** - Email (TODO)
- 📲 **SMS** - SMS (TODO)
- 🔔 **PUSH** - Push уведомления (TODO)
- 📋 **IN_APP** - Внутри приложения (TODO)

## Приоритеты

- 🟢 **LOW** - Низкий (информационные)
- 🔵 **NORMAL** - Обычный (стандартные уведомления)
- 🟠 **HIGH** - Высокий (важные события)
- 🔴 **URGENT** - Срочно (критичные уведомления)

## Мониторинг

### GraphQL Query для статистики

```graphql
query {
  notifications(first: 10, status: FAILED) {
    edges {
      node {
        id
        title
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

### Логи

Логи доступны через `@repo/shared-logger`:

```
[notifications-subgraph] Notification sent via Telegram
[telegram-provider] Message sent to chat 123456789
[websocket-provider] WebSocket client connected: ws_1234567890_abc123
```

## TODO

- [ ] Добавить Prisma модели для Notification в schema.prisma
- [ ] Реализовать Email провайдер
- [ ] Реализовать SMS провайдер  
- [ ] Добавить Push уведомления
- [ ] Реализовать шаблоны уведомлений
- [ ] Добавить планировщик для отложенных уведомлений
- [ ] Реализовать retry logic для неудачных отправок
- [ ] Добавить rate limiting
- [ ] Метрики и мониторинг (Prometheus)
- [ ] Интеграция с GraphQL Hive

## Порты

- **4011** - GraphQL HTTP (queries/mutations)
- **4111** - gRPC (для других subgraphs)
- **4020** - WebSocket (real-time subscriptions)

## Связанные файлы

- `packages/grpc-sdk/src/proto/notifications.proto` - gRPC протокол
- Schema: `src/schema/index.gql`
- Providers: `src/providers/`
- Services: `src/services/`

## Тестирование

```bash
# Unit tests
pnpm test

# Test Telegram bot
curl -X POST http://localhost:4011/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { sendNotification(input: { eventType: CLEANING_ASSIGNED, recipientIds: [\"YOUR_CHAT_ID\"], channels: [TELEGRAM], priority: NORMAL, title: \"Test\", message: \"Test message\" }) { id status } }"
  }'

# Test WebSocket
wscat -c ws://localhost:4020
> {"type":"subscribe","userId":"user_123"}
```

## Лицензия

Private - Posutka

