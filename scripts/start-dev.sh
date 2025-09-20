#!/bin/bash

echo "🚀 Запуск всех сервисов..."

# Запускаем подграфы в фоне
echo "📦 Запуск подграфов..."
pnpm start:subgraphs &
SUBDGRAPHS_PID=$!

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
    echo "🌐 Запуск gateway..."
    pnpm start:gateway
  else
    echo "❌ Ошибка при сборке суперграфа"
    kill $SUBDGRAPHS_PID 2>/dev/null
    exit 1
  fi
else
  echo "❌ Подграфы не готовы"
  kill $SUBDGRAPHS_PID 2>/dev/null
  exit 1
fi
