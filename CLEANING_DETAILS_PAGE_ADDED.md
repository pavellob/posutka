# ✅ Настроена ссылка на диалог деталей уборки

## Что сделано

### 1. Обновлена страница `/cleanings` для работы с URL параметрами

**Файл:** `frontend/backoffice/src/app/(app)/cleanings/page.tsx`

Теперь при переходе по ссылке `/cleanings?id={cleaningId}` автоматически открывается существующий `CleaningDetailsDialog` с:
- ✅ Статусом уборки (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
- ✅ Информацией о квартире и уборщике
- ✅ Датами планирования, начала и завершения
- ✅ Контактами уборщика (телефон, email)
- ✅ Чек-листом уборки с отображением прогресса
- ✅ Документами приемки и сдачи с фотографиями
- ✅ Заметками
- ✅ Связью с задачами

### 2. Изменены ссылки в уведомлениях

**Файл:** `backend/cleaning-subgraph/src/services/notification-client.ts`

Все ссылки теперь используют query параметр вместо динамического роута:
- Было: `/cleanings/${cleaningId}`
- Стало: `/cleanings?id=${cleaningId}`

При клике на кнопку в Telegram:
1. Открывается страница `/cleanings?id=...`
2. Автоматически открывается диалог `CleaningDetailsDialog`
3. При закрытии диалога URL очищается обратно на `/cleanings`

### 3. Настроен dotenv для cleaning-subgraph

**Изменения:**
- Установлен пакет `dotenv`
- Добавлена загрузка `.env` в начале `server.ts`
- Добавлено логирование `FRONTEND_URL` при инициализации `NotificationClient`

### 4. Исправлена настройка FRONTEND_URL

**Убрано из:**
- `backend/notifications-subgraph/env.example` - переменная не нужна, т.к. notifications-subgraph только пересылает готовые ссылки
- `backend/notifications-subgraph/README.md` - удалена документация про FRONTEND_URL

**Добавлены важные комментарии в:**
- `backend/cleaning-subgraph/env.example`
- `env.example` (корень проекта)

⚠️ **Важное замечание про Telegram:**
```bash
# ⚠️ ВАЖНО: Telegram не принимает localhost URL в кнопках!
# Для локальной разработки используйте ngrok: https://ngrok.com/
# Пример: FRONTEND_URL=https://your-subdomain.ngrok-free.dev
```

### 5. Обновлен docker-compose.yml

Добавлено `env_file: - .env` для автоматической загрузки переменных окружения.

## Как использовать

### Локальная разработка

1. **Запустите ngrok для фронтенда:**
   ```bash
   ngrok http 3000
   ```

2. **Создайте `.env` файл в корне проекта:**
   ```bash
   FRONTEND_URL=https://your-subdomain.ngrok-free.dev
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/posutka
   NODE_ENV=development
   ```

3. **Создайте `.env` в `backend/cleaning-subgraph`:**
   ```bash
   PORT=4010
   FRONTEND_URL=https://your-subdomain.ngrok-free.dev
   NOTIFICATIONS_ENDPOINT=http://localhost:4011/graphql
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/posutka
   NODE_ENV=development
   ```

4. **Перезапустите Docker:**
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up
   ```

5. **Создайте тестовую уборку**

6. **Откройте ссылку из Telegram уведомления** - должна открыться страница с полной информацией об уборке

### Структура страницы `/cleanings/[id]`

```
┌─────────────────────────────────────┐
│ ← Уборки                            │
│                                     │
│ Уборка #cmgu2vrk    [SCHEDULED]    │
│ Квартира · Смена постельного белья  │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ [Квартира]  [Уборщик]  [Дата]      │
│                                     │
│ [Начало]    [Завершение]            │
│                                     │
│ Контакты уборщика                   │
│ 📞 +7 xxx    ✉️ email               │
│                                     │
│ Чеклист уборки                      │
│ ☑ Задача 1                          │
│ ☐ Задача 2                          │
│                                     │
│ Документы и фотографии              │
│ 📸 Приемка ДО уборки                │
│ [фото] [фото] [фото]                │
│                                     │
│ 📸 Сдача ПОСЛЕ уборки               │
│ [фото] [фото] [фото]                │
│                                     │
│ Заметки                             │
│ ...                                 │
│                                     │
│ Связанная задача                    │
│ [Перейти к задачам →]               │
└─────────────────────────────────────┘
```

## Проверка работы

### 1. Проверьте переменную окружения

```bash
docker exec -it posutka-app env | grep FRONTEND_URL
```

Должно вывести:
```
FRONTEND_URL=https://your-subdomain.ngrok-free.dev
```

### 2. Проверьте логи при старте cleaning-subgraph

```bash
docker logs posutka-app | grep "NotificationClient initialized"
```

Должно быть:
```
NotificationClient initialized { 
  endpoint: 'http://localhost:4011/graphql',
  frontendUrl: 'https://your-subdomain.ngrok-free.dev',
  envFrontendUrl: 'https://your-subdomain.ngrok-free.dev'
}
```

### 3. Создайте тестовую уборку

```graphql
mutation {
  scheduleCleaning(input: {
    orgId: "your-org-id"
    cleanerId: "your-cleaner-id"
    unitId: "your-unit-id"
    scheduledAt: "2025-10-20T10:00:00Z"
    requiresLinenChange: true
  }) {
    id
  }
}
```

### 4. Проверьте логи отправки уведомления

```bash
docker logs posutka-app | grep "Cleaning assigned notification sent"
```

Должно быть:
```
Cleaning assigned notification sent { 
  cleaningId: '...',
  actionUrl: 'https://your-subdomain.ngrok-free.dev/cleanings/...'
}
```

### 5. Откройте ссылку из Telegram

- Нажмите на кнопку "Открыть детали уборки →" в Telegram
- Возможно появится страница ngrok warning - нажмите "Visit Site"
- Должна открыться страница с деталями уборки

## Архитектура

```
┌──────────────────────┐
│ cleaning-subgraph    │
│                      │
│ ✅ process.env.      │
│    FRONTEND_URL      │
│                      │
│ NotificationClient   │
│ getFrontendUrl()     │
│ ↓                    │
│ /cleanings?id={id}   │
└──────────┬───────────┘
           │
           │ Полная ссылка
           │ https://ngrok.../cleanings?id=123
           │
           ▼
┌──────────────────────┐
│ notifications-       │
│ subgraph             │
│                      │
│ ❌ НЕ использует     │
│    FRONTEND_URL      │
│                      │
│ Просто пересылает    │
│ готовую ссылку       │
└──────────┬───────────┘
           │
           ▼
      🤖 Telegram Bot
           │
           ▼
      👤 Пользователь
           │
           │ Клик по кнопке
           ▼
┌──────────────────────┐
│ Frontend             │
│                      │
│ /cleanings           │
│ page.tsx             │
│                      │
│ useEffect читает     │
│ query param 'id'     │
│ ↓                    │
│ открывает диалог     │
│ CleaningDetails      │
│ Dialog               │
└──────────────────────┘
```

## Файлы изменены

1. ✅ `frontend/backoffice/src/app/(app)/cleanings/page.tsx` - добавлен useSearchParams и useEffect для чтения ?id=
2. ✅ `backend/cleaning-subgraph/src/services/notification-client.ts` - изменены ссылки на query параметры
3. ✅ `backend/cleaning-subgraph/src/server.ts` - добавлен dotenv
4. ✅ `backend/cleaning-subgraph/env.example` - добавлены комментарии про ngrok
5. ✅ `backend/notifications-subgraph/env.example` - убран FRONTEND_URL
6. ✅ `backend/notifications-subgraph/README.md` - убран FRONTEND_URL из документации
7. ✅ `docker-compose.yml` - добавлен `env_file`
8. ✅ `env.example` - добавлены комментарии про ngrok

## Следующие шаги

1. Создайте `.env` файл с вашим ngrok URL
2. Создайте `.env` в `backend/cleaning-subgraph`
3. Перезапустите Docker
4. Протестируйте создание уборки
5. Проверьте, что ссылка из Telegram открывает страницу `/cleanings` с диалогом деталей

