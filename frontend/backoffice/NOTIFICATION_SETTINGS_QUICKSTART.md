# 🚀 Быстрый старт: Настройки уведомлений

## 1. Добавить страницу настроек (уже готова!)

Страница доступна по адресу: `/settings/notifications`

```tsx
// src/app/(app)/settings/notifications/page.tsx
import { NotificationSettings } from '@/components/notification-settings';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function Page() {
  const { user } = useCurrentUser();
  return <NotificationSettings userId={user.id} />;
}
```

## 2. Добавить ссылку в навигацию

Найдите файл с навигацией (например, `src/components/sidebar.tsx`) и добавьте:

```tsx
<NavItem href="/settings/notifications">
  <BellIcon className="size-4" />
  <NavItemLabel>Уведомления</NavItemLabel>
</NavItem>
```

## 3. Использовать в своих компонентах

### Простой переключатель

```tsx
'use client';

import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Switch } from '@/components/switch';

export function NotificationToggle({ userId }: { userId: string }) {
  const { settings, toggleNotifications } = useNotificationSettings(userId);
  
  return (
    <Switch
      checked={settings?.enabled ?? true}
      onChange={toggleNotifications}
    />
  );
}
```

### Статус Telegram

```tsx
'use client';

import { useNotificationSettings } from '@/hooks/useNotificationSettings';

export function TelegramStatus({ userId }: { userId: string }) {
  const { settings } = useNotificationSettings(userId);
  
  if (settings?.telegramChatId) {
    return <span className="text-green-600">✓ Telegram подключен</span>;
  }
  
  return (
    <a href="/settings/notifications" className="text-blue-600">
      Подключить Telegram
    </a>
  );
}
```

### Полный пример: Профиль пользователя

```tsx
'use client';

import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Button } from '@/components/button';

export function UserProfile({ userId }: { userId: string }) {
  const { settings, toggleChannel } = useNotificationSettings(userId);
  
  return (
    <div className="space-y-4">
      <h2>Профиль</h2>
      
      {/* Показываем статус уведомлений */}
      <div>
        <p className="text-sm text-gray-600">Уведомления:</p>
        <p className="font-medium">
          {settings?.enabled ? '✓ Включены' : '✗ Выключены'}
        </p>
      </div>
      
      {/* Показываем подключенные каналы */}
      <div>
        <p className="text-sm text-gray-600">Каналы:</p>
        <div className="flex gap-2 mt-1">
          {settings?.enabledChannels?.map(channel => (
            <span key={channel} className="px-2 py-1 bg-blue-100 rounded text-xs">
              {channel}
            </span>
          ))}
        </div>
      </div>
      
      {/* Кнопка настроек */}
      <Button href="/settings/notifications">
        Настроить уведомления
      </Button>
    </div>
  );
}
```

## 4. Подключить Telegram

### Для пользователя:

1. Перейти на страницу `/settings/notifications`
2. В разделе "Telegram" нажать на ссылку с ботом
3. Отправить `/start` боту
4. Вернуться на страницу настроек - должна появиться галочка "Telegram подключен"

### Или вручную:

1. Получить свой Chat ID: https://t.me/userinfobot
2. На странице настроек раскрыть "Ввести Chat ID вручную"
3. Ввести Chat ID
4. Нажать "Сохранить"

## 5. Тестирование

### GraphQL Playground (http://localhost:4011/graphql)

**1. Проверить настройки:**
```graphql
query {
  userNotificationSettings(userId: "YOUR_USER_ID") {
    enabled
    telegramChatId
    enabledChannels
    subscribedEvents
  }
}
```

**2. Обновить настройки:**
```graphql
mutation {
  updateNotificationSettings(input: {
    userId: "YOUR_USER_ID"
    enabled: true
    enabledChannels: [TELEGRAM, WEBSOCKET]
    subscribedEvents: [CLEANING_ASSIGNED, TASK_ASSIGNED]
  }) {
    enabled
    enabledChannels
  }
}
```

**3. Отправить тестовое уведомление:**
```graphql
mutation {
  sendNotification(input: {
    eventType: SYSTEM_ALERT
    recipientIds: ["YOUR_TELEGRAM_CHAT_ID"]
    channels: [TELEGRAM]
    priority: NORMAL
    title: "🎉 Тест!"
    message: "Поздравляем! Уведомления работают."
  }) {
    id
    status
  }
}
```

## 6. Интеграция с существующими компонентами

### Добавить в Header

```tsx
// src/components/header.tsx
import { TelegramStatus } from '@/components/telegram-status';

export function Header() {
  const { user } = useCurrentUser();
  
  return (
    <header>
      {/* ... другие элементы ... */}
      <TelegramStatus userId={user.id} />
    </header>
  );
}
```

### Добавить в Settings Layout

```tsx
// src/app/(app)/settings/layout.tsx
export default function SettingsLayout({ children }) {
  return (
    <div>
      <nav>
        <a href="/settings/profile">Профиль</a>
        <a href="/settings/notifications">Уведомления</a> {/* <- Новая ссылка */}
        <a href="/settings/security">Безопасность</a>
      </nav>
      <main>{children}</main>
    </div>
  );
}
```

## Готово! 🎉

Теперь у вас есть:
- ✅ Страница настроек уведомлений
- ✅ Hook для управления настройками
- ✅ Компоненты для встраивания
- ✅ Интеграция с Telegram
- ✅ Real-time обновления через WebSocket

---

**Следующие шаги:**
1. Добавьте ссылку на `/settings/notifications` в навигацию
2. Настройте Telegram бота (см. `backend/notifications-subgraph/README.md`)
3. Протестируйте отправку уведомлений

