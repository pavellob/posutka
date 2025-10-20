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

# Запускаем подграфы через turbo (правильно передает env vars)
echo "📦 Запуск подграфов..."
pnpm start:subgraphs &

# Ждем готовности подграфов
echo "⏳ Ожидание готовности подграфов..."
./scripts/wait-for-subgraphs.sh

if [ $? -eq 0 ]; then
    echo "✅ Подграфы готовы!"
    
    # Собираем суперграф
    echo "🔧 Сборка суперграфа..."
    pnpm mesh:compose
    
    if [ $? -eq 0 ]; then
        echo "✅ Суперграф собран!"
        
        # Запускаем gateway
        echo "🌐 Запуск Gateway..."
        pnpm start:gateway
    else
        echo "❌ Ошибка при сборке суперграфа"
        exit 1
    fi
else
    echo "❌ Подграфы не готовы"
    exit 1
fi
