# Настройка ссылок в уведомлениях

## Обзор

Ссылки в уведомлениях Telegram (action buttons) настраиваются динамически в зависимости от окружения через переменную `FRONTEND_URL`.

## Как это работает

### 1. Notification Client

В `backend/cleaning-subgraph/src/services/notification-client.ts` реализован механизм динамического формирования ссылок:

```typescript
constructor(
  endpoint: string = 'http://localhost:4011/graphql',
  frontendUrl?: string
) {
  this.endpoint = endpoint;
  this.frontendUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
}

private getFrontendUrl(path: string): string {
  return `${this.frontendUrl}${path}`;
}
```

Метод `getFrontendUrl()` используется для создания всех ссылок в уведомлениях:
- `notifyCleaningAssigned()` → `/cleanings/${cleaningId}`
- `notifyCleaningStarted()` → `/cleanings/${cleaningId}`
- `notifyCleaningCompleted()` → `/cleanings/${cleaningId}`

### 2. Переменная окружения FRONTEND_URL

#### Локальная разработка

В корневом `.env` (или скопируйте из `env.example`):
```bash
FRONTEND_URL=http://localhost:3000
```

В `backend/cleaning-subgraph/.env`:
```bash
FRONTEND_URL=http://localhost:3000
```

В `backend/notifications-subgraph/.env`:
```bash
FRONTEND_URL=http://localhost:3000
```

#### Docker Compose

В `docker-compose.yml` уже настроена переменная:
```yaml
environment:
  - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
  - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
```

Значение берется из вашего `.env` файла, или используется дефолтное `http://localhost:3000`.

#### Production (Northflank)

В `northflank.yml` настроен production URL:
```yaml
environment:
  - name: FRONTEND_URL
    value: https://posutka-backoffice.vercel.app
  - name: TELEGRAM_BOT_TOKEN
    fromSecret: telegram-bot-token
```

## Настройка для разных окружений

### Локальная разработка

1. Скопируйте `.env.example` в `.env`:
   ```bash
   cp env.example .env
   ```

2. Установите `FRONTEND_URL`:
   ```bash
   FRONTEND_URL=http://localhost:3000
   ```

3. Запустите приложение:
   ```bash
   docker-compose up
   ```

### Production

1. В Northflank установите секрет `telegram-bot-token`:
   - Перейдите в настройки проекта
   - Добавьте секрет с именем `telegram-bot-token`
   - Вставьте ваш токен бота из BotFather

2. `FRONTEND_URL` уже настроен в `northflank.yml`:
   ```
   https://posutka-backoffice.vercel.app
   ```

3. Если ваш фронтенд развернут на другом URL, обновите значение в `northflank.yml`:
   ```yaml
   - name: FRONTEND_URL
     value: https://your-frontend-url.com
   ```

## Проверка работы

### 1. Проверьте переменные окружения

```bash
# В контейнере приложения
docker exec -it posutka-app env | grep FRONTEND_URL
```

### 2. Проверьте логи при отправке уведомления

При создании уборки вы должны увидеть в логах:
```
📤 Sending notification... { cleaningId: '...', userId: '...', telegramChatId: '***1234' }
✅ Notification sent successfully! { cleaningId: '...' }
```

### 3. Проверьте ссылку в Telegram

В сообщении Telegram должна быть кнопка "Открыть детали уборки →" с правильной ссылкой:
- **Локально**: `http://localhost:3000/cleanings/{id}`
- **Production**: `https://posutka-backoffice.vercel.app/cleanings/{id}`

## Troubleshooting

### Ссылки ведут не туда

1. Проверьте переменную `FRONTEND_URL`:
   ```bash
   echo $FRONTEND_URL
   ```

2. Перезапустите сервисы:
   ```bash
   docker-compose restart
   ```

### В production ссылки ведут на localhost

1. Убедитесь, что в Northflank установлена правильная переменная `FRONTEND_URL`
2. Проверьте логи деплоя в Northflank
3. Перезапустите сервис

### Кнопки не появляются в Telegram

1. Проверьте, что передаются `actionUrl` и `actionText` в notification client
2. Убедитесь, что Telegram provider правильно формирует `inline_keyboard`
3. Проверьте логи `notifications-subgraph`

## Дополнительная информация

Для более детальной информации см.:
- [backend/notifications-subgraph/README.md](backend/notifications-subgraph/README.md) - Документация по notifications-subgraph
- [backend/cleaning-subgraph/CLEANING_INTEGRATION.md](backend/cleaning-subgraph/CLEANING_INTEGRATION.md) - Интеграция с cleaning-subgraph


