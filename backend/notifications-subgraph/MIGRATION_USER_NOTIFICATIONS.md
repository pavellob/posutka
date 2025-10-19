# Миграция: Нотификации привязаны к пользователям

## Краткое описание изменений

Система нотификаций теперь привязывается к **пользователям** (User), ассоциированным с уборщиками (Cleaner), а не напрямую к уборщикам.

## Причины изменений

1. **Универсальность**: Пользователи могут иметь разные роли (уборщик, менеджер, администратор)
2. **Масштабируемость**: Одна система настроек для всех типов пользователей
3. **Гибкость**: Уборщик может быть INTERNAL (сотрудник с User) или EXTERNAL (подрядчик)

## Схема данных

### Модель Cleaner
```prisma
model Cleaner {
  id               String      @id @default(cuid())
  type             CleanerType @default(EXTERNAL)
  userId           String?     // Для INTERNAL сотрудников
  // ... другие поля
}

enum CleanerType {
  INTERNAL // Сотрудник компании (имеет User)
  EXTERNAL // Внешний подрядчик (userId может быть null)
}
```

### Модель UserNotificationSettings
```prisma
model UserNotificationSettings {
  userId           String   @id
  telegramChatId   String?
  email            String?
  phone            String?
  enabled          Boolean  @default(true)
  enabledChannels  String[]
  subscribedEvents String[]
  // ...
}
```

## Логика привязки userId

Для получения `userId` используется следующая логика:

```typescript
const targetUserId = cleaner.userId || cleaner.id;
```

- **INTERNAL cleaner**: используется `cleaner.userId` (связь с таблицей User)
- **EXTERNAL cleaner**: используется `cleaner.id` как userId (уборщик сам является "пользователем")

## Изменения в коде

### 1. TelegramLinkService

**Новые методы:**
- `linkUserByChatId()` - привязывает пользователя к Telegram chat ID
- `getUserByChatId()` - получает информацию о пользователе по chat ID

**Deprecated методы:**
- `linkCleanerByChatId()` - теперь вызывает `linkUserByChatId()`
- `getCleanerByChatId()` - помечен как deprecated

### 2. Server (notifications-subgraph)

Обновлена логика обработки команд Telegram бота:

```typescript
const linked = await telegramLinkService.linkUserByChatId(username, chatId);
if (linked) {
  logger.info(`✅ Successfully linked user with username @${username} to chat ID ${chatId}`);
} else {
  logger.info(`ℹ️ No user found with Telegram username @${username}`);
}
```

### 3. Cleaning Subgraph

Обновлена логика получения настроек уведомлений во всех мутациях:

```typescript
// Определяем userId
const targetUserId = cleaner?.userId || cleaner?.id;

// Получаем настройки уведомлений пользователя
const settings = targetUserId 
  ? await prisma.userNotificationSettings.findUnique({
      where: { userId: targetUserId },
    }).catch(() => null)
  : null;

// Отправляем уведомление
if (settings?.telegramChatId) {
  await notificationClient.notifyCleaningAssigned({
    telegramChatId: settings.telegramChatId,
    // ...
  });
}
```

## Обновленные файлы

### Notifications Subgraph
- ✅ `src/services/telegram-link.service.ts` - новые методы для работы с пользователями
- ✅ `src/server.ts` - обновлена обработка команд бота
- ✅ `README.md` - обновлены примеры интеграции
- ✅ `QUICKSTART.md` - обновлены примеры кода
- ✅ `INTEGRATION_EXAMPLE.md` - обновлены примеры использования

### Cleaning Subgraph
- ✅ `src/resolvers/index.ts` - обновлена логика отправки уведомлений в мутациях:
  - `scheduleCleaning`
  - `completeCleaning`
  - `cancelCleaning`

## Как использовать

### Привязка Telegram

1. Пользователь (уборщик) открывает Telegram бота
2. Отправляет команду `/start`
3. Бот автоматически ищет Cleaner по `telegramUsername`
4. Определяет `userId` (для INTERNAL - из `cleaner.userId`, для EXTERNAL - `cleaner.id`)
5. Создает/обновляет запись в `UserNotificationSettings`

### Отправка уведомлений

```typescript
// 1. Получаем cleaner
const cleaner = await prisma.cleaner.findUnique({ where: { id } });

// 2. Определяем userId
const targetUserId = cleaner.userId || cleaner.id;

// 3. Получаем настройки уведомлений
const settings = await prisma.userNotificationSettings.findUnique({
  where: { userId: targetUserId }
});

// 4. Отправляем уведомление
if (settings?.telegramChatId) {
  await notificationClient.notify({
    telegramChatId: settings.telegramChatId,
    // ...
  });
}
```

## Миграция существующих данных

Если у вас есть существующие данные:

```sql
-- Создать настройки для INTERNAL cleaners
INSERT INTO "UserNotificationSettings" ("userId", "enabled", "enabledChannels", "subscribedEvents", "createdAt", "updatedAt")
SELECT 
  "userId",
  true,
  ARRAY['TELEGRAM', 'WEBSOCKET']::text[],
  ARRAY['CLEANING_ASSIGNED', 'CLEANING_STARTED', 'CLEANING_COMPLETED', 'CLEANING_CANCELLED']::text[],
  NOW(),
  NOW()
FROM "Cleaner"
WHERE "userId" IS NOT NULL
  AND "isActive" = true
  AND "deletedAt" IS NULL
ON CONFLICT ("userId") DO NOTHING;

-- Создать настройки для EXTERNAL cleaners (используя их id как userId)
INSERT INTO "UserNotificationSettings" ("userId", "enabled", "enabledChannels", "subscribedEvents", "createdAt", "updatedAt")
SELECT 
  "id",
  true,
  ARRAY['TELEGRAM', 'WEBSOCKET']::text[],
  ARRAY['CLEANING_ASSIGNED', 'CLEANING_STARTED', 'CLEANING_COMPLETED', 'CLEANING_CANCELLED']::text[],
  NOW(),
  NOW()
FROM "Cleaner"
WHERE "userId" IS NULL
  AND "isActive" = true
  AND "deletedAt" IS NULL
ON CONFLICT ("userId") DO NOTHING;
```

## Обратная совместимость

- ✅ Старый метод `linkCleanerByChatId()` помечен как deprecated, но продолжает работать
- ✅ Старый метод `getCleanerByChatId()` помечен как deprecated, но продолжает работать
- ✅ Все изменения обратно совместимы с существующей базой данных

## Преимущества новой архитектуры

1. **Единая система уведомлений** для всех типов пользователей
2. **Гибкость**: можно легко добавлять новые роли (менеджеры, администраторы)
3. **Масштабируемость**: одна запись настроек на пользователя
4. **Чистая архитектура**: разделение ролей (User) и специфических данных (Cleaner)

## Дата миграции

15 октября 2025

---

Все изменения протестированы и готовы к использованию! 🚀

