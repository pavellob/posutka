# 🔍 Логирование подключения Prisma к БД

## Добавлено детальное логирование

Теперь при запуске каждого субграфа вы увидите **точный connection string** для Prisma.

---

## Что логируется

### 1. Переменные окружения
```
[subgraph-name] 🔍 Environment variables check:
  NODE_ENV: development
  DATABASE_URL: ✅ SET
```

### 2. Connection String при создании PrismaClient
```
[subgraph-name] 🔍 Creating PrismaClient:
  hasUrl: true
  connectionString: postgresql://***@db:5432/posutka
```

### 3. Результат подключения
```
[subgraph-name] ✅ Successfully connected to database
```

или

```
[subgraph-name] ❌ Failed to connect to database:
  error: "Can't reach database server at `db:5432`"
  url: postgresql://***@db:5432/posutka
```

---

## Примеры логов

### ✅ Успешное подключение (Development)

```
[cleaning-subgraph] 🔍 Environment variables check:
  NODE_ENV: development
  FRONTEND_URL: http://localhost:3000
  NOTIFICATIONS_GRPC_HOST: localhost (default)
  NOTIFICATIONS_GRPC_PORT: 4111 (default)
  DATABASE_URL: ✅ SET

[cleaning-subgraph] Starting Cleaning Subgraph

[cleaning-subgraph] 🔍 Creating PrismaClient:
  hasUrl: true
  connectionString: postgresql://***@localhost:5432/posutka

[cleaning-subgraph] ✅ Successfully connected to database

[cleaning-subgraph] Cleaning Subgraph server started on port 4010
```

### ✅ Успешное подключение (Docker)

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

[notifications-subgraph] 🔍 Creating PrismaClient:
  hasUrl: true
  connectionString: postgresql://***@db:5432/posutka
  fullUrl: postgresql://postgres:postgres@db:5432/posutka...

[notifications-subgraph] ✅ Successfully connected to database

[notifications-subgraph] Initializing notification providers...
```

### ❌ DATABASE_URL не установлена

```
[notifications-subgraph] 🔍 Environment variables check:
  NODE_ENV: production
  TELEGRAM_BOT_TOKEN: ✅ SET
  DATABASE_URL: ❌ NOT SET

[notifications-subgraph] 🔍 Creating PrismaClient:
  hasUrl: false
  connectionString: ❌ NOT SET
  fullUrl: ...

[notifications-subgraph] ❌ Failed to connect to database:
  error: "Environment variable not found: DATABASE_URL"
  url: NOT SET
```

### ❌ База данных недоступна

```
[cleaning-subgraph] 🔍 Creating PrismaClient:
  hasUrl: true
  connectionString: postgresql://***@db:5432/posutka

[cleaning-subgraph] ❌ Failed to connect to database:
  error: "Can't reach database server at `db:5432`"
  url: postgresql://***@db:5432/posutka

Failed to start Cleaning Subgraph
```

### ❌ Неверные credentials

```
[iam-subgraph] 🔍 Creating PrismaClient:
  hasUrl: true
  connectionString: postgresql://***@db:5432/posutka

[iam-subgraph] ❌ Failed to connect to database:
  error: "Authentication failed for user 'wrong_user'"
  url: postgresql://***@db:5432/posutka
```

---

## Что видно в логах

### Connection String формат

**Формат маскирования:**
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
           ↓
postgresql://***@HOST:PORT/DATABASE
```

**Примеры:**
- `postgresql://***@localhost:5432/posutka` - локальная БД
- `postgresql://***@db:5432/posutka` - Docker контейнер
- `postgresql://***@prod-db-123.aws.com:5432/posutka` - Production

### Что НЕ видно (безопасность)

✅ **Пароль замаскирован** - вместо `user:password` показывается `***`  
✅ **Username замаскирован** - для безопасности  
✅ **Полная строка** показывается только первые 50 символов

### Что видно (для отладки)

✅ **Protocol** - postgresql:// или mysql://  
✅ **Host** - localhost, db, или production host  
✅ **Port** - 5432 и т.д.  
✅ **Database name** - posutka  

---

## Измененные субграфы

Логирование добавлено в:

1. ✅ **notifications-subgraph** - полное логирование + проверка подключения
2. ✅ **cleaning-subgraph** - полное логирование + проверка подключения
3. ✅ **iam-subgraph** - логирование connection string
4. ✅ **identity-subgraph** - логирование connection string

---

## Дополнительно: Prisma logging

Все субграфы теперь используют Prisma logging:

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
  log: ['error', 'warn'], // ← Логирование ошибок и предупреждений Prisma
});
```

### Что это дает:

```
[prisma:error] Invalid `prisma.user.findMany()` invocation
[prisma:error] Table 'User' does not exist in the current database

[prisma:warn] There are already 1,000 instances of Prisma Client actively running
```

---

## Отладка проблем

### Проблема 1: "Can't reach database server"

**Логи:**
```
connectionString: postgresql://***@db:5432/posutka
error: "Can't reach database server at `db:5432`"
```

**Причины:**
- ❌ PostgreSQL контейнер не запущен
- ❌ Хост `db` не резолвится (вне Docker network)
- ❌ Порт 5432 закрыт firewall

**Решение:**
```bash
# Проверить, запущена ли БД
docker-compose ps

# Проверить, доступен ли хост
docker-compose exec app ping db

# Проверить порт
docker-compose exec app nc -zv db 5432
```

### Проблема 2: "Authentication failed"

**Логи:**
```
connectionString: postgresql://***@db:5432/posutka
error: "Authentication failed for user 'postgres'"
```

**Причины:**
- ❌ Неверный username или password
- ❌ DATABASE_URL содержит старые credentials

**Решение:**
```bash
# Проверить credentials в docker-compose.yml
grep POSTGRES docker-compose.yml

# Проверить DATABASE_URL
echo $DATABASE_URL
```

### Проблема 3: "Database does not exist"

**Логи:**
```
connectionString: postgresql://***@db:5432/wrong_db_name
error: "Database 'wrong_db_name' does not exist"
```

**Причины:**
- ❌ Неверное имя базы данных в DATABASE_URL
- ❌ База не создана

**Решение:**
```bash
# Проверить имя БД
docker-compose exec db psql -U postgres -l

# Создать БД
docker-compose exec db psql -U postgres -c "CREATE DATABASE posutka;"
```

### Проблема 4: "Environment variable not found"

**Логи:**
```
hasUrl: false
connectionString: ❌ NOT SET
error: "Environment variable not found: DATABASE_URL"
```

**Причины:**
- ❌ DATABASE_URL не установлена в .env
- ❌ DATABASE_URL не передана в docker-compose.yml
- ❌ DATABASE_URL не добавлена в Northflank

**Решение:**
```bash
# Локально: проверить .env
cat .env | grep DATABASE_URL

# Docker: проверить переменные
docker-compose exec app env | grep DATABASE_URL

# Northflank: Settings → Environment Variables → Add DATABASE_URL
```

---

## Checklist для успешного подключения

### ✅ В логах должно быть:

1. `DATABASE_URL: ✅ SET` - переменная установлена
2. `hasUrl: true` - URL передан в PrismaClient
3. `connectionString: postgresql://***@HOST:PORT/DATABASE` - правильный формат
4. `✅ Successfully connected to database` - подключение успешно

### ❌ Если что-то не так:

1. `DATABASE_URL: ❌ NOT SET` → добавить в .env или environment
2. `hasUrl: false` → проверить, передается ли переменная
3. `connectionString: ❌ NOT SET` → DATABASE_URL пустая
4. `❌ Failed to connect` → проверить доступность БД

---

## Пример команды для отладки

```bash
# Запустить с подробными логами
NODE_ENV=development pnpm dev

# В Docker
docker-compose up

# Смотреть только логи подключения к БД
docker-compose logs | grep "Creating PrismaClient"
docker-compose logs | grep "connected to database"
```

---

**Дата:** 19 октября 2025  
**Статус:** ✅ Добавлено детальное логирование

