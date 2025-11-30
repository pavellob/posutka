# Multi-stage build для realty-calendar-adapter
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
COPY backend/realty-calendar-adapter/ ./backend/realty-calendar-adapter/

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Генерируем Prisma клиент (если нужен)
RUN cd packages/datalayer-prisma && pnpm prisma generate || echo "Prisma generate skipped"

# Собираем grpc-sdk (если нужен)
RUN cd packages/grpc-sdk && pnpm build || echo "grpc-sdk build skipped"

# Собираем приложение
WORKDIR /app/backend/realty-calendar-adapter
RUN pnpm run build

# Продакшн стадия
FROM node:20-alpine AS production

RUN apk add --no-cache protobuf

WORKDIR /app

# Копируем node_modules и собранные файлы
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/backend/realty-calendar-adapter/dist ./dist
COPY --from=base /app/backend/realty-calendar-adapter/package.json ./
COPY --from=base /app/packages ./packages

# Открываем порт
EXPOSE 4201

# Запускаем приложение
CMD ["node", "dist/main.js"]

