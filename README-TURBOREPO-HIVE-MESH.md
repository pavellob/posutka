# Turborepo + Hive CLI + GraphQL Mesh Architecture

Эта архитектура позволяет запускать все сабграфы через Turborepo, автоматически собирать supergraph с помощью Hive CLI и поднимать GraphQL Mesh гейтвей.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
pnpm install
```

### 2. Настройка Hive

Скопируйте `env.example` в `.env` и заполните ваши данные Hive:

```bash
cp env.example .env
```

Отредактируйте `.env`:
```bash
HIVE_TOKEN=your_hive_token_here
HIVE_TARGET=your_org/your_project/your_target
```

### 3. Запуск всей системы

```bash
pnpm dev
```

Эта команда:
1. Запустит все сабграфы на портах 4001-4009
2. Соберет supergraph с помощью `hive dev`
3. Запустит GraphQL Mesh гейтвей на порту 4000

## 📁 Структура проекта

```
apps/
├── ai-subgraph/          # Порт 4009
├── billing-subgraph/     # Порт 4005
├── bookings-subgraph/    # Порт 4002
├── gateway-mesh/         # Порт 4000 (гейтвей)
├── identity-subgraph/    # Порт 4006
├── inventory-subgraph/   # Порт 4001
├── legal-subgraph/       # Порт 4008
├── listings-subgraph/    # Порт 4007
└── ops-subgraph/         # Порт 4003
```

## 🔧 Команды

### Основные команды

- `pnpm dev` - Запуск всей системы (сабграфы + supergraph + гейтвей)
- `pnpm build` - Сборка всех пакетов
- `pnpm test` - Запуск тестов

### Команды для сабграфов

Каждый сабграф имеет единые скрипты:

```bash
# В любом сабграфе
pnpm dev              # Сборка + запуск в dev режиме
pnpm build            # Сборка TypeScript
pnpm start            # Запуск в production режиме
pnpm schema:publish   # Публикация схемы в Hive
```

### Команды для гейтвея

```bash
# В apps/gateway-mesh
pnpm compose          # Сборка supergraph с помощью hive dev
pnpm gateway          # Запуск GraphQL Mesh гейтвея
pnpm mesh:dev         # Запуск Mesh в dev режиме
pnpm mesh:build       # Сборка Mesh
pnpm mesh:start       # Запуск Mesh в production режиме
```

## 🔄 Как это работает

### Turborepo Pipeline

1. **dev** (в сабграфах) → Сборка и запуск сабграфов
2. **compose** (в gateway-mesh) → Сборка supergraph с `hive dev`
3. **gateway** (в gateway-mesh) → Запуск GraphQL Mesh гейтвея

### Hive CLI

- `hive dev` скачивает схемы из реестра Hive
- Подменяет локальные сабграфы по `--service/--url`
- Создает файл `supergraph.graphql` в `apps/gateway-mesh/`
- Обновляет файл в режиме `--watch`

### GraphQL Mesh

- Читает `supergraph.graphql` из файла
- Подключается к локальным сабграфам по указанным эндпоинтам
- Предоставляет единый GraphQL API на порту 4000

## 🌐 Эндпоинты

- **Гейтвей**: http://localhost:4000/graphql
- **Inventory**: http://localhost:4001/graphql
- **Bookings**: http://localhost:4002/graphql
- **Ops**: http://localhost:4003/graphql
- **Billing**: http://localhost:4005/graphql
- **Identity**: http://localhost:4006/graphql
- **Listings**: http://localhost:4007/graphql
- **Legal**: http://localhost:4008/graphql
- **AI**: http://localhost:4009/graphql

## 🔧 Настройка

### Изменение портов

Если нужно изменить порты сабграфов:

1. Обновите `server.ts` в каждом сабграфе
2. Обновите `.meshrc.yaml` в `apps/gateway-mesh/`
3. Обновите `compose` скрипт в `apps/gateway-mesh/package.json`

### Добавление нового сабграфа

1. Создайте новый сабграф в `apps/`
2. Добавьте его в `.meshrc.yaml`
3. Добавьте в `compose` скрипт
4. Обновите `turbo.json` если нужно

## 🐛 Отладка

### Проверка статуса сабграфов

```bash
# Проверить, что все сабграфы запущены
curl http://localhost:4001/graphql
curl http://localhost:4002/graphql
# ... и т.д.
```

### Проверка supergraph

```bash
# Проверить, что файл supergraph.graphql создан
ls -la apps/gateway-mesh/supergraph.graphql
```

### Проверка гейтвея

```bash
# Проверить, что гейтвей отвечает
curl http://localhost:4000/graphql
```

## 📚 Дополнительные ресурсы

- [Hive CLI Documentation](https://the-guild.dev/graphql/hive/docs/api-reference/cli)
- [GraphQL Mesh Documentation](https://the-guild.dev/graphql/mesh/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)
