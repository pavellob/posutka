#!/bin/bash

# Скрипт для запуска всех субграфов одновременно
# Используется для тестирования объединенной схемы в Hive

echo "🚀 Запуск всех GraphQL субграфов..."

# Функция для запуска субграфа в фоне
start_subgraph() {
    local name=$1
    local port=$2
    local script=$3
    
    echo "📡 Запуск $name на порту $port..."
    cd "apps/$name" && pnpm run dev &
    local pid=$!
    echo "✅ $name запущен (PID: $pid) на порту $port"
    echo $pid >> ../subgraph_pids.txt
    cd ../..
}

# Очистка файла с PID'ами
rm -f subgraph_pids.txt

# Запуск всех субграфов
start_subgraph "ai-subgraph" "4008" "dev"
start_subgraph "identity-subgraph" "4005" "dev"
start_subgraph "inventory-subgraph" "4001" "dev"
start_subgraph "listings-subgraph" "4002" "dev"
start_subgraph "bookings-subgraph" "4003" "dev"
start_subgraph "ops-subgraph" "4004" "dev"
start_subgraph "billing-subgraph" "4006" "dev"
start_subgraph "legal-subgraph" "4007" "dev"

echo ""
echo "🎉 Все субграфы запущены!"
echo ""
echo "📋 Список запущенных субграфов:"
echo "  • AI Subgraph:        http://localhost:4008/graphql"
echo "  • Identity Subgraph:  http://localhost:4005/graphql"
echo "  • Inventory Subgraph: http://localhost:4001/graphql"
echo "  • Listings Subgraph:  http://localhost:4002/graphql"
echo "  • Bookings Subgraph:  http://localhost:4003/graphql"
echo "  • Ops Subgraph:       http://localhost:4004/graphql"
echo "  • Billing Subgraph:   http://localhost:4006/graphql"
echo "  • Legal Subgraph:     http://localhost:4007/graphql"
echo ""
echo "🔧 Для остановки всех субграфов выполните:"
echo "   ./stop-all-subgraphs.sh"
echo ""
echo "📖 Подробная инструкция по настройке Hive:"
echo "   cat HIVE_SETUP.md"
