# 🔧 Исправление pnpm команд в Docker

## ❌ **Проблема:**
```
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "packages/datalayer-prisma" not found
```

## ✅ **Решение:**

### 1. **Исправлен синтаксис pnpm команд**
- **Было**: `pnpm -C packages/datalayer-prisma prisma db push`
- **Стало**: `cd packages/datalayer-prisma && pnpm prisma db push && cd ../..`

### 2. **Создан отдельный скрипт** `scripts/migrate-and-seed.sh`
- Более надежный и читаемый
- Правильная обработка ошибок
- Автоматический возврат в корневую директорию

### 3. **Обновлен Dockerfile**
- Использует внешний скрипт вместо встроенного
- Правильные права доступа
- Более чистая структура

## 🚀 **Что изменилось:**

### **Dockerfile:**
```dockerfile
# Делаем скрипты исполняемыми
RUN chmod +x ./scripts/migrate-and-seed.sh

# В start.sh используем внешний скрипт
./scripts/migrate-and-seed.sh
```

### **scripts/migrate-and-seed.sh:**
```bash
# Миграции
until cd packages/datalayer-prisma && pnpm prisma db push --accept-data-loss && cd ../..; do
  echo "⏳ База данных недоступна, ждем..."
  sleep 5
done

# Сиды
if [ -f "packages/datalayer-prisma/prisma-seed.ts" ]; then
  cd packages/datalayer-prisma && pnpm tsx prisma-seed.ts && cd ../..
elif [ -f "packages/datalayer-prisma/prisma-seed.js" ]; then
  cd packages/datalayer-prisma && pnpm seed && cd ../..
fi
```

## 📝 **Следующие шаги:**

1. **Зафиксируйте изменения**:
   ```bash
   git add .
   git commit -m "Fix pnpm commands in Docker"
   git push
   ```

2. **Пересоберите сервис** в Northflank

3. **Проверьте логи** - теперь должны работать команды pnpm!

## 🎯 **Ожидаемый результат:**

- ✅ Миграции Prisma выполняются успешно
- ✅ Сиды запускаются с помощью pnpm
- ✅ База данных заполняется богатыми тестовыми данными
- ✅ Все сервисы запускаются корректно

Теперь pnpm команды должны работать правильно! 🚀
