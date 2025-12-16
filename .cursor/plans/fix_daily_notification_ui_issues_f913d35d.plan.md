---
name: Fix daily notification UI issues
overview: "Исправление четырех проблем на странице ежедневных уведомлений: переполнение заметок, неправильный текст в задачах уборки, проблема с часовым поясом дат и невидимая кнопка отмены"
todos:
  - id: fix-notes-overflow
    content: Добавить break-words и overflow-wrap для заметок в notification-task-content.tsx
    status: completed
  - id: fix-cancel-button
    content: Исправить стиль кнопки Отмена в notification-task-edit-form.tsx для лучшей видимости в темной теме
    status: completed
  - id: fix-timezone
    content: Исправить форматирование даты в notification-task-card.tsx для правильного отображения без сдвига часового пояса
    status: completed
  - id: fix-cleaning-task-note
    content: Изменить текст заметки в createCleaningTask в booking.service.ts для отображения имени гостя и адреса вместо ID
    status: completed
---

# План исправления проблем на странице ежедневных уведомлений

## Проблемы

1. **Переполнение заметок** - заметки выходят за ширину карточки в `notification-task-content.tsx`
2. **Неправильный текст в задачах уборки** - вместо "Уборка для бронирования {id}. Гость: {guestId}" нужно показывать имя гостя и адрес юнита
3. **Проблема с часовым поясом** - дата 17.12 отображается как 18.12 01:00 из-за неправильной конвертации часового пояса
4. **Невидимая кнопка отмены** - кнопка "Отмена" черная на черном фоне в темной теме

## Решения

### 1. Исправление переполнения заметок

**Файл**: `frontend/backoffice/src/components/notification-task-content.tsx`

Добавить обработку переполнения для текста заметок:

- Добавить `break-words` или `word-break` для переноса длинных слов
- Добавить `overflow-wrap: break-word` через классы Tailwind
- Убедиться, что контейнер имеет правильные ограничения ширины

**Изменения** (строка 32):

```tsx
<Text className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words overflow-wrap-anywhere">
  {item.notes}
</Text>
```

### 2. Исправление текста задачи уборки для бронирования

**Файл**: `backend/bookings-subgraph/src/services/booking.service.ts`

В методе `createCleaningTask` (строка 264-317) нужно:

- Получить информацию о госте из booking (уже есть в booking.guest или через dl.getGuestById)
- Получить адрес юнита из unit (unit.address или property.address)
- Заменить текст заметки на: `Уборка для бронирования. Гость: {guest.name}. Адрес: {unit.address || property.address}`

**Изменения** (строка 286):

```typescript
// Получаем информацию о госте
const guest = booking.guest || await this.dl.getGuestById(booking.guestId);
const guestName = guest?.name || 'Неизвестный гость';

// Получаем адрес из property
const property = unit?.propertyId ? await this.inventoryDL.getPropertyById(unit.propertyId) : null;
const address = property?.address || unit?.address || 'Адрес не указан';

const request = {
  // ...
  notes: `Уборка для бронирования. Гость: ${guestName}. Адрес: ${address}`,
  // ...
};
```

### 3. Исправление проблемы с часовым поясом

**Файл**: `frontend/backoffice/src/components/notification-task-card.tsx`

Проблема в строках 71-81: при форматировании даты используется `toLocaleDateString` и `toLocaleTimeString`, но исходная дата может быть в UTC, что приводит к сдвигу.

**Решение**:

- Использовать только дату без времени для отображения даты
- Убедиться, что время отображается в локальном часовом поясе
- Использовать `toLocaleDateString` с опциями для правильного отображения только даты

**Изменения** (строки 71-81):

```typescript
const scheduledDate = new Date(item.scheduledAt)
// Для даты используем только дату без времени, чтобы избежать сдвига из-за часового пояса
const formattedDate = scheduledDate.toLocaleDateString('ru-RU', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: 'UTC' // Используем UTC для даты, чтобы избежать сдвига
})
const formattedTime = scheduledDate.toLocaleTimeString('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Локальное время для времени
})
```

Или лучше - парсить дату отдельно от времени:

```typescript
const scheduledDate = new Date(item.scheduledAt)
// Получаем компоненты даты в UTC, чтобы избежать сдвига
const dateUTC = new Date(scheduledDate.getUTCFullYear(), scheduledDate.getUTCMonth(), scheduledDate.getUTCDate())
const formattedDate = dateUTC.toLocaleDateString('ru-RU', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})
const formattedTime = scheduledDate.toLocaleTimeString('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
```

### 4. Исправление стиля кнопки отмены

**Файл**: `frontend/backoffice/src/components/notification-task-edit-form.tsx`

Кнопка "Отмена" (строка 216-225) имеет темный фон в темной теме, но текст может быть недостаточно контрастным.

**Изменения** (строка 222):

```tsx
<Button
  onClick={(e) => {
    e.stopPropagation()
    setEditingItemId(null)
    setEditedItems({})
  }}
  className="flex-1 border border-zinc-300 dark:border-zinc-500 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
>
  Отмена
</Button>
```

Или использовать более светлый вариант:

```tsx
className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-600 dark:hover:bg-zinc-500 text-zinc-800 dark:text-zinc-100"
```

## Порядок выполнения

1. Исправить переполнение заметок (самое простое)
2. Исправить стиль кнопки отмены
3. Исправить проблему с часовым поясом
4. Исправить текст задачи уборки (требует доступа к данным бронирования)