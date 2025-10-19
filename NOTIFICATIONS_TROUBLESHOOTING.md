# 🔧 Диагностика: Почему не приходят уведомления

## Контрольный список

Когда вы назначаете уборку на уборщика, уведомление должно отправиться. Если этого не происходит, проверьте:

### 1. ✅ Уборщик связан с пользователем или настройками

```sql
-- Проверьте уборщика
SELECT id, "userId", "firstName", "lastName", type, "isActive" 
FROM "Cleaner" 
WHERE id = 'ВАSH_CLEANER_ID';
```

**Ожидаемые результаты:**
- `userId` не null (для INTERNAL) ИЛИ
- `userId` null (для EXTERNAL - будет использован `id`)
- `isActive` = true

### 2. ✅ Есть настройки уведомлений

```sql
-- Для INTERNAL cleaner (если userId не null):
SELECT * FROM "UserNotificationSettings" 
WHERE "userId" = 'userId_из_предыдущего_запроса';

-- Для EXTERNAL cleaner (если userId null):
SELECT * FROM "UserNotificationSettings" 
WHERE "userId" = 'id_уборщика';
```

**Если записи НЕТ:**
```sql
-- Создайте настройки вручную для теста:
INSERT INTO "UserNotificationSettings" 
  ("userId", enabled, "enabledChannels", "subscribedEvents", "createdAt", "updatedAt")
VALUES 
  ('ВАШ_USER_ID_ИЛИ_CLEANER_ID', 
   true, 
   ARRAY['TELEGRAM', 'WEBSOCKET']::text[], 
   ARRAY['CLEANING_ASSIGNED', 'CLEANING_STARTED', 'CLEANING_COMPLETED']::text[],
   NOW(), 
   NOW());
```

### 3. ✅ Настройки правильные

Проверьте поля в `UserNotificationSettings`:

- ✅ `enabled` = true
- ✅ `enabledChannels` содержит 'TELEGRAM'
- ✅ `subscribedEvents` содержит 'CLEANING_ASSIGNED'
- ✅ `telegramChatId` заполнен (не null)

```sql
-- Проверка настроек
SELECT 
  "userId",
  enabled,
  "telegramChatId",
  "enabledChannels",
  "subscribedEvents"
FROM "UserNotificationSettings"
WHERE "userId" = 'ВАШ_USER_ID';
```

**Если что-то не так, обновите:**
```sql
UPDATE "UserNotificationSettings"
SET 
  enabled = true,
  "enabledChannels" = ARRAY['TELEGRAM', 'WEBSOCKET']::text[],
  "subscribedEvents" = ARRAY['CLEANING_ASSIGNED', 'CLEANING_STARTED', 'CLEANING_COMPLETED', 'CLEANING_CANCELLED']::text[],
  "telegramChatId" = 'ВАШ_TELEGRAM_CHAT_ID'
WHERE "userId" = 'ВАШ_USER_ID';
```

### 4. ✅ Telegram chat ID правильный

Получите свой Telegram Chat ID:
1. Откройте https://t.me/userinfobot
2. Отправьте `/start`
3. Бот пришлет ваш ID (например: `123456789`)

Или через notifications-subgraph бота:
1. Откройте бота
2. Отправьте `/start`
3. Проверьте логи notifications-subgraph - там будет автоматическая привязка

### 5. ✅ Notifications-subgraph запущен

```bash
# Проверьте, что сервис запущен
lsof -i:4011  # GraphQL API
lsof -i:4020  # WebSocket

# Если нет - запустите:
cd backend/notifications-subgraph
pnpm dev
```

### 6. ✅ Cleaning-subgraph перезапущен после изменений

```bash
# Если вы только что изменили код - перезапустите:
cd backend/cleaning-subgraph
pnpm build  # если используете production build
# Перезапустите процесс (Ctrl+C и заново pnpm dev)
```

## 📊 Детальная диагностика через логи

После добавления детального логирования, при создании уборки вы увидите в логах cleaning-subgraph:

### ✅ Успешный сценарий:
```
🔔 Starting notification flow for cleaning
✅ Cleaner found { cleanerId: 'xxx', userId: 'yyy', type: 'INTERNAL' }
✅ Unit found { unitId: 'zzz', unitName: 'Apartment 1' }
🎯 Target userId determined { targetUserId: 'yyy' }
✅ Notification settings found { 
  enabled: true, 
  telegramChatId: '***6789',
  enabledChannels: ['TELEGRAM', 'WEBSOCKET'],
  subscribedEvents: ['CLEANING_ASSIGNED']
}
📤 Sending notification...
✅ Notification sent successfully!
```

### ❌ Проблемные сценарии:

**Проблема 1: Нет настроек**
```
⚠️ No notification settings found for user { targetUserId: 'xxx' }
hint: User needs to set up notification settings first. They can do this in /settings/notifications
```
**Решение:** Создайте настройки через UI или SQL (см. выше)

---

**Проблема 2: Уведомления выключены**
```
⚠️ Notifications disabled for user { targetUserId: 'xxx' }
```
**Решение:** Включите в `/settings/notifications` или:
```sql
UPDATE "UserNotificationSettings" SET enabled = true WHERE "userId" = 'xxx';
```

---

**Проблема 3: Нет Telegram chat ID**
```
⚠️ No Telegram chat ID configured
hint: User needs to connect Telegram bot via /start command
```
**Решение:** Отправьте `/start` боту или добавьте вручную:
```sql
UPDATE "UserNotificationSettings" 
SET "telegramChatId" = 'YOUR_CHAT_ID' 
WHERE "userId" = 'xxx';
```

---

**Проблема 4: Канал Telegram не включен**
```
⚠️ Telegram channel not enabled
enabledChannels: ['WEBSOCKET']
```
**Решение:** Включите Telegram в настройках или:
```sql
UPDATE "UserNotificationSettings" 
SET "enabledChannels" = "enabledChannels" || ARRAY['TELEGRAM']::text[]
WHERE "userId" = 'xxx';
```

---

**Проблема 5: Не подписан на событие**
```
⚠️ User not subscribed to CLEANING_ASSIGNED events
subscribedEvents: ['TASK_ASSIGNED']
```
**Решение:** Подпишитесь на событие:
```sql
UPDATE "UserNotificationSettings" 
SET "subscribedEvents" = "subscribedEvents" || ARRAY['CLEANING_ASSIGNED']::text[]
WHERE "userId" = 'xxx';
```

## 🎯 Быстрый тест

### 1. Создайте тестовые настройки для уборщика:

```sql
-- Замените CLEANER_ID на ID вашего уборщика
DO $$
DECLARE
  target_user_id text;
  cleaner_data record;
BEGIN
  -- Получаем userId уборщика
  SELECT id, "userId" INTO cleaner_data FROM "Cleaner" WHERE id = 'CLEANER_ID';
  
  -- Определяем target userId
  target_user_id := COALESCE(cleaner_data."userId", cleaner_data.id);
  
  -- Создаем или обновляем настройки
  INSERT INTO "UserNotificationSettings" 
    ("userId", enabled, "enabledChannels", "subscribedEvents", "telegramChatId", "createdAt", "updatedAt")
  VALUES 
    (target_user_id, true, 
     ARRAY['TELEGRAM', 'WEBSOCKET']::text[], 
     ARRAY['CLEANING_ASSIGNED', 'CLEANING_STARTED', 'CLEANING_COMPLETED', 'CLEANING_CANCELLED']::text[],
     'YOUR_TELEGRAM_CHAT_ID',
     NOW(), NOW())
  ON CONFLICT ("userId") 
  DO UPDATE SET
    enabled = true,
    "enabledChannels" = ARRAY['TELEGRAM', 'WEBSOCKET']::text[],
    "subscribedEvents" = ARRAY['CLEANING_ASSIGNED', 'CLEANING_STARTED', 'CLEANING_COMPLETED', 'CLEANING_CANCELLED']::text[],
    "telegramChatId" = 'YOUR_TELEGRAM_CHAT_ID',
    "updatedAt" = NOW();
    
  RAISE NOTICE 'Settings created/updated for userId: %', target_user_id;
END $$;
```

### 2. Назначьте уборку

### 3. Проверьте логи:

```bash
# Terminal 1: Логи cleaning-subgraph
cd backend/cleaning-subgraph
pnpm dev  # смотрите на вывод

# Terminal 2: Логи notifications-subgraph
cd backend/notifications-subgraph
pnpm dev  # смотрите на вывод
```

## 🆘 Все еще не работает?

### Проверьте GraphQL запрос напрямую:

```graphql
# В GraphQL Playground (http://localhost:4011/graphql)
mutation TestNotification {
  sendNotification(input: {
    eventType: SYSTEM_ALERT
    recipientIds: ["YOUR_TELEGRAM_CHAT_ID"]
    channels: [TELEGRAM]
    priority: NORMAL
    title: "Test"
    message: "Test notification"
  }) {
    id
    status
  }
}
```

Если это работает, но уборка не отправляет - проблема в cleaning-subgraph.
Если это НЕ работает - проблема в notifications-subgraph или Telegram.

### Проверьте Telegram бота:

```bash
# Проверьте, что бот жив
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"

# Отправьте тестовое сообщение
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -d "chat_id=YOUR_CHAT_ID" \
  -d "text=Test message"
```

---

**Дата создания:** 15 октября 2025
**Статус:** 🔧 Активно используется для диагностики

