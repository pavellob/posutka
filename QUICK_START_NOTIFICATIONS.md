# 🚀 Быстрый старт: Уведомления с динамическими ссылками

## Для локальной разработки

### 1. Настройка переменных окружения

Скопируйте `.env.example` в `.env` в корне проекта:

```bash
cp env.example .env
```

### 2. Установите переменные

В `.env` убедитесь, что есть:

```bash
# Frontend URL для локальной разработки
FRONTEND_URL=http://localhost:3000

# Токен Telegram бота
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 3. Получите токен Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Скопируйте токен и вставьте в `.env`

### 4. Запустите проект

```bash
docker-compose up
```

### 5. Подключите Telegram бот

1. Найдите вашего бота в Telegram
2. Отправьте команду `/start @your_telegram_username`
   - Например: `/start @ivan_ivanov`
3. Бот ответит подтверждением привязки

### 6. Создайте тестовую уборку

Перейдите в GraphQL Playground на `http://localhost:4000/graphql`:

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
    status
  }
}
```

### 7. Проверьте уведомление

В Telegram придет сообщение с кнопкой **"Открыть детали уборки →"**.

При нажатии откроется: `http://localhost:3000/cleanings/{id}`

---

## Для продакшн деплоя

### 1. Настройте секреты в Northflank

В настройках проекта добавьте секрет:
- **Название**: `telegram-bot-token`
- **Значение**: ваш токен из BotFather

### 2. Обновите FRONTEND_URL (если нужно)

В `northflank.yml` убедитесь, что URL правильный:

```yaml
environment:
  - name: FRONTEND_URL
    value: https://posutka-backoffice.vercel.app  # или ваш URL
```

### 3. Деплой

```bash
git add .
git commit -m "Configure notification links"
git push origin main
```

Northflank автоматически применит изменения.

### 4. Проверка

После деплоя ссылки в Telegram будут вести на:
`https://posutka-backoffice.vercel.app/cleanings/{id}`

---

## Проверка работы

### Проверьте переменные окружения

```bash
# В Docker контейнере
docker exec -it posutka-app env | grep FRONTEND_URL
```

Должно вывести:
```
FRONTEND_URL=http://localhost:3000
```

### Проверьте логи

При создании уборки в логах должно быть:

```
🔔 Starting notification flow for cleaning
✅ Cleaner found
✅ Unit found
✅ Notification settings found
📤 Sending notification...
✅ Notification sent successfully!
```

---

## Troubleshooting

### ❌ Ссылки ведут не туда

**Проблема**: Ссылки в production ведут на localhost

**Решение**:
1. Проверьте `northflank.yml`:
   ```yaml
   - name: FRONTEND_URL
     value: https://posutka-backoffice.vercel.app
   ```
2. Перезапустите сервис в Northflank
3. Пересоздайте тестовое уведомление

### ❌ Кнопки не появляются в Telegram

**Проблема**: В сообщениях Telegram нет кнопок с действиями

**Решение**:
1. Проверьте логи `notifications-subgraph`:
   ```bash
   docker logs posutka-app | grep "notification"
   ```
2. Убедитесь, что `actionUrl` и `actionText` передаются в notification client
3. Проверьте, что Telegram provider правильно формирует `inline_keyboard`

### ❌ Уведомления не приходят

**Проблема**: Уведомления вообще не приходят в Telegram

**Решение**:
1. Проверьте, что бот подключен через `/start @username`
2. Проверьте настройки уведомлений пользователя в `/settings/notifications`
3. Проверьте, что уборщик привязан к пользователю (`userId`)
4. Проверьте логи для деталей

---

## Дополнительные ресурсы

- [NOTIFICATION_LINKS_SETUP.md](NOTIFICATION_LINKS_SETUP.md) - полная документация
- [backend/notifications-subgraph/README.md](backend/notifications-subgraph/README.md) - документация notifications-subgraph
- [backend/cleaning-subgraph/README.md](backend/cleaning-subgraph/README.md) - документация cleaning-subgraph



