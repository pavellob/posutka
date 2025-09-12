#!/bin/bash

echo "🚀 Запуск Posutka Federation с Hive Gateway..."

# Функция для запуска сервиса в фоне
start_service() {
    local service_name=$1
    local port=$2
    local command=$3
    
    echo "📦 Запуск $service_name на порту $port..."
    cd "apps/$service_name"
    $command &
    local pid=$!
    echo $pid > "../$service_name.pid"
    cd ../..
    
    # Ждем пока сервис запустится
    sleep 2
    echo "✅ $service_name запущен (PID: $pid)"
}

# Функция для остановки всех сервисов
cleanup() {
    echo "🛑 Остановка всех сервисов..."
    for pidfile in apps/*.pid; do
        if [ -f "$pidfile" ]; then
            pid=$(cat "$pidfile")
            kill $pid 2>/dev/null || true
            rm "$pidfile"
        fi
    done
    echo "✅ Все сервисы остановлены"
}

# Устанавливаем обработчик сигналов
trap cleanup EXIT INT TERM

# Проверяем, что все зависимости установлены
echo "📋 Проверка зависимостей..."
pnpm install

# Собираем все проекты
echo "🔨 Сборка проектов..."
pnpm -C apps/inventory-subgraph build
pnpm -C apps/bookings-subgraph build  
pnpm -C apps/ops-subgraph build
pnpm -C apps/billing-subgraph build
pnpm -C apps/identity-subgraph build
pnpm -C apps/listings-subgraph build
pnpm -C apps/legal-subgraph build
pnpm -C apps/ai-subgraph build
pnpm -C apps/hive-gateway build

# Запускаем все сабграфы
start_service "inventory-subgraph" "4001" "pnpm start"
start_service "bookings-subgraph" "4002" "pnpm start"
start_service "ops-subgraph" "4003" "pnpm start"
start_service "billing-subgraph" "4004" "pnpm start"
start_service "identity-subgraph" "4005" "pnpm start"
start_service "listings-subgraph" "4006" "pnpm start"
start_service "legal-subgraph" "4007" "pnpm start"
start_service "ai-subgraph" "4008" "pnpm start"

# Ждем немного, чтобы все сабграфы запустились
echo "⏳ Ожидание запуска сабграфов..."
sleep 5

# Запускаем Hive Gateway
echo "🌐 Запуск Hive Gateway..."
start_service "hive-gateway" "4000" "pnpm start"

echo ""
echo "🎉 Все сервисы запущены!"
echo ""
echo "📊 Доступные эндпоинты:"
echo "   - Hive Gateway: http://localhost:4000/graphql"
echo "   - GraphQL Playground: http://localhost:4000/graphql"
echo ""
echo "🔗 Сабграфы:"
echo "   - Inventory: http://localhost:4001/graphql"
echo "   - Bookings: http://localhost:4002/graphql"
echo "   - Ops: http://localhost:4003/graphql"
echo "   - Billing: http://localhost:4004/graphql"
echo "   - Identity: http://localhost:4005/graphql"
echo "   - Listings: http://localhost:4006/graphql"
echo "   - Legal: http://localhost:4007/graphql"
echo "   - AI: http://localhost:4008/graphql"
echo ""
echo "💡 Нажмите Ctrl+C для остановки всех сервисов"

# Ждем сигнала остановки
wait
