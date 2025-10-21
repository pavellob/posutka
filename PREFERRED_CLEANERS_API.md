# ✅ API для управления привязкой уборщиков к квартирам

## GraphQL Mutations

### Добавить уборщика к квартире

```graphql
mutation AddPreferredCleaner {
  addPreferredCleaner(
    unitId: "unit_123"
    cleanerId: "cleaner_456"
  ) {
    id
    name
    preferredCleaners {
      id
      cleaner {
        id
        firstName
        lastName
        telegramUsername
        isActive
      }
      createdAt
    }
  }
}
```

**Результат:**
```json
{
  "data": {
    "addPreferredCleaner": {
      "id": "unit_123",
      "name": "Квартира 101",
      "preferredCleaners": [
        {
          "id": "pref_789",
          "cleaner": {
            "id": "cleaner_456",
            "firstName": "Иван",
            "lastName": "Иванов",
            "telegramUsername": "ivanov_cleaner",
            "isActive": true
          },
          "createdAt": "2025-10-20T12:00:00Z"
        }
      ]
    }
  }
}
```

---

### Удалить уборщика от квартиры

```graphql
mutation RemovePreferredCleaner {
  removePreferredCleaner(
    unitId: "unit_123"
    cleanerId: "cleaner_456"
  ) {
    id
    name
    preferredCleaners {
      id
      cleaner {
        id
        firstName
        lastName
      }
    }
  }
}
```

---

## GraphQL Queries

### Получить квартиру с привязанными уборщиками

```graphql
query GetUnit($unitId: UUID!) {
  # Запрос через inventory-subgraph
  unit(id: $unitId) {
    id
    name
    capacity
    beds
    # Через federation получаем данные из cleaning-subgraph
    preferredCleaners {
      id
      cleaner {
        id
        firstName
        lastName
        telegramUsername
        isActive
        rating
      }
      createdAt
    }
  }
}
```

**Результат:**
```json
{
  "data": {
    "unit": {
      "id": "unit_123",
      "name": "Квартира 101",
      "capacity": 4,
      "beds": 2,
      "preferredCleaners": [
        {
          "id": "pref_1",
          "cleaner": {
            "id": "cleaner_1",
            "firstName": "Иван",
            "lastName": "Иванов",
            "telegramUsername": "ivanov_cleaner",
            "isActive": true,
            "rating": 4.8
          },
          "createdAt": "2025-10-20T10:00:00Z"
        },
        {
          "id": "pref_2",
          "cleaner": {
            "id": "cleaner_2",
            "firstName": "Петр",
            "lastName": "Петров",
            "telegramUsername": "petrov_cleaner",
            "isActive": true,
            "rating": 4.5
          },
          "createdAt": "2025-10-20T11:00:00Z"
        }
      ]
    }
  }
}
```

---

### Получить уборщика с его квартирами

```graphql
query GetCleaner($cleanerId: UUID!) {
  cleaner(id: $cleanerId) {
    id
    firstName
    lastName
    preferredUnits {
      id
      unit {
        id
        name
        # Можно получить через federation
        property {
          title
        }
      }
      createdAt
    }
  }
}
```

**Результат:**
```json
{
  "data": {
    "cleaner": {
      "id": "cleaner_123",
      "firstName": "Иван",
      "lastName": "Иванов",
      "preferredUnits": [
        {
          "id": "pref_1",
          "unit": {
            "id": "unit_101",
            "name": "Квартира 101",
            "property": {
              "title": "Sunrise Stays"
            }
          },
          "createdAt": "2025-10-20T10:00:00Z"
        },
        {
          "id": "pref_2",
          "unit": {
            "id": "unit_102",
            "name": "Квартира 102",
            "property": {
              "title": "Sunrise Stays"
            }
          },
          "createdAt": "2025-10-20T11:00:00Z"
        }
      ]
    }
  }
}
```

---

## Frontend UI (примеры)

### Компонент управления уборщиками квартиры

```typescript
// components/unit-preferred-cleaners.tsx

'use client';

import { useMutation, useQuery } from '@apollo/client';

const GET_UNIT_WITH_CLEANERS = gql`
  query GetUnitWithCleaners($unitId: UUID!) {
    unit(id: $unitId) {
      id
      name
      preferredCleaners {
        id
        cleaner {
          id
          firstName
          lastName
          isActive
          rating
        }
        createdAt
      }
    }
  }
`;

const ADD_PREFERRED_CLEANER = gql`
  mutation AddPreferredCleaner($unitId: UUID!, $cleanerId: UUID!) {
    addPreferredCleaner(unitId: $unitId, cleanerId: $cleanerId) {
      id
      preferredCleaners {
        id
        cleaner {
          id
          firstName
          lastName
        }
      }
    }
  }
`;

const REMOVE_PREFERRED_CLEANER = gql`
  mutation RemovePreferredCleaner($unitId: UUID!, $cleanerId: UUID!) {
    removePreferredCleaner(unitId: $unitId, cleanerId: $cleanerId) {
      id
    }
  }
`;

export function UnitPreferredCleaners({ unitId }: { unitId: string }) {
  const { data, loading } = useQuery(GET_UNIT_WITH_CLEANERS, {
    variables: { unitId },
  });
  
  const [addCleaner] = useMutation(ADD_PREFERRED_CLEANER, {
    refetchQueries: ['GetUnitWithCleaners'],
  });
  
  const [removeCleaner] = useMutation(REMOVE_PREFERRED_CLEANER, {
    refetchQueries: ['GetUnitWithCleaners'],
  });
  
  if (loading) return <div>Загрузка...</div>;
  
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Привязанные уборщики</h3>
      
      <div className="space-y-2">
        {data?.unit?.preferredCleaners.map((pref) => (
          <div key={pref.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-medium">
                {pref.cleaner.firstName} {pref.cleaner.lastName}
              </p>
              <p className="text-sm text-gray-500">
                Рейтинг: {pref.cleaner.rating || 'Н/Д'}
              </p>
            </div>
            <button
              onClick={() => removeCleaner({
                variables: { unitId, cleanerId: pref.cleaner.id }
              })}
              className="text-red-600 hover:text-red-800"
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
      
      <button
        onClick={() => {
          // Открыть модалку выбора уборщика
          openCleanerSelectModal();
        }}
        className="btn-primary"
      >
        + Добавить уборщика
      </button>
    </div>
  );
}
```

---

### Модалка выбора уборщика

```typescript
// components/add-cleaner-to-unit-dialog.tsx

'use client';

import { Dialog } from '@headlessui/react';
import { useMutation, useQuery } from '@apollo/client';

const GET_AVAILABLE_CLEANERS = gql`
  query GetAvailableCleaners($orgId: UUID!) {
    cleaners(orgId: $orgId, first: 100) {
      edges {
        node {
          id
          firstName
          lastName
          isActive
          rating
          telegramUsername
        }
      }
    }
  }
`;

export function AddCleanerToUnitDialog({ 
  unitId, 
  orgId, 
  isOpen, 
  onClose 
}: Props) {
  const { data } = useQuery(GET_AVAILABLE_CLEANERS, {
    variables: { orgId },
  });
  
  const [addCleaner] = useMutation(ADD_PREFERRED_CLEANER, {
    onCompleted: () => {
      onClose();
      // Toast: "Уборщик добавлен!"
    },
  });
  
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <Dialog.Title>Добавить уборщика к квартире</Dialog.Title>
      
      <div className="space-y-2 mt-4">
        {data?.cleaners?.edges.map(({ node: cleaner }) => (
          <button
            key={cleaner.id}
            onClick={() => addCleaner({
              variables: { unitId, cleanerId: cleaner.id }
            })}
            className="w-full p-3 border rounded hover:bg-gray-50 text-left"
          >
            <p className="font-medium">
              {cleaner.firstName} {cleaner.lastName}
            </p>
            <p className="text-sm text-gray-500">
              Рейтинг: {cleaner.rating || 'Н/Д'} | 
              Telegram: @{cleaner.telegramUsername || 'нет'}
            </p>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
```

---

## Пример использования в Backoffice

### Страница деталей квартиры

```typescript
// app/(app)/units/[id]/page.tsx

export default function UnitDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Детали квартиры</h1>
      
      {/* Основная информация */}
      <UnitInfo unitId={params.id} />
      
      {/* Привязанные уборщики */}
      <div className="mt-8">
        <UnitPreferredCleaners unitId={params.id} />
      </div>
      
      {/* История уборок */}
      <div className="mt-8">
        <CleaningHistory unitId={params.id} />
      </div>
    </div>
  );
}
```

---

## Логика работы

### 1. Менеджер привязывает уборщика к квартире

```
Backoffice → Детали квартиры → "Добавить уборщика"
  ↓
Выбор уборщика из списка
  ↓
mutation addPreferredCleaner(unitId, cleanerId)
  ↓
Создается запись в UnitPreferredCleaner
  ↓
Уборщик видит квартиру в списке "Мои квартиры"
```

### 2. Менеджер создает уборку БЕЗ назначения

```
Backoffice → Создать уборку → НЕ выбирает cleanerId
  ↓
mutation scheduleCleaning({ unitId, cleanerId: null })
  ↓
Backend находит всех preferredCleaners для этой квартиры
  ↓
Отправка CLEANING_AVAILABLE каждому уборщику
  ↓
Telegram: "🆓 Доступна уборка! [✋ Взять в работу]"
```

### 3. Уборщик берет уборку

```
Telegram → Нажатие "✋ Взять в работу"
  ↓
Открывается /cleanings/assign/{id}
  ↓
mutation assignCleaningToMe(cleaningId)
  ↓
cleaning.cleanerId = current_cleaner_id
  ↓
Telegram: "🧹 Уборка назначена на вас!"
```

---

## Преимущества

### ✅ Удобство управления

Менеджер может:
- Видеть список привязанных уборщиков для квартиры
- Добавлять/удалять уборщиков через UI
- Не писать SQL запросы

### ✅ Прозрачность

Уборщик может:
- Видеть список "своих" квартир
- Знать, в каких квартирах будет получать уведомления
- Приоритизировать знакомые квартиры

### ✅ Гибкость

- Один уборщик → несколько квартир ✅
- Одна квартира → несколько уборщиков ✅
- Many-to-many связь

---

## Примеры UI

### Карточка квартиры

```
┌─────────────────────────────────────┐
│ Квартира 101                        │
│ Sunrise Stays                       │
├─────────────────────────────────────┤
│ Привязанные уборщики:               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Иван Иванов         Рейтинг: 4.8│ │
│ │ @ivanov_cleaner         [Удалить]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Петр Петров         Рейтинг: 4.5│ │
│ │ @petrov_cleaner         [Удалить]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ [+ Добавить уборщика]               │
└─────────────────────────────────────┘
```

### Профиль уборщика

```
┌─────────────────────────────────────┐
│ Иван Иванов                         │
│ Рейтинг: 4.8 | Активен             │
├─────────────────────────────────────┤
│ Мои квартиры:                       │
│                                     │
│ • Квартира 101 (Sunrise Stays)      │
│ • Квартира 102 (Sunrise Stays)      │
│ • Квартира 205 (Harbor Loft)        │
│                                     │
│ Всего: 3 квартиры                   │
└─────────────────────────────────────┘
```

---

## Workflow

### Сценарий: Добавление уборщика к квартире

1. **Менеджер открывает детали квартиры**
   - URL: `/units/{unitId}`
   - Видит раздел "Привязанные уборщики"

2. **Нажимает "Добавить уборщика"**
   - Открывается модалка со списком активных уборщиков
   - Можно фильтровать по имени, рейтингу

3. **Выбирает уборщика**
   - Клик по карточке уборщика
   - Вызывается `addPreferredCleaner`

4. **Уборщик добавлен**
   - Появляется в списке привязанных
   - Теперь будет получать уведомления о новых уборках в этой квартире

---

### Сценарий: Создание уборки для привязанных уборщиков

1. **Менеджер создает уборку**
   - НЕ выбирает конкретного уборщика
   - Указывает только квартиру и время

2. **Backend находит привязанных уборщиков**
   - Запрашивает `unit.preferredCleaners`
   - Фильтрует активных
   - Проверяет настройки уведомлений

3. **Отправка уведомлений**
   - Каждому привязанному уборщику отправляется CLEANING_AVAILABLE
   - С кнопкой "✋ Взять в работу"

4. **Первый взявший получает уборку**
   - Нажатие кнопки → `assignCleaningToMe`
   - Уборка назначается на этого уборщика
   - Остальные уведомления становятся неактуальными

---

## Защита от дубликатов

```typescript
// В resolver addPreferredCleaner
const existing = await prisma.unitPreferredCleaner.findUnique({
  where: {
    unitId_cleanerId: { unitId, cleanerId }
  }
});

if (existing) {
  // Уже добавлен - не создаем дубликат
  return unit;
}
```

**Prisma schema:**
```prisma
@@unique([unitId, cleanerId])  // ← Гарантирует уникальность
```

---

## GraphQL Schema

### Типы

```graphql
type Unit {
  id: UUID!
  preferredCleaners: [CleanerPreference!]!
}

type Cleaner {
  id: UUID!
  preferredUnits: [UnitPreference!]!
}

type CleanerPreference {
  id: UUID!
  cleaner: Cleaner!
  createdAt: DateTime!
}

type UnitPreference {
  id: UUID!
  unit: Unit!
  createdAt: DateTime!
}
```

### Mutations

```graphql
addPreferredCleaner(unitId: UUID!, cleanerId: UUID!): Unit!
removePreferredCleaner(unitId: UUID!, cleanerId: UUID!): Unit!
```

---

## Измененные файлы

### Backend

1. ✅ `backend/cleaning-subgraph/src/schema/index.gql`
   - Добавлены mutations: `addPreferredCleaner`, `removePreferredCleaner`
   - Добавлены типы: `CleanerPreference`, `UnitPreference`
   - Обновлены типы: `Unit.preferredCleaners`, `Cleaner.preferredUnits`

2. ✅ `backend/cleaning-subgraph/src/resolvers/index.ts`
   - Добавлены resolvers для mutations
   - Добавлены field resolvers для `Unit.preferredCleaners` и `Cleaner.preferredUnits`

3. ✅ `packages/datalayer-prisma/prisma/schema.prisma`
   - Добавлена модель `UnitPreferredCleaner`
   - Обновлены модели `Unit` и `Cleaner`

---

## Миграция

После изменений выполните:

```bash
cd packages/datalayer-prisma
pnpm prisma migrate dev --name add_preferred_cleaners_management
```

Или в production:

```bash
pnpm prisma db push
```

---

## Frontend TODO

Создать компоненты в backoffice:

1. **`components/unit-preferred-cleaners.tsx`**
   - Список привязанных уборщиков
   - Кнопка добавления
   - Кнопка удаления

2. **`components/add-cleaner-to-unit-dialog.tsx`**
   - Модалка выбора уборщика
   - Поиск/фильтрация
   - Добавление по клику

3. **Обновить `app/(app)/units/[id]/page.tsx`**
   - Добавить секцию с `UnitPreferredCleaners`

4. **Обновить `app/(app)/cleaners/[id]/page.tsx`**
   - Показать список квартир уборщика

---

**Дата:** 20 октября 2025  
**Статус:** ✅ Backend API готов для UI


