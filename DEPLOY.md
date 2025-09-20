# Деплой Posutka GraphQL Federation на Northflank

## 🚀 Быстрый старт

### Локальная разработка

```bash
# Установка зависимостей
pnpm install

# Запуск в режиме разработки
pnpm start:dev

# Или пошагово:
pnpm start:subgraphs  # Запуск подграфов
pnpm wait:subgraphs    # Ожидание готовности
pnpm mesh:compose      # Сборка суперграфа
pnpm start:gateway     # Запуск gateway
```

### Продакшн сборка

```bash
# Сборка продакшн версии
pnpm build:prod

# Сборка Docker образа
pnpm build:docker

# Тестирование Docker образа
pnpm build:test
```

## 🐳 Docker

### Сборка образа

```bash
docker build -t posutka-federation:latest .
```

### Запуск контейнера

```bash
docker run -d \
  --name posutka-federation \
  -p 4001:4001 \
  -p 4002:4002 \
  -p 4003:4003 \
  -p 4004:4004 \
  -p 4005:4005 \
  -p 4006:4006 \
  -p 4007:4007 \
  -p 4008:4008 \
  -p 4009:4009 \
  posutka-federation:latest
```

### Проверка работы

```bash
# Gateway (основной endpoint)
curl http://localhost:4009/graphql

# Подграфы
curl http://localhost:4001/graphql  # Inventory
curl http://localhost:4002/graphql  # Bookings
# ... и т.д.
```

## ☁️ Northflank

### Конфигурация

Файл `northflank.yml` содержит конфигурацию для деплоя на Northflank.

### Переменные окружения

Установите следующие секреты в Northflank:

- `database-url` - URL подключения к базе данных

### Деплой

1. Подключите репозиторий к Northflank
2. Убедитесь, что секреты настроены
3. Запустите деплой

### Мониторинг

- **Gateway**: `https://your-app.northflank.app/graphql`
- **Подграфы**: `https://your-app.northflank.app:4001-4008/graphql`

## 📊 Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Gateway (4009)                       │
│              GraphQL Federation Gateway                 │
└─────────────────┬───────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐ ┌───────▼───────┐ ┌───▼───┐
│ 4001  │ │     4002      │ │ 4003  │
│Inventory│ │  Bookings    │ │  Ops  │
└───────┘ └───────────────┘ └───────┘
    │             │             │
┌───▼───┐ ┌───────▼───────┐ ┌───▼───┐
│ 4004  │ │     4005      │ │ 4006  │
│Billing │ │  Identity     │ │Listings│
└───────┘ └───────────────┘ └───────┘
    │             │             │
┌───▼───┐ ┌───────▼───────┐
│ 4007  │ │     4008      │
│ Legal │ │      AI       │
└───────┘ └───────────────┘
```

## 🔧 Troubleshooting

### Проблемы с запуском

1. **Подграфы не запускаются**: Проверьте логи контейнера
2. **Gateway не отвечает**: Убедитесь, что все подграфы готовы
3. **Ошибки сборки**: Проверьте зависимости и Prisma схему

### Логи

```bash
# Просмотр логов контейнера
docker logs posutka-federation

# Следить за логами в реальном времени
docker logs -f posutka-federation
```

### Очистка

```bash
# Остановка и удаление контейнера
docker stop posutka-federation
docker rm posutka-federation

# Удаление образа
docker rmi posutka-federation:latest
```
