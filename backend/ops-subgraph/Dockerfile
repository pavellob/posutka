# Multi-stage build для ops-subgraph
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
COPY backend/ops-subgraph/ ./backend/ops-subgraph/

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Генерируем Prisma клиент
RUN cd packages/datalayer-prisma && pnpm prisma generate

# Генерируем proto файлы и собираем
WORKDIR /app/backend/ops-subgraph
RUN pnpm run generate || echo "Proto generation skipped"
RUN pnpm run build

# Продакшн стадия
FROM node:20-alpine AS production

RUN apk add --no-cache protobuf

WORKDIR /app

# Копируем node_modules и собранные файлы
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/backend/ops-subgraph/dist ./dist
COPY --from=base /app/backend/ops-subgraph/package.json ./
COPY --from=base /app/packages ./packages
COPY --from=base /app/backend/ops-subgraph/src/schema ./src/schema
COPY --from=base /app/backend/ops-subgraph/src/proto ./src/proto
COPY --from=base /app/backend/ops-subgraph/src/generated ./src/generated

# Открываем порты для GraphQL и gRPC
EXPOSE 4003
EXPOSE 4103

# Запускаем приложение
CMD ["node", "dist/server.js"]

