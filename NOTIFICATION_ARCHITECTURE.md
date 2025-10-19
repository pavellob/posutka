# 🏗️ Архитектура системы уведомлений

## Правильная связь данных

### ✅ Правильная архитектура

```
User (пользователь системы)
  ↓ 1:1 relation
UserNotificationSettings (настройки уведомлений)
  ├── telegramChatId
  ├── email
  ├── phone  
  ├── enabled
  ├── enabledChannels []
  └── subscribedEvents []

Cleaner (уборщик)
  ├── userId (optional) → связь с User для INTERNAL сотрудников
  └── id → используется как userId для EXTERNAL подрядчиков
```

### ❌ Неправильная архитектура

```
Cleaner
  └── telegramChatId  ❌ НЕПРАВИЛЬНО!
```

## Почему так?

### 1. **User - это основная сущность**
- User может иметь разные роли (уборщик, менеджер, администратор)
- Настройки уведомлений привязаны к **пользователю**, а не к роли
- Один User может иметь несколько ролей одновременно

### 2. **Cleaner - это специфическая роль**
- Cleaner может быть:
  - **INTERNAL** - сотрудник компании (имеет `userId`)
  - **EXTERNAL** - внешний подрядчик (не имеет `userId`)
- Для EXTERNAL используется `cleaner.id` как `userId`

### 3. **UserNotificationSettings - централизованные настройки**
- Одна запись на пользователя
- Управляет всеми каналами уведомлений
- Независима от ролей пользователя

## Логика работы

### Для INTERNAL cleaner (сотрудник)

```typescript
const cleaner = await prisma.cleaner.findUnique({ 
  where: { id: cleanerId } 
});

// Используем userId из cleaner
const targetUserId = cleaner.userId; // <- настоящий User ID

const settings = await prisma.userNotificationSettings.findUnique({
  where: { userId: targetUserId }
});

// Отправляем уведомление
if (settings?.telegramChatId) {
  await sendNotification(settings.telegramChatId);
}
```

### Для EXTERNAL cleaner (подрядчик)

```typescript
const cleaner = await prisma.cleaner.findUnique({ 
  where: { id: cleanerId } 
});

// Используем id уборщика как userId
const targetUserId = cleaner.id; // <- cleaner.userId === null

const settings = await prisma.userNotificationSettings.findUnique({
  where: { userId: targetUserId }
});

// Отправляем уведомление
if (settings?.telegramChatId) {
  await sendNotification(settings.telegramChatId);
}
```

### Универсальная логика

```typescript
// Работает для обоих типов:
const targetUserId = cleaner.userId || cleaner.id;

const settings = await prisma.userNotificationSettings.findUnique({
  where: { userId: targetUserId }
});
```

## UI компоненты

### ✅ Где ДОЛЖНЫ быть настройки уведомлений:

1. **Редактирование User** (`edit-user-dialog.tsx`)
   - Прямое редактирование настроек пользователя
   - ✅ Правильно!

2. **Страница Settings** (`/settings`)
   - Текущий пользователь настраивает свои уведомления
   - ✅ Правильно!

3. **Отдельная страница** (`/settings/notifications`)
   - Полные настройки уведомлений
   - ✅ Правильно!

### ℹ️ Где показывается информация (read-only):

4. **Редактирование Cleaner** (`edit-cleaner-dialog.tsx`)
   - Показывает информацию о связанном User
   - Указывает, где настраивать уведомления
   - ℹ️ Только информация, не редактирование

## Примеры кода

### Frontend: Редактирование User

```tsx
// ✅ ПРАВИЛЬНО
import { NotificationSettingsCompact } from '@/components/notification-settings-compact'

function EditUserDialog({ user }) {
  return (
    <Dialog>
      {/* ... поля пользователя ... */}
      
      {/* Настройки уведомлений */}
      <NotificationSettingsCompact userId={user.id} />
    </Dialog>
  );
}
```

### Frontend: Редактирование Cleaner

```tsx
// ✅ ПРАВИЛЬНО - только информация
function EditCleanerDialog({ cleaner }) {
  return (
    <Dialog>
      {/* ... поля уборщика ... */}
      
      {/* Информация о связанном пользователе */}
      {cleaner.userId && (
        <div className="bg-blue-50 p-4">
          <p>📱 Этот уборщик связан с пользователем системы.</p>
          <p>Настройки уведомлений управляются в профиле пользователя.</p>
          <p>User ID: {cleaner.userId}</p>
        </div>
      )}
      
      {!cleaner.userId && (
        <div className="bg-gray-50 p-4">
          <p>ℹ️ Внешний подрядчик (настройки через cleaner.id)</p>
        </div>
      )}
    </Dialog>
  );
}
```

### Backend: Отправка уведомления

```typescript
// ✅ ПРАВИЛЬНО
async function sendCleaningNotification(cleaningId: string) {
  const cleaning = await prisma.cleaning.findUnique({ 
    where: { id: cleaningId },
    include: { cleaner: true }
  });
  
  const cleaner = cleaning.cleaner;
  
  // Универсальная логика для обоих типов
  const targetUserId = cleaner.userId || cleaner.id;
  
  // Получаем настройки пользователя
  const settings = await prisma.userNotificationSettings.findUnique({
    where: { userId: targetUserId }
  });
  
  // Проверяем настройки и отправляем
  if (settings?.enabled && 
      settings?.telegramChatId && 
      settings?.enabledChannels.includes('TELEGRAM') &&
      settings?.subscribedEvents.includes('CLEANING_ASSIGNED')) {
    
    await notificationClient.send({
      chatId: settings.telegramChatId,
      message: 'Вам назначена уборка'
    });
  }
}
```

## Преимущества правильной архитектуры

### 1. **Централизация**
- Все настройки уведомлений в одном месте
- Легко управлять и искать

### 2. **Масштабируемость**
- Легко добавлять новые роли (менеджер, администратор)
- Одна логика для всех

### 3. **Гибкость**
- User может быть уборщиком, менеджером и администратором одновременно
- Настройки остаются едиными

### 4. **Чистота данных**
- Нет дублирования (telegramChatId хранится в одном месте)
- Нет рассинхронизации

### 5. **Простота интеграции**
- Новые сервисы работают с User
- Не нужно знать о Cleaner

## Миграция данных

Если раньше было `cleaner.telegramChatId`:

```sql
-- Создать настройки для INTERNAL cleaners
INSERT INTO "UserNotificationSettings" ("userId", "telegramChatId", "enabled", "enabledChannels", "subscribedEvents", "createdAt", "updatedAt")
SELECT 
  "userId",
  "telegramChatId",
  true,
  ARRAY['TELEGRAM', 'WEBSOCKET']::text[],
  ARRAY['CLEANING_ASSIGNED', 'CLEANING_STARTED', 'CLEANING_COMPLETED']::text[],
  NOW(),
  NOW()
FROM "Cleaner"
WHERE "userId" IS NOT NULL
  AND "telegramChatId" IS NOT NULL
  AND "isActive" = true
ON CONFLICT ("userId") DO UPDATE
  SET "telegramChatId" = EXCLUDED."telegramChatId";

-- Создать настройки для EXTERNAL cleaners (используя их id как userId)
INSERT INTO "UserNotificationSettings" ("userId", "telegramChatId", "enabled", "enabledChannels", "subscribedEvents", "createdAt", "updatedAt")
SELECT 
  "id",
  "telegramChatId",
  true,
  ARRAY['TELEGRAM', 'WEBSOCKET']::text[],
  ARRAY['CLEANING_ASSIGNED', 'CLEANING_STARTED', 'CLEANING_COMPLETED']::text[],
  NOW(),
  NOW()
FROM "Cleaner"
WHERE "userId" IS NULL
  AND "telegramChatId" IS NOT NULL
  AND "isActive" = true
ON CONFLICT ("userId") DO UPDATE
  SET "telegramChatId" = EXCLUDED."telegramChatId";

-- После успешной миграции можно удалить поле (опционально)
-- ALTER TABLE "Cleaner" DROP COLUMN "telegramChatId";
```

## Checklist для разработки

При работе с уведомлениями всегда:

- [ ] Использовать `User.id` или `cleaner.userId || cleaner.id`
- [ ] Работать через `UserNotificationSettings`
- [ ] НЕ хранить `telegramChatId` в `Cleaner`
- [ ] Редактировать настройки в `EditUserDialog`, а не в `EditCleanerDialog`
- [ ] Показывать информацию о связанном User в `EditCleanerDialog`
- [ ] Использовать компонент `NotificationSettingsCompact` для встраивания

---

**Дата создания:** 15 октября 2025
**Статус:** ✅ Внедрено и работает

