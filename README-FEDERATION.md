# 🚀 Posutka Federation с GraphQL Mesh v1

Этот проект демонстрирует федеративную архитектуру GraphQL с использованием инструментов от The Guild.

## 📋 Архитектура

### Сабграфы
- **inventory-subgraph** (4001) - управление недвижимостью
- **bookings-subgraph** (4002) - бронирования
- **ops-subgraph** (4003) - операционные задачи
- **billing-subgraph** (4004) - биллинг и инвойсы
- **identity-subgraph** (4005) - пользователи и организации
- **listings-subgraph** (4006) - объявления и цены
- **legal-subgraph** (4007) - юридические документы
- **ai-subgraph** (4008) - AI команды и оркестрация

### Gateway
- **hive-gateway** (4000) - центральный шлюз с интеллектуальным проксированием

## 🛠 Технологии

- **GraphQL Yoga** - сервер GraphQL
- **Apollo Federation v2** - федерация сабграфов
- **GraphQL Mesh v1** - композиция схем (от The Guild)
- **TypeScript** - типизация
- **Prisma** - ORM для базы данных
- **DataLayer Pattern** - абстракция данных

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
pnpm install
```

### 2. Сборка всех проектов
```bash
pnpm -C apps/ai-subgraph build
pnpm -C apps/hive-gateway build
# ... остальные сабграфы
```

### 3. Запуск AI Subgraph
```bash
cd apps/ai-subgraph
node test-server.cjs
```

### 4. Тестирование AI команд
```bash
# Показать статистику
curl -X POST http://localhost:4008/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { aiCommand(orgId: \"org-123\", command: \"показать статистику\") { ok message preview } }"}'

# Создать бронирование
curl -X POST http://localhost:4008/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { aiCommand(orgId: \"org-123\", command: \"создать бронирование на 5 дней с 15 января\") { ok message preview } }"}'
```

### 5. Запуск Federation Gateway
```bash
cd apps/hive-gateway
node dist/server.js
```

### 6. Тестирование через Gateway
```bash
# AI команды автоматически направляются к ai-subgraph
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { aiCommand(orgId: \"org-123\", command: \"показать статистику\") { ok message preview } }"}'
```

## 🎯 AI Команды

AI Subgraph поддерживает следующие команды:

### Статистика
```graphql
mutation {
  aiCommand(orgId: "org-123", command: "показать статистику") {
    ok
    message
    affectedIds
    preview
  }
}
```

### Создание бронирования
```graphql
mutation {
  aiCommand(orgId: "org-123", command: "создать бронирование на 5 дней с 15 января") {
    ok
    message
    affectedIds
    preview
  }
}
```

### Создание инвойса
```graphql
mutation {
  aiCommand(orgId: "org-123", command: "создать инвойс") {
    ok
    message
    affectedIds
    preview
  }
}
```

### Показ бронирований
```graphql
mutation {
  aiCommand(orgId: "org-123", command: "показать бронирования") {
    ok
    message
    affectedIds
    preview
  }
}
```

## 🔧 GraphQL Mesh v1

### Конфигурация
Файл `mesh.config.ts` содержит конфигурацию для композиции всех сабграфов:

```typescript
import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('ai-subgraph', {
        endpoint: 'http://localhost:4008/graphql'
      })
    },
    // ... остальные сабграфы
  ]
})
```

### Генерация Supergraph
```bash
npx mesh-compose -o supergraph.graphql
```

### Генерация отдельных сабграфов
```bash
npx mesh-compose --subgraph ai-subgraph -o ai-subgraph.graphql
```

## 🐳 Docker

### Запуск всех сервисов
```bash
docker-compose -f docker-compose.hive.yml up
```

### Остановка
```bash
docker-compose -f docker-compose.hive.yml down
```

## 📊 Мониторинг

### GraphQL Playground
- **Gateway**: http://localhost:4000/graphql
- **AI Subgraph**: http://localhost:4008/graphql

### Health Checks
```bash
# Проверка AI Subgraph
curl http://localhost:4008/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __schema { types { name } } }"}'

# Проверка Gateway
curl http://localhost:4000/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __schema { types { name } } }"}'
```

## 🧪 Тестирование

### Unit тесты
```bash
pnpm -C apps/ai-subgraph test
```

### Интеграционные тесты
```bash
node test-federation.js
```

## 📁 Структура проекта

```
posutka-monorepo/
├── apps/
│   ├── ai-subgraph/          # AI команды и оркестрация
│   ├── hive-gateway/         # Federation Gateway
│   ├── billing-subgraph/     # Биллинг и инвойсы
│   ├── identity-subgraph/    # Пользователи и организации
│   ├── listings-subgraph/    # Объявления и цены
│   ├── legal-subgraph/       # Юридические документы
│   └── ...                   # Остальные сабграфы
├── packages/
│   ├── datalayer/            # Интерфейсы DataLayer
│   ├── datalayer-prisma/     # Реализация Prisma
│   └── shared/               # Общие типы
├── mesh.config.ts            # Конфигурация Mesh
├── docker-compose.hive.yml   # Docker Compose
└── test-federation.js        # Тестовый скрипт
```

## 🎉 Результат

✅ **AI Subgraph** - полностью функционален с поддержкой команд
✅ **Federation Gateway** - интеллектуальное проксирование запросов
✅ **GraphQL Mesh v1** - готов к композиции схем
✅ **Docker Compose** - полная инфраструктура
✅ **TypeScript** - полная типизация
✅ **DataLayer Pattern** - чистая архитектура

## 🔗 Полезные ссылки

- [GraphQL Mesh v1 Documentation](https://the-guild.dev/graphql/mesh/v1/getting-started)
- [Apollo Federation v2](https://www.apollographql.com/docs/federation/)
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)
- [The Guild](https://the-guild.dev/)

---

**Создано с ❤️ используя инструменты от The Guild**
