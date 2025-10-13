# Cleaning Subgraph

Подграф для управления уборками в системе Posutka.

## Описание

Cleaning Subgraph отвечает за:

- **Управление уборщиками** - создание и управление профилями уборщиков
- **Шаблоны уборок** - настройка шаблонов для разных типов квартир с чеклистами
- **Планирование уборок** - создание и назначение уборок уборщикам
- **Документация уборок** - формирование документов приемки и сдачи квартир с фотографиями

## Основные сущности

### Cleaner (Уборщик)
Представляет уборщика в системе. Каждый уборщик связан с пользователем системы (`User`) и организацией.

**Поля:**
- `id` - уникальный идентификатор
- `userId` - ссылка на пользователя системы
- `orgId` - ссылка на организацию
- `firstName`, `lastName` - имя и фамилия
- `phone`, `email` - контактная информация
- `rating` - рейтинг уборщика (0-5)
- `isActive` - активен ли уборщик

### CleaningTemplate (Шаблон уборки)
Шаблон уборки для квартиры, содержит описание и чеклист.

**Поля:**
- `id` - уникальный идентификатор
- `unitId` - ссылка на квартиру (Unit)
- `name` - название шаблона
- `description` - текстовое описание
- `requiresLinenChange` - требуется ли смена белья
- `estimatedDuration` - расчетная продолжительность в минутах
- `checklistItems` - список чек-боксов для проверки

### Cleaning (Уборка)
Процесс уборки квартиры. **Обязательно** привязана к квартире (`Unit`), **опционально** может быть привязана к бронированию (`Booking`).

**Поля:**
- `id` - уникальный идентификатор
- `orgId` - ссылка на организацию
- `cleanerId` - ссылка на уборщика
- `unitId` - ссылка на квартиру (**обязательно**)
- `bookingId` - ссылка на бронирование (**опционально**)
- `status` - статус уборки (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
- `scheduledAt` - запланированное время
- `startedAt`, `completedAt` - время начала и завершения
- `requiresLinenChange` - требуется ли смена белья
- `checklistItems` - чеклист уборки

### CleaningDocument (Документ уборки)
Документ приемки или сдачи квартиры. Два типа:
- **PRE_CLEANING_ACCEPTANCE** - приемка квартиры перед уборкой (по нему возвращается залог)
- **POST_CLEANING_HANDOVER** - сдача убранной квартиры

**Поля:**
- `id` - уникальный идентификатор
- `cleaningId` - ссылка на уборку
- `type` - тип документа
- `notes` - заметки
- `photos` - список фотографий

## GraphQL API

### Queries

```graphql
# Получить уборщика по ID
cleaner(id: UUID!): Cleaner

# Список уборщиков
cleaners(orgId: UUID!, isActive: Boolean, first: Int, after: String): CleanerConnection!

# Получить шаблон уборки
cleaningTemplate(id: UUID!): CleaningTemplate

# Шаблоны уборки для квартиры
cleaningTemplates(unitId: UUID!): [CleaningTemplate!]!

# Получить уборку по ID
cleaning(id: UUID!): Cleaning

# Список уборок с фильтрацией
cleanings(
  orgId: UUID
  unitId: UUID
  cleanerId: UUID
  bookingId: UUID
  status: CleaningStatus
  from: DateTime
  to: DateTime
  first: Int
  after: String
): CleaningConnection!
```

### Mutations

```graphql
# Управление уборщиками
createCleaner(input: CreateCleanerInput!): Cleaner!
updateCleaner(id: UUID!, input: UpdateCleanerInput!): Cleaner!
deactivateCleaner(id: UUID!): Cleaner!

# Управление шаблонами
createCleaningTemplate(input: CreateCleaningTemplateInput!): CleaningTemplate!
updateCleaningTemplate(id: UUID!, input: UpdateCleaningTemplateInput!): CleaningTemplate!
deleteCleaningTemplate(id: UUID!): Boolean!

# Управление уборками
scheduleCleaning(input: ScheduleCleaningInput!): Cleaning!
startCleaning(id: UUID!): Cleaning!
completeCleaning(id: UUID!, input: CompleteCleaningInput!): Cleaning!
cancelCleaning(id: UUID!, reason: String): Cleaning!
updateCleaningChecklist(id: UUID!, items: [ChecklistItemInput!]!): Cleaning!

# Управление документами
createPreCleaningDocument(cleaningId: UUID!, input: CreateCleaningDocumentInput!): CleaningDocument!
createPostCleaningDocument(cleaningId: UUID!, input: CreateCleaningDocumentInput!): CleaningDocument!
addPhotoToDocument(documentId: UUID!, input: AddPhotoInput!): CleaningDocumentPhoto!
deletePhotoFromDocument(photoId: UUID!): Boolean!
```

## Примеры использования

### Создание уборщика

```graphql
mutation {
  createCleaner(input: {
    userId: "user-123"
    orgId: "org-456"
    firstName: "Иван"
    lastName: "Иванов"
    phone: "+7 900 123 45 67"
    email: "ivan@example.com"
  }) {
    id
    firstName
    lastName
    rating
  }
}
```

### Создание шаблона уборки

```graphql
mutation {
  createCleaningTemplate(input: {
    unitId: "unit-789"
    name: "Стандартная уборка 1-комнатной квартиры"
    description: "Базовая уборка после выезда гостей"
    requiresLinenChange: true
    estimatedDuration: 120
    checklistItems: [
      { label: "Пропылесосить все комнаты", order: 1, isRequired: true }
      { label: "Помыть полы", order: 2, isRequired: true }
      { label: "Протереть пыль", order: 3, isRequired: true }
      { label: "Убрать в ванной", order: 4, isRequired: true }
      { label: "Сменить постельное белье", order: 5, isRequired: true }
    ]
  }) {
    id
    name
    checklistItems {
      label
      order
    }
  }
}
```

### Планирование уборки

```graphql
mutation {
  scheduleCleaning(input: {
    orgId: "org-456"
    cleanerId: "cleaner-123"
    unitId: "unit-789"
    bookingId: "booking-111"  # опционально
    scheduledAt: "2025-10-12T10:00:00Z"
    requiresLinenChange: true
    checklistItems: [
      { label: "Пропылесосить все комнаты", isChecked: false, order: 1 }
      { label: "Помыть полы", isChecked: false, order: 2 }
    ]
  }) {
    id
    status
    scheduledAt
    unit { id }
    cleaner {
      firstName
      lastName
    }
  }
}
```

### Создание документа приемки

```graphql
mutation {
  createPreCleaningDocument(
    cleaningId: "cleaning-123"
    input: {
      notes: "Обнаружено загрязнение на ковре"
      photos: [
        { url: "https://example.com/photo1.jpg", caption: "Пятно на ковре", order: 1 }
        { url: "https://example.com/photo2.jpg", caption: "Общий вид", order: 2 }
      ]
    }
  ) {
    id
    type
    notes
    photos {
      url
      caption
    }
  }
}
```

## Разработка

### Запуск в режиме разработки

```bash
pnpm dev
```

Сервис будет доступен на `http://localhost:4010/graphql`

### Сборка

```bash
pnpm build
```

### Тестирование

```bash
pnpm test
```

## Интеграция с другими подграфами

Cleaning Subgraph интегрируется с:

- **Identity Subgraph** - для связи с пользователями и организациями
- **Inventory Subgraph** - для связи с квартирами (Units)
- **Bookings Subgraph** - для опциональной связи с бронированиями

## Порты

- GraphQL: `4010`

