# 🎯 Миграция на Event Bus - Cleaning Subgraph

## Что сделано

### ✅ Отключена старая логика уведомлений

Все прямые вызовы `notificationClient` в `cleaning-subgraph/src/resolvers/index.ts` закомментированы:

1. **scheduleCleaning** (строки 167-319)
   - Блок отправки `CLEANING_ASSIGNED` уведомлений
   - Блок отправки `CLEANING_AVAILABLE` уведомлений preferred cleaners

2. **startCleaning** (строки 328-375)
   - Отправка `CLEANING_STARTED` уведомлений

3. **completeCleaning** (строки 384-427)
   - Отправка `CLEANING_COMPLETED` уведомлений

4. **assignCleaningToMe** (строки 460-491)
   - Отправка подтверждающих `CLEANING_ASSIGNED` уведомлений

5. **cancelCleaning** (строки 505-542)
   - Отправка `CLEANING_CANCELLED` уведомлений

### ✅ Включена новая логика Event Bus

В `scheduleCleaning` (строки 115-166) работает публикация событий:
- Создается событие в `prisma.event.create()`
- Определяется `eventType`: `CLEANING_ASSIGNED` или `CLEANING_SCHEDULED`
- Автоматически определяются `targetUserIds` (cleaner или preferred cleaners)
- Включается полный payload с деталями уборки

## Как работает новая архитектура

```
┌─────────────────┐
│ cleaning-subgraph│
│  scheduleCleaning│
└────────┬─────────┘
         │ publishes event
         ▼
┌─────────────────┐
│  Event Bus      │
│  (events-subgraph)│
└────────┬─────────┘
         │ routes to handlers
         ▼
┌─────────────────────────┐
│ NotificationEventHandler│
│  - Check user settings  │
│  - Render content       │
│  - Create Notification  │
│  - Create NotificationDelivery│
└────────┬─────────────────┘
         │
         ▼
┌─────────────────┐
│notifications-    │
│subgraph          │
│  Process delivery│
│  Send to Telegram│
└──────────────────┘
```

## Преимущества

1. **🔌 Развязка (Decoupling)**
   - `cleaning-subgraph` не знает о Telegram, WebSocket, Email
   - Просто публикует события - и все

2. **📊 Централизованный Event Store**
   - Все события в одной БД таблице `Event`
   - Легко делать аналитику, аудит, дебаг

3. **⚙️ Гибкая настройка**
   - Подписки через `EventSubscription`
   - Можно добавлять новые handlers без изменения domain logic

4. **👤 Уважение к пользователю**
   - `UserNotificationSettings` проверяются в одном месте
   - Нет дублирования проверок

5. **🔍 Прозрачность статусов**
   - `Notification.status` = агрегация `NotificationDelivery.status`
   - Понятно, где и почему фейл

## Статус

- ✅ Старая логика отключена
- ✅ Event Bus интегрирован в `scheduleCleaning`
- ⏳ Нужно добавить события в `startCleaning`, `completeCleaning`, `cancelCleaning`, `assignCleaningToMe`
- ⏳ Тестирование end-to-end

## Следующие шаги

1. Добавить публикацию событий в оставшиеся мутации
2. Протестировать весь flow создания уборки → событие → уведомление → доставка
3. Убрать закомментированный код после успешного тестирования
4. Документировать новые типы событий

