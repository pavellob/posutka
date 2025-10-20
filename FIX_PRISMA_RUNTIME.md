# ✅ Исправление: PrismaClient не может подключиться к БД в runtime

## 🎯 Главная проблема

**Симптом:** 
```
Error: Environment variable not found: DATABASE_URL
```

или

```
Error: Can't reach database server at `localhost:5432`
```

**При том, что:**
- DATABASE_URL установлена в docker-compose.yml ✅
- Логи показывают `DATABASE_URL: ✅ SET` ✅

---

## Причина

### Проблема с порядком выполнения

В TypeScript/JavaScript модули выполняются **сверху вниз**, и код на уровне модуля выполняется **при импорте**.

**Было:**

```typescript
// packages/datalayer-prisma/src/prismaClient.ts
export const prisma = new PrismaClient(); // ← Выполняется ПРИ ИМПОРТЕ!

// backend/iam-subgraph/src/server.ts
import { IdentityDLPrisma, prisma } from '@repo/datalayer-prisma';
// ↑ Здесь выполняется prismaClient.ts
// ↑ DATABASE_URL еще НЕ загружена!

// Потом загружается dotenv
import 'dotenv/config';
```

**Порядок выполнения:**
1. ❌ Импорт модуля → создание `new PrismaClient()` (DATABASE_URL не установлена!)
2. ✅ Загрузка dotenv → DATABASE_URL попадает в process.env
3. ❌ Но PrismaClient уже создан БЕЗ DATABASE_URL!

---

## Решение

### ✅ Создавать PrismaClient после загрузки переменных

**Стало:**

```typescript
// backend/notifications-subgraph/src/server.ts

// 1. Сначала загружаем переменные (top-level await)
if (process.env.NODE_ENV !== 'production') {
  try {
    await import('dotenv/config');
  } catch (error) {
    console.log('ℹ️  dotenv not loaded, using environment variables from process.env');
  }
}

// 2. Импорты
import { createYoga } from 'graphql-yoga';
import { PrismaClient } from '@prisma/client';
// ...

// 3. Логирование переменных
logger.info('🔍 Environment variables check:', {
  DATABASE_URL: process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET',
});

// 4. Создание Prisma ВНУТРИ функции start()
async function start() {
  logger.info('🔍 Creating PrismaClient with DATABASE_URL:', 
    process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');
  
  const prisma = new PrismaClient(); // ← Теперь DATABASE_URL уже загружена!
  
  // Остальной код...
}

start();
```

---

## Измененные файлы

### 1. **backend/notifications-subgraph/src/server.ts**

**Было:**
```typescript
import 'dotenv/config';
// ... imports ...

const prisma = new PrismaClient(); // ← На уровне модуля

async function start() {
  // ...
}
```

**Стало:**
```typescript
// Top-level await для dotenv
if (process.env.NODE_ENV !== 'production') {
  await import('dotenv/config');
}

// ... imports ...

async function start() {
  const prisma = new PrismaClient(); // ← Внутри функции
  // ...
}
```

### 2. **backend/iam-subgraph/src/server.ts**

**Было:**
```typescript
import { IdentityDLPrisma, prisma } from '@repo/datalayer-prisma';
// ↑ Импорт singleton prisma - создается при импорте модуля!

const dl = new IdentityDLPrisma(prisma);
```

**Стало:**
```typescript
import { IdentityDLPrisma } from '@repo/datalayer-prisma';
import { PrismaClient } from '@prisma/client';

logger.info('🔍 Creating PrismaClient with DATABASE_URL:', 
  process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');

const prisma = new PrismaClient(); // ← Создаем свой экземпляр
const dl = new IdentityDLPrisma(prisma);
```

### 3. **backend/identity-subgraph/src/server.ts**

Аналогично iam-subgraph.

### 4. **backend/iam-subgraph/src/context.ts**

**Было:**
```typescript
import { IdentityDLPrisma, prisma } from '@repo/datalayer-prisma';
// ↑ Импортировал singleton
```

**Стало:**
```typescript
import type { IdentityDLPrisma } from '@repo/datalayer-prisma';
// ↑ Только тип, не импортирует prisma
```

---

## Важно понимать

### ❌ НЕ импортируйте singleton prisma

```typescript
// ❌ ПЛОХО
import { prisma } from '@repo/datalayer-prisma';
// Этот prisma создается при импорте модуля, когда DATABASE_URL может быть не установлена
```

### ✅ Создавайте свой PrismaClient

```typescript
// ✅ ХОРОШО
import { PrismaClient } from '@prisma/client';

async function start() {
  const prisma = new PrismaClient(); // Создается когда переменные уже загружены
  // ...
}
```

---

## Проверка

### Логи при успешном подключении:

```
[notifications-subgraph] 🔍 Environment variables check:
  NODE_ENV: development
  DATABASE_URL: ✅ SET

[notifications-subgraph] 🔍 Creating PrismaClient with DATABASE_URL: ✅ SET
[notifications-subgraph] Initializing notification providers...
✅ Все работает!
```

### Логи при проблеме:

```
[notifications-subgraph] 🔍 Environment variables check:
  DATABASE_URL: ❌ NOT SET

[notifications-subgraph] 🔍 Creating PrismaClient with DATABASE_URL: ❌ NOT SET
❌ Error: Environment variable not found: DATABASE_URL
```

---

## Порядок выполнения (правильный)

```
1. Top-level await
   ↓
2. if (NODE_ENV !== 'production') → await import('dotenv/config')
   ↓ DATABASE_URL загружается в process.env
   ↓
3. Импорты модулей
   ↓
4. logger.info('Environment variables check')
   ↓ Логируем DATABASE_URL: ✅ SET
   ↓
5. async function start() {
     const prisma = new PrismaClient();
     ↑ DATABASE_URL уже доступна!
   }
   ↓
6. start() → запуск сервиса
```

---

## Для всех субграфов

### Правило 1: Dotenv загружается ПЕРВЫМ

```typescript
// ✅ В самом начале файла
if (process.env.NODE_ENV !== 'production') {
  await import('dotenv/config');
}
```

### Правило 2: PrismaClient создается в функции

```typescript
// ✅ Внутри функции start() или startServer()
async function start() {
  const prisma = new PrismaClient();
  // ...
}
```

### Правило 3: НЕ использовать singleton prisma

```typescript
// ❌ НЕ ДЕЛАТЬ
import { prisma } from '@repo/datalayer-prisma';

// ✅ ДЕЛАТЬ
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

---

## Результат

Теперь **все субграфы** корректно подключаются к базе данных:

- ✅ **notifications-subgraph** - PrismaClient создается в start()
- ✅ **cleaning-subgraph** - уже был правильно (в startServer())
- ✅ **iam-subgraph** - исправлен, создает свой PrismaClient
- ✅ **identity-subgraph** - исправлен, создает свой PrismaClient

---

**Дата:** 19 октября 2025  
**Статус:** ✅ ИСПРАВЛЕНО

