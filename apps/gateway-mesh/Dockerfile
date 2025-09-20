# Multi-stage build для gateway-mesh
FROM node:18-alpine AS base

# Устанавливаем pnpm
RUN npm install -g pnpm

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы конфигурации
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Копируем все пакеты
COPY packages/ ./packages/
COPY apps/gateway-mesh/ ./apps/gateway-mesh/
COPY base-schema.gql ./

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Собираем суперграф
RUN pnpm mesh:compose

# Продакшн стадия
FROM node:18-alpine AS production

WORKDIR /app

# Копируем только необходимые файлы
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/gateway-mesh/package.json ./
COPY --from=base /app/apps/gateway-mesh/supergraph.graphql ./

# Устанавливаем только продакшн зависимости
RUN npm install --only=production

# Открываем порт
EXPOSE 4009

# Запускаем gateway
CMD ["npx", "hive-gateway", "supergraph"]
