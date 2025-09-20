# 🚀 Деплой Posutka GraphQL Federation на Northflank (Бесплатный аккаунт)

## 📋 Требования

- Бесплатный аккаунт Northflank
- Git репозиторий с кодом
- PostgreSQL база данных (можно использовать бесплатные сервисы)

## 🔧 Настройка

### 1. Подготовка базы данных

Используйте один из бесплатных сервисов:
- **Neon** (https://neon.tech) - 3GB бесплатно
- **Supabase** (https://supabase.com) - 500MB бесплатно
- **Railway** (https://railway.app) - 1GB бесплатно

### 2. Настройка Northflank

1. **Создайте новый проект** в Northflank
2. **Добавьте секрет** `database-url` с вашей PostgreSQL строкой подключения
3. **Используйте файл** `northflank-free.yml` для конфигурации

### 3. Оптимизация для бесплатного аккаунта

- **Память**: 512Mi (вместо 2Gi)
- **CPU**: 500m (вместо 1000m)
- **Порты**: Только необходимые (4000-4008)
- **Dockerfile**: Оптимизированная версия `Dockerfile.free`

## 🚀 Деплой

### Вариант 1: Через Northflank UI

1. **Подключите Git репозиторий**
2. **Выберите файл** `northflank-free.yml`
3. **Добавьте секрет** `database-url`
4. **Запустите деплой**

### Вариант 2: Через CLI

```bash
# Установите Northflank CLI
npm install -g @northflank/cli

# Войдите в аккаунт
northflank login

# Деплойте проект
northflank deploy --config northflank-free.yml
```

## 📊 Мониторинг

После деплоя вы получите:
- **Gateway**: `https://your-app.northflank.app/graphql`
- **Health Check**: Автоматическая проверка на `/graphql`
- **Логи**: Доступны в Northflank Dashboard

## 🔍 Тестирование

```bash
# Проверьте Gateway
curl -X POST https://your-app.northflank.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'

# Проверьте подграфы
curl -X POST https://your-app.northflank.app:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'
```

## ⚠️ Ограничения бесплатного аккаунта

- **Память**: Максимум 512Mi
- **CPU**: Максимум 500m
- **Сеть**: Ограниченный трафик
- **Время работы**: Может быть ограничено

## 🛠️ Оптимизация

Для лучшей производительности на бесплатном аккаунте:

1. **Используйте кэширование** в GraphQL запросах
2. **Оптимизируйте Prisma запросы**
3. **Используйте connection pooling**
4. **Мониторьте использование ресурсов**

## 📝 Логи и отладка

```bash
# Посмотрите логи
northflank logs posutka-federation

# Проверьте статус
northflank status posutka-federation
```

## 🎉 Готово!

Ваша GraphQL Federation теперь работает на Northflank бесплатно! 🚀
