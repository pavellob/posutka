# ✅ Чек-лист настройки уведомлений с динамическими ссылками

## Локальная разработка

### Шаг 1: Файлы конфигурации
- [ ] Создан `.env` файл в корне проекта
- [ ] В `.env` установлена переменная `FRONTEND_URL=http://localhost:3000`
- [ ] В `.env` установлена переменная `TELEGRAM_BOT_TOKEN=...`

### Шаг 2: Telegram бот
- [ ] Создан бот через [@BotFather](https://t.me/BotFather)
- [ ] Токен бота добавлен в `.env`
- [ ] Бот запущен и доступен в Telegram

### Шаг 3: Docker
- [ ] `docker-compose.yml` содержит переменные:
  ```yaml
  - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
  - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
  ```
- [ ] Запущен `docker-compose up`
- [ ] Все сервисы запустились без ошибок:
  - [ ] `notifications-subgraph` на порту 4011
  - [ ] `cleaning-subgraph` на порту 4010
  - [ ] `gateway-mesh` на порту 4000

### Шаг 4: Подключение бота
- [ ] Отправлена команда `/start @your_username` в Telegram боте
- [ ] Бот ответил подтверждением привязки
- [ ] В базе данных создались `UserNotificationSettings`

### Шаг 5: Проверка уведомлений
- [ ] Создана тестовая уборка через GraphQL
- [ ] Уведомление пришло в Telegram
- [ ] В уведомлении есть кнопка "Открыть детали уборки →"
- [ ] Кнопка ведет на `http://localhost:3000/cleanings/{id}`

### Шаг 6: Проверка логов
- [ ] В логах есть:
  ```
  🔔 Starting notification flow for cleaning
  ✅ Cleaner found
  ✅ Notification settings found
  📤 Sending notification...
  ✅ Notification sent successfully!
  ```

---

## Production (Northflank)

### Шаг 1: Секреты
- [ ] В Northflank создан секрет `telegram-bot-token`
- [ ] В секрете установлен правильный токен бота

### Шаг 2: Конфигурация
- [ ] `northflank.yml` содержит:
  ```yaml
  - name: FRONTEND_URL
    value: https://posutka-backoffice.vercel.app
  - name: TELEGRAM_BOT_TOKEN
    fromSecret: telegram-bot-token
  ```
- [ ] Порты настроены:
  - [ ] 4011 - Notifications GraphQL
  - [ ] 4111 - Notifications gRPC
  - [ ] 4020 - Notifications WebSocket
  - [ ] 4010 - Cleaning GraphQL

### Шаг 3: Деплой
- [ ] Изменения закоммичены в git
- [ ] Изменения запушены в main ветку
- [ ] Northflank успешно задеплоил приложение
- [ ] Все сервисы запустились (проверка в Northflank логах)

### Шаг 4: Проверка в production
- [ ] Создана тестовая уборка в production
- [ ] Уведомление пришло в Telegram
- [ ] Кнопка ведет на production URL:
  `https://posutka-backoffice.vercel.app/cleanings/{id}`
- [ ] Страница открывается и отображает детали уборки

---

## Проверка правильности настройки

### Команды для проверки

#### 1. Проверка переменных окружения (локально)
```bash
docker exec -it posutka-app env | grep FRONTEND_URL
docker exec -it posutka-app env | grep TELEGRAM_BOT_TOKEN
```

Должно вывести:
```
FRONTEND_URL=http://localhost:3000
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

#### 2. Проверка работы бота
```bash
docker logs posutka-app | grep "Telegram bot"
```

Должно быть:
```
Telegram bot initialized successfully
Telegram bot command handlers registered
```

#### 3. Проверка отправки уведомления
```bash
docker logs posutka-app | grep "Notification sent"
```

Должно быть:
```
✅ Notification sent successfully! { cleaningId: 'clean_...' }
Message sent to Telegram chat 123456789
```

#### 4. Проверка формирования ссылки
В коде `NotificationClient` логируется URL:
```bash
docker logs posutka-app | grep "actionUrl"
```

Должно быть:
```
actionUrl: 'http://localhost:3000/cleanings/clean_...'
```

---

## Что делать, если что-то не работает

### ❌ Уведомления не приходят

**Проверьте:**
1. Бот подключен через `/start @username`
2. В БД есть `UserNotificationSettings` для пользователя:
   ```sql
   SELECT * FROM "UserNotificationSettings" WHERE "userId" = 'your-user-id';
   ```
3. `enabled = true` и `enabledChannels` содержит `'TELEGRAM'`
4. `subscribedEvents` содержит `'CLEANING_ASSIGNED'`
5. `telegramChatId` не null

### ❌ Ссылки ведут на localhost в production

**Проверьте:**
1. В Northflank переменная `FRONTEND_URL` установлена правильно
2. Перезапустите сервис после изменения переменных
3. Проверьте логи деплоя в Northflank

### ❌ Кнопки не появляются

**Проверьте:**
1. В `notifyCleaningAssigned()` передаются `actionUrl` и `actionText`
2. В Telegram provider правильно формируется `reply_markup`:
   ```typescript
   options.reply_markup = {
     inline_keyboard: [[
       { text: message.actionText, url: message.actionUrl }
     ]]
   };
   ```

### ❌ Бот не отвечает на /start

**Проверьте:**
1. Токен бота правильный
2. Бот запущен (логи `notifications-subgraph`)
3. Command handlers зарегистрированы:
   ```
   Telegram bot command handlers registered
   ```

---

## Дополнительно

### Файлы для проверки

- ✅ [env.example](env.example) - содержит `FRONTEND_URL`
- ✅ [backend/cleaning-subgraph/env.example](backend/cleaning-subgraph/env.example) - содержит `FRONTEND_URL`
- ✅ [backend/notifications-subgraph/env.example](backend/notifications-subgraph/env.example) - содержит `FRONTEND_URL`
- ✅ [docker-compose.yml](docker-compose.yml) - передает `FRONTEND_URL`
- ✅ [northflank.yml](northflank.yml) - содержит `FRONTEND_URL` для production

### Код для проверки

- ✅ [backend/cleaning-subgraph/src/services/notification-client.ts](backend/cleaning-subgraph/src/services/notification-client.ts):
  - Строка 18: `this.frontendUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'`
  - Строка 24: `private getFrontendUrl(path: string): string`
  - Строка 85, 134, 194: Использование `this.getFrontendUrl()`

### Документация

- 📖 [NOTIFICATION_LINKS_SETUP.md](NOTIFICATION_LINKS_SETUP.md) - полная документация
- 📖 [QUICK_START_NOTIFICATIONS.md](QUICK_START_NOTIFICATIONS.md) - быстрый старт
- 📖 [backend/notifications-subgraph/README.md](backend/notifications-subgraph/README.md) - notifications-subgraph
- 📖 [backend/cleaning-subgraph/README.md](backend/cleaning-subgraph/README.md) - cleaning-subgraph

---

## ✅ Финальная проверка

После выполнения всех шагов:

1. [ ] Локально создайте уборку
2. [ ] Получите уведомление в Telegram с кнопкой
3. [ ] Нажмите на кнопку - откроется `http://localhost:3000/cleanings/{id}`
4. [ ] В production создайте уборку
5. [ ] Получите уведомление в Telegram с кнопкой
6. [ ] Нажмите на кнопку - откроется `https://posutka-backoffice.vercel.app/cleanings/{id}`

**Если все пункты выполнены ✅ - настройка завершена!** 🎉



