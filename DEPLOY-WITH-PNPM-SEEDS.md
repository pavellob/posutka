# 🚀 Деплой с pnpm сидами и миграциями

## 📋 Что добавлено

### 1. **Автоматические миграции с pnpm**
- Использование `pnpm -C packages/datalayer-prisma prisma db push`
- Retry логика для подключения к базе данных
- Автоматическое создание схемы

### 2. **Богатые сиды с pnpm**
- **TypeScript сиды**: `pnpm -C packages/datalayer-prisma tsx prisma-seed.ts`
- **JavaScript сиды**: `pnpm -C packages/datalayer-prisma seed`
- Автоматический выбор типа сидов

### 3. **Богатые тестовые данные**
- **Организация**: "Sunrise Stays B.V." с 2 свойствами
- **Свойства**: "Canal View Apartments" и "Harbor Loft Studios"
- **Единицы**: 4 единицы с разными характеристиками
- **Пользователи**: Owner, Manager, Staff с ролями
- **Гости**: Alice, Bob, Chen с документами
- **Бронирования**: 3 бронирования (подтвержденное, ожидающее, отмененное)
- **Задачи**: Уборка и ремонт с поставщиками услуг
- **Счета**: Инвойсы с платежами
- **Правовые документы**: Соглашения и GDPR

## 🔧 Как это работает

### Последовательность запуска:
1. **Подготовка БД** → `migrate-and-seed.sh`
   - Ожидание подключения к PostgreSQL
   - Выполнение `prisma db push`
   - Запуск сидов (TypeScript или JavaScript)
2. **Запуск подграфов** → `pnpm start:subgraphs`
3. **Ожидание готовности** → `wait-for-subgraphs.sh`
4. **Сборка суперграфа** → `pnpm mesh:compose`
5. **Запуск Gateway** → `pnpm start:gateway`

### Логика выбора сидов:
```bash
if [ -f "packages/datalayer-prisma/prisma-seed.ts" ]; then
  # TypeScript сиды
  pnpm -C packages/datalayer-prisma tsx prisma-seed.ts
elif [ -f "packages/datalayer-prisma/prisma-seed.js" ]; then
  # JavaScript сиды
  pnpm -C packages/datalayer-prisma seed
else
  # Сиды не найдены
  echo "ℹ️  Сиды не найдены, пропускаем"
fi
```

## 🚀 Деплой

### 1. **Настройка базы данных**
```bash
# Создайте PostgreSQL базу данных
# Получите DATABASE_URL
# Пример: postgresql://user:password@host:port/database
```

### 2. **Деплой в Northflank**
```bash
# Зафиксируйте изменения
git add .
git commit -m "Add pnpm-based migrations and rich seeds"
git push

# В Northflank Dashboard:
# 1. Добавьте секрет DATABASE_URL
# 2. Пересоберите сервис
# 3. Проверьте логи
```

### 3. **Проверка работы**
```bash
# Проверьте Gateway
curl -X POST https://your-app.northflank.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'

# Проверьте подграфы
curl -X POST https://your-app.northflank.app:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'
```

## 📊 Мониторинг

### Логи для отслеживания:
- `🗄️ Запуск миграций Prisma...`
- `⏳ Ожидание подключения к базе данных...`
- `✅ База данных готова!`
- `🌱 Запуск сидов с помощью pnpm...`
- `📦 Найдены TypeScript сиды, запускаем...`
- `🎉 Миграции и сиды завершены!`
- `📦 Запуск подграфов...`
- `✅ Подграфы готовы!`
- `🌐 Запуск Gateway...`

## 🎯 Тестовые данные

### Создаются автоматически:
- **1 организация** с 2 свойствами
- **4 единицы** с разными характеристиками
- **3 пользователя** с ролями (Owner, Manager, Staff)
- **3 гостя** с документами
- **3 бронирования** (разные статусы)
- **2 задачи** (уборка и ремонт)
- **2 поставщика услуг** (CleanCo, RepairPro)
- **1 счет** с платежом
- **Правовые документы** и транзакции

## ⚠️ Важные моменты

### 1. **База данных должна быть доступна**
- Убедитесь, что DATABASE_URL правильный
- Проверьте доступность PostgreSQL сервера
- Настройте firewall и security groups

### 2. **Сиды выполняются только при первом запуске**
- При перезапуске контейнера сиды не дублируются
- Для повторного заполнения удалите данные в БД

### 3. **pnpm команды**
- Используется `pnpm -C packages/datalayer-prisma` для изоляции
- TypeScript сиды запускаются через `tsx`
- JavaScript сиды через `node`

## 🎉 Результат

После деплоя у вас будет:
- ✅ **Автоматически настроенная база данных**
- ✅ **Богатые тестовые данные для всех сущностей**
- ✅ **Работающая GraphQL Federation**
- ✅ **Готовый к использованию API с реальными данными**

Теперь ваш сервис полностью автономен с богатыми тестовыми данными! 🚀
