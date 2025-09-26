# Pino Logger Implementation

Этот проект теперь использует [Pino](https://getpino.io/) для структурированного логирования во всех GraphQL subgraph'ах.

## 🚀 Что было сделано

1. **Создан общий logger модуль** (`shared-logger/`)
2. **Обновлены все subgraph'ы** для использования pino logger
3. **Заменены все console.log/console.error** на структурированное логирование
4. **Добавлены GraphQL-специфичные методы** для логирования

## 📦 Структура

```
backend/
├── shared-logger/           # Общий logger модуль
│   ├── src/logger.ts        # Основные функции logger'а
│   └── package.json        # Зависимости pino
├── ai-subgraph/            # Обновлен с pino logger
├── inventory-subgraph/     # Обновлен с pino logger
├── identity-subgraph/      # Обновлен с pino logger
├── billing-subgraph/       # Обновлен с pino logger
├── bookings-subgraph/      # Обновлен с pino logger
├── legal-subgraph/         # Обновлен с pino logger
├── listings-subgraph/      # Обновлен с pino logger
└── ops-subgraph/           # Обновлен с pino logger
```

## 🛠 Использование

### Базовый Service Logger

```typescript
import { createServiceLogger } from '@repo/shared-logger';

const logger = createServiceLogger('my-service');

// Разные уровни логирования
logger.info('Service started');
logger.warn('Warning message', { userId: '123' });
logger.error('Error occurred', error, { context: 'user-action' });
logger.debug('Debug info', { data: someData });
```

### GraphQL Logger

```typescript
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('my-subgraph');

// GraphQL-специфичные методы
logger.graphqlQuery('getUsers', { limit: 10 }, 150);
logger.resolverStart('getUserById', { id: '123' });
logger.resolverEnd('getUserById', result, 45);
logger.graphqlError('createUser', error, { input: userInput });
```

## 🎯 Преимущества

### До (console.log)
```javascript
console.log('User created:', user);
console.error('Error creating user:', error);
```

### После (pino logger)
```javascript
logger.info('User created successfully', { userId: user.id, email: user.email });
logger.error('Failed to create user', error, { input: userInput, timestamp: Date.now() });
```

## 📊 Уровни логирования

- **trace** - Детальная отладочная информация
- **debug** - Отладочная информация
- **info** - Общая информация
- **warn** - Предупреждения
- **error** - Ошибки
- **fatal** - Критические ошибки

## 🔧 Конфигурация

Logger автоматически настраивается с:
- **Pretty printing** в development режиме
- **JSON формат** в production
- **Цветной вывод** для лучшей читаемости
- **Структурированные данные** для анализа

## 🚀 Запуск

1. **Установка зависимостей:**
   ```bash
   cd backend
   pnpm install
   ```

2. **Сборка проекта:**
   ```bash
   pnpm build
   ```

3. **Тестирование logger'а:**
   ```bash
   node test-logger.js
   ```

4. **Запуск subgraph'ов:**
   ```bash
   # AI Subgraph
   cd ai-subgraph && pnpm start
   
   # Inventory Subgraph  
   cd inventory-subgraph && pnpm start
   
   # Identity Subgraph
   cd identity-subgraph && pnpm start
   ```

## 📈 Мониторинг

Структурированные логи легко интегрируются с:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**
- **Datadog**
- **New Relic**
- **Splunk**

## 🔍 Примеры логов

### Успешный запрос
```json
{
  "level": 30,
  "time": 1703123456789,
  "service": "inventory-subgraph",
  "msg": "GraphQL resolver returning properties",
  "count": 5,
  "executionTime": "45ms",
  "orgId": "org-123"
}
```

### Ошибка
```json
{
  "level": 50,
  "time": 1703123456789,
  "service": "ai-orchestrator",
  "msg": "Ошибка выполнения AI команды",
  "error": {
    "type": "Error",
    "message": "API rate limit exceeded",
    "stack": "Error: API rate limit exceeded\n    at ..."
  },
  "orgId": "org-123",
  "command": "create user"
}
```

## 🎉 Результат

✅ **Все console.log заменены** на структурированное логирование  
✅ **Добавлены GraphQL-специфичные методы**  
✅ **Улучшена отладка** и мониторинг  
✅ **Готовность к production** с JSON логами  
✅ **Единообразное логирование** во всех сервисах  

Теперь все subgraph'ы используют современный, структурированный logger с отличной производительностью и возможностями мониторинга!
