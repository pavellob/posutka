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
echo "🔍 DATABASE_URL для миграций: ${DATABASE_URL:0:30}..."
cd packages/datalayer-prisma && DATABASE_URL="$DATABASE_URL" pnpm prisma db push --accept-data-loss || echo "Migration failed, continuing..."

# Генерируем Prisma клиент
echo "🔧 Генерация Prisma клиента..."
cd packages/datalayer-prisma && DATABASE_URL="$DATABASE_URL" pnpm prisma generate

# Сиды отключены для production деплоя
# Для локальной разработки запускайте вручную: pnpm seed:ts
echo "ℹ️  Сиды отключены. Запустите вручную при необходимости."

echo "🎯 Запуск всех сервисов..."

# Проверяем и логируем переменные окружения перед запуском
echo "🔍 Checking environment variables before starting services..."
echo "DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:0:20}..."
echo "FRONTEND_URL: $FRONTEND_URL"
echo "NODE_ENV: $NODE_ENV"

# Экспортируем переменные явно, чтобы они передались в дочерние процессы
export DATABASE_URL
export NODE_ENV
export FRONTEND_URL
export TELEGRAM_BOT_TOKEN
export TELEGRAM_USE_MINIAPP
export TELEGRAM_POLLING
export NOTIFICATIONS_GRPC_HOST
export NOTIFICATIONS_GRPC_PORT

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
  "pnpm -C backend/iam-subgraph start" \
  "pnpm -C backend/cleaning-subgraph start" \
  "pnpm -C backend/notifications-subgraph start" \
  "pnpm -C backend/gateway-mesh mesh:dev"
