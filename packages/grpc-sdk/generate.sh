#!/bin/bash

# Создаем директорию для генерации
mkdir -p src/generated

# Ищем google-proto-files в разных местах
PROTO_PATHS=""
if [ -d "node_modules/google-proto-files" ]; then
    PROTO_PATHS="--proto_path=node_modules/google-proto-files"
elif [ -d "../../node_modules/google-proto-files" ]; then
    PROTO_PATHS="--proto_path=../../node_modules/google-proto-files"
elif [ -d "/app/node_modules/google-proto-files" ]; then
    PROTO_PATHS="--proto_path=/app/node_modules/google-proto-files"
else
    echo "❌ google-proto-files не найден"
    echo "🔍 Поиск в текущей директории: $(pwd)"
    echo "🔍 Содержимое node_modules:"
    ls -la node_modules/ 2>/dev/null || echo "node_modules не найден"
    echo "🔍 Поиск google-proto-files:"
    find . -name "google-proto-files" -type d 2>/dev/null || echo "google-proto-files не найден"
    exit 1
fi

echo "✅ Найден google-proto-files: $PROTO_PATHS"

# Запускаем protoc
protoc \
  --ts_proto_out=src/generated \
  --ts_proto_opt=config=ts-proto.config.json \
  --proto_path=src/proto \
  $PROTO_PATHS \
  src/proto/*.proto
