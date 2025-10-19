# 🚀 Quickstart - Notifications Subgraph

## Быстрый старт за 5 минут

### Шаг 1: Установите зависимости

```bash
cd /Users/pavellobachev/dev/posutka-monorepo
pnpm install
```

### Шаг 2: Настройте Telegram бота

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте `/newbot`
3. Введите имя бота: `Posutka Notifications Bot`
4. Введите username: `posutka_notifications_bot` (или любой доступный)
5. Скопируйте токен

### Шаг 3: Создайте .env файл

```bash
cd backend/notifications-subgraph
cp env.example .env
```

Отредактируйте `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/posutka
PORT=4011
GRPC_PORT=4111
WS_PORT=4020
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE  # Вставьте токен из шага 2
LOG_LEVEL=info
```

### Шаг 4: Запустите сервис

```bash
# Из корня monorepo
pnpm dev:notifications

# Или из директории subgraph
cd backend/notifications-subgraph
pnpm dev
```

Вы увидите:

```
[notifications-subgraph] Initializing notification providers...
[telegram-provider] Telegram bot initialized: @posutka_notifications_bot
[websocket-provider] WebSocket server running on port 4020
[notifications-subgraph] All providers initialized successfully
[notifications-subgraph] 🚀 GraphQL server ready at http://localhost:4011/graphql
[notifications-subgraph] 📡 gRPC service available on port 4111
```

### Шаг 5: Получите свой Telegram Chat ID

1. Откройте Telegram
2. Найдите своего бота: `@posutka_notifications_bot`
3. Отправьте `/start`
4. Откройте в браузере:
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
5. Найдите ваш `chat.id` - это число типа `123456789`

### Шаг 6: Отправьте тестовое уведомление

Откройте GraphQL Playground: http://localhost:4011/graphql

Выполните мутацию:

```graphql
mutation TestNotification {
  sendNotification(input: {
    eventType: SYSTEM_ALERT
    recipientIds: ["YOUR_CHAT_ID"]  # Замените на ваш chat ID
    channels: [TELEGRAM]
    priority: NORMAL
    title: "🎉 Тест уведомлений!"
    message: "Поздравляем! Система уведомлений работает."
    actionUrl: "https://posutka.com"
    actionText: "Открыть приложение"
  }) {
    id
    status
    title
  }
}
```

Вы получите уведомление в Telegram! 📱

### Шаг 7: Протестируйте WebSocket

Откройте консоль браузера и выполните:

```javascript
const ws = new WebSocket('ws://localhost:4020');

ws.onopen = () => {
  console.log('✅ Connected to WebSocket');
  
  // Подписываемся
  ws.send(JSON.stringify({
    type: 'subscribe',
    userId: 'user_123'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 Message from server:', data);
};
```

Теперь отправьте уведомление через GraphQL с каналом `WEBSOCKET` - оно придет в консоль!

## Что дальше?

### Интеграция с cleaning-subgraph

Добавьте отправку уведомлений при назначении уборки:

```typescript
// backend/cleaning-subgraph/src/resolvers/index.ts
import fetch from 'node-fetch';

const sendNotification = async (chatId: string, title: string, message: string) => {
  await fetch('http://localhost:4011/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation {
          sendNotification(input: {
            eventType: CLEANING_ASSIGNED
            recipientIds: ["${chatId}"]
            channels: [TELEGRAM, WEBSOCKET]
            priority: HIGH
            title: "${title}"
            message: "${message}"
          }) { id }
        }
      `
    })
  });
};

// В мутации scheduleCleaning:
// Получаем настройки уведомлений через userId
const targetUserId = cleaner.userId || cleaner.id;
const userSettings = await prisma.userNotificationSettings.findUnique({
  where: { userId: targetUserId }
});

if (userSettings?.telegramChatId) {
  await sendNotification(
    userSettings.telegramChatId,
    '🧹 Новая уборка!',
    `Вам назначена уборку в ${unit.name}`
  );
}
```

### Добавить в gateway mesh

Обновите `backend/gateway-mesh/mesh.config.ts`:

```typescript
{
  notifications: {
    source: {
      name: 'notifications-subgraph',
      handler: {
        graphql: {
          endpoint: 'http://localhost:4011/graphql'
        }
      }
    }
  }
}
```

### Frontend интеграция

Создайте компонент для отображения уведомлений:

```tsx
// frontend/backoffice/src/components/notifications-bell.tsx
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationsBell() {
  const { notifications, connected } = useNotifications(currentUserId);
  
  return (
    <div className="relative">
      <button className="relative">
        🔔
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5">
            {notifications.length}
          </span>
        )}
      </button>
      
      {/* Dropdown с уведомлениями */}
    </div>
  );
}
```

## Troubleshooting

### Telegram бот не отвечает

1. Проверьте токен в `.env`
2. Убедитесь, что бот активен в BotFather
3. Проверьте логи: `[telegram-provider]`

### WebSocket не подключается

1. Проверьте порт 4020 свободен: `lsof -i :4020`
2. Проверьте firewall правила
3. Используйте `ws://` (не `wss://`) для локальной разработки

### Уведомления не приходят

1. Проверьте, что провайдеры инициализированы: логи `All providers initialized`
2. Проверьте правильность chat ID
3. Проверьте статус уведомления через GraphQL

## Ready! 🎉

Теперь у вас работает полноценная система уведомлений с:
- ✅ Telegram ботом
- ✅ WebSocket real-time
- ✅ gRPC интеграцией
- ✅ Provider pattern для расширения

Начните интегрировать с другими сервисами!

