# ✅ Опциональные провайдеры уведомлений

## Проблема

Раньше, если хоть один провайдер не мог инициализироваться (например, порт 4020 для WebSocket был занят), **весь сервис падал** при запуске:

```
[websocket-provider] Failed to initialize WebSocket server: EADDRINUSE
💥 ВЕСЬ СЕРВИС УПАЛ
```

## Решение

Теперь провайдеры работают по принципу **graceful degradation**:

- ✅ **WebSocket** - опциональный (если не запустился - продолжаем без него)
- ✅ **Telegram** - важный (если не запустился - логируем, но пытаемся работать)
- ⚠️ **Если ВСЕ провайдеры упали** - только тогда сервис не запускается

---

## Как это работает

### 1. WebSocketProvider (опциональный)

**Старое поведение:**
```typescript
async initialize(): Promise<void> {
  try {
    this.wss = new WebSocketServer({ port: this.port });
    // ...
  } catch (error) {
    logger.error('Failed to initialize WebSocket server:', error);
    throw error; // ← Падает весь сервис! 💥
  }
}
```

**Новое поведение:**
```typescript
async initialize(): Promise<void> {
  try {
    this.wss = new WebSocketServer({ port: this.port });
    logger.info(`✅ WebSocket server running on port ${this.port}`);
    await super.initialize();
  } catch (error) {
    // ⚠️ WebSocket - опциональный провайдер
    logger.warn(`⚠️ WebSocket server failed to start on port ${this.port}:`, error.message);
    logger.warn('⚠️ Notifications service will continue without WebSocket support');
    logger.warn('💡 Real-time notifications via WebSocket will NOT be available');
    
    // НЕ бросаем ошибку - позволяем сервису работать без WebSocket
    this.initialized = false;
  }
}
```

### 2. ProviderManager

**Старое поведение:**
```typescript
async initialize(): Promise<void> {
  const initPromises = providers.map(async (provider) => {
    try {
      await provider.initialize();
    } catch (error) {
      logger.error(`Failed to initialize provider ${provider.name}:`, error);
      throw error; // ← Падает весь менеджер! 💥
    }
  });
  
  await Promise.all(initPromises);
}
```

**Новое поведение:**
```typescript
async initialize(): Promise<void> {
  let successCount = 0;
  let failedCount = 0;
  
  const initPromises = providers.map(async (provider) => {
    try {
      await provider.initialize();
      logger.info(`✅ Provider ${provider.name} initialized successfully`);
      successCount++;
    } catch (error) {
      // Логируем, но продолжаем
      logger.warn(`⚠️ Provider ${provider.name} failed to initialize:`, error.message);
      failedCount++;
    }
  });
  
  await Promise.all(initPromises);
  
  if (successCount > 0) {
    logger.info(`✅ Provider initialization complete: ${successCount} successful, ${failedCount} failed`);
  } else {
    // Только если ВСЕ провайдеры упали
    throw new Error('No providers available - cannot start notifications service');
  }
}
```

### 3. Проверка при отправке

Перед отправкой уведомления проверяется, инициализирован ли провайдер:

```typescript
async sendNotification(message, channels) {
  for (const channel of channels) {
    const provider = this.providers.get(channel);
    
    // Проверяем инициализацию
    if (!provider.initialized) {
      results.set(channel, {
        success: false,
        error: `Provider ${provider.name} is not initialized`,
      });
      continue; // Пропускаем этот канал
    }
    
    // Отправляем через доступные каналы
    const result = await provider.send(message);
    results.set(channel, result);
  }
}
```

---

## Примеры использования

### Сценарий 1: WebSocket порт занят

```bash
# Порт 4020 занят другим процессом
lsof -i :4020
# COMMAND  PID  USER
# node     1234 user

# Запускаем notifications-subgraph
pnpm dev
```

**Логи:**
```
[notifications-subgraph] Initializing notification providers...
[telegram-provider] ✅ Telegram Bot initialized successfully
[websocket-provider] Initializing WebSocket server on port 4020...
[websocket-provider] ⚠️ WebSocket server failed to start on port 4020: listen EADDRINUSE
[websocket-provider] ⚠️ Notifications service will continue without WebSocket support
[websocket-provider] 💡 Real-time notifications via WebSocket will NOT be available
[provider-manager] ✅ Provider initialization complete: 1 successful, 1 failed
[provider-manager] ⚠️ Some providers failed to initialize, but service will continue with available providers
[notifications-subgraph] ✅ All providers initialized successfully
[notifications-subgraph] 🚀 Notifications Subgraph GraphQL server ready at http://localhost:4011/graphql
[notifications-grpc-transport] ✅ Notifications GRPC server started on localhost:4111
```

**Результат:**
- ✅ Telegram работает
- ❌ WebSocket НЕ работает
- ✅ gRPC работает
- ✅ GraphQL работает
- ✅ **Сервис запустился!**

### Сценарий 2: Telegram токен неверный

```env
TELEGRAM_BOT_TOKEN=invalid_token
```

**Логи:**
```
[notifications-subgraph] Initializing notification providers...
[telegram-provider] Failed to initialize Telegram bot: 401 Unauthorized
[provider-manager] ⚠️ Provider Telegram failed to initialize: 401 Unauthorized
[websocket-provider] ✅ WebSocket server running on port 4020
[provider-manager] ✅ Provider initialization complete: 1 successful, 1 failed
[notifications-subgraph] ✅ All providers initialized successfully
```

**Результат:**
- ❌ Telegram НЕ работает
- ✅ WebSocket работает
- ✅ **Сервис запустился!**

### Сценарий 3: Все провайдеры упали

```bash
# WebSocket порт занят + неверный Telegram токен
```

**Логи:**
```
[notifications-subgraph] Initializing notification providers...
[telegram-provider] Failed to initialize Telegram bot: 401 Unauthorized
[provider-manager] ⚠️ Provider Telegram failed to initialize
[websocket-provider] ⚠️ WebSocket server failed to start on port 4020
[provider-manager] ⚠️ Provider WebSocket failed to initialize
[provider-manager] ❌ All providers failed to initialize!
💥 Error: No providers available - cannot start notifications service
```

**Результат:**
- ❌ **Сервис НЕ запустился** (нет ни одного рабочего провайдера)

---

## Отправка уведомлений

При отправке через несколько каналов, часть может работать, часть - нет:

```typescript
// Отправляем через Telegram и WebSocket
await grpcClient.sendNotification({
  recipientIds: ['123456789'],
  channels: [
    NotificationChannel.CHANNEL_TELEGRAM,    // ✅ Работает
    NotificationChannel.CHANNEL_WEBSOCKET     // ❌ Не инициализирован
  ],
  title: 'Test',
  message: 'Test message'
});
```

**Результат:**
```json
{
  "notificationId": "notif_123",
  "status": "sent",           // ← Хотя бы один канал сработал
  "sentCount": 1,             // ← Telegram сработал
  "failedCount": 1            // ← WebSocket не сработал
}
```

**В БД:**
```sql
SELECT * FROM "NotificationDelivery" WHERE "notificationId" = 'notif_123';

-- channel    | status  | error
-- TELEGRAM   | SENT    | null
-- WEBSOCKET  | FAILED  | 'Provider WebSocket is not initialized'
```

---

## Мониторинг

### GraphQL Query для проверки провайдеров

```graphql
query {
  providerStats {
    channel
    name
    initialized
  }
}
```

**Ответ:**
```json
{
  "data": {
    "providerStats": [
      {
        "channel": "TELEGRAM",
        "name": "Telegram",
        "initialized": true     // ✅
      },
      {
        "channel": "WEBSOCKET",
        "name": "WebSocket",
        "initialized": false    // ❌
      }
    ]
  }
}
```

### Логи для мониторинга

Ищите эти строки в логах:

```bash
# Успешный старт всех провайдеров
grep "Provider initialization complete: 2 successful, 0 failed" logs.txt

# Частичный старт (некоторые провайдеры не работают)
grep "Some providers failed to initialize" logs.txt

# Критическая ошибка (все провайдеры упали)
grep "All providers failed to initialize" logs.txt
```

---

## Преимущества

### 1. **Высокая доступность**
Сервис работает, даже если часть провайдеров недоступна

### 2. **Graceful degradation**
Функциональность ухудшается постепенно, а не полностью

### 3. **Гибкость конфигурации**
Можно запускать без WebSocket (только Telegram) или без Telegram (только WebSocket)

### 4. **Удобство разработки**
Не нужно останавливать все, чтобы освободить порт 4020

### 5. **Прозрачность**
Четкие логи показывают, какие провайдеры работают, а какие нет

---

## Настройка приоритетов

Если нужно сделать провайдер **обязательным**, измените его логику:

```typescript
// В telegram-provider.ts
async initialize(): Promise<void> {
  try {
    // ...
  } catch (error) {
    logger.error('❌ CRITICAL: Telegram provider failed!');
    throw error; // ← Бросаем ошибку для критических провайдеров
  }
}
```

---

## Рекомендации

### Production

```env
# Оба провайдера должны работать
TELEGRAM_BOT_TOKEN=your_real_token
WS_PORT=4020
```

Следите за логами на наличие `failed to initialize`.

### Development

```env
# Можно работать только с одним провайдером
TELEGRAM_BOT_TOKEN=test_token
# WS_PORT не указываем, если порт занят
```

Сервис запустится с тем, что доступно.

---

**Дата:** 19 октября 2025  
**Статус:** ✅ Реализовано

