# 🔄 Перезапуск ВСЕХ обновленных сервисов

## ✅ Что собрано и готово:

1. ✅ `packages/datalayer-prisma` - новая схема, Prisma Client сгенерирован
2. ✅ `backend/iam-subgraph` - добавлена роль CLEANER в enum
3. ✅ `backend/notifications-subgraph` - новая архитектура уведомлений
4. ✅ `backend/cleaning-subgraph` - упрощенное создание уборщика

## 🚀 Перезапустить (в отдельных терминалах):

### Terminal 1 - IAM Subgraph:
```bash
cd /Users/pavellobachev/dev/posutka-monorepo/backend/iam-subgraph
# Ctrl+C если запущен
pnpm dev
```

### Terminal 2 - Notifications Subgraph:
```bash
cd /Users/pavellobachev/dev/posutka-monorepo/backend/notifications-subgraph
# Ctrl+C если запущен
pnpm dev
```

### Terminal 3 - Cleaning Subgraph:
```bash
cd /Users/pavellobachev/dev/posutka-monorepo/backend/cleaning-subgraph
# Ctrl+C если запущен
pnpm dev
```

### Terminal 4 - Gateway Mesh (если используется):
```bash
cd /Users/pavellobachev/dev/posutka-monorepo/backend/gateway-mesh
# Ctrl+C если запущен
pnpm dev
```

## ИЛИ через turbo (если настроено):

```bash
cd /Users/pavellobachev/dev/posutka-monorepo
pnpm dev
```

## ✅ После перезапуска:

### 1. Проверьте логи:
- ✅ IAM: "GraphQL server ready"
- ✅ Notifications: "Telegram bot initialized", "All providers initialized"
- ✅ Cleaning: "GraphQL server ready"

### 2. Создайте уборщика:
- Откройте `/cleaners`
- Нажмите "+ Добавить уборщика"
- **Просто выберите пользователя** из списка
- Нажмите "Создать"
- ✅ Должно создаться без ошибок!

### 3. Назначьте уборку:
- Откройте `/cleanings`
- Создайте уборку
- Назначьте на уборщика
- ✅ Придет уведомление в Telegram! 📱

### 4. Проверьте `/notifications`:
- Откройте страницу
- ✅ Должны увидеть список уведомлений

---

**ВАЖНО:** Все три сервиса (iam, notifications, cleaning) должны быть перезапущены!

