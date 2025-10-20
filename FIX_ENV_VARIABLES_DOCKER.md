# ✅ Исправление: Переменные окружения в Docker

## Проблема

При запуске в Docker переменные окружения передавались в контейнер через `docker-compose.yml`, но **не доходили** до:
1. **Prisma CLI** (`prisma db push`, `prisma generate`)
2. **Субграфов** (notifications-subgraph, cleaning-subgraph)

### Симптомы:

```
❌ TELEGRAM_BOT_TOKEN not set, Telegram notifications disabled
❌ Prisma error: Environment variable not found: DATABASE_URL
```

---

## Причины

### 1. dotenv искал файлы вместо process.env

**Было:**
```typescript
import 'dotenv/config'; // ← Всегда пытается загрузить .env файл
```

**Проблема:**
- В Docker `.env` файла нет в контейнере
- dotenv не находит файл, но переменные УЖЕ в `process.env`
- Некоторые конфигурации dotenv могли игнорировать `process.env`

### 2. Prisma команды не получали DATABASE_URL

**Было:**
```bash
cd packages/datalayer-prisma && pnpm prisma db push
```

**Проблема:**
- При `cd` в подпапку переменные окружения могли не передаваться
- pnpm мог не передавать переменные в Prisma CLI

---

## Решение

### ✅ 1. Условная загрузка dotenv (для всех субграфов)

**notifications-subgraph/src/server.ts:**
```typescript
// Загружаем .env только для локальной разработки
// В Docker/production переменные уже в process.env
if (process.env.NODE_ENV !== 'production') {
  try {
    await import('dotenv/config');
  } catch (error) {
    console.log('ℹ️  dotenv not loaded, using environment variables from process.env');
  }
}

// Отладка переменных окружения при старте
logger.info('🔍 Environment variables check:', {
  NODE_ENV: process.env.NODE_ENV,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? '✅ SET' : '❌ NOT SET',
  FRONTEND_URL: process.env.FRONTEND_URL,
  DATABASE_URL: process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET',
});
```

**cleaning-subgraph/src/server.ts:**
```typescript
// Аналогично
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (error) {
    console.log('ℹ️  dotenv not loaded, using environment variables from process.env');
  }
}

logger.info('🔍 Environment variables check:', {
  FRONTEND_URL: process.env.FRONTEND_URL,
  NOTIFICATIONS_GRPC_HOST: process.env.NOTIFICATIONS_GRPC_HOST || 'localhost (default)',
  NOTIFICATIONS_GRPC_PORT: process.env.NOTIFICATIONS_GRPC_PORT || '4111 (default)',
  DATABASE_URL: process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET',
});
```

### ✅ 2. Явная передача DATABASE_URL в Prisma

**docker-entrypoint.sh:**
```bash
# Выполняем миграции
echo "🔄 Выполнение миграций базы данных..."
echo "🔍 DATABASE_URL для миграций: ${DATABASE_URL:0:30}..."
cd packages/datalayer-prisma && DATABASE_URL="$DATABASE_URL" pnpm prisma db push --accept-data-loss

# Генерируем Prisma клиент
echo "🔧 Генерация Prisma клиента..."
cd packages/datalayer-prisma && DATABASE_URL="$DATABASE_URL" pnpm prisma generate
```

**scripts/migrate.sh:**
```bash
# Проверяем DATABASE_URL
echo "🔍 Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  exit 1
else
  echo "✅ DATABASE_URL is set: ${DATABASE_URL:0:30}..."
fi

# Выполняем с явной передачей
until DATABASE_URL="$DATABASE_URL" pnpm prisma db push --accept-data-loss; do
  echo "⏳ База данных недоступна, ждем..."
  sleep 5
done
```

### ✅ 3. Добавлены переменные для gRPC в docker-compose.yml

```yaml
environment:
  - DATABASE_URL=postgresql://postgres:postgres@db:5432/posutka
  - NODE_ENV=development
  - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
  - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
  - TELEGRAM_USE_MINIAPP=${TELEGRAM_USE_MINIAPP:-false}
  - TELEGRAM_POLLING=${TELEGRAM_POLLING:-false}
  - NOTIFICATIONS_GRPC_HOST=localhost      # ← Добавлено
  - NOTIFICATIONS_GRPC_PORT=4111           # ← Добавлено
```

---

## Как это работает теперь

### 🏠 Локальная разработка

```bash
# В backend/notifications-subgraph/.env
TELEGRAM_BOT_TOKEN=123456:ABC...

# Запуск
cd backend/notifications-subgraph
pnpm dev
```

**Процесс:**
1. `NODE_ENV` не установлен → загружается dotenv
2. Читается `.env` файл
3. Переменные попадают в `process.env`
4. Telegram провайдер инициализируется ✅

**Логи:**
```
[notifications-subgraph] 🔍 Environment variables check:
  NODE_ENV: undefined
  TELEGRAM_BOT_TOKEN: ✅ SET
  FRONTEND_URL: http://localhost:3000
  DATABASE_URL: ✅ SET
```

### 🐳 Docker

```bash
docker-compose up --build
```

**Процесс:**
1. Docker читает корневой `.env`
2. Передает переменные через `environment` секцию
3. В контейнере `NODE_ENV=development` → dotenv пытается загрузиться
4. `.env` файла нет → используется `process.env` от Docker
5. При запуске `pnpm prisma` - явно передается `DATABASE_URL="$DATABASE_URL"`

**Логи:**
```
🔍 DATABASE_URL для миграций: postgresql://postgres:postgres...
[notifications-subgraph] 🔍 Environment variables check:
  NODE_ENV: development
  TELEGRAM_BOT_TOKEN: ✅ SET
  FRONTEND_URL: http://localhost:3000
  DATABASE_URL: ✅ SET
```

### ☁️ Northflank (production)

В Northflank Settings → Environment Variables:
```
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
TELEGRAM_BOT_TOKEN=123456:ABC...
FRONTEND_URL=https://app.posutka.com
TELEGRAM_USE_MINIAPP=true
NOTIFICATIONS_GRPC_HOST=localhost
NOTIFICATIONS_GRPC_PORT=4111
```

**Процесс:**
1. `NODE_ENV=production` → dotenv **НЕ загружается**
2. Используются только переменные из Northflank
3. При запуске Prisma - явно передается `DATABASE_URL`

**Логи:**
```
🔍 DATABASE_URL для миграций: postgresql://production...
[notifications-subgraph] 🔍 Environment variables check:
  NODE_ENV: production
  TELEGRAM_BOT_TOKEN: ✅ SET
  FRONTEND_URL: https://app.posutka.com
  DATABASE_URL: ✅ SET
```

---

## Проверка

### После изменений вы должны увидеть:

**При миграциях:**
```
🔄 Выполнение миграций базы данных...
🔍 DATABASE_URL для миграций: postgresql://postgres:postgr...
✅ Миграции выполнены!
```

**При запуске сервиса:**
```
[notifications-subgraph] 🔍 Environment variables check:
  TELEGRAM_BOT_TOKEN: ✅ SET
  DATABASE_URL: ✅ SET
[telegram-provider] ✅ Telegram Bot initialized successfully
```

### Если переменная не установлена:

```
[notifications-subgraph] 🔍 Environment variables check:
  TELEGRAM_BOT_TOKEN: ❌ NOT SET
  DATABASE_URL: ✅ SET
[notifications-subgraph] ⚠️ TELEGRAM_BOT_TOKEN not set, Telegram notifications disabled
```

---

## Измененные файлы

### ✅ Субграфы
1. `backend/notifications-subgraph/src/server.ts`
   - Условная загрузка dotenv
   - Отладочное логирование

2. `backend/cleaning-subgraph/src/server.ts`
   - Условная загрузка dotenv
   - Отладочное логирование

3. `backend/cleaning-subgraph/src/services/notification-client.ts`
   - Убран повторный вызов dotenv

### ✅ Скрипты
4. `docker-entrypoint.sh`
   - Явная передача `DATABASE_URL` в prisma команды
   - Добавлено логирование DATABASE_URL

5. `scripts/migrate.sh`
   - Проверка наличия DATABASE_URL
   - Явная передача в prisma команды

### ✅ Конфигурация
6. `docker-compose.yml`
   - Добавлены `NOTIFICATIONS_GRPC_HOST` и `NOTIFICATIONS_GRPC_PORT`

7. `env.example`
   - Добавлены комментарии и переменные для gRPC

---

## Northflank Configuration

Добавьте эти переменные в Settings → Environment Variables:

```
# Required
DATABASE_URL=postgresql://user:password@host:5432/database
NODE_ENV=production
TELEGRAM_BOT_TOKEN=123456:ABCdefGHIjkl...

# Optional (with defaults)
FRONTEND_URL=https://app.posutka.com
TELEGRAM_USE_MINIAPP=true
TELEGRAM_POLLING=false
NOTIFICATIONS_GRPC_HOST=localhost
NOTIFICATIONS_GRPC_PORT=4111
PORT=4011
GRPC_PORT=4111
WS_PORT=4020
```

---

## Troubleshooting

### DATABASE_URL не находится

**Проверьте логи:**
```bash
# Ищите эту строку
grep "DATABASE_URL для миграций" logs.txt

# Если видите:
🔍 DATABASE_URL для миграций: postgresql://...
# → переменная передается ✅

# Если видите:
🔍 DATABASE_URL для миграций: ...
# → переменная пустая ❌
```

**Решение:**
- Проверьте `.env` файл в корне проекта
- Проверьте `docker-compose.yml` → `environment` секцию
- Убедитесь, что переменная не пустая: `echo $DATABASE_URL`

### TELEGRAM_BOT_TOKEN не находится

**Проверьте логи:**
```bash
grep "Environment variables check" logs.txt
```

**Должно быть:**
```
TELEGRAM_BOT_TOKEN: ✅ SET
```

**Если видите:**
```
TELEGRAM_BOT_TOKEN: ❌ NOT SET
```

**Решение:**
- Добавьте в корневой `.env`: `TELEGRAM_BOT_TOKEN=...`
- Или в Northflank: Settings → Environment Variables → Add

---

## Преимущества

### 1. **Универсальность**
Работает одинаково локально, в Docker и на Northflank

### 2. **Отладка**
Сразу видно, какие переменные установлены

### 3. **Явность**
DATABASE_URL явно передается в каждую prisma команду

### 4. **Безопасность**
В production не читаются файлы - только `process.env`

### 5. **Надежность**
Проверка DATABASE_URL перед миграциями

---

**Дата:** 19 октября 2025  
**Статус:** ✅ Исправлено

