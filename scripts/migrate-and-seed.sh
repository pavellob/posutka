#!/bin/sh

echo "🗄️  Запуск миграций Prisma..."

# Отладочная информация
echo "🔍 Текущая директория: $(pwd)"
echo "🔍 Скрипт запущен из: $(dirname "$0")"

# Убеждаемся, что мы находимся в корневой директории проекта
cd "$(dirname "$0")/.." || exit 1

echo "🔍 Перешли в директорию: $(pwd)"

# Проверяем, что директория packages/datalayer-prisma существует
echo "🔍 Проверяем структуру директорий..."
ls -la
echo "🔍 Проверяем packages директорию..."
ls -la packages/ 2>/dev/null || echo "packages директория не найдена"

if [ ! -d "packages/datalayer-prisma" ]; then
  echo "❌ Ошибка: директория packages/datalayer-prisma не найдена в $(pwd)"
  echo "🔍 Содержимое текущей директории:"
  ls -la
  echo "🔍 Поиск datalayer-prisma в файловой системе:"
  find . -name "datalayer-prisma" -type d 2>/dev/null || echo "datalayer-prisma не найден"
  exit 1
fi

echo "✅ Директория packages/datalayer-prisma найдена"

# Ждем подключения к базе данных
echo "⏳ Ожидание подключения к базе данных..."
echo "🔍 Пытаемся перейти в packages/datalayer-prisma..."
cd packages/datalayer-prisma || {
  echo "❌ Не удалось перейти в packages/datalayer-prisma"
  echo "🔍 Текущая директория: $(pwd)"
  echo "🔍 Содержимое packages/:"
  ls -la packages/ || echo "packages/ не существует"
  exit 1
}

echo "✅ Успешно перешли в packages/datalayer-prisma"
echo "🔍 Содержимое datalayer-prisma:"
ls -la

# Теперь выполняем команды Prisma
until pnpm prisma db push --accept-data-loss; do
  echo "⏳ База данных недоступна, ждем..."
  sleep 5
done

# Возвращаемся в корневую директорию
cd ../..
echo "🔍 Вернулись в корневую директорию: $(pwd)"

echo "✅ База данных готова!"

# Запускаем сиды с помощью pnpm
echo "🌱 Запуск сидов с помощью pnpm..."
cd packages/datalayer-prisma && pnpm seed:ts && cd ../..

echo "🎉 Миграции и сиды завершены!"
