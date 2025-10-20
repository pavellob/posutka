# ☁️ Настройка переменных в Northflank

## Обязательные секреты

В Northflank Dashboard → Settings → **Secrets** создайте:

### 1. `database-url`
```
postgresql://username:password@host:port/database
```

**Пример:**
```
postgresql://posutka_user:secure_password@db.northflank.io:5432/posutka_prod
```

### 2. `telegram-bot-token`
```
123456:ABCdefGHIjklMNOpqrsTUVwxyz
```

Получите токен от [@BotFather](https://t.me/BotFather) в Telegram.

---

## Переменные в northflank.yml

Уже настроены в `northflank.yml`:

```yaml
environment:
  # Обязательные
  - name: NODE_ENV
    value: production
  
  - name: DATABASE_URL
    fromSecret: database-url      # ← Создайте секрет!
  
  - name: TELEGRAM_BOT_TOKEN
    fromSecret: telegram-bot-token # ← Создайте секрет!
  
  # С дефолтными значениями
  - name: FRONTEND_URL
    value: https://posutka-backoffice.vercel.app
  
  - name: TELEGRAM_USE_MINIAPP
    value: "true"
  
  - name: TELEGRAM_POLLING
    value: "false"
  
  - name: NOTIFICATIONS_GRPC_HOST
    value: localhost
  
  - name: NOTIFICATIONS_GRPC_PORT
    value: "4111"
```

---

## Checklist для деплоя

### В Northflank UI:

- [ ] Создан секрет `database-url` с правильным PostgreSQL URL
- [ ] Создан секрет `telegram-bot-token` с токеном от BotFather
- [ ] Проверено, что `northflank.yml` в репозитории
- [ ] Service перезапущен (Redeploy)

### Проверка в логах:

После деплоя проверьте логи и найдите:

```
[cleaning-subgraph] 🔍 Environment variables check:
  NODE_ENV: production
  DATABASE_URL: ✅ SET
  DATABASE_URL_RAW: postgresql://posutka_user:***@db.northflank.io:5432/...
  DATABASE_URL_HOST: db.northflank.io:5432  ← Должен быть НЕ localhost!

[cleaning-subgraph] ✅ Successfully connected to database
```

### ❌ Если видите:

```
DATABASE_URL_HOST: localhost:5432

⚠️  WARNING: DATABASE_URL uses localhost instead of Docker host!
```

**Причины:**
1. Секрет `database-url` не создан в Northflank
2. В секрете указан `localhost` вместо реального хоста
3. Northflank не может получить доступ к секрету

---

## Как создать секреты в Northflank

### Шаг 1: Откройте проект
1. Зайдите в Northflank Dashboard
2. Выберите ваш проект
3. Выберите сервис `posutka-federation`

### Шаг 2: Создайте секреты
1. Settings → **Secrets** → **Add Secret**
2. Name: `database-url`
3. Value: `postgresql://username:password@host:port/database`
4. Click **Add**

5. **Add Secret** (еще раз)
6. Name: `telegram-bot-token`
7. Value: `123456:ABCdefGHIjklMNOpqrsTUVwxyz`
8. Click **Add**

### Шаг 3: Redeploy
1. Deployments → **Redeploy**
2. Дождитесь завершения деплоя
3. Проверьте логи

---

## Альтернатива: Environment Variables вместо Secrets

Если не хотите использовать Secrets, можно добавить прямо в Environment Variables:

### В Northflank UI:

Settings → **Environment Variables** → **Add Variable**:

```
DATABASE_URL = postgresql://username:password@host:port/database
TELEGRAM_BOT_TOKEN = 123456:ABC...
FRONTEND_URL = https://posutka-backoffice.vercel.app
TELEGRAM_USE_MINIAPP = true
TELEGRAM_POLLING = false
NOTIFICATIONS_GRPC_HOST = localhost
NOTIFICATIONS_GRPC_PORT = 4111
```

**Но тогда измените** `northflank.yml`:

```yaml
environment:
  - name: DATABASE_URL
    # fromSecret: database-url  ← Уберите это
    # Переменная будет браться из Environment Variables
  
  - name: TELEGRAM_BOT_TOKEN
    # fromSecret: telegram-bot-token  ← Уберите это
```

---

## Проверка

### В логах должно быть:

```
[cleaning-subgraph] 🔍 Environment variables check:
  NODE_ENV: production
  DATABASE_URL: ✅ SET
  DATABASE_URL_RAW: postgresql://posutka_user:***@your-db-host.com:5432...
  DATABASE_URL_HOST: your-db-host.com:5432

[cleaning-subgraph] 🔍 Creating PrismaClient:
  hasUrl: true
  connectionString: postgresql://***@your-db-host.com:5432/posutka

[cleaning-subgraph] 🔍 PrismaClient datasource URL:
  host: your-db-host.com:5432

[cleaning-subgraph] ✅ Successfully connected to database
```

### Если DATABASE_URL не установлена:

```
[cleaning-subgraph] 🔍 Environment variables check:
  DATABASE_URL: ❌ NOT SET
  DATABASE_URL_RAW: 
  DATABASE_URL_HOST: NO HOST

❌ ERROR: DATABASE_URL is not set!
```

---

## Troubleshooting

### Проблема: Секрет не загружается

**Симптомы:**
```
DATABASE_URL: ❌ NOT SET
```

**Решение:**
1. Проверьте имя секрета: должно быть точно `database-url`
2. Проверьте, что секрет создан в том же проекте
3. Redeploy сервис

### Проблема: Переменные есть, но используется localhost

**Симптомы:**
```
DATABASE_URL_HOST: localhost:5432
⚠️  WARNING: DATABASE_URL uses localhost
```

**Решение:**
1. Проверьте значение секрета `database-url`
2. Убедитесь, что там НЕ `localhost`, а реальный хост БД
3. В Northflank должна быть отдельная база данных (Addon)

### Проблема: Переменные из .env локального файла

**Симптомы:**
```
DATABASE_URL_RAW: postgresql://postgres:postgres@localhost:5432...
```

**Причина:** В Docker образ попал `.env` файл

**Решение:**
1. Добавьте `.env` в `.dockerignore`
2. Пересоберите Docker образ
3. Redeploy в Northflank

---

## Итоговый northflank.yml

```yaml
environment:
  # Базовые
  - name: NODE_ENV
    value: production
  
  # Из секретов
  - name: DATABASE_URL
    fromSecret: database-url
  
  - name: TELEGRAM_BOT_TOKEN
    fromSecret: telegram-bot-token
  
  # Статические значения
  - name: FRONTEND_URL
    value: https://posutka-backoffice.vercel.app
  
  - name: TELEGRAM_USE_MINIAPP
    value: "true"
  
  - name: TELEGRAM_POLLING
    value: "false"
  
  - name: NOTIFICATIONS_GRPC_HOST
    value: localhost
  
  - name: NOTIFICATIONS_GRPC_PORT
    value: "4111"
```

---

**Дата:** 19 октября 2025  
**Статус:** ✅ Конфигурация обновлена

