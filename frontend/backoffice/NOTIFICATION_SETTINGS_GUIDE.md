# 🔔 Руководство по настройкам уведомлений

## Обзор

Система уведомлений позволяет пользователям управлять тем, как и какие уведомления они получают.

## Архитектура

### Данные пользователя

```
User (основная таблица)
  ↓ (1:1 relation)
UserNotificationSettings (настройки уведомлений)
  ├── telegramChatId
  ├── email
  ├── phone
  ├── enabled
  ├── enabledChannels []
  └── subscribedEvents []
```

### GraphQL API

**Query:**
```graphql
query GetUserNotificationSettings($userId: UUID!) {
  userNotificationSettings(userId: $userId) {
    userId
    telegramChatId
    enabled
    enabledChannels
    subscribedEvents
  }
}
```

**Mutation:**
```graphql
mutation UpdateNotificationSettings($input: UpdateNotificationSettingsInput!) {
  updateNotificationSettings(input: $input) {
    userId
    telegramChatId
    enabled
    enabledChannels
    subscribedEvents
  }
}
```

## Использование на фронтенде

### 1. Hook для работы с настройками

```tsx
import { useNotificationSettings } from '@/hooks/useNotificationSettings';

function MyComponent() {
  const { 
    settings, 
    isLoading,
    updateSettings,
    toggleNotifications,
    toggleChannel,
    toggleEvent
  } = useNotificationSettings(userId);
  
  return (
    <div>
      <button onClick={() => toggleNotifications(true)}>
        Включить уведомления
      </button>
      
      <button onClick={() => toggleChannel('TELEGRAM')}>
        Переключить Telegram
      </button>
      
      <button onClick={() => toggleEvent('CLEANING_ASSIGNED')}>
        Подписаться на уборки
      </button>
    </div>
  );
}
```

### 2. Полноценная страница настроек

Создана готовая страница: `/settings/notifications`

```tsx
import { NotificationSettings } from '@/components/notification-settings';

export default function Page() {
  const { user } = useCurrentUser();
  
  return <NotificationSettings userId={user.id} />;
}
```

### 3. Компактный виджет настроек

Для встраивания в другие страницы:

```tsx
'use client';

import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Switch } from '@/components/switch';

export function QuickNotificationToggle({ userId }: { userId: string }) {
  const { settings, toggleNotifications, isUpdating } = useNotificationSettings(userId);
  
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={settings?.enabled ?? true}
        onChange={toggleNotifications}
        disabled={isUpdating}
      />
      <span className="text-sm">
        Уведомления {settings?.enabled ? 'включены' : 'выключены'}
      </span>
    </div>
  );
}
```

## Подключение Telegram

### Автоматическая привязка

1. Пользователь должен иметь `telegramUsername` в профиле Cleaner
2. Пользователь открывает бота в Telegram
3. Отправляет `/start`
4. Бот автоматически привязывает chat ID

### Ручная привязка

В интерфейсе настроек есть возможность ввести Chat ID вручную:

1. Получить свой Chat ID: https://t.me/userinfobot
2. Ввести в поле "Ввести Chat ID вручную"
3. Сохранить

## Каналы доставки

### Доступные каналы:

- **TELEGRAM** - уведомления в Telegram (требуется telegramChatId)
- **WEBSOCKET** - real-time в браузере (всегда доступен)
- **EMAIL** - на почту (требуется email)
- **SMS** - SMS сообщения (требуется phone)

### Логика включения:

```typescript
// Канал доступен только если:
const canEnable = 
  settings.enabled && // Уведомления включены
  (channel === 'TELEGRAM' ? !!settings.telegramChatId : true) && // Для Telegram нужен chatId
  (channel === 'EMAIL' ? !!settings.email : true); // Для Email нужен email
```

## События

### Группы событий:

**Уборки:**
- `CLEANING_ASSIGNED` - Уборка назначена
- `CLEANING_STARTED` - Уборка начата
- `CLEANING_COMPLETED` - Уборка завершена
- `CLEANING_CANCELLED` - Уборка отменена

**Задачи:**
- `TASK_CREATED` - Задача создана
- `TASK_ASSIGNED` - Задача назначена
- `TASK_STATUS_CHANGED` - Статус изменен
- `TASK_COMPLETED` - Задача завершена

**Бронирования:**
- `BOOKING_CREATED` - Бронирование создано
- `BOOKING_CONFIRMED` - Подтверждено
- `BOOKING_CANCELLED` - Отменено
- `BOOKING_CHECKIN` - Заселение
- `BOOKING_CHECKOUT` - Выселение

**Платежи:**
- `PAYMENT_RECEIVED` - Платеж получен
- `PAYMENT_FAILED` - Платеж не прошел
- `INVOICE_CREATED` - Счет создан
- `INVOICE_OVERDUE` - Счет просрочен

## API примеры

### Получить настройки

```typescript
const settings = await graphqlClient.request(gql`
  query GetUserNotificationSettings($userId: String!) {
    userNotificationSettings(userId: $userId) {
      telegramChatId
      enabled
      enabledChannels
      subscribedEvents
    }
  }
`, { userId: 'user_123' });
```

### Обновить настройки

```typescript
await graphqlClient.request(gql`
  mutation UpdateNotificationSettings($input: UpdateNotificationSettingsInput!) {
    updateNotificationSettings(input: $input) {
      userId
      enabled
      enabledChannels
    }
  }
`, {
  input: {
    userId: 'user_123',
    enabled: true,
    enabledChannels: ['TELEGRAM', 'WEBSOCKET'],
    subscribedEvents: ['CLEANING_ASSIGNED', 'TASK_ASSIGNED']
  }
});
```

### Включить канал

```typescript
// Через hook
const { toggleChannel } = useNotificationSettings(userId);
await toggleChannel('TELEGRAM');

// Или напрямую
const currentChannels = settings.enabledChannels;
await updateSettings({
  userId,
  enabledChannels: [...currentChannels, 'TELEGRAM']
});
```

## Интеграция в навигацию

Добавьте ссылку в меню:

```tsx
// В navigation компоненте
<NavItem href="/settings/notifications">
  <BellIcon />
  <NavItemLabel>Уведомления</NavItemLabel>
</NavItem>
```

## Тестирование

### 1. Проверка настроек

```bash
# Через GraphQL Playground (http://localhost:4011/graphql)
query {
  userNotificationSettings(userId: "user_123") {
    telegramChatId
    enabled
    enabledChannels
  }
}
```

### 2. Отправка тестового уведомления

```bash
mutation {
  sendNotification(input: {
    eventType: SYSTEM_ALERT
    recipientIds: ["123456789"]
    channels: [TELEGRAM]
    priority: NORMAL
    title: "Тест"
    message: "Проверка настроек"
  }) {
    id
    status
  }
}
```

## Troubleshooting

### Telegram не подключается

1. ✅ Проверьте, что бот запущен (backend/notifications-subgraph)
2. ✅ Проверьте `TELEGRAM_BOT_TOKEN` в .env
3. ✅ Убедитесь, что у Cleaner заполнен `telegramUsername`
4. ✅ Попробуйте ввести Chat ID вручную

### Уведомления не приходят

1. ✅ Проверьте, что `settings.enabled === true`
2. ✅ Проверьте, что нужный канал в `enabledChannels`
3. ✅ Проверьте, что событие в `subscribedEvents`
4. ✅ Для Telegram проверьте наличие `telegramChatId`

### WebSocket не подключается

1. ✅ Проверьте, что WebSocket сервер запущен (порт 4020)
2. ✅ Проверьте URL в `useNotifications` hook
3. ✅ Проверьте консоль браузера на ошибки

## Best Practices

1. **Всегда проверяйте наличие userId**
   ```tsx
   if (!userId) return null;
   ```

2. **Используйте optimistic updates**
   ```tsx
   queryClient.setQueryData(['notificationSettings', userId], newData);
   ```

3. **Обрабатывайте ошибки**
   ```tsx
   try {
     await updateSettings(newSettings);
   } catch (error) {
     toast.error('Не удалось сохранить настройки');
   }
   ```

4. **Показывайте состояние загрузки**
   ```tsx
   {isUpdating && <Spinner />}
   ```

---

Готово! Теперь у вас есть полноценная система управления настройками уведомлений на фронтенде. 🎉

