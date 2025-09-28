FROM node:18-alpine

# Устанавливаем pnpm и необходимые пакеты
RUN npm install -g pnpm
RUN apk add --no-cache curl openssl

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

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Генерируем Prisma клиент
RUN pnpm generate

# Собираем все приложения
RUN pnpm build

# Делаем скрипты исполняемыми
RUN chmod +x ./scripts/migrate-and-seed.sh
RUN chmod +x ./docker-entrypoint.sh
RUN chmod +x ./scripts/wait-for-subgraphs.sh

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

# Открываем порты
EXPOSE 4001 4002 4003 4004 4005 4006 4007 4008 4000

# Запускаем скрипт
CMD ["./start.sh"]