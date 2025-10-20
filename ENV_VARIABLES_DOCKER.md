# 🔧 Переменные окружения в Docker и Northflank

## Проблема

При локальной разработке переменные окружения загружаются из `.env` файлов через `dotenv`. Но в Docker и Northflank переменные передаются через `environment` в конфигурации, и **dotenv не должен искать файлы**.

### Что было:

```typescript
// ❌ ПРОБЛЕМА: всегда пытается загрузить .env файл
import 'dotenv/config';
```

**Результат:**
- ✅ Локально работает - находит `.env`
- ❌ В Docker - ищет `.env`, не находит, игнорирует `process.env`

---

## Решение

### 1. Условная загрузка dotenv

Загружаем `.env` **только для локальной разработки**, в production используем `process.env`:

```typescript
// ✅ ПРАВИЛЬНО: загружаем .env только если не production
if (process.env.NODE_ENV !== 'production') {
  try {
    await import('dotenv/config');
  } catch (error) {
    console.log('ℹ️  dotenv not loaded, using environment variables from process.env');
  }
}
```

### 2. Отладочное логирование

Добавляем логи для проверки переменных при старте:

```typescript
logger.info('🔍 Environment variables check:', {
  NODE_ENV: process.env.NODE_ENV,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? '✅ SET' : '❌ NOT SET',
  FRONTEND_URL: process.env.FRONTEND_URL,
  DATABASE_URL: process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET',
});
```

---

## Как работает в разных окружениях

### 🏠 Локальная разработка

```bash
# В backend/notifications-subgraph/.env
TELEGRAM_BOT_TOKEN=123456:ABCdef...
FRONTEND_URL=http://localhost:3000

# Запуск
cd backend/notifications-subgraph
pnpm dev
```

**Что происходит:**
1. `NODE_ENV` не установлен (или `development`)
2. Загружается `dotenv/config`
3. Читается файл `.env`
4. Переменные попадают в `process.env`

### 🐳 Docker (docker-compose.yml)

```yaml
services:
  app:
    environment:
      - NODE_ENV=development
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
```

**Что происходит:**
1. Docker читает переменные из `.env` в корне проекта
2. Передает их в контейнер через `environment`
3. В контейнере: `NODE_ENV=development`, dotenv загружается
4. Но `.env` файла нет в контейнере → dotenv ничего не делает
5. Используются переменные из `process.env` (которые установил Docker)

### ☁️ Northflank (production)

```yaml
# В Northflank настройках
Environment Variables:
  NODE_ENV: production
  TELEGRAM_BOT_TOKEN: 123456:ABCdef...
  FRONTEND_URL: https://app.posutka.com
```

**Что происходит:**
1. `NODE_ENV=production`
2. dotenv **НЕ загружается** (условие `!== 'production'`)
3. Используются переменные из `process.env` напрямую

---

## Конфигурация

### docker-compose.yml

```yaml
services:
  app:
    env_file:
      - .env  # ← Читает переменные из корневого .env
    environment:
      # Базовые переменные
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/posutka
      
      # Telegram (для notifications-subgraph)
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_USE_MINIAPP=${TELEGRAM_USE_MINIAPP:-false}
      - TELEGRAM_POLLING=${TELEGRAM_POLLING:-false}
      
      # Frontend URL (для ссылок в уведомлениях)
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
      
      # gRPC для взаимодействия субграфов
      - NOTIFICATIONS_GRPC_HOST=localhost
      - NOTIFICATIONS_GRPC_PORT=4111
```

### Корневой .env

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/posutka

# Environment
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_USE_MINIAPP=false
TELEGRAM_POLLING=false

# Notifications gRPC
NOTIFICATIONS_GRPC_HOST=localhost
NOTIFICATIONS_GRPC_PORT=4111
```

### backend/notifications-subgraph/.env (для локальной разработки)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/posutka

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_USE_MINIAPP=false
TELEGRAM_POLLING=false

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Server Ports
PORT=4011
GRPC_HOST=localhost
GRPC_PORT=4111
WS_PORT=4020
```

---

## Отладка

### Проверка переменных в логах

При старте каждого сервиса смотрите логи:

```
[notifications-subgraph] 🔍 Environment variables check:
  NODE_ENV: development
  TELEGRAM_BOT_TOKEN: ✅ SET
  TELEGRAM_USE_MINIAPP: false
  FRONTEND_URL: http://localhost:3000
  DATABASE_URL: ✅ SET
  PORT: 4011 (default)
  GRPC_PORT: 4111 (default)
  WS_PORT: 4020 (default)
```

### Если переменные не передаются

1. **В Docker:**
   ```bash
   # Проверьте, что переменные в .env файле
   cat .env | grep TELEGRAM_BOT_TOKEN
   
   # Проверьте в контейнере
   docker-compose exec app env | grep TELEGRAM
   ```

2. **В Northflank:**
   - Откройте Settings → Environment Variables
   - Убедитесь, что все переменные добавлены
   - Проверьте, что `NODE_ENV=production`

3. **Логи при старте:**
   - Ищите строку `🔍 Environment variables check`
   - Смотрите, какие переменные `✅ SET` или `❌ NOT SET`

---

## Измененные файлы

### ✅ backend/notifications-subgraph/src/server.ts

**Было:**
```typescript
import 'dotenv/config';
```

**Стало:**
```typescript
if (process.env.NODE_ENV !== 'production') {
  try {
    await import('dotenv/config');
  } catch (error) {
    console.log('ℹ️  dotenv not loaded, using environment variables from process.env');
  }
}

// ... imports ...

logger.info('🔍 Environment variables check:', {
  NODE_ENV: process.env.NODE_ENV,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? '✅ SET' : '❌ NOT SET',
  // ... остальные переменные
});
```

### ✅ backend/cleaning-subgraph/src/server.ts

Аналогично notifications-subgraph.

### ✅ backend/cleaning-subgraph/src/services/notification-client.ts

**Было:**
```typescript
import dotenv from 'dotenv';
dotenv.config();
```

**Стало:**
```typescript
// Переменные окружения уже загружены в server.ts
```

---

## Преимущества

### 1. **Универсальность**
Одинаково работает локально, в Docker и на Northflank

### 2. **Отладка**
Сразу видно, какие переменные установлены при старте

### 3. **Безопасность**
В production не пытается читать файлы - только `process.env`

### 4. **Совместимость**
Старый код продолжает работать локально через `.env` файлы

---

## Checklist для деплоя

### Docker

- [ ] Переменные в корневом `.env`
- [ ] Переменные в `docker-compose.yml` → `environment`
- [ ] `NODE_ENV` НЕ установлен как `production` (чтобы dotenv работал)
- [ ] Проверить логи: `🔍 Environment variables check`

### Northflank

- [ ] `NODE_ENV=production` в Environment Variables
- [ ] Все переменные добавлены в Settings
- [ ] `TELEGRAM_BOT_TOKEN` установлен
- [ ] `FRONTEND_URL` указывает на production URL
- [ ] Проверить логи: все переменные `✅ SET`

---

## Troubleshooting

### Проблема: `TELEGRAM_BOT_TOKEN: ❌ NOT SET`

**В Docker:**
```bash
# 1. Проверьте .env файл в корне
cat .env | grep TELEGRAM_BOT_TOKEN

# 2. Перезапустите контейнеры
docker-compose down
docker-compose up --build

# 3. Проверьте переменные в контейнере
docker-compose exec app env | grep TELEGRAM
```

**В Northflank:**
1. Settings → Environment Variables
2. Добавьте `TELEGRAM_BOT_TOKEN`
3. Redeploy service

### Проблема: dotenv ищет файл и не находит

**Решение:** Установите `NODE_ENV=production` в Northflank/production окружениях.

### Проблема: Переменные есть, но не читаются

**Решение:** Проверьте порядок импортов - dotenv должен быть **в самом начале** файла.

---

**Дата:** 19 октября 2025  
**Статус:** ✅ Исправлено

