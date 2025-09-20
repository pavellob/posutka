# AI Subgraph с поддержкой GQLPT

AI Subgraph для проекта Posutka с интеграцией [GQLPT](https://github.com/rocket-connect/gqlpt) - библиотеки для генерации GraphQL запросов из естественного языка с помощью AI.

## 🚀 Возможности

- **AI-команды**: Выполнение команд на естественном языке
- **Генерация GraphQL запросов**: Автоматическое создание GraphQL запросов из текстовых описаний
- **Поддержка AI-адаптеров**: OpenAI GPT и Anthropic Claude
- **Выполнение запросов**: Автоматическое выполнение сгенерированных запросов
- **Валидация схемы**: Все запросы валидируются против GraphQL схемы

## 📦 Установка зависимостей

```bash
pnpm install
```

## 🔧 Настройка

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Запуск в режиме разработки

```bash
pnpm dev
```

Сервер будет доступен на `http://localhost:4008/graphql`

## 📖 Использование

### 1. Генерация GraphQL запроса

```graphql
mutation GenerateQuery {
  generateGraphQLQuery(
    orgId: "123e4567-e89b-12d3-a456-426614174000"
    description: "Найти всех пользователей с именем Иван"
    adapterConfig: {
      type: "openai"
      apiKey: "your-api-key"
      model: "gpt-4"
    }
  ) {
    query
    variables
    description
    success
    error
  }
}
```

### 2. Выполнение сгенерированного запроса

```graphql
mutation ExecuteQuery {
  executeGeneratedQuery(
    orgId: "123e4567-e89b-12d3-a456-426614174000"
    query: "query($name: String!) { users(where: { name: { equals: $name } }) { id name } }"
    variables: { "name": "Иван" }
  )
}
```

### 3. Выполнение AI-команды

```graphql
mutation AICommand {
  aiCommand(
    orgId: "123e4567-e89b-12d3-a456-426614174000"
    command: "Создать новое бронирование для пользователя Иван"
    context: {
      "userId": "user-123"
      "checkIn": "2024-01-15"
      "checkOut": "2024-01-20"
    }
  ) {
    ok
    message
    affectedIds
    preview
  }
}
```

## 🔌 Поддерживаемые AI-адаптеры

### OpenAI

```typescript
const adapterConfig = {
  type: 'openai',
  apiKey: 'your-openai-api-key',
  model: 'gpt-4' // или 'gpt-3.5-turbo'
};
```

### Anthropic

```typescript
const adapterConfig = {
  type: 'anthropic',
  apiKey: 'your-anthropic-api-key',
  model: 'claude-3-sonnet-20240229' // или 'claude-3-haiku-20240307'
};
```

## 🏗️ Архитектура

```
AI Subgraph
├── Schema (GraphQL)
│   ├── AICommandResult
│   ├── GraphQLQueryResult
│   └── AIAdapterConfig
├── Resolvers
│   ├── aiCommand
│   ├── generateGraphQLQuery
│   └── executeGeneratedQuery
├── Services
│   ├── GQLPTService (работа с GQLPT)
│   └── AIOrchestratorService (оркестрация AI команд)
└── Context
    └── createContext (инициализация сервисов)
```

## 🧪 Тестирование

```bash
# Запуск тестов
pnpm test

# Запуск тестов в режиме наблюдения
pnpm test --watch
```

## 📝 Примеры использования

Смотрите файл `src/examples/gqlpt-usage.example.ts` для подробных примеров использования всех функций.

## 🔍 Отладка

Для отладки AI-запросов включите логирование:

```typescript
// В GQLPTService
console.log('Генерируем запрос для:', description);
console.log('Результат:', result);
```

## 🚨 Ограничения

- Требуется API ключ для выбранного AI-провайдера
- Сгенерированные запросы валидируются против схемы, но могут требовать ручной корректировки
- Производительность зависит от выбранной AI-модели

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License
