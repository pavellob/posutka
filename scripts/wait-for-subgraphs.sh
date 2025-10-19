#!/bin/sh

# Список URL подграфов для проверки
SUBDGRAPHS="http://localhost:4001/graphql http://localhost:4002/graphql http://localhost:4003/graphql http://localhost:4004/graphql http://localhost:4005/graphql http://localhost:4006/graphql http://localhost:4007/graphql http://localhost:4008/graphql http://localhost:4009/graphql http://localhost:4010/graphql http://localhost:4011/graphql"

echo "⏳ Ожидание готовности подграфов..."

# Функция для проверки доступности подграфа
check_subgraph() {
  url=$1
  max_attempts=30
  attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    if curl -s -f "$url" -X POST -H "Content-Type: application/json" -d '{"query":"{ __schema { types { name } } }"}' > /dev/null 2>&1; then
      echo "✅ Подграф готов: $url"
      return 0
    fi
    
    echo "⏳ Попытка $attempt/$max_attempts для $url..."
    sleep 2
    attempt=$((attempt + 1))
  done
  
  echo "❌ Подграф не готов: $url"
  return 1
}

# Проверяем все подграфы
for subgraph in $SUBDGRAPHS; do
  if ! check_subgraph "$subgraph"; then
    echo "❌ Не все подграфы готовы. Выход."
    exit 1
  fi
done

echo "🎉 Все подграфы готовы!"
exit 0
