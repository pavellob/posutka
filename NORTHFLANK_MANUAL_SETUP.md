# ☁️ Ручная настройка переменных в Northflank

## ⚠️ ВАЖНО!

**northflank.yml НЕ применяет переменные автоматически!**

Все переменные нужно добавить **вручную в Northflank UI**.

---

## 🔧 Инструкция по настройке

### Шаг 1: Откройте ваш сервис в Northflank

1. Зайдите в [Northflank Dashboard](https://app.northflank.com)
2. Выберите ваш проект
3. Выберите сервис `posutka-federation`

---

### Шаг 2: Создайте секреты

**Settings → Secrets → Create Secret**

#### Секрет 1: database-url
- **Name**: `database-url`
- **Value**: `postgresql://username:password@host.northflank.io:5432/database_name`
  
**Где взять:**
- Если используете Northflank Addon (PostgreSQL) - скопируйте из Addon → Connection Details
- Или ваш внешний PostgreSQL сервер

#### Секрет 2: telegram-bot-token
- **Name**: `telegram-bot-token`
- **Value**: Токен от [@BotFather](https://t.me/BotFather)
  
**Пример:** `123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567`

---

### Шаг 3: Добавьте Environment Variables

**Settings → Environment Variables → Add Variable**

Добавьте каждую переменную по отдельности:

#### 1. NODE_ENV
- **Name**: `NODE_ENV`
- **Value**: `production`

#### 2. DATABASE_URL
- **Name**: `DATABASE_URL`
- **Type**: Secret Reference
- **Secret**: `database-url`

#### 3. TELEGRAM_BOT_TOKEN
- **Name**: `TELEGRAM_BOT_TOKEN`
- **Type**: Secret Reference
- **Secret**: `telegram-bot-token`

#### 4. FRONTEND_URL
- **Name**: `FRONTEND_URL`
- **Value**: `https://YOUR_TELEGRAM_MINI_APP_URL`
  
⚠️ **ВАЖНО:** 
- Это должен быть URL **мобильного приложения для уборщиков** (Telegram Mini App)
- НЕ backoffice URL!
- Обязательно **HTTPS** (Telegram не принимает HTTP для Web App)
- Приложение должно быть прикреплено к боту в BotFather
  
**Примеры:**
- `https://app.kakadu.com`
- `https://cleaners.posutka.com`
- `https://your-mobile-app.vercel.app`

#### 5. TELEGRAM_USE_MINIAPP
- **Name**: `TELEGRAM_USE_MINIAPP`
- **Value**: `true`

#### 6. TELEGRAM_POLLING
- **Name**: `TELEGRAM_POLLING`
- **Value**: `false`

#### 7. NOTIFICATIONS_GRPC_HOST
- **Name**: `NOTIFICATIONS_GRPC_HOST`
- **Value**: `localhost`

#### 8. NOTIFICATIONS_GRPC_PORT
- **Name**: `NOTIFICATIONS_GRPC_PORT`
- **Value**: `4111`

---

### Шаг 4: Redeploy

1. Deployments → **Redeploy**
2. Дождитесь завершения (может занять 3-5 минут)

---

### Шаг 5: Проверьте логи

**Logs → Real-time logs**

Ищите строки:

```
[cleaning-subgraph] 🔍 Environment variables check:
  NODE_ENV: production
  DATABASE_URL: ✅ SET
  DATABASE_URL_RAW: postgresql://user:***@your-db.northflank.io:5432...
  DATABASE_URL_HOST: your-db.northflank.io:5432  ← НЕ localhost!

[cleaning-subgraph] ✅ Successfully connected to database
```

### ✅ Правильно:
```
DATABASE_URL_HOST: your-db.northflank.io:5432
DATABASE_URL_HOST: db-addon-xxx.northflank.io:5432
DATABASE_URL_HOST: postgres-12345.render.com:5432
```

### ❌ Неправильно:
```
DATABASE_URL_HOST: localhost:5432  ← ПРОБЛЕМА!

⚠️  WARNING: DATABASE_URL uses localhost instead of Docker host!
```

Если видите `localhost` - значит переменная НЕ установлена, и используется дефолтное значение.

---

## Troubleshooting

### Проблема 1: Переменные не применяются

**Симптомы:**
```
DATABASE_URL_HOST: localhost:5432
NOTIFICATIONS_GRPC_HOST: "localhost (default)"
```

**Решение:**
1. Проверьте, что переменные добавлены в UI (Settings → Environment Variables)
2. Проверьте, что секреты созданы (Settings → Secrets)
3. Сделайте **Redeploy** (важно!)
4. Подождите 3-5 минут
5. Проверьте логи снова

### Проблема 2: Секрет не найден

**Симптомы:**
```
Error: Secret 'database-url' not found
```

**Решение:**
1. Создайте секрет с **точным именем** `database-url` (с дефисом!)
2. Убедитесь, что секрет в том же проекте
3. Redeploy

### Проблема 3: DATABASE_URL пустая

**Симптомы:**
```
DATABASE_URL: ❌ NOT SET
DATABASE_URL_HOST: NO HOST
```

**Решение:**
1. Проверьте значение секрета `database-url`
2. Убедитесь, что это валидный PostgreSQL URL
3. Проверьте, что переменная `DATABASE_URL` ссылается на секрет

---

## Полный список переменных для копирования

```
NODE_ENV = production
DATABASE_URL = (from secret: database-url)
TELEGRAM_BOT_TOKEN = (from secret: telegram-bot-token)
FRONTEND_URL = https://posutka-backoffice.vercel.app
TELEGRAM_USE_MINIAPP = true
TELEGRAM_POLLING = false
NOTIFICATIONS_GRPC_HOST = localhost
NOTIFICATIONS_GRPC_PORT = 4111
```

---

## PostgreSQL в Northflank

### Если используете Northflank Addon:

1. **Addons** → **Create Addon** → **PostgreSQL**
2. После создания → **Connection Details**
3. Скопируйте **Connection String**
4. Создайте секрет `database-url` с этим URL

### Если используете внешний PostgreSQL:

Получите connection string от провайдера (Render, Railway, Supabase и т.д.)

---

## Проверка после настройки

### Правильные логи:

```
🔍 DATABASE_URL для миграций: postgresql://user:***@db.northflank.io:5432...
✅ Миграции выполнены!

[cleaning-subgraph] 🔍 Environment variables check:
  DATABASE_URL_HOST: db.northflank.io:5432  ✅
  TELEGRAM_BOT_TOKEN: ✅ SET  ✅

[cleaning-subgraph] ✅ Successfully connected to database  ✅

[notifications-subgraph] ✅ Telegram Bot initialized successfully  ✅
[notifications-grpc-transport] ✅ Notifications GRPC server started  ✅
```

### Ошибочные логи:

```
DATABASE_URL_HOST: localhost:5432  ❌
NOTIFICATIONS_GRPC_HOST: "localhost (default)"  ❌
TELEGRAM_BOT_TOKEN: ❌ NOT SET  ❌

⚠️  WARNING: DATABASE_URL uses localhost instead of Docker host!
❌ Failed to connect to database
```

---

## Важно!

1. ✅ **northflank.yml используется только как template** - реальные переменные нужно добавить в UI
2. ✅ **Secrets хранятся отдельно** - не коммитьте их в репозиторий
3. ✅ **После изменения переменных** - обязательно Redeploy
4. ✅ **Логи показывают точные значения** - используйте их для отладки

---

**Дата:** 20 октября 2025  
**Статус:** 🔴 Требуется ручная настройка в Northflank UI

