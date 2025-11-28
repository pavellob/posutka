# Интеграция Tasks и Cleanings

## Обзор

Cleaning Subgraph интегрирован с системой задач (Tasks) для обеспечения полного цикла управления уборками.

## Архитектура связи

```
Task (type: CLEANING) ──┐
                         ├──> Cleaning (с чеклистами и документами)
Unit (обязательно) ──────┘
Booking (опционально) ───┘
```

### Поля связи

В модели `Cleaning` добавлено поле:
- `taskId: UUID?` - опциональная связь с задачей из ops-subgraph

## Рабочий процесс

### 1. Создание задачи на уборку (в Tasks)

Пользователь создает задачу типа `CLEANING` на странице `/tasks`:
- Указывает квартиру (Unit) - **обязательно**
- Указывает бронирование (Booking) - опционально
- Устанавливает срок выполнения
- Добавляет заметки

### 2. Выполнение уборки (переход в Cleanings)

На странице `/tasks` для задач типа `CLEANING` появляется кнопка **"✨ Выполнить уборку"**

При клике открывается диалог `CleaningExecutionDialog` с 4 шагами:

#### Шаг 1: Создание уборки
- Выбор уборщика из списка активных cleaners
- Настройка "Требуется смена белья"
- Добавление заметок
- Создается запись `Cleaning` с привязкой к Task через `taskId`

#### Шаг 2: Приемка квартиры (Pre-Cleaning)
- **Чеклист приемки**:
  - Проверить состояние мебели
  - Проверить бытовую технику
  - Проверить сантехнику
  - Сфотографировать текущее состояние
  
- **Загрузка фото ДО уборки**:
  - URL фотографии
  - Описание (caption)
  - Создается `CleaningDocument` типа `PRE_CLEANING_ACCEPTANCE`

#### Шаг 3: Выполнение уборки (Post-Cleaning)
- **Чеклист уборки** (динамический):
  - Пропылесосить все комнаты
  - Помыть полы
  - Протереть пыль
  - Убрать в ванной
  - Убрать на кухне
  - Сменить постельное белье
  - Проверить все приборы
  - Вынести мусор
  
- **Загрузка фото ПОСЛЕ уборки**:
  - URL фотографии
  - Описание
  - Создается `CleaningDocument` типа `POST_CLEANING_HANDOVER`

#### Шаг 4: Завершение
- Уборка помечается как `COMPLETED`
- Обновляется чеклист
- Сохраняются все документы и фотографии
- Task автоматически обновляется (опционально)

## Модели данных

### Cleaning
```typescript
{
  id: UUID
  orgId: UUID
  cleanerId: UUID
  unitId: UUID         // обязательно
  bookingId?: UUID     // опционально
  taskId?: UUID        // опционально - связь с Task
  status: CleaningStatus
  scheduledAt: DateTime
  startedAt?: DateTime
  completedAt?: DateTime
  notes?: string
  requiresLinenChange: boolean
  checklistItems: CleaningChecklist[]
}
```

### CleaningDocument
```typescript
{
  id: UUID
  cleaningId: UUID
  type: 'PRE_CLEANING_ACCEPTANCE' | 'POST_CLEANING_HANDOVER'
  notes?: string
  photos: CleaningDocumentPhoto[]
}
```

### CleaningDocumentPhoto
```typescript
{
  id: UUID
  documentId: UUID
  url: string
  caption?: string
  order: number
}
```

## UI Интеграция

### Страница Tasks (`/tasks`)

**Для задач типа CLEANING:**
- В меню действий появляется пункт **"✨ Выполнить уборку"**
- Доступно во всех режимах просмотра: таблица, карточки, канбан

**Функционал:**
```tsx
// В таблице и карточках
<DropdownItem onClick={() => onExecuteCleaning(task)}>
  ✨ Выполнить уборку
</DropdownItem>
```

### Страница Cleanings (`/cleanings`)

**Отображение связи с задачами:**
- Колонка "Связь" показывает, связана ли уборка с задачей
- Badge "Связана с задачей" + ссылка на `/tasks`

**Статистика:**
- Всего уборок
- Запланировано
- В процессе
- Завершены
- Отменены

**Фильтрация:**
- По статусу
- По уборщику
- По задаче (опционально)

## GraphQL API

### Queries

```graphql
# Получить уборку по ID задачи
query GetCleaningByTask($taskId: UUID!) {
  cleaningByTask(taskId: $taskId) {
    id
    status
    scheduledAt
    checklistItems { ... }
    documents { 
      photos { url, caption }
    }
  }
}

# Получить все уборки с фильтром по taskId
query GetCleanings($taskId: UUID) {
  cleanings(taskId: $taskId) {
    edges {
      node { ... }
    }
  }
}
```

### Mutations

```graphql
# Создать уборку с привязкой к задаче
mutation ScheduleCleaning($input: ScheduleCleaningInput!) {
  scheduleCleaning(input: {
    orgId: "..."
    cleanerId: "..."
    unitId: "..."
    taskId: "..."  # связь с Task
    scheduledAt: "..."
  }) {
    id
    taskId
  }
}

# Документы с фотографиями
mutation CreatePreCleaningDocument($cleaningId: UUID!, $input: CreateCleaningDocumentInput!) {
  createPreCleaningDocument(cleaningId: $cleaningId, input: {
    notes: "Приемка квартиры"
    photos: [
      { url: "...", caption: "Общий вид", order: 1 }
      { url: "...", caption: "Кухня", order: 2 }
    ]
  }) {
    id
    type
    photos { url }
  }
}
```

## Преимущества интеграции

### 1. Единая точка управления
- Менеджер создает задачу в `/tasks`
- Уборщик выполняет через `/cleanings` или прямо из задачи

### 2. Прослеживаемость
- Каждая уборка связана с задачей
- История выполнения сохраняется
- Документы и фото как доказательство

### 3. Возврат залога
- Документ `PRE_CLEANING_ACCEPTANCE` используется для возврата залога
- Фотографии показывают состояние квартиры до уборки
- Если есть повреждения - залог удерживается

### 4. Контроль качества
- Документ `POST_CLEANING_HANDOVER` подтверждает качество уборки
- Чеклист отмечен полностью
- Фотографии подтверждают результат

## Примеры использования

### Создание задачи на уборку

```typescript
// На странице /tasks нажать "Создать задачу"
const task = {
  type: 'CLEANING',
  orgId: 'org-123',
  unitId: 'unit-456',
  bookingId: 'booking-789', // опционально
  dueAt: '2025-10-13T10:00:00Z',
  note: 'Уборка после выезда гостей'
}
```

### Выполнение уборки

```typescript
// 1. Нажать "✨ Выполнить уборку" в действиях задачи
// 2. Выбрать уборщика
// 3. Пройти приемку с фото
// 4. Выполнить уборку с чеклистом
// 5. Сделать фото после
// 6. Завершить
```

### Просмотр результатов

```typescript
// На странице /cleanings
// - Видны все уборки
// - Фильтр по taskId
// - Просмотр документов и фото
// - Статистика выполнения
```

## Статусы уборки

- `SCHEDULED` - запланирована (задача создана)
- `IN_PROGRESS` - в процессе (приемка пройдена, идет уборка)
- `COMPLETED` - завершена (документы созданы, чеклист заполнен)
- `CANCELLED` - отменена

## Миграции

Миграции для field-service-subgraph:
1. `20251011112041_add_cleaning_models` - создание всех моделей
2. `20251012165916_add_task_id_to_cleaning` - добавление связи с Task

## Endpoints

- **Cleaning Subgraph**: `http://localhost:4010/graphql`
- **Frontend Tasks**: `http://localhost:3000/tasks`
- **Frontend Cleanings**: `http://localhost:3000/cleanings`

## TODO: Будущие улучшения

- [ ] Автоматическое обновление статуса Task при завершении Cleaning
- [ ] Push-уведомления уборщику
- [ ] Автозагрузка шаблонов чеклистов из CleaningTemplate
- [ ] Интеграция с облачными хранилищами для фото (S3, Cloudinary)
- [ ] QR-коды для быстрого доступа к уборке
- [ ] Мобильное приложение для уборщиков
- [ ] Геолокация при начале/завершении уборки
- [ ] Время начала/завершения для расчета производительности

