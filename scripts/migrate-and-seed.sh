#!/bin/sh

echo "🗄️  Запуск миграций Prisma..."

# Отладочная информация
echo "🔍 Текущая директория: $(pwd)"
echo "🔍 Скрипт запущен из: $(dirname "$0")"

# Убеждаемся, что мы находимся в корневой директории проекта
cd "$(dirname "$0")/.." || exit 1

echo "🔍 Перешли в директорию: $(pwd)"

# Проверяем, что директория packages/datalayer-prisma существует
if [ ! -d "packages/datalayer-prisma" ]; then
  echo "❌ Ошибка: директория packages/datalayer-prisma не найдена в $(pwd)"
  ls -la
  exit 1
fi

# Ждем подключения к базе данных
echo "⏳ Ожидание подключения к базе данных..."
until cd packages/datalayer-prisma && pnpm prisma db push --accept-data-loss && cd ../..; do
  echo "⏳ База данных недоступна, ждем..."
  sleep 5
done

echo "✅ База данных готова!"

# Запускаем сиды с помощью pnpm
echo "🌱 Запуск сидов с помощью pnpm..."
cd packages/datalayer-prisma && pnpm seed:ts && cd ../..

echo "🎉 Миграции и сиды завершены!"
