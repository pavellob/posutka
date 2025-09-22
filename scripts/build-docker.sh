#!/bin/bash

# Список всех подграфов
SUBDGRAPHS=(
  "inventory-subgraph"
  "bookings-subgraph"
  "ops-subgraph"
  "billing-subgraph"
  "identity-subgraph"
  "listings-subgraph"
  "legal-subgraph"
  "ai-subgraph"
)

echo "🐳 Сборка Docker образов..."

# Собираем образы для подграфов
for subgraph in "${SUBDGRAPHS[@]}"; do
  echo "📦 Сборка образа для $subgraph..."
  docker build \
    -f Dockerfile.subgraph \
    --build-arg SUBGRAPH_NAME=$subgraph \
    -t posutka-$subgraph:latest \
    .
done

# Собираем образ для gateway
echo "🌐 Сборка образа для gateway..."
docker build \
  -f backend/gateway-mesh/Dockerfile \
  -t posutka-gateway:latest \
  .

echo "✅ Все Docker образы собраны!"
echo ""
echo "📋 Список образов:"
docker images | grep posutka
