#!/bin/bash

echo "🏗️  Сборка продакшн версии..."

# Устанавливаем зависимости
echo "📦 Установка зависимостей..."
pnpm install --frozen-lockfile

# Генерируем Prisma клиент
echo "🗄️  Генерация Prisma клиента..."
pnpm generate

# Собираем все приложения
echo "🔨 Сборка приложений..."
pnpm build

# Собираем суперграф
echo "🔧 Сборка суперграфа..."
pnpm mesh:compose

echo "✅ Продакшн сборка завершена!"
