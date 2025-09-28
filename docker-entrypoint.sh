#!/bin/sh

echo "🚀 Запуск Posutka Monorepo в Docker..."

# Убеждаемся, что мы находимся в корневой директории проекта
if [ "$(dirname "$0")" = "/app" ]; then
  # Если скрипт находится в /app, то мы уже в правильной директории
  cd /app || exit 1
else
  # Иначе переходим в директорию проекта
  cd "$(dirname "$0")/.." || exit 1
fi

# Проверяем, что директория packages/datalayer-prisma существует
if [ ! -d "packages/datalayer-prisma" ]; then
  echo "❌ Ошибка: директория packages/datalayer-prisma не найдена в $(pwd)"
  ls -la
  exit 1
fi

# Ждем готовности базы данных
echo "⏳ Ожидание готовности базы данных..."
until nc -z db 5432; do
  echo "База данных еще не готова, ждем..."
  sleep 2
done

echo "✅ База данных готова!"

# Выполняем миграции
echo "🔄 Выполнение миграций базы данных..."
cd packages/datalayer-prisma && pnpm prisma db push --force-reset || echo "Migration failed, continuing..."

# Генерируем Prisma клиент
echo "🔧 Генерация Prisma клиента..."
cd packages/datalayer-prisma && pnpm prisma generate

# Заполняем базу тестовыми данными
echo "🌱 Заполнение базы тестовыми данными..."
cd packages/datalayer-prisma && pnpm tsx prisma/prisma-seed-mock.ts || echo "Seeding failed, continuing..."
cd "$(dirname "$0")/.."

echo "🎯 Запуск всех сервисов..."

# Запускаем все сабграфы и Mesh Gateway параллельно
npm-run-all --parallel \
  "pnpm -C backend/inventory-subgraph start" \
  "pnpm -C backend/bookings-subgraph start" \
  "pnpm -C backend/ops-subgraph start" \
  "pnpm -C backend/billing-subgraph start" \
  "pnpm -C backend/identity-subgraph start" \
  "pnpm -C backend/listings-subgraph start" \
  "pnpm -C backend/legal-subgraph start" \
  "pnpm -C backend/ai-subgraph start" \
  "pnpm -C backend/gateway-mesh mesh:dev"
