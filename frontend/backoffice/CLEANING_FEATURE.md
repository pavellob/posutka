# 🧹 Функционал управления уборками

## Описание

Полная интеграция системы управления уборками с задачами (Tasks). Позволяет создавать задачи на уборку через интерфейс задач, а затем выполнять их с детальными чеклистами и документацией.

## Страницы

### 1. `/tasks` - Управление задачами
**Новый функционал для задач типа CLEANING:**
- ✨ Кнопка "Выполнить уборку" в действиях
- Доступна во всех режимах: таблица, карточки, канбан
- При клике открывается диалог выполнения уборки

### 2. `/cleanings` - Управление уборками
**Основная страница уборок:**
- 📊 Статистика по статусам
- 🔍 Фильтры: статус, уборщик
- 📋 Таблица со всеми уборками
- 🔗 Показывает связь с задачами
- 📸 Отображает документы и количество фото

## Компоненты

### CleaningExecutionDialog
**Местоположение:** `src/components/cleaning-execution-dialog.tsx`

**Многошаговый диалог для выполнения уборки:**

#### Шаг 1: Назначение уборщика
```tsx
- Выбор уборщика из списка (с рейтингом)
- Чекбокс "Требуется смена белья"
- Поле для заметок
- Кнопка "Создать уборку"
```

#### Шаг 2: Приемка квартиры (Pre-Cleaning)
```tsx
Чеклист приемки:
  ☐ Проверить состояние мебели
  ☐ Проверить бытовую технику
  ☐ Проверить сантехнику
  ☐ Сфотографировать текущее состояние

Загрузка фото ДО уборки:
  - URL фотографии
  - Описание (caption)
  - Список загруженных фото
  
Кнопка "Начать уборку" → создает CleaningDocument (PRE_CLEANING_ACCEPTANCE)
```

#### Шаг 3: Выполнение уборки (Post-Cleaning)
```tsx
Чеклист уборки:
  ☐ Пропылесосить все комнаты
  ☐ Помыть полы
  ☐ Протереть пыль
  ☐ Убрать в ванной
  ☐ Убрать на кухне
  ☐ Сменить постельное белье
  ☐ Проверить все приборы
  ☐ Вынести мусор

Загрузка фото ПОСЛЕ уборки:
  - URL фотографии
  - Описание
  - Список загруженных фото
  
Кнопка "Завершить уборку" → создает CleaningDocument (POST_CLEANING_HANDOVER)
```

#### Шаг 4: Завершение
```tsx
✅ Уборка завершена!
   Документы приемки и сдачи созданы
```

## Типы документов

### PRE_CLEANING_ACCEPTANCE (Приемка перед уборкой)
**Назначение:** Фиксация состояния квартиры ДО уборки

**Используется для:**
- Возврата залога гостю
- Документирования повреждений
- Оценки объема работ

**Содержит:**
- Заметки о состоянии
- Фотографии всех комнат и проблемных зон

### POST_CLEANING_HANDOVER (Сдача после уборки)
**Назначение:** Подтверждение качества выполненной уборки

**Используется для:**
- Контроля качества работы уборщика
- Подготовки к следующему заселению
- Рейтинга уборщика

**Содержит:**
- Заметки о результатах
- Фотографии чистой квартиры

## Структура данных

### Связь Task → Cleaning
```graphql
type Task {
  id: UUID!
  type: TaskType  # CLEANING
  unitId: String
  bookingId?: String
}

type Cleaning {
  id: UUID!
  taskId: UUID  # ← связь с Task
  unitId: String!
  bookingId?: String
  status: CleaningStatus
  documents: [CleaningDocument!]!
}
```

### Документы с фотографиями
```graphql
type CleaningDocument {
  id: UUID!
  cleaningId: UUID!
  type: CleaningDocumentType
  notes?: String
  photos: [CleaningDocumentPhoto!]!
}

type CleaningDocumentPhoto {
  id: UUID!
  url: String!
  caption?: String
  order: Int!
}
```

## GraphQL запросы

### Создание уборки из задачи
```graphql
mutation ScheduleCleaning($input: ScheduleCleaningInput!) {
  scheduleCleaning(input: {
    orgId: "org-123"
    cleanerId: "cleaner-456"
    unitId: "unit-789"
    taskId: "task-111"  # ← связь с задачей
    bookingId: "booking-222"  # опционально
    scheduledAt: "2025-10-13T10:00:00Z"
    requiresLinenChange: true
    checklistItems: [
      { label: "Пропылесосить", isChecked: false, order: 1 }
    ]
  }) {
    id
    taskId
    status
  }
}
```

### Получение уборки по задаче
```graphql
query GetCleaningByTask($taskId: UUID!) {
  cleaningByTask(taskId: $taskId) {
    id
    status
    checklistItems {
      label
      isChecked
    }
    documents {
      type
      photos {
        url
        caption
      }
    }
  }
}
```

### Создание документов
```graphql
# Документ приемки ДО уборки
mutation CreatePreCleaningDocument($cleaningId: UUID!, $input: CreateCleaningDocumentInput!) {
  createPreCleaningDocument(cleaningId: $cleaningId, input: {
    notes: "Обнаружены загрязнения на ковре"
    photos: [
      { url: "https://storage.com/before1.jpg", caption: "Пятно на ковре" }
      { url: "https://storage.com/before2.jpg", caption: "Общий вид" }
    ]
  }) {
    id
    type  # PRE_CLEANING_ACCEPTANCE
  }
}

# Документ сдачи ПОСЛЕ уборки
mutation CreatePostCleaningDocument($cleaningId: UUID!, $input: CreateCleaningDocumentInput!) {
  createPostCleaningDocument(cleaningId: $cleaningId, input: {
    notes: "Квартира убрана, белье сменено"
    photos: [
      { url: "https://storage.com/after1.jpg", caption: "Чистая комната" }
      { url: "https://storage.com/after2.jpg", caption: "Чистая кухня" }
    ]
  }) {
    id
    type  # POST_CLEANING_HANDOVER
  }
}
```

## Навигация между страницами

### Tasks → Cleanings
```tsx
// На странице /tasks
1. Найти задачу типа CLEANING
2. Нажать "✨ Выполнить уборку"
3. Пройти все шаги в диалоге
4. Уборка создается и связывается с задачей
```

### Cleanings → Tasks
```tsx
// На странице /cleanings
1. В колонке "Связь" видно Badge "Связана с задачей"
2. Кликнуть "Перейти к задачам →"
3. Откроется страница /tasks с задачей
```

## Бизнес-процесс

### Сценарий 1: Уборка после выезда гостя
```
1. Гость выезжает → Booking завершается
2. Менеджер создает Task (CLEANING) с bookingId
3. Уборщик открывает задачу
4. Выполняет приемку (фото ДО)
   - Если повреждения → залог удерживается
   - Если все ОК → залог возвращается
5. Выполняет уборку (чеклист)
6. Делает фото ПОСЛЕ
7. Завершает → квартира готова к новому заселению
```

### Сценарий 2: Регулярная уборка
```
1. Менеджер создает Task (CLEANING) без bookingId
2. Указывает только unitId
3. Уборщик выполняет стандартную уборку
4. Делает фото до и после
5. Завершает
```

### Сценарий 3: Срочная уборка
```
1. Менеджер видит проблему в квартире
2. Создает Task (CLEANING) с высоким приоритетом
3. Назначает лучшего уборщика (по рейтингу)
4. Уборщик получает уведомление
5. Выполняет с полной документацией
```

## Технические детали

### State management в диалоге
```tsx
const [step, setStep] = useState<'create' | 'pre-checklist' | 'post-checklist' | 'completed'>()

// Шаги:
// create → pre-checklist → post-checklist → completed
```

### Сохранение фотографий
```tsx
// Временное хранение до сохранения
const [preCleaningPhotos, setPreCleaningPhotos] = useState<Photo[]>([])
const [postCleaningPhotos, setPostCleaningPhotos] = useState<Photo[]>([])

// При создании документа все фото сохраняются
photos: preCleaningPhotos.map((photo, index) => ({
  url: photo.url,
  caption: photo.caption,
  order: index
}))
```

### Обновление чеклиста
```tsx
// Динамическое обновление при отметке пунктов
const newItems = [...postChecklistItems]
newItems[index].isChecked = true
setPostChecklistItems(newItems)

// Сохранение в базу при завершении
await updateChecklistMutation.mutateAsync({
  id: cleaningId,
  items: postChecklistItems
})
```

## Безопасность

- ✅ Только пользователи с правами могут создавать уборки
- ✅ Уборщик должен быть активен (isActive: true)
- ✅ Unit должен существовать и принадлежать организации
- ✅ Документы с фото неизменяемы (для юридической силы)

## Производительность

- Lazy loading фотографий
- Pagination для списков уборок
- Кэширование списка уборщиков
- Оптимистичные обновления UI

## Мониторинг

Отслеживаемые метрики:
- Среднее время уборки
- Рейтинг уборщиков
- Количество документов с фото
- Процент завершенных уборок

