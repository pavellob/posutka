# 📱 Telegram Mini App для уведомлений

## Что это?

Telegram Mini App (Web App) позволяет открывать ваше веб-приложение **внутри Telegram** при нажатии на кнопку в уведомлении. Приложение открывается в полноэкранном режиме внутри Telegram, а не во внешнем браузере.

## Преимущества

✅ **Лучший UX** - приложение открывается внутри Telegram  
✅ **Авторизация** - автоматическая авторизация через Telegram  
✅ **Нативный интерфейс** - интеграция с UI Telegram  
✅ **Быстрее** - не нужно переключаться в браузер  

## Как это работает

### Обычная кнопка (TELEGRAM_USE_MINIAPP=false):
```json
{
  "text": "Открыть детали уборки →",
  "url": "https://app.posutka.com/cleanings?id=123"
}
```
→ Открывается во **внешнем браузере**

### Mini App кнопка (TELEGRAM_USE_MINIAPP=true):
```json
{
  "text": "Открыть детали уборки →",
  "web_app": { "url": "https://app.posutka.com/cleanings?id=123" }
}
```
→ Открывается **внутри Telegram** в полноэкранном режиме

## Настройка

### 1. Прикрепите Mini App к боту

В [@BotFather](https://t.me/BotFather):

```
/mybots
→ Выбрать вашего бота
→ Bot Settings
→ Menu Button
→ Configure menu button
```

Введите:
- **Button text:** `Открыть приложение` (или любое название)
- **Web App URL:** `https://app.posutka.com` (ваш production URL)

### 2. Настройте переменные окружения

В `.env` файле notifications-subgraph:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Mini App (для production)
TELEGRAM_USE_MINIAPP=true

# Polling (обычно false на production)
TELEGRAM_POLLING=false
```

### 3. Настройте фронтенд

Ваш фронтенд должен поддерживать Telegram Web App API:

```html
<!-- В index.html добавьте скрипт Telegram -->
<script src="https://telegram.org/js/telegram-web-app.js"></script>
```

```typescript
// В вашем приложении
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  
  // Расширить приложение на весь экран
  tg.expand();
  
  // Получить данные пользователя
  const user = tg.initDataUnsafe?.user;
  console.log('Telegram user:', user);
  
  // Настроить theme
  document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
  
  // Показать кнопку "Назад" в Telegram
  tg.BackButton.show();
  tg.BackButton.onClick(() => {
    tg.close(); // Закрыть Mini App
  });
}
```

## Окружения

### Development (локальная разработка)

```env
# Используйте обычные URL кнопки
TELEGRAM_USE_MINIAPP=false
FRONTEND_URL=http://localhost:3000
```

→ Ссылки будут открываться в браузере (проще для отладки)

### Staging/Production

```env
# Используйте Mini App
TELEGRAM_USE_MINIAPP=true
FRONTEND_URL=https://app.posutka.com
```

→ Ссылки будут открываться внутри Telegram

## Пример уведомления

### Когда приходит уведомление:

```
🧹 Новая уборка назначена!

Вам назначена уборка в квартире "Москва, Арбат 1"

Дата: 20 октября 2025 г., 14:00
⚠️ Требуется смена постельного белья

[Открыть детали уборки →]  ← Кнопка Mini App
```

### При нажатии на кнопку:

- ✅ **С Mini App:** Открывается https://app.posutka.com/cleanings?id=123 **внутри Telegram**
- ❌ **Без Mini App:** Открывается https://app.posutka.com/cleanings?id=123 в **браузере**

## Авторизация через Telegram

При использовании Mini App вы можете авторизовать пользователя через Telegram:

```typescript
// На фронтенде
const initData = window.Telegram.WebApp.initData;

// Отправьте initData на ваш бэкенд
const response = await fetch('/api/auth/telegram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData })
});

// На бэкенде валидируйте initData
import crypto from 'crypto';

function validateTelegramWebAppData(initData: string, botToken: string): boolean {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return calculatedHash === hash;
}
```

## Документация Telegram

- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Telegram Web App JS API](https://core.telegram.org/bots/webapps#initializing-mini-apps)
- [BotFather Commands](https://core.telegram.org/bots#botfather)

## Тестирование

### 1. Локально (без Mini App)

```env
TELEGRAM_USE_MINIAPP=false
FRONTEND_URL=http://localhost:3000
```

Отправьте тестовое уведомление → кнопка откроет localhost в браузере

### 2. Production (с Mini App)

```env
TELEGRAM_USE_MINIAPP=true
FRONTEND_URL=https://app.posutka.com
```

Отправьте тестовое уведомление → кнопка откроет приложение внутри Telegram

## Пример: Полная настройка для production

### 1. Backend (.env):

```env
# Database
DATABASE_URL=postgresql://user:password@db:5432/posutka

# Servers
PORT=4011
GRPC_PORT=4111
WS_PORT=4020

# Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_USE_MINIAPP=true
TELEGRAM_POLLING=false

# Frontend URL
FRONTEND_URL=https://app.posutka.com

# Environment
NODE_ENV=production
```

### 2. Frontend (index.html):

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

### 3. Frontend (main.tsx):

```typescript
// Инициализация Telegram WebApp
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();
  
  // Применяем theme Telegram
  document.documentElement.style.cssText = `
    --tg-theme-bg-color: ${tg.themeParams.bg_color};
    --tg-theme-text-color: ${tg.themeParams.text_color};
    --tg-theme-button-color: ${tg.themeParams.button_color};
    --tg-theme-button-text-color: ${tg.themeParams.button_text_color};
  `;
}

// Ваше приложение
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
```

---

**Дата:** 19 октября 2025  
**Статус:** ✅ Реализовано

