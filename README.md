# POSUTKA Monorepo

Монорепозиторий для федеративных GraphQL субграфов с DataLayer архитектурой.

## Архитектура

- **pnpm + Turborepo** для управления монорепозиторием
- **Apollo Federation v2** для федеративных GraphQL субграфов
- **GraphQL Yoga** как GraphQL сервер
- **DataLayer** для изоляции доступа к данным
- **Prisma** для работы с PostgreSQL

## Структура

```
.
├── apps/
│   └── inventory-subgraph/     # Субграф для управления недвижимостью
├── packages/
│   ├── datalayer/              # Интерфейсы DataLayer
│   ├── datalayer-prisma/       # Реализация DataLayer на Prisma
│   └── shared/                 # Общие типы и утилиты
├── docker-compose.yml          # PostgreSQL для разработки
└── turbo.json                  # Конфигурация Turborepo
```

## Быстрый старт

### 1. Установка зависимостей

```bash
pnpm install
```

### 2. Запуск базы данных

```bash
docker-compose up -d
```

### 3. Настройка базы данных

```bash
# Генерация Prisma клиента
pnpm generate

# Применение миграций
pnpm migrate
```

### 4. Запуск в режиме разработки

```bash
# Запуск всех сервисов
pnpm dev

# Или только inventory-subgraph
pnpm -C apps/inventory-subgraph dev
```

### 5. Сборка

```bash
pnpm build
```

### 6. Тесты

```bash
pnpm test
```

## Использование

### Inventory Subgraph

Сервер запускается на `http://localhost:4001`

#### Примеры запросов:

**Создание объекта недвижимости:**
```graphql
mutation {
  createProperty(
    orgId: "org_123"
    title: "Квартира в центре"
    address: "Невский проспект, 1"
    amenities: ["wifi", "parking"]
  ) {
    id
    title
    address
    amenities
  }
}
```

**Получение объекта недвижимости:**
```graphql
query {
  property(id: "prop_123") {
    id
    title
    address
    amenities
    org {
      id
    }
  }
}
```

**Создание единицы (комнаты/квартиры):**
```graphql
mutation {
  createUnit(
    propertyId: "prop_123"
    name: "Студия 1"
    capacity: 2
    beds: 1
    bathrooms: 1
    amenities: ["wifi", "kitchen"]
  ) {
    id
    name
    capacity
    beds
    bathrooms
  }
}
```

**Блокировка дат:**
```graphql
mutation {
  blockDates(
    unitId: "unit_123"
    from: "2025-01-01T00:00:00.000Z"
    to: "2025-01-05T00:00:00.000Z"
    note: "Техническое обслуживание"
  ) {
    date
    status
    note
  }
}
```

## DataLayer

DataLayer обеспечивает изоляцию доступа к данным:

- `@repo/datalayer` - интерфейсы и типы
- `@repo/datalayer-prisma` - реализация на Prisma
- Легко заменяемая реализация (можно подставить mock или blockchain-DL)

## Разработка

### Добавление нового субграфа

1. Создать директорию в `apps/`
2. Добавить зависимости на `@repo/datalayer`
3. Реализовать GraphQL схему и резолверы
4. Добавить в `turbo.json` pipeline

### Добавление новых типов в DataLayer

1. Обновить интерфейсы в `@repo/datalayer`
2. Реализовать в `@repo/datalayer-prisma`
3. Обновить Prisma схему и миграции

## CI/CD

- `lint` - проверка кода
- `typecheck` - проверка типов TypeScript
- `build` - сборка всех пакетов
- `test` - запуск тестов
- `migrate` - применение миграций Prisma

## Переменные окружения

Создайте `.env` файл в `apps/inventory-subgraph/`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/posutka"
```
