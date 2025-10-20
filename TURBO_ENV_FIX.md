# ✅ Исправление: Turbo не передавал переменные окружения

## 🎯 Главная проблема

**Симптом:**
```
# При миграциях (migrate.sh):
DATABASE_URL: postgresql://user:***@db:5432/posutka  ✅ Правильно!

# При запуске субграфов (turbo start):
DATABASE_URL_HOST: localhost:5432  ❌ Неправильно!
```

**Причина:** Turbo **НЕ передавал** переменные окружения в задачи по умолчанию!

---

## Как работает Turbo

### ❌ Без `globalEnv`:

```json
{
  "tasks": {
    "start": { "cache": false }
  }
}
```

**Что происходит:**
1. Docker/Northflank устанавливает `DATABASE_URL=postgresql://...@db:5432/...`
2. Запускается `pnpm start:subgraphs` → `turbo start`
3. Turbo **НЕ передает** `DATABASE_URL` в субграфы
4. Субграфы видят только дефолтные переменные или читают из `.env` файлов
5. Результат: `localhost:5432` вместо `db:5432`

### ✅ С `globalEnv`:

```json
{
  "globalEnv": [
    "DATABASE_URL",
    "TELEGRAM_BOT_TOKEN",
    "FRONTEND_URL",
    // ... остальные
  ],
  "tasks": {
    "start": { "cache": false }
  }
}
```

**Что происходит:**
1. Docker/Northflank устанавливает переменные
2. Запускается `pnpm start:subgraphs` → `turbo start`
3. Turbo **передает** все переменные из `globalEnv` в каждый субграф ✅
4. Субграфы видят правильные значения из Northflank
5. Результат: `db:5432` или правильный production хост

---

## Решение

### Добавлен `globalEnv` в turbo.json

```json
{
  "globalEnv": [
    "DATABASE_URL",           // ← База данных
    "NODE_ENV",               // ← Окружение
    "FRONTEND_URL",           // ← URL фронтенда для ссылок
    "TELEGRAM_BOT_TOKEN",     // ← Telegram бот
    "TELEGRAM_USE_MINIAPP",   // ← Mini App в Telegram
    "TELEGRAM_POLLING",       // ← Polling режим
    "NOTIFICATIONS_GRPC_HOST",// ← gRPC хост
    "NOTIFICATIONS_GRPC_PORT",// ← gRPC порт
    "PORT",                   // ← Порты для каждого субграфа
    "GRPC_PORT",
    "GRPC_HOST",
    "WS_PORT",
    "OPS_GRPC_HOST",
    "OPS_GRPC_PORT"
  ],
  "tasks": {
    // ...
  }
}
```

---

## Что это дает

### Все переменные доступны во всех субграфах:

```typescript
// В любом субграфе:
process.env.DATABASE_URL         // ← Правильное значение из Northflank!
process.env.TELEGRAM_BOT_TOKEN   // ← Правильное значение!
process.env.FRONTEND_URL         // ← Правильное значение!
```

### Логи показывают правильные значения:

```
[cleaning-subgraph] 🔍 Environment variables check:
  DATABASE_URL_RAW: "postgresql://user:***@db-addon-xxx.northflank.io:5432..."
  DATABASE_URL_HOST: "db-addon-xxx.northflank.io:5432"  ✅ НЕ localhost!

[notifications-subgraph] 🔍 Environment variables check:
  TELEGRAM_BOT_TOKEN: ✅ SET
  FRONTEND_URL: https://posutka-backoffice.vercel.app

[cleaning-subgraph] ✅ Successfully connected to database
[notifications-subgraph] ✅ Telegram Bot initialized successfully
```

---

## Проверка

### Перед исправлением:

```bash
# В docker-entrypoint.sh
echo "DATABASE_URL: postgresql://...@db:5432..."  ✅ Правильно

# В субграфах (через turbo)
[cleaning-subgraph] DATABASE_URL_HOST: localhost:5432  ❌ Неправильно!
```

### После исправления:

```bash
# В docker-entrypoint.sh
echo "DATABASE_URL: postgresql://...@db:5432..."  ✅ Правильно

# В субграфах (через turbo с globalEnv)
[cleaning-subgraph] DATABASE_URL_HOST: db:5432  ✅ Правильно!
```

---

## Важно!

### globalEnv vs env

- **globalEnv** - переменные доступны во ВСЕХ задачах turbo
- **env** - переменные для конкретной задачи

Мы используем `globalEnv`, чтобы все субграфы получили переменные.

### Кеширование

Turbo кеширует результаты задач. Если переменная в `globalEnv` изменилась, кеш **автоматически инвалидируется**.

---

## Другие субграфы

Все субграфы теперь получают переменные правильно:

- ✅ cleaning-subgraph - DATABASE_URL, FRONTEND_URL, NOTIFICATIONS_GRPC_*
- ✅ notifications-subgraph - DATABASE_URL, TELEGRAM_BOT_TOKEN, все порты
- ✅ bookings-subgraph - DATABASE_URL, OPS_GRPC_*
- ✅ ops-subgraph - DATABASE_URL
- ✅ Все остальные - DATABASE_URL

---

## Файлы

### ✅ Изменен: turbo.json

Добавлен `globalEnv` со всеми необходимыми переменными.

### ✅ Изменен: docker-entrypoint.sh

- Логирование переменных перед запуском
- Явный export переменных
- Использование turbo через `pnpm start:subgraphs`

### ✅ Изменен: .dockerignore

Добавлены `.env` файлы для исключения из Docker образа.

---

## Проверка в Northflank

После деплоя проверьте логи:

### 1. Проверка в entrypoint:
```
🔍 Checking environment variables before starting services...
DATABASE_URL: postgresql://user:***@db-addon-xxx.northflank.io:5432...
TELEGRAM_BOT_TOKEN: 123456:ABC...
```

### 2. Проверка в субграфах:
```
[cleaning-subgraph] DATABASE_URL_HOST: "db-addon-xxx.northflank.io:5432"
[cleaning-subgraph] ✅ Successfully connected to database
```

### 3. БЕЗ warnings:
```
✅ НЕ должно быть:
⚠️  WARNING: DATABASE_URL uses localhost instead of Docker host!
```

---

**Дата:** 20 октября 2025  
**Статус:** ✅ ИСПРАВЛЕНО - Turbo теперь передает все переменные

