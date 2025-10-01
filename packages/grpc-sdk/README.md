# @repo/grpc-sdk

GRPC SDK для микросервисов проекта Posutka. Содержит proto файлы и сгенерированные клиенты для взаимодействия между сервисами.

## Структура

```
grpc-sdk/
├── src/
│   ├── proto/           # Proto файлы для всех сервисов
│   │   └── ops.proto    # Операционный сервис (задачи, уборка)
│   ├── generated/       # Автоматически сгенерированные типы и клиенты
│   ├── clients/         # Обертки над GRPC клиентами
│   │   └── ops.client.ts
│   └── index.ts         # Основной экспорт
├── package.json
└── tsconfig.json
```

## Использование

### Установка

Пакет автоматически доступен через workspace в других пакетах:

```json
{
  "dependencies": {
    "@repo/grpc-sdk": "workspace:*"
  }
}
```

### Пример использования OpsGrpcClient

```typescript
import { createOpsGrpcClient } from '@repo/grpc-sdk';

// Создаем клиент
const opsClient = createOpsGrpcClient({
  host: 'localhost',
  port: 50051,
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 5000
});

// Подключаемся
await opsClient.connect();

// Создаем задачу уборки
const result = await opsClient.createCleaningTask({
  propertyId: 'prop-123',
  roomId: 'room-456',
  bookingId: 'booking-789',
  scheduledAt: new Date(),
  notes: 'Уборка перед заездом гостя',
  priority: 1
});

console.log('Task created:', result.task.id);

// Отключаемся
await opsClient.disconnect();
```

## Разработка

### Требования

- Protocol Buffers Compiler (`protoc`)
  - macOS: `brew install protobuf`
  - Ubuntu: `sudo apt-get install protobuf-compiler`
  - Windows: Скачайте с [GitHub Releases](https://github.com/protocolbuffers/protobuf/releases)

### Генерация клиентов из proto файлов

```bash
pnpm run generate
```

Эта команда:
1. Очищает директорию `src/generated/`
2. Читает proto файлы из `src/proto/`
3. Генерирует TypeScript типы и nice-grpc клиенты в `src/generated/`
4. Использует `ts-proto` с опциями для `nice-grpc`

### Сборка

```bash
pnpm run build
```

Команда build автоматически:
1. Очищает старые файлы (`clean`)
2. Генерирует типы из proto (`generate`)
3. Компилирует TypeScript (`tsup`)

### Dev режим

```bash
pnpm run dev
```

Запускает `tsup` в режиме watch для быстрой разработки.

### Добавление нового сервиса

1. Создайте `.proto` файл в `src/proto/`
2. Запустите `pnpm run generate`
3. Создайте клиент-обертку в `src/clients/`
4. Экспортируйте из `src/index.ts`

## Proto файлы

### ops.proto

Сервис для управления операционными задачами:
- Создание задач уборки
- Получение задач
- Обновление статуса задач
- Назначение исполнителей

## Зависимости

- `nice-grpc` - современный GRPC клиент для Node.js
- `@grpc/grpc-js` - официальная GRPC библиотека
- `ts-proto` - генератор TypeScript кода из proto файлов

