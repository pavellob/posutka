# Автоматическое создание Cleaning при создании Task через gRPC

## 📋 Описание

При создании **Task** с типом `CLEANING` в `ops-subgraph` автоматически создаётся соответствующая **Cleaning** entity в `cleaning-subgraph` через **gRPC** вызов.

---

## 🔄 Как работает:

### 1. **Создание Task (ops-subgraph)**
```graphql
mutation CreateTask {
  createTask(input: {
    orgId: "org-123"
    unitId: "unit-456"
    bookingId: "booking-789"
    type: CLEANING           # ← Тип CLEANING
    dueAt: "2025-10-25T10:00:00Z"
    cleanerId: "cleaner-abc"  # Опционально
    note: "Deep cleaning required"
  }) {
    id
    type
    status
  }
}
```

### 2. **Автоматическое создание Cleaning через gRPC**
После создания Task с типом `CLEANING`, `ops-subgraph` автоматически вызывает `cleaning-subgraph` через **gRPC**:

```typescript
// backend/ops-subgraph/src/resolvers/index.ts
if (input.type === 'CLEANING') {
  // gRPC клиент для cleaning-subgraph
  const cleaningGrpcClient = createCleaningGrpcClient({
    host: process.env.CLEANING_GRPC_HOST || 'localhost',
    port: parseInt(process.env.CLEANING_GRPC_PORT || '4110'),
  });
  
  // Автоматически создаёт Cleaning через gRPC
  const response = await cleaningGrpcClient.scheduleCleaning({
    orgId: input.orgId,
    unitId: input.unitId,
    bookingId: input.bookingId,
    taskId: task.id,          // ✅ Связь с Task
    scheduledAt: input.dueAt ? new Date(input.dueAt) : new Date(),
    cleanerId: input.cleanerId,
    requiresLinenChange: false,
    notes: input.note,
  });
}
```

### 3. **Результат**
- ✅ Создан **Task** в ops-subgraph
- ✅ Создан **Cleaning** в cleaning-subgraph  
- ✅ `Cleaning.taskId` → связь с Task
- ✅ Если указан `cleanerId` → отправляется уведомление `CLEANING_ASSIGNED`
- ✅ Если `cleanerId` не указан → отправляются уведомления `CLEANING_AVAILABLE` всем привязанным уборщикам

---

## 🗄️ Связь в БД

```prisma
model Task {
  id                 String
  type               TaskType  // CLEANING | CHECKIN | CHECKOUT | ...
  assignedCleanerId  String?
  // ...
}

model Cleaning {
  id          String
  taskId      String?   // ✅ Ссылка на Task
  cleanerId   String?
  unitId      String
  scheduledAt DateTime
  status      CleaningStatus
  // ...
}
```

---

## 📝 Логи

При создании Task типа CLEANING в логах будет:

```
[ops-subgraph] Creating task { type: 'CLEANING', unitId: 'unit-456' }
[ops-subgraph] Task is CLEANING type, creating Cleaning entity { taskId: 'task-123' }
[ops-subgraph] ✅ Cleaning created for Task { taskId: 'task-123', cleaningId: 'cleaning-789' }
```

Если cleaning-subgraph недоступен:
```
[ops-subgraph] Error creating Cleaning for Task { taskId: 'task-123', error: '...' }
```
**Важно:** Task всё равно создастся, даже если Cleaning не создалась.

---

## 🚀 Использование

### Из фронтенда:
```typescript
// Создать задачу на уборку
const { data } = await client.mutate({
  mutation: CREATE_TASK,
  variables: {
    input: {
      orgId: currentOrgId,
      unitId: selectedUnitId,
      type: 'CLEANING',
      dueAt: '2025-10-25T10:00:00Z',
      cleanerId: selectedCleanerId, // Опционально
    }
  }
});

// Автоматически создастся Cleaning!
// Уборщики получат уведомления!
```

---

## ⚙️ Конфигурация

### Порты:
- `ops-subgraph`: `4003` (GraphQL)
- `cleaning-subgraph`: 
  - `4010` (GraphQL)
  - `4110` (gRPC) ← **Новый порт для gRPC**

### Переменные окружения:
```bash
# В .env файле
CLEANING_GRPC_HOST=localhost
CLEANING_GRPC_PORT=4110
```

Эти переменные должны быть установлены в `ops-subgraph` для подключения к `cleaning-subgraph` через gRPC.

---

## 🔧 Troubleshooting

### Cleaning не создаётся:
1. Проверьте что `cleaning-subgraph` запущен на **gRPC порту `4110`**
   ```bash
   ✅ GRPC transport started successfully { host: 'localhost', port: 4110 }
   ```
2. Проверьте что `ops-subgraph` подключен к gRPC:
   ```bash
   Connected to Cleaning GRPC service
   ```
3. Проверьте переменные окружения `CLEANING_GRPC_HOST` и `CLEANING_GRPC_PORT`
4. Проверьте логи `ops-subgraph` - должна быть ошибка gRPC
5. Проверьте что `unitId` существует в БД

### Task создаётся но без уведомлений:
1. Проверьте что у Unit привязаны уборщики (`preferredCleaners`)
2. Проверьте что у уборщиков настроен Telegram (`telegramChatId`)
3. Проверьте переменную `TELEGRAM_BOT_TOKEN`

---

## 📚 См. также:
- [PREFERRED_CLEANERS_API.md](./PREFERRED_CLEANERS_API.md) - API для управления привязкой уборщиков
- [CLEANING_SELF_ASSIGNMENT.md](./CLEANING_SELF_ASSIGNMENT.md) - Самоназначение уборок
- [NOTIFICATION_SETUP_CHECKLIST.md](./NOTIFICATION_SETUP_CHECKLIST.md) - Настройка уведомлений

