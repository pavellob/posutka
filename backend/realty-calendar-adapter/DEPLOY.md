# 🚀 Деплой Realty Calendar Adapter

## 📋 Обзор

Realty Calendar Adapter - это отдельный микросервис, который обрабатывает webhooks от RealtyCalendar и интегрируется с bookings-subgraph и inventory-subgraph через gRPC.

## 🐳 Docker

### Локальная сборка

```bash
docker build -f backend/realty-calendar-adapter/Dockerfile -t realty-calendar-adapter .
```

### Запуск локально

```bash
docker run -p 4201:4201 \
  -e REALTY_CALENDAR_ADAPTER_PORT=4201 \
  -e REALTY_CALENDAR_DEFAULT_ORG_ID=petroga \
  -e BOOKINGS_GRPC_HOST=localhost \
  -e BOOKINGS_GRPC_PORT=4102 \
  -e INVENTORY_GRPC_HOST=localhost \
  -e INVENTORY_GRPC_PORT=4101 \
  realty-calendar-adapter
```

## ☁️ Northflank

### Конфигурация

Сервис уже добавлен в `northflank.yml` как отдельный сервис `realty-calendar-adapter`.

### Переменные окружения

Все переменные окружения должны быть установлены в Northflank Dashboard:

#### Обязательные переменные:
- `REALTY_CALENDAR_ADAPTER_PORT=4201` - порт сервиса
- `REALTY_CALENDAR_DEFAULT_ORG_ID=petroga` - ID организации по умолчанию
- `BOOKINGS_GRPC_HOST=posutka-federation` - хост bookings-subgraph (внутренний DNS)
- `BOOKINGS_GRPC_PORT=4102` - порт bookings gRPC
- `INVENTORY_GRPC_HOST=posutka-federation` - хост inventory-subgraph (внутренний DNS)
- `INVENTORY_GRPC_PORT=4101` - порт inventory gRPC

#### Опциональные переменные:
- `GRPC_TIMEOUT=5000` - таймаут gRPC запросов (мс)
- `GRPC_RETRY_ATTEMPTS=3` - количество попыток повтора
- `GRPC_RETRY_DELAY=1000` - задержка между попытками (мс)

### Health Check

Сервис предоставляет health check endpoint:
- `GET /health` - возвращает `{ status: 'ok' }`

### Webhook Endpoint

- `POST /webhooks/realty-calendar` - основной endpoint для получения webhooks от RealtyCalendar

### Деплой

1. Убедитесь, что `northflank.yml` обновлен
2. В Northflank Dashboard:
   - Перейдите в проект
   - Убедитесь, что сервис `realty-calendar-adapter` виден
   - Проверьте переменные окружения
   - Убедитесь, что `BOOKINGS_GRPC_HOST` и `INVENTORY_GRPC_HOST` указывают на правильный внутренний адрес (обычно `posutka-federation`)
3. Задеплойте сервис

### Проверка работы

После деплоя проверьте:
1. Health check: `curl https://your-domain.northflank.io/health`
2. Логи сервиса в Northflank Dashboard
3. Webhook endpoint доступен для RealtyCalendar

## 🔗 Интеграция с RealtyCalendar

После деплоя настройте webhook в RealtyCalendar:
- URL: `https://your-domain.northflank.io/webhooks/realty-calendar`
- Method: `POST`
- Content-Type: `application/json`

## 📝 Примечания

- Сервис работает независимо от основного federation контейнера
- gRPC клиенты подключаются к другим сервисам через внутренний DNS Northflank
- Если сервисы находятся в разных namespace, может потребоваться настройка service discovery

