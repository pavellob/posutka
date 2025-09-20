# Multi-stage build для inventory-subgraph
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
COPY apps/inventory-subgraph/ ./apps/inventory-subgraph/

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Генерируем Prisma клиент
RUN pnpm generate

# Собираем приложение
RUN pnpm build --filter=inventory-subgraph

# Продакшн стадия
FROM node:18-alpine AS production

WORKDIR /app

# Копируем только необходимые файлы
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/inventory-subgraph/dist ./dist
COPY --from=base /app/apps/inventory-subgraph/package.json ./
COPY --from=base /app/packages ./packages

# Устанавливаем только продакшн зависимости
RUN npm install --only=production

# Открываем порт
EXPOSE 4001

# Запускаем приложение
CMD ["node", "dist/apps/inventory-subgraph/src/server.js"]
