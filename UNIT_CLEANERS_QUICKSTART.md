# 🚀 Быстрый старт: Привязка уборщиков к квартирам

## ⚡ TL;DR

Теперь можно привязывать уборщиков к квартирам через UI, и они автоматически получают уведомления в Telegram о новых уборках!

---

## 📋 Для администратора

### 1. Откройте список квартир

```
http://localhost:3000/inventory/units
```

### 2. Выберите квартиру и нажмите "👥 Уборщики"

### 3. В диалоге нажмите "✅ Привязать" рядом с нужными уборщиками

Готово! Теперь при создании уборки в этой квартире все привязанные уборщики получат уведомление.

---

## 🔔 Как работают уведомления

### Вариант 1: Уборка с конкретным уборщиком

```graphql
mutation {
  scheduleCleaning(input: {
    unitId: "abc123"
    cleanerId: "def456"  # Указан уборщик
    scheduledFor: "2025-10-25T10:00:00Z"
  }) {
    id
  }
}
```

➡️ **Уведомление уходит только этому уборщику**

### Вариант 2: Уборка без указания уборщика

```graphql
mutation {
  scheduleCleaning(input: {
    unitId: "abc123"
    # cleanerId НЕ указан!
    scheduledFor: "2025-10-25T10:00:00Z"
  }) {
    id
  }
}
```

➡️ **Уведомления уходят ВСЕМ привязанным уборщикам**
➡️ **Любой может взять уборку через Telegram**

---

## 📱 Для уборщика (Telegram)

1. Получаете сообщение: "Доступна новая уборка в квартире X"
2. Нажимаете кнопку "Взять уборку"
3. Открывается Telegram Mini App
4. Уборка назначается на вас!

---

## 🛠️ Миграция БД (один раз)

```bash
cd packages/datalayer-prisma
pnpm prisma migrate dev --name add_unit_preferred_cleaner
```

---

## ✅ Проверка

### 1. Запустите проект:

```bash
pnpm dev:graph
```

### 2. Откройте backoffice:

```bash
cd frontend/backoffice
pnpm dev
```

### 3. Перейдите на:

```
http://localhost:3000/inventory/units
```

---

## 📂 Что добавлено

### Backend:
- ✅ `unitPreferredCleaners` query
- ✅ `addPreferredCleaner` mutation
- ✅ `removePreferredCleaner` mutation
- ✅ `assignCleaningToMe` mutation (для уборщиков)

### Frontend:
- ✅ Страница списка квартир: `/inventory/units`
- ✅ Детали квартиры: `/inventory/units/[id]`
- ✅ Диалог управления уборщиками

### База данных:
- ✅ Таблица `UnitPreferredCleaner`

---

## 🎯 Пример использования

```typescript
// 1. Привязать уборщика к квартире
mutation {
  addPreferredCleaner(
    unitId: "unit-123"
    cleanerId: "cleaner-456"
  ) { id }
}

// 2. Создать уборку без cleanerId
mutation {
  scheduleCleaning(input: {
    unitId: "unit-123"
    scheduledFor: "2025-10-25T10:00:00Z"
  }) { id }
}

// ➡️ Все привязанные уборщики получат уведомление!

// 3. Уборщик назначает себя (из Telegram)
mutation {
  assignCleaningToMe(cleaningId: "cleaning-789") {
    id
    cleaner {
      firstName
      lastName
    }
  }
}
```

---

## 💡 Полная документация

См. `UNIT_CLEANERS_MANAGEMENT.md` для подробной информации.

---

**Готово!** 🎉


