#!/bin/bash

# Скрипт для тестирования настройки Turborepo + Hive + Mesh

echo "🧪 Тестирование настройки Turborepo + Hive + Mesh"
echo "=================================================="

# Проверка наличия .env файла
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден. Скопируйте env.example в .env и заполните переменные Hive."
    exit 1
fi

# Проверка переменных окружения
if [ -z "$HIVE_TOKEN" ] || [ -z "$HIVE_TARGET" ]; then
    echo "❌ Переменные HIVE_TOKEN и HIVE_TARGET не установлены в .env файле."
    exit 1
fi

echo "✅ Переменные окружения настроены"

# Проверка зависимостей
echo "📦 Проверка зависимостей..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm не установлен"
    exit 1
fi

echo "✅ pnpm установлен"

# Проверка структуры проекта
echo "📁 Проверка структуры проекта..."

required_dirs=(
    "apps/ai-subgraph"
    "apps/billing-subgraph"
    "apps/bookings-subgraph"
    "apps/gateway-mesh"
    "apps/identity-subgraph"
    "apps/inventory-subgraph"
    "apps/legal-subgraph"
    "apps/listings-subgraph"
    "apps/ops-subgraph"
)

for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "❌ Директория $dir не найдена"
        exit 1
    fi
done

echo "✅ Все директории сабграфов найдены"

# Проверка package.json файлов
echo "📄 Проверка package.json файлов..."

for dir in "${required_dirs[@]}"; do
    if [ ! -f "$dir/package.json" ]; then
        echo "❌ package.json не найден в $dir"
        exit 1
    fi
done

echo "✅ Все package.json файлы найдены"

# Проверка конфигурации Mesh
if [ ! -f "apps/gateway-mesh/.meshrc.yaml" ]; then
    echo "❌ Конфигурация Mesh не найдена"
    exit 1
fi

echo "✅ Конфигурация Mesh найдена"

# Проверка turbo.json
if [ ! -f "turbo.json" ]; then
    echo "❌ turbo.json не найден"
    exit 1
fi

echo "✅ turbo.json найден"

echo ""
echo "🎉 Все проверки пройдены! Система готова к запуску."
echo ""
echo "Для запуска выполните:"
echo "  pnpm dev"
echo ""
echo "Это запустит:"
echo "  1. Все сабграфы на портах 4001-4009"
echo "  2. Сборку supergraph с помощью hive dev"
echo "  3. GraphQL Mesh гейтвей на порту 4000"
echo ""
echo "Гейтвей будет доступен по адресу: http://localhost:4000/graphql"
