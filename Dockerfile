FROM node:20-alpine

# Устанавливаем pnpm, protoc и необходимые пакеты
RUN npm install -g pnpm
RUN apk add --no-cache curl openssl protobuf

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы конфигурации
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY tsconfig.base.json ./
COPY base-schema.gql ./

# Копируем все пакеты, приложения и скрипты
COPY packages/ ./packages/
COPY backend/ ./backend/
COPY scripts/ ./scripts/
COPY docker-entrypoint.sh ./

# Делаем скрипты исполняемыми
RUN chmod +x ./scripts/migrate-and-seed.sh
RUN chmod +x ./docker-entrypoint.sh
RUN chmod +x ./scripts/wait-for-subgraphs.sh

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Генерируем Prisma клиент
RUN pnpm generate

# Собираем все приложения
RUN pnpm build

# Создаем простой скрипт запуска
RUN cat > ./start.sh << 'EOF'
#!/bin/sh

echo "🚀 Запуск Posutka GraphQL Federation..."

# Сначала выполняем миграции и сиды
echo "📊 Подготовка базы данных..."
./scripts/migrate-and-seed.sh

# Запускаем подграфы в фоне
echo "📦 Запуск подграфов..."
pnpm start:subgraphs &

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
        echo "🌐 Запуск Gateway..."
        pnpm start:gateway
    else
        echo "❌ Ошибка при сборке суперграфа"
        exit 1
    fi
else
    echo "❌ Подграфы не готовы"
    exit 1
fi
EOF

# Делаем скрипт запуска исполняемым
RUN chmod +x ./start.sh

# Открываем порты (GraphQL и gRPC)
# Gateway
EXPOSE 4000  
# Inventory Subgraph (GraphQL)
EXPOSE 4001  
# Bookings Subgraph (GraphQL)
EXPOSE 4002  
# Bookings Subgraph (gRPC)
EXPOSE 4102  
# Ops Subgraph (GraphQL)
EXPOSE 4003  
# Ops Subgraph (gRPC)
EXPOSE 4103  
# Billing Subgraph (GraphQL)
EXPOSE 4004  
# Identity Subgraph (GraphQL)
EXPOSE 4005  
# Listings Subgraph (GraphQL)
EXPOSE 4006  
# Legal Subgraph (GraphQL)
EXPOSE 4007  
# AI Subgraph (GraphQL)
EXPOSE 4008  

# Запускаем скрипт
CMD ["./start.sh"]