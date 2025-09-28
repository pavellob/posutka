# Multi-stage build для всего приложения
FROM node:18-alpine AS base

# Устанавливаем pnpm
RUN npm install -g pnpm

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

# Добавляем cache-busting для скриптов
RUN echo "Scripts updated: $(date)" > /tmp/scripts-version

# Отладочная информация о структуре директорий
RUN echo "=== Docker Build Debug Info ===" && \
    echo "Current directory: $(pwd)" && \
    echo "Directory contents:" && \
    ls -la && \
    echo "Packages directory:" && \
    ls -la packages/ && \
    echo "Datalayer-prisma directory:" && \
    ls -la packages/datalayer-prisma/ && \
    echo "=== End Debug Info ==="

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Генерируем Prisma клиент
RUN pnpm generate

# Собираем все приложения
RUN pnpm build

# Продакшн стадия
FROM node:18-alpine AS production

WORKDIR /app

# Устанавливаем необходимые пакеты
RUN apk add --no-cache curl openssl

# Устанавливаем pnpm в продакшн образе
RUN npm install -g pnpm

# Копируем весь app из базовой стадии
COPY --from=base /app ./

# Устанавливаем зависимости для создания симлинков workspace пакетов
RUN pnpm install --frozen-lockfile

# Добавляем cache-busting для продакшн стадии
RUN echo "Production scripts updated: $(date)" > /tmp/prod-scripts-version

# Отладочная информация для продакшн стадии
RUN echo "=== Production Build Debug Info ===" && \
    echo "Current directory: $(pwd)" && \
    echo "Directory contents:" && \
    ls -la && \
    echo "Packages directory:" && \
    ls -la packages/ && \
    echo "Datalayer-prisma directory:" && \
    ls -la packages/datalayer-prisma/ && \
    echo "=== End Production Debug Info ==="

# Делаем скрипты исполняемыми
RUN chmod +x ./scripts/migrate-and-seed.sh
RUN chmod +x ./docker-entrypoint.sh

# Создаем простой скрипт запуска
COPY <<EOF ./start.sh
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

if [ \$? -eq 0 ]; then
    echo "✅ Подграфы готовы!"
    
    # Собираем суперграф
    echo "🔧 Сборка суперграфа..."
    pnpm mesh:compose
    
    if [ \$? -eq 0 ]; then
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

# Делаем скрипты исполняемыми
RUN chmod +x ./start.sh
RUN chmod +x ./scripts/wait-for-subgraphs.sh

# Открываем порты
EXPOSE 4001 4002 4003 4004 4005 4006 4007 4008 4000

# Запускаем скрипт
CMD ["./start.sh"]