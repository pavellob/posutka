# Multi-stage build для bookings-subgraph
FROM node:20-alpine AS base

# Устанавливаем pnpm и protoc
RUN npm install -g pnpm
RUN apk add --no-cache protobuf

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы конфигурации
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Копируем все пакеты
COPY packages/ ./packages/
COPY backend/bookings-subgraph/ ./backend/bookings-subgraph/

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Генерируем Prisma клиент
RUN cd packages/datalayer-prisma && pnpm prisma generate

# Собираем приложение
WORKDIR /app/backend/bookings-subgraph
RUN pnpm run generate || echo "No proto files to generate"
RUN pnpm run build

# Продакшн стадия
FROM node:20-alpine AS production

RUN apk add --no-cache protobuf

WORKDIR /app

# Копируем node_modules и собранные файлы
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/backend/bookings-subgraph/dist ./dist
COPY --from=base /app/backend/bookings-subgraph/package.json ./
COPY --from=base /app/packages ./packages
COPY --from=base /app/backend/bookings-subgraph/src/schema ./src/schema

# Открываем порты для GraphQL и gRPC
EXPOSE 4002
EXPOSE 4102

# Запускаем приложение
CMD ["node", "dist/server.js"]

