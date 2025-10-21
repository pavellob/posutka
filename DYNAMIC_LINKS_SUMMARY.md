# ✅ Реализовано: Динамические ссылки в Telegram уведомлениях

## Что сделано

Настроена система динамических ссылок в Telegram боте, которая автоматически адаптируется к окружению:
- **Локально**: ссылки ведут на `http://localhost:3000`
- **Production**: ссылки ведут на `https://posutka-backoffice.vercel.app`

## Изменения в коде

### 1. ✅ NotificationClient уже поддерживает FRONTEND_URL

В `backend/cleaning-subgraph/src/services/notification-client.ts` уже реализован механизм:

```typescript
constructor(endpoint: string = 'http://localhost:4011/graphql', frontendUrl?: string) {
  this.frontendUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
}

private getFrontendUrl(path: string): string {
  return `${this.frontendUrl}${path}`;
}
```

Используется во всех методах:
- `notifyCleaningAssigned()` → `/cleanings/${cleaningId}`
- `notifyCleaningStarted()` → `/cleanings/${cleaningId}`
- `notifyCleaningCompleted()` → `/cleanings/${cleaningId}`

### 2. ✅ Созданы env.example файлы

#### `/env.example` (корень проекта)
```bash
FRONTEND_URL=http://localhost:3000
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

#### `/backend/cleaning-subgraph/env.example`
```bash
PORT=4010
FRONTEND_URL=http://localhost:3000
NOTIFICATIONS_ENDPOINT=http://localhost:4011/graphql
```

#### `/backend/notifications-subgraph/env.example` (обновлен)
```bash
FRONTEND_URL=http://localhost:3000
```

### 3. ✅ Обновлен docker-compose.yml

```yaml
environment:
  - DATABASE_URL=postgresql://postgres:postgres@db:5432/posutka
  - NODE_ENV=development
  - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
  - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
```

### 4. ✅ Обновлен northflank.yml (Production)

```yaml
environment:
  - name: NODE_ENV
    value: production
  - name: DATABASE_URL
    fromSecret: database-url
  - name: FRONTEND_URL
    value: https://posutka-backoffice.vercel.app
  - name: TELEGRAM_BOT_TOKEN
    fromSecret: telegram-bot-token
```

Добавлены порты:
- 4009 - IAM Subgraph
- 4010 - Cleaning Subgraph
- 4011 - Notifications Subgraph (GraphQL)
- 4111 - Notifications Subgraph (gRPC)
- 4020 - Notifications WebSocket

## Документация

### Созданные файлы

1. **NOTIFICATION_LINKS_SETUP.md** - Полная документация по настройке ссылок
   - Как это работает
   - Настройка для локальной разработки
   - Настройка для production
   - Troubleshooting

2. **QUICK_START_NOTIFICATIONS.md** - Быстрый старт для разработчиков
   - Пошаговая инструкция для локального запуска
   - Пошаговая инструкция для production
   - Проверка работы
   - Частые проблемы

3. **NOTIFICATION_SETUP_CHECKLIST.md** - Чек-лист для проверки настройки
   - Локальная разработка (6 шагов)
   - Production (4 шага)
   - Команды для проверки
   - Troubleshooting

### Обновленные файлы

1. **backend/notifications-subgraph/README.md**
   - Добавлена переменная `FRONTEND_URL` в секцию конфигурации

2. **backend/cleaning-subgraph/README.md**
   - Добавлена полная секция "Конфигурация"
   - Добавлено описание настройки ссылок в уведомлениях
   - Ссылка на NOTIFICATION_LINKS_SETUP.md

## Как использовать

### Локальная разработка

1. Скопируйте `.env.example` в `.env`:
   ```bash
   cp env.example .env
   ```

2. Установите переменные:
   ```bash
   FRONTEND_URL=http://localhost:3000
   TELEGRAM_BOT_TOKEN=your_token_here
   ```

3. Запустите:
   ```bash
   docker-compose up
   ```

4. Ссылки в Telegram будут вести на: `http://localhost:3000/cleanings/{id}`

### Production (Northflank)

1. Создайте секрет `telegram-bot-token` в Northflank

2. Убедитесь, что в `northflank.yml` правильный URL:
   ```yaml
   - name: FRONTEND_URL
     value: https://posutka-backoffice.vercel.app
   ```

3. Задеплойте:
   ```bash
   git push origin main
   ```

4. Ссылки в Telegram будут вести на: `https://posutka-backoffice.vercel.app/cleanings/{id}`

## Проверка работы

### Быстрая проверка

```bash
# 1. Проверьте переменные окружения
docker exec -it posutka-app env | grep FRONTEND_URL

# 2. Создайте тестовую уборку через GraphQL

# 3. Проверьте уведомление в Telegram

# 4. Нажмите на кнопку и убедитесь, что открывается правильный URL
```

### Проверка логов

```bash
docker logs posutka-app | grep "Notification sent"
```

Должно быть:
```
✅ Notification sent successfully! { cleaningId: 'clean_...' }
```

## Преимущества решения

✅ **Автоматическая адаптация** - не нужно менять код при смене окружения

✅ **Централизованная настройка** - одна переменная `FRONTEND_URL` для всех сервисов

✅ **Безопасность** - токен бота хранится в секретах (production)

✅ **Гибкость** - легко изменить URL для staging/dev окружений

✅ **Обратная совместимость** - fallback на localhost:3000 если переменная не установлена

## Следующие шаги

Для использования в production:

1. [ ] Убедитесь, что в Northflank создан секрет `telegram-bot-token`
2. [ ] Проверьте, что `FRONTEND_URL` указывает на правильный URL вашего фронтенда
3. [ ] Задеплойте изменения
4. [ ] Протестируйте создание уборки и получение уведомления

## Ссылки на документацию

- [NOTIFICATION_LINKS_SETUP.md](NOTIFICATION_LINKS_SETUP.md) - полная документация
- [QUICK_START_NOTIFICATIONS.md](QUICK_START_NOTIFICATIONS.md) - быстрый старт
- [NOTIFICATION_SETUP_CHECKLIST.md](NOTIFICATION_SETUP_CHECKLIST.md) - чек-лист
- [backend/notifications-subgraph/README.md](backend/notifications-subgraph/README.md)
- [backend/cleaning-subgraph/README.md](backend/cleaning-subgraph/README.md)



