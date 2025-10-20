# ❌ Telegram Web App требует HTTPS

## Ошибка

```
ETELEGRAM: 400 Bad Request: inline keyboard button Web App URL 'http://localhost:3000/cleanings?id=xxx' is invalid: Only HTTPS links are allowed
```

## Причина

Telegram **не принимает HTTP ссылки** для Web App кнопок - только HTTPS!

**Текущая проблема:**
```typescript
FRONTEND_URL = 'http://localhost:3000'  // ❌ HTTP!
```

**Нужно:**
```typescript
FRONTEND_URL = 'https://posutka-backoffice.vercel.app'  // ✅ HTTPS!
```

---

## Решение

### В Northflank Dashboard:

**Settings → Environment Variables → Add Variable:**

- **Name:** `FRONTEND_URL`
- **Value:** `https://posutka-backoffice.vercel.app`

(или ваш реальный production URL с HTTPS)

---

### Redeploy

После добавления переменной:
1. Deployments → **Redeploy**
2. Проверьте логи

---

## Проверка в логах

### ✅ Правильно:

```
[cleaning-notification-client] NotificationClient initialized (gRPC):
  frontendUrl: "https://posutka-backoffice.vercel.app"
  envFrontendUrl: "https://posutka-backoffice.vercel.app"

[telegram-provider] Message sent to Telegram chat
  actionUrl: https://posutka-backoffice.vercel.app/cleanings/xxx  ✅ HTTPS!
```

### ❌ Неправильно:

```
[cleaning-notification-client] NotificationClient initialized (gRPC):
  frontendUrl: "http://localhost:3000"
  envFrontendUrl: undefined

❌ CRITICAL: FRONTEND_URL uses HTTP in production!
❌ Telegram Web App requires HTTPS links
❌ Current FRONTEND_URL: http://localhost:3000
💡 Set FRONTEND_URL to your production HTTPS URL in Northflank Environment Variables

[telegram-provider] Failed to send Telegram message:
  error: "400 Bad Request: inline keyboard button Web App URL 'http://localhost:3000/...' is invalid"
```

---

## Почему так?

### Telegram Web App Security

Telegram требует HTTPS для безопасности:
- ✅ **HTTPS** - зашифрованное соединение, безопасно
- ❌ **HTTP** - незашифрованное, небезопасно для Mini App

### Обычные кнопки vs Web App

#### Обычная кнопка (`url`):
```typescript
{
  text: "Открыть",
  url: "http://localhost:3000"  // ← HTTP разрешен
}
```
→ Открывается в браузере, HTTP работает

#### Web App кнопка (`web_app`):
```typescript
{
  text: "Открыть",
  web_app: { 
    url: "http://localhost:3000"  // ← HTTP ЗАПРЕЩЕН! ❌
  }
}
```
→ Открывается в Telegram, требуется HTTPS

---

## Локальная разработка

### Проблема:

Локально у вас `http://localhost:3000`, но Telegram не примет такие ссылки для Web App.

### Решение 1: Отключить Mini App локально

```env
# backend/notifications-subgraph/.env
TELEGRAM_USE_MINIAPP=false  ← Используем обычные url кнопки
FRONTEND_URL=http://localhost:3000
```

→ Будут обычные кнопки (открываются в браузере), HTTP работает ✅

### Решение 2: Использовать ngrok

```bash
# Запустите ngrok
ngrok http 3000

# Скопируйте HTTPS URL
Forwarding: https://abc123.ngrok-free.app -> http://localhost:3000

# Установите в .env
FRONTEND_URL=https://abc123.ngrok-free.app
TELEGRAM_USE_MINIAPP=true
```

→ Mini App работает с HTTPS через ngrok ✅

---

## Production

### ✅ Правильная конфигурация:

```yaml
# В Northflank Environment Variables:
FRONTEND_URL = https://posutka-backoffice.vercel.app
TELEGRAM_USE_MINIAPP = true
NODE_ENV = production
```

**Результат:**
- ✅ HTTPS ссылки
- ✅ Web App кнопки работают
- ✅ Открывается внутри Telegram

---

## Обновленный checklist

### Northflank Environment Variables (ОБЯЗАТЕЛЬНО):

```
NODE_ENV = production
DATABASE_URL = (Secret Reference: database-url)
TELEGRAM_BOT_TOKEN = (Secret Reference: telegram-bot-token)
FRONTEND_URL = https://posutka-backoffice.vercel.app  ← ВАЖНО: HTTPS!
TELEGRAM_USE_MINIAPP = true
TELEGRAM_POLLING = false
NOTIFICATIONS_GRPC_HOST = localhost
NOTIFICATIONS_GRPC_PORT = 4111
```

### Проверка:

После Redeploy в логах должно быть:

```
[cleaning-notification-client] frontendUrl: "https://posutka-backoffice.vercel.app"
[telegram-provider] ✅ Message sent to Telegram
```

**БЕЗ** ошибок `400 Bad Request: Only HTTPS links are allowed`!

---

**Дата:** 20 октября 2025  
**Статус:** ⚠️ Требуется установить FRONTEND_URL с HTTPS в Northflank

