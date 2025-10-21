# ✅ Самоназначение уборок через Telegram

## Новая функциональность

Теперь уборщиков можно **привязывать к квартирам**, и когда создается уборка без назначенного уборщика, **все привязанные уборщики** получают уведомление с кнопкой **"Взять в работу"**.

---

## Как это работает

### 1. Привязка уборщика к квартире

```graphql
# Создайте связь Unit ↔ Cleaner
mutation {
  # TODO: Добавить mutation для привязки
  # Пока добавляйте напрямую в БД через SQL:
}
```

**SQL (временно):**
```sql
INSERT INTO "UnitPreferredCleaner" ("id", "unitId", "cleanerId", "createdAt")
VALUES (
  gen_random_uuid(),
  'unit_id_here',
  'cleaner_id_here',
  NOW()
);
```

### 2. Создание уборки БЕЗ уборщика

```graphql
mutation {
  scheduleCleaning(input: {
    orgId: "org_123"
    # cleanerId НЕ указываем! ← ВАЖНО
    unitId: "unit_456"
    scheduledAt: "2025-10-21T10:00:00Z"
    requiresLinenChange: false
  }) {
    id
    status
    cleanerId  # будет null
  }
}
```

**Что происходит:**
1. Уборка создается БЕЗ назначенного уборщика (`cleanerId = null`)
2. Backend находит **всех привязанных уборщиков** к этой квартире
3. Отправляет каждому уведомление **CLEANING_AVAILABLE** с кнопкой "✋ Взять в работу"

### 3. Уборщик получает уведомление в Telegram

```
🆓 Доступна уборка!

Запланирована уборка в квартире "Sunrise Stays - Квартира 101"

Дата: 21 октября 2025 г., 10:00

💡 Нажмите кнопку ниже, чтобы взять уборку в работу

[✋ Взять в работу]  ← Telegram Mini App кнопка
```

### 4. Уборщик нажимает кнопку

**Кнопка ведет на:**
```
https://your-app.com/cleanings/assign/{cleaningId}
```

**На фронтенде:**
```typescript
// /cleanings/assign/[id]/page.tsx

// Автоматически вызывается mutation:
await client.mutate({
  mutation: ASSIGN_CLEANING_TO_ME,
  variables: { cleaningId }
});
```

**GraphQL mutation:**
```graphql
mutation {
  assignCleaningToMe(cleaningId: "cleaning_123") {
    id
    cleanerId  # теперь установлен!
    status
  }
}
```

### 5. Уборка назначается на уборщика

**Backend:**
1. Обновляет `cleaning.cleanerId` = ID текущего уборщика
2. Меняет статус на `SCHEDULED`
3. Отправляет подтверждающее уведомление уборщику

**Уборщик получает подтверждение:**
```
🧹 Новая уборка назначена!

Вам назначена уборка в квартире "Sunrise Stays - Квартира 101"

Дата: 21 октября 2025 г., 10:00

[Открыть детали уборки →]
```

---

## Изменения в базе данных

### Новая таблица: `UnitPreferredCleaner`

```prisma
model UnitPreferredCleaner {
  id        String   @id @default(cuid())
  unitId    String
  cleanerId String
  unit      Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  cleaner   Cleaner  @relation(fields: [cleanerId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([unitId, cleanerId])
  @@index([unitId])
  @@index([cleanerId])
}
```

### Обновлена модель `Unit`

```prisma
model Unit {
  // ...
  preferredCleaners UnitPreferredCleaner[] // Привязанные уборщики
}
```

### Обновлена модель `Cleaner`

```prisma
model Cleaner {
  // ...
  preferredUnits UnitPreferredCleaner[] // Квартиры, где предпочтителен
}
```

### Обновлена модель `Cleaning`

```prisma
model Cleaning {
  // ...
  cleanerId String? // Теперь опциональный!
  cleaner   Cleaner? @relation(fields: [cleanerId], references: [id])
}
```

---

## Новые GraphQL API

### Mutation: assignCleaningToMe

```graphql
mutation AssignToMe($cleaningId: UUID!) {
  assignCleaningToMe(cleaningId: $cleaningId) {
    id
    cleanerId
    status
    scheduledAt
    cleaner {
      id
      firstName
      lastName
    }
  }
}
```

**Описание:**
- Назначает текущего уборщика на уборку
- Обновляет статус
- Отправляет подтверждающее уведомление

### Обновлен: scheduleCleaning

```graphql
mutation Schedule($input: ScheduleCleaningInput!) {
  scheduleCleaning(input: {
    orgId: "org_123"
    cleanerId: null  # ← Опциональный!
    unitId: "unit_456"
    scheduledAt: "2025-10-21T10:00:00Z"
    requiresLinenChange: false
  }) {
    id
    cleanerId  # будет null если не назначен
  }
}
```

---

## Новый тип события: CLEANING_AVAILABLE

### В proto файле:

```proto
enum EventType {
  // ...
  EVENT_TYPE_CLEANING_AVAILABLE = 15; // Уборка доступна для самоназначения
}
```

### В notification-client:

```typescript
async notifyCleaningAvailable(params: {
  userId: string;
  telegramChatId?: string;
  cleaningId: string;
  unitName: string;
  scheduledAt: string;
  requiresLinenChange: boolean;
  orgId?: string;
}): Promise<void>
```

---

## Логика работы

### Сценарий 1: Уборка создается С уборщиком

```
scheduleCleaning({ cleanerId: "cleaner_123", ... })
  ↓
cleaning.cleanerId = "cleaner_123"
  ↓
Отправка уведомления CLEANING_ASSIGNED
  ↓
Уборщику: "🧹 Новая уборка назначена!"
```

### Сценарий 2: Уборка создается БЕЗ уборщика

```
scheduleCleaning({ cleanerId: null, unitId: "unit_456", ... })
  ↓
cleaning.cleanerId = null
  ↓
Находим всех привязанных уборщиков к unit_456
  ↓
Отправка уведомлений CLEANING_AVAILABLE каждому
  ↓
Уборщикам: "🆓 Доступна уборка! [✋ Взять в работу]"
  ↓
Первый нажавший получает уборку
  ↓
assignCleaningToMe(cleaningId)
  ↓
cleaning.cleanerId = "cleaner_xxx"
  ↓
Подтверждение: "🧹 Новая уборка назначена!"
```

---

## Frontend (TODO)

### Нужно создать страницу для самоназначения:

```typescript
// frontend/mobile-app/src/app/cleanings/assign/[id]/page.tsx

'use client';

import { useMutation } from '@apollo/client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ASSIGN_CLEANING = gql`
  mutation AssignCleaningToMe($cleaningId: UUID!) {
    assignCleaningToMe(cleaningId: $cleaningId) {
      id
      cleanerId
      status
    }
  }
`;

export default function AssignCleaningPage() {
  const params = useParams();
  const router = useRouter();
  const [assign, { data, loading, error }] = useMutation(ASSIGN_CLEANING);
  
  useEffect(() => {
    if (params.id) {
      assign({ variables: { cleaningId: params.id } })
        .then(() => {
          router.push(`/cleanings/${params.id}`);
        });
    }
  }, [params.id]);
  
  if (loading) return <div>Назначаем уборку...</div>;
  if (error) return <div>Ошибка: {error.message}</div>;
  if (data) return <div>Успешно! Перенаправление...</div>;
  
  return <div>Загрузка...</div>;
}
```

---

## Миграция базы данных

После изменений в schema.prisma выполните:

```bash
cd packages/datalayer-prisma
pnpm prisma migrate dev --name add_unit_preferred_cleaners
```

Или в production:

```bash
pnpm prisma db push
```

---

## Тестирование

### 1. Привяжите уборщика к квартире

```sql
INSERT INTO "UnitPreferredCleaner" ("id", "unitId", "cleanerId", "createdAt")
VALUES (
  gen_random_uuid(),
  'your_unit_id',
  'your_cleaner_id',
  NOW()
);
```

### 2. Убедитесь, что у уборщика есть telegram settings

```sql
SELECT * FROM "UserNotificationSettings" 
WHERE "userId" = 'cleaner_user_id';
```

### 3. Создайте уборку БЕЗ cleanerId

```graphql
mutation {
  scheduleCleaning(input: {
    orgId: "org_123"
    unitId: "unit_456"  # К этой квартире привязан уборщик
    scheduledAt: "2025-10-21T10:00:00Z"
    requiresLinenChange: false
  }) {
    id
    cleanerId  # будет null
  }
}
```

### 4. Проверьте Telegram

Уборщик должен получить:
```
🆓 Доступна уборка!
...
[✋ Взять в работу]
```

### 5. Нажмите кнопку (или вызовите mutation)

```graphql
mutation {
  assignCleaningToMe(cleaningId: "cleaning_id") {
    id
    cleanerId  # теперь установлен!
  }
}
```

### 6. Проверьте подтверждение

Уборщик должен получить:
```
🧹 Новая уборка назначена!
...
```

---

## Логи для отладки

### При создании уборки БЕЗ уборщика:

```
[cleaning-subgraph] Scheduling cleaning
  cleanerId: null

[cleaning-subgraph] ✅ Unit found
  preferredCleanersCount: 2

[cleaning-subgraph] 🔔 No cleaner assigned, sending AVAILABLE notifications to preferred cleaners

[cleaning-subgraph] ✅ AVAILABLE notification sent to preferred cleaner
  cleanerId: cleaner_1
  cleanerName: "Иван Иванов"

[cleaning-subgraph] ✅ AVAILABLE notification sent to preferred cleaner
  cleanerId: cleaner_2
  cleanerName: "Петр Петров"

[cleaning-subgraph] ✅ All AVAILABLE notifications sent
  sentTo: 2
```

### При самоназначении:

```
[cleaning-subgraph] 🎯 Assigning cleaning to current user
  cleaningId: cleaning_123

[cleaning-subgraph] ✅ Cleaning assigned to cleaner
  cleanerId: cleaner_1
  cleanerName: "Иван Иванов"

[cleaning-subgraph] ✅ Assignment confirmation sent
```

---

## Преимущества

### ✅ Гибкость
- Менеджер может назначить конкретного уборщика
- Или оставить выбор уборщикам

### ✅ Скорость
- Уборщики сами берут задачи
- Не нужно ждать назначения менеджером

### ✅ Мотивация
- Уборщики выбирают удобные им уборки
- Привязка к "своим" квартирам

### ✅ Масштабируемость
- Работает с любым количеством уборщиков
- Первый нажавший получает уборку

---

## TODO для frontend

### Нужно создать:

1. **Страница самоназначения:**
   - `/cleanings/assign/[id]/page.tsx`
   - Автоматически вызывает `assignCleaningToMe`
   - Редиректит на детали уборки

2. **UI для привязки уборщиков к квартирам:**
   - В деталях Unit - список привязанных уборщиков
   - Кнопка "Добавить уборщика"
   - Возможность удаления привязки

3. **Mutation для управления привязками:**
   ```graphql
   addPreferredCleaner(unitId: UUID!, cleanerId: UUID!): Unit!
   removePreferredCleaner(unitId: UUID!, cleanerId: UUID!): Unit!
   ```

---

## Измененные файлы

### Backend

1. ✅ `packages/datalayer-prisma/prisma/schema.prisma`
   - Добавлена таблица `UnitPreferredCleaner`
   - `Unit.preferredCleaners`
   - `Cleaner.preferredUnits`
   - `Cleaning.cleanerId` - теперь опциональный

2. ✅ `packages/grpc-sdk/src/proto/notifications.proto`
   - Добавлен `EVENT_TYPE_CLEANING_AVAILABLE = 15`

3. ✅ `backend/cleaning-subgraph/src/schema/index.gql`
   - Добавлена mutation `assignCleaningToMe`
   - `ScheduleCleaningInput.cleanerId` - теперь опциональный

4. ✅ `backend/cleaning-subgraph/src/resolvers/index.ts`
   - Добавлен resolver `assignCleaningToMe`
   - Обновлена логика `scheduleCleaning` (if/else для назначенного/не назначенного)

5. ✅ `backend/cleaning-subgraph/src/services/notification-client.ts`
   - Добавлен метод `notifyCleaningAvailable()`

### Frontend (TODO)

6. ⏳ Создать `/cleanings/assign/[id]/page.tsx`
7. ⏳ Добавить UI для управления preferredCleaners
8. ⏳ Добавить mutations для add/removePreferredCleaner

---

**Дата:** 20 октября 2025  
**Статус:** ✅ Backend готов, Frontend - TODO


