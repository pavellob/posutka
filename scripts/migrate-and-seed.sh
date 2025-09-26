#!/bin/sh

echo "🗄️  Запуск миграций Prisma..."

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
