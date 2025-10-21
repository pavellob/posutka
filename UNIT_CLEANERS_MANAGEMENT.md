# 👥 Управление привязкой уборщиков к квартирам

## 📋 Обзор

Реализована полная система для управления привязкой уборщиков к квартирам с автоматическими уведомлениями в Telegram и возможностью самостоятельного назначения на уборки через Telegram Mini App.

---

## 🎯 Что реализовано

### 1️⃣ **Backend (GraphQL API)**

#### Добавлено в `backend/cleaning-subgraph/src/schema/index.gql`:

```graphql
# Query для получения привязанных уборщиков
unitPreferredCleaners(unitId: UUID!): [CleanerPreference!]!

# Mutations для управления привязкой
addPreferredCleaner(unitId: UUID!, cleanerId: UUID!): Unit!
removePreferredCleaner(unitId: UUID!, cleanerId: UUID!): Unit!

# Type для связи
type CleanerPreference {
  id: UUID!
  cleaner: Cleaner!
  createdAt: DateTime!
}
```

#### Resolvers в `backend/cleaning-subgraph/src/resolvers/index.ts`:

- `unitPreferredCleaners` - получить список привязанных уборщиков для квартиры
- `addPreferredCleaner` - добавить уборщика в список предпочтительных
- `removePreferredCleaner` - удалить уборщика из списка

#### База данных (`packages/datalayer-prisma/prisma/schema.prisma`):

```prisma
model UnitPreferredCleaner {
  id        String   @id @default(cuid())
  unitId    String
  cleanerId String
  createdAt DateTime @default(now())
  
  unit    Unit    @relation(fields: [unitId], references: [id])
  cleaner Cleaner @relation(fields: [cleanerId], references: [id])
  
  @@unique([unitId, cleanerId])
}
```

---

### 2️⃣ **Frontend (Backoffice UI)**

#### Новые файлы:

1. **`frontend/backoffice/src/components/manage-unit-cleaners-dialog.tsx`**
   - Диалог для управления привязкой уборщиков
   - Поиск уборщиков по имени и Telegram
   - Визуализация статуса (привязан/не привязан)
   - Добавление/удаление уборщиков

2. **`frontend/backoffice/src/app/(app)/inventory/units/page.tsx`**
   - Список всех квартир организации
   - Кнопка быстрого перехода к управлению уборщиками
   - Отображение основной информации о квартирах

3. **`frontend/backoffice/src/app/(app)/inventory/units/[id]/page.tsx`**
   - Детальная страница квартиры
   - Кнопка "Управление уборщиками"
   - Информация об автоматических уведомлениях

#### Обновлены GraphQL запросы в `lib/graphql-queries.ts`:

```typescript
GET_UNIT_PREFERRED_CLEANERS
ADD_PREFERRED_CLEANER
REMOVE_PREFERRED_CLEANER
```

---

## 🚀 Как использовать

### Для администратора (Backoffice):

1. **Перейдите в раздел "Квартиры"**:
   ```
   /inventory/units
   ```

2. **Выберите квартиру** из списка или нажмите кнопку "👥 Уборщики"

3. **Откроется страница квартиры** с информацией и кнопкой "Управление уборщиками"

4. **В диалоге управления**:
   - Просмотрите список всех уборщиков организации
   - Используйте поиск по имени или Telegram
   - Нажмите "✅ Привязать" для добавления уборщика
   - Нажмите "❌ Отвязать" для удаления уборщика

5. **Привязанные уборщики автоматически**:
   - Получают уведомления в Telegram о новых уборках
   - Могут самостоятельно назначить себя на уборку

---

### Для уборщика (Telegram):

1. **При создании уборки без указания cleanerId**:
   - Все привязанные к квартире уборщики получают уведомление в Telegram
   - Сообщение содержит кнопку "Взять уборку"

2. **Уборщик нажимает кнопку**:
   - Открывается Telegram Mini App (если `TELEGRAM_USE_MINIAPP=true`)
   - Или открывается веб-страница backoffice

3. **Уборщик может назначить себя на уборку**:
   - Через мутацию `assignCleaningToMe(cleaningId: UUID!)`
   - Уборка автоматически назначается на этого уборщика

---

## 📊 Логика работы уведомлений

### Сценарий 1: Уборка с указанным уборщиком

```typescript
// При создании уборки с cleanerId
scheduleCleaning(input: {
  unitId: "...",
  cleanerId: "abc123",  // Указан конкретный уборщик
  // ...
})

// ➡️ Уведомление уходит ТОЛЬКО этому уборщику
// Тип события: CLEANING_ASSIGNED
```

### Сценарий 2: Уборка без указания уборщика

```typescript
// При создании уборки без cleanerId
scheduleCleaning(input: {
  unitId: "...",
  // cleanerId не указан
  // ...
})

// ➡️ Уведомления уходят ВСЕМ привязанным уборщикам этой квартиры
// Тип события: CLEANING_AVAILABLE
// Любой из них может назначить себя через assignCleaningToMe
```

---

## 🔧 API Endpoints

### Query

```graphql
# Получить привязанных уборщиков для квартиры
query GetUnitPreferredCleaners($unitId: UUID!) {
  unitPreferredCleaners(unitId: $unitId) {
    id
    cleaner {
      id
      firstName
      lastName
      telegramUsername
      rating
      isActive
    }
    createdAt
  }
}
```

### Mutations

```graphql
# Добавить уборщика к квартире
mutation AddPreferredCleaner($unitId: UUID!, $cleanerId: UUID!) {
  addPreferredCleaner(unitId: $unitId, cleanerId: $cleanerId) {
    id
  }
}

# Удалить уборщика от квартиры
mutation RemovePreferredCleaner($unitId: UUID!, $cleanerId: UUID!) {
  removePreferredCleaner(unitId: $unitId, cleanerId: $cleanerId) {
    id
  }
}

# Уборщик назначает себя на уборку (из Telegram)
mutation AssignCleaningToMe($cleaningId: UUID!) {
  assignCleaningToMe(cleaningId: $cleaningId) {
    id
    cleaner {
      id
      firstName
      lastName
    }
    status
  }
}
```

---

## 🎨 UI Компоненты

### ManageUnitCleanersDialog

**Props:**
- `isOpen: boolean` - состояние открытия диалога
- `onClose: () => void` - функция закрытия
- `unitId: string` - ID квартиры
- `unitName: string` - название квартиры
- `orgId: string` - ID организации
- `availableCleaners: Cleaner[]` - список доступных уборщиков

**Функционал:**
- ✅ Поиск по имени и Telegram username
- ✅ Визуальная индикация привязанных уборщиков (зеленый фон)
- ✅ Отображение рейтинга и статуса активности
- ✅ Статистика: количество привязанных и всего уборщиков
- ✅ Информационная панель о работе системы
- ✅ Сортировка: сначала привязанные, потом по имени

---

## 🗂️ Структура файлов

```
backend/
  cleaning-subgraph/
    src/
      schema/index.gql          # GraphQL схема (добавлены queries и mutations)
      resolvers/index.ts        # Resolvers для управления привязкой
      services/
        notification-client.ts  # Клиент для отправки уведомлений

packages/
  datalayer-prisma/
    prisma/
      schema.prisma            # Модель UnitPreferredCleaner

frontend/
  backoffice/
    src/
      lib/
        graphql-queries.ts     # GraphQL запросы
      components/
        manage-unit-cleaners-dialog.tsx  # Диалог управления
      app/
        (app)/
          inventory/
            units/
              page.tsx         # Список квартир
              [id]/
                page.tsx       # Детали квартиры
```

---

## 📝 Миграция БД

Выполните миграцию для создания таблицы `UnitPreferredCleaner`:

```bash
cd packages/datalayer-prisma
pnpm prisma migrate dev --name add_unit_preferred_cleaner
```

---

## ✅ Проверка работы

### 1. Запустите subgraphs:

```bash
pnpm dev:graph
```

### 2. Откройте backoffice:

```bash
cd frontend/backoffice
pnpm dev
```

Перейдите на: `http://localhost:3000/inventory/units`

### 3. Тестирование в GraphQL Playground:

```bash
# Cleaning Subgraph
http://localhost:4010/graphql
```

#### Пример: Добавить уборщика к квартире

```graphql
mutation {
  addPreferredCleaner(
    unitId: "your-unit-id"
    cleanerId: "your-cleaner-id"
  ) {
    id
  }
}
```

#### Пример: Создать уборку без cleanerId

```graphql
mutation {
  scheduleCleaning(input: {
    unitId: "your-unit-id"
    # cleanerId не указываем!
    scheduledFor: "2025-10-25T10:00:00Z"
    estimatedDuration: 120
  }) {
    id
    status
  }
}
```

➡️ Все привязанные уборщики получат уведомление в Telegram!

---

## 🔐 Права доступа

- **Админы** могут управлять привязкой уборщиков через backoffice
- **Уборщики** могут назначать себя на доступные уборки через Telegram
- **Текущий пользователь** определяется из контекста (JWT token)

---

## 🎉 Готово!

Система полностью готова к использованию. Администраторы могут привязывать уборщиков к квартирам через удобный интерфейс, а уборщики будут автоматически получать уведомления и смогут самостоятельно назначать себя на уборки.

---

## 📱 Telegram Mini App

Для полноценной работы в production:

1. Установите `TELEGRAM_USE_MINIAPP=true` в Northflank
2. Установите `FRONTEND_URL=https://your-app.com` (обязательно HTTPS!)
3. Уборщики будут получать кнопки с Telegram Web Apps

В development (localhost) будут работать обычные ссылки.


