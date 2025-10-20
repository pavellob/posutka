#!/bin/sh

echo "🗄️  Запуск миграций Prisma..."

# Отладочная информация
echo "🔍 Текущая директория: $(pwd)"
echo "🔍 Скрипт запущен из: $(dirname "$0")"

# Убеждаемся, что мы находимся в корневой директории проекта
if [ "$(dirname "$0")" = "/app/scripts" ]; then
  # Если скрипт находится в /app/scripts, то переходим в /app
  cd /app || exit 1
else
  # Иначе переходим в директорию проекта
  cd "$(dirname "$0")/.." || exit 1
fi

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

# Проверяем DATABASE_URL
echo "🔍 Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  exit 1
else
  echo "✅ DATABASE_URL is set: ${DATABASE_URL:0:30}..."
fi

# Теперь выполняем команды Prisma с явной передачей DATABASE_URL
until DATABASE_URL="$DATABASE_URL" pnpm prisma db push --accept-data-loss; do
  echo "⏳ База данных недоступна, ждем..."
  sleep 5
done

echo "✅ Миграции выполнены!"

# Сиды отключены для production деплоя
# Для локальной разработки запускайте вручную: pnpm seed:ts
echo "ℹ️  Сиды отключены. Запустите вручную при необходимости: pnpm seed:ts"

# Возвращаемся в корневую директорию
cd ../..
echo "🔍 Вернулись в корневую директорию: $(pwd)"

echo "✅ База данных готова!"

echo "🎉 Миграции завершены!"
