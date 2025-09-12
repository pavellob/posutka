# Настройка Hive Gateway для объединения GraphQL схем

## Обзор

Этот проект использует Hive Gateway для объединения нескольких GraphQL субграфов в единую федеративную схему. Все субграфы используют Apollo Federation v2.6.

## Структура субграфов

**Работающие субграфы:**
1. **ai-subgraph** (порт 4008) - AI команды
2. **identity-subgraph** (порт 4005) - Пользователи и организации
3. **bookings-subgraph** (порт 4002) - Бронирования, недвижимость и юниты
4. **billing-subgraph** (порт 4004) - Биллинг и платежи

**Не запущенные субграфы:**
- **inventory-subgraph** (порт 4001) - Недвижимость и юниты
- **listings-subgraph** (порт 4002) - Объявления и ценообразование
- **ops-subgraph** (порт 4004) - Операционные задачи
- **legal-subgraph** (порт 4007) - Документы и депозиты

## Настройка Hive

### 1. Создание проекта в Hive

1. Зайдите в [Hive Cloud](https://cloud.graphql-hive.com/)
2. Создайте новый проект
3. Выберите тип "Gateway"

### 2. Настройка Base Schema

В настройках проекта Hive:

1. Перейдите в раздел "Settings" → "Base Schema"
2. Скопируйте содержимое файла `base-schema.gql` в поле "Base Schema"
3. Сохраните изменения

### 3. Регистрация субграфов

Для каждого субграфа:

1. Перейдите в раздел "Subgraphs"
2. Нажмите "Add Subgraph"
3. Укажите:
   - **Name**: имя субграфа (например, `ai-subgraph`)
   - **URL**: URL субграфа (например, `http://localhost:4008/graphql`)
   - **Schema**: загрузите схему субграфа или укажите URL для интроспекции

### 4. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Hive Configuration
HIVE_TOKEN=your_hive_token_here
HIVE_ENDPOINT=https://your-hive-endpoint.com/graphql

# Subgraph URLs (для локальной разработки)
AI_SUBGRAPH_URL=http://localhost:4008/graphql
IDENTITY_SUBGRAPH_URL=http://localhost:4005/graphql
INVENTORY_SUBGRAPH_URL=http://localhost:4001/graphql
LISTINGS_SUBGRAPH_URL=http://localhost:4002/graphql
BOOKINGS_SUBGRAPH_URL=http://localhost:4003/graphql
OPS_SUBGRAPH_URL=http://localhost:4004/graphql
BILLING_SUBGRAPH_URL=http://localhost:4006/graphql
LEGAL_SUBGRAPH_URL=http://localhost:4007/graphql
```

## Schema Extensions

Базовая схема (`base-schema.gql`) содержит:

### Общие типы
- `UUID`, `DateTime`, `JSON` скаляры
- `Money` и `MoneyInput` типы
- `PageInfo` для пагинации
- Общие енумы (`DepositAction`, `TransactionStatus`, `Channel`)

### Schema Extensions
Используются для связывания типов между субграфами:

- **Organization** → связан с properties, bookings, tasks, invoices
- **Property** → связан с units
- **Unit** → связан с listings, bookings, tasks
- **Booking** → связан с documents, depositTransactions, tasks
- **ServiceOrder** → связан с invoice
- **User** → связан с organizations

### Директива @resolveTo

Каждое расширение использует директиву `@resolveTo` для автоматической делегации запросов:

```graphql
extend type Organization {
  properties: [Property!]!
    @resolveTo(
      sourceName: "inventory-subgraph"
      sourceTypeName: "Query"
      sourceFieldName: "propertiesByOrgId"
      requiredSelectionSet: "{ id }"
      sourceArgs: { orgId: "{root.id}" }
    )
}
```

## Запуск

### 1. Запуск субграфов

```bash
# Запуск всех субграфов
pnpm run dev

# Или по отдельности
pnpm run dev:ai-subgraph
pnpm run dev:identity-subgraph
pnpm run dev:inventory-subgraph
pnpm run dev:listings-subgraph
pnpm run dev:bookings-subgraph
pnpm run dev:ops-subgraph
pnpm run dev:billing-subgraph
pnpm run dev:legal-subgraph
```

### 2. Проверка работы

После запуска всех субграфов, Hive Gateway автоматически объединит схемы и предоставит единую точку входа для всех запросов.

## Примеры запросов

### Получение организации с связанными данными

```graphql
query GetOrganizationWithDetails($id: UUID!) {
  organization(id: $id) {
    id
    name
    timezone
    currency
    
    # Связанные данные из других субграфов
    properties {
      id
      title
      address
      units {
        id
        name
        capacity
        listings {
          id
          status
          basePrice
        }
      }
    }
    
    bookings {
      id
      status
      checkIn
      checkOut
      guest {
        id
        name
        email
      }
    }
    
    tasks {
      id
      type
      status
      dueAt
    }
    
    invoices {
      id
      total
      status
    }
  }
}
```

### Получение бронирования с документами

```graphql
query GetBookingWithDocuments($id: UUID!) {
  booking(id: $id) {
    id
    status
    checkIn
    checkOut
    
    # Документы из legal-subgraph
    documents {
      id
      type
      url
      createdAt
    }
    
    # Депозитные транзакции
    depositTransactions {
      id
      action
      amount
      status
      createdAt
    }
    
    # Связанные задачи
    tasks {
      id
      type
      status
      assignedTo {
        id
        name
      }
    }
  }
}
```

## Мониторинг

Hive предоставляет встроенный мониторинг:

- **Schema Registry** - отслеживание изменений схем
- **Usage Analytics** - статистика использования запросов
- **Error Tracking** - отслеживание ошибок
- **Performance Metrics** - метрики производительности

## Troubleshooting

### Проблемы с подключением субграфов

1. Убедитесь, что все субграфы запущены
2. Проверьте URL-адреса в настройках Hive
3. Убедитесь, что субграфы поддерживают Apollo Federation

### Проблемы с Schema Extensions

1. Проверьте правильность имен субграфов в `sourceName`
2. Убедитесь, что запрашиваемые поля существуют в субграфах
3. Проверьте правильность аргументов в `sourceArgs`

### Проблемы с делегацией

1. Убедитесь, что `requiredSelectionSet` содержит необходимые поля
2. Проверьте, что типы возвращаемых данных совпадают
3. Убедитесь, что все связанные типы правильно определены в субграфах
