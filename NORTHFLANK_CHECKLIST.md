# ✅ Checklist: Исправление DATABASE_URL в Northflank

## 🎯 Проблема

В логах:
```
DATABASE_URL_RAW: "postgresql://postgres:postgres@localhost:5432/posutka"
DATABASE_URL_HOST: localhost:5432  ❌
```

**Причина:** Переменные из Northflank не применяются.

---

## ✅ Решение (пошагово)

### 1. Добавьте `.env` в `.dockerignore`

✅ **УЖЕ СДЕЛАНО** - `.env` файлы теперь не копируются в Docker образ

### 2. В Northflank Dashboard → Settings → Secrets

Создайте 2 секрета:

#### Секрет: `database-url`
```
postgresql://username:password@your-db-host.northflank.io:5432/database_name
```

**Где взять:**
- Если используете Northflank PostgreSQL Addon:
  - Addons → ваш PostgreSQL → Connection Details → Copy Connection String
- Если внешняя БД:
  - Используйте ваш connection string

⚠️ **ВАЖНО:** Хост должен быть **НЕ localhost**! Например:
- `db-addon-xxx.northflank.io:5432` ✅
- `postgres.railway.app:5432` ✅
- `db.supabase.co:5432` ✅
- `localhost:5432` ❌

#### Секрет: `telegram-bot-token`
```
123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567
```

Получите от [@BotFather](https://t.me/BotFather)

---

### 3. В Northflank Dashboard → Settings → Environment Variables

Добавьте **каждую** переменную вручную (⚠️ **northflank.yml не применяется автоматически!**):

#### Add Variable → Name: `NODE_ENV`, Value: `production`
#### Add Variable → Name: `DATABASE_URL`, Type: **Secret Reference**, Secret: `database-url`
#### Add Variable → Name: `TELEGRAM_BOT_TOKEN`, Type: **Secret Reference**, Secret: `telegram-bot-token`
#### Add Variable → Name: `FRONTEND_URL`, Value: `https://YOUR_MOBILE_APP_URL` ⚠️ **ВАЖНО: Замените на URL вашего Telegram Mini App с HTTPS!**
#### Add Variable → Name: `TELEGRAM_USE_MINIAPP`, Value: `true`
#### Add Variable → Name: `TELEGRAM_POLLING`, Value: `false`
#### Add Variable → Name: `NOTIFICATIONS_GRPC_HOST`, Value: `localhost`
#### Add Variable → Name: `NOTIFICATIONS_GRPC_PORT`, Value: `4111`

---

### 4. Redeploy сервис

1. Deployments → **Redeploy** (или Manual Deploy)
2. Дождитесь завершения (3-5 минут)
3. Смотрите логи в реальном времени

---

### 5. Проверьте логи

**Logs → Real-time logs**

Ищите строки:

#### ✅ Правильно (переменные применились):
```
🔍 Checking environment variables before starting services...
DATABASE_URL: postgresql://user:***@db-addon-xxx.northflank.io:5432...
TELEGRAM_BOT_TOKEN: 123456:ABC...
FRONTEND_URL: https://posutka-backoffice.vercel.app
NODE_ENV: production

[cleaning-subgraph] 🔍 Environment variables check:
  DATABASE_URL_RAW: "postgresql://user:***@db-addon-xxx.northflank.io:5432..."
  DATABASE_URL_HOST: "db-addon-xxx.northflank.io:5432"  ← Правильный хост!

[cleaning-subgraph] ✅ Successfully connected to database
```

#### ❌ Неправильно (переменные не применились):
```
🔍 Checking environment variables before starting services...
DATABASE_URL: postgresql://postgres:postgres@localhost:5432...  ← localhost!
TELEGRAM_BOT_TOKEN:   ← пустая!

[cleaning-subgraph] DATABASE_URL_HOST: "localhost:5432"  ❌

⚠️  WARNING: DATABASE_URL uses localhost instead of Docker host!
❌ Failed to connect to database
```

---

## 🔧 Что может быть не так

### Причина 1: Переменные не добавлены в UI

**Симптом:** В логах `localhost:5432`

**Решение:** Добавьте все 8 переменных вручную в Northflank UI

### Причина 2: Секреты не созданы

**Симптом:** Error: Secret 'database-url' not found

**Решение:** Создайте секреты `database-url` и `telegram-bot-token`

### Причина 3: Неправильный хост в секрете

**Симптом:** В секрете стоит `localhost`

**Решение:** Измените значение секрета на реальный хост БД

### Причина 4: Не сделан Redeploy после добавления переменных

**Симптом:** Старые логи продолжают показывать `localhost`

**Решение:** Сделайте Redeploy и дождитесь завершения

---

## 📝 Копируйте в Northflank UI

### Environment Variables (точные имена и значения):

```
NODE_ENV = production
DATABASE_URL = (Secret Reference: database-url)
TELEGRAM_BOT_TOKEN = (Secret Reference: telegram-bot-token)
FRONTEND_URL = https://posutka-backoffice.vercel.app
TELEGRAM_USE_MINIAPP = true
TELEGRAM_POLLING = false
NOTIFICATIONS_GRPC_HOST = localhost
NOTIFICATIONS_GRPC_PORT = 4111
```

### Secrets (точные имена):

```
database-url = postgresql://user:pass@db-host.northflank.io:5432/dbname
telegram-bot-token = 123456:ABCdef...
```

---

## 🎯 После успешной настройки

В логах должно быть:

```
✅ Миграции выполнены!
[cleaning-subgraph] ✅ Successfully connected to database
[notifications-subgraph] ✅ Telegram Bot initialized successfully
[notifications-grpc-transport] ✅ Notifications GRPC server started
✅ Подграфы готовы!
✅ Суперграф собран!
🌐 Запуск Gateway...
```

**БЕЗ** warnings о localhost!

---

## 🚨 Критично!

**northflank.yml - это только документация!**

Northflank НЕ применяет переменные из этого файла автоматически.

**Вы ОБЯЗАТЕЛЬНО должны:**
1. Создать секреты вручную
2. Добавить Environment Variables вручную
3. Redeploy

**Только после этого** переменные появятся в приложении!

---

**Дата:** 20 октября 2025  
**Статус:** 🔴 Требуется ручная настройка в Northflank

