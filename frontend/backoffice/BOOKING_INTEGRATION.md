# Интеграция системы бронирования

## Обзор

Система бронирования полностью интегрирована в backoffice и позволяет управлять бронированиями объектов недвижимости через веб-интерфейс.

## Архитектура

### Backend
- **Букинг сабграф** (`/backend/bookings-subgraph/`) - обрабатывает логику бронирований
- **Суперграф** (`/backend/gateway-mesh/`) - объединяет все сабграфы через GraphQL Mesh
- **GraphQL API** - предоставляет типизированные запросы и мутации

### Frontend
- **Backoffice** (`/frontend/backoffice/`) - административный интерфейс
- **React Query** - для управления состоянием и кэшированием данных
- **TypeScript** - с автогенерированными типами из GraphQL схемы

## Функциональность

### Управление бронированиями
- ✅ Просмотр списка всех бронирований
- ✅ Создание новых бронирований
- ✅ Отмена бронирований
- ✅ Статистика по статусам бронирований
- ✅ Фильтрация по объектам недвижимости

### Создание бронирования
1. Выбор объекта недвижимости
2. Выбор единицы недвижимости
3. Заполнение данных гостя
4. Указание дат заезда/выезда
5. Расчет стоимости
6. Добавление заметок

### Статусы бронирований
- `PENDING` - Ожидает подтверждения
- `CONFIRMED` - Подтверждено
- `CANCELLED` - Отменено
- `COMPLETED` - Завершено
- `NO_SHOW` - Гость не явился

## GraphQL Запросы

### Основные запросы
```graphql
# Получение списка бронирований
query GetBookings($orgId: UUID, $unitId: UUID, $from: DateTime, $to: DateTime, $status: BookingStatus, $first: Int, $after: String) {
  bookings(orgId: $orgId, unitId: $unitId, from: $from, to: $to, status: $status, first: $first, after: $after) {
    edges {
      node {
        id
        status
        checkIn
        checkOut
        guest {
          name
          email
          phone
        }
        unit {
          name
          property {
            title
          }
        }
        priceBreakdown {
          total {
            amount
            currency
          }
        }
      }
    }
  }
}

# Создание бронирования
mutation CreateBooking($input: CreateBookingInput!) {
  createBooking(input: $input) {
    id
    status
    checkIn
    checkOut
  }
}

# Отмена бронирования
mutation CancelBooking($id: UUID!, $reason: String) {
  cancelBooking(id: $id, reason: $reason) {
    id
    status
    cancellationReason
  }
}
```

## Типы данных

Все типы автоматически генерируются из GraphQL схемы в файле `/src/lib/generated/graphql.ts`:

```typescript
type Booking = NonNullable<GetBookingsQuery['bookings']['edges'][0]>['node']
type Property = NonNullable<GetPropertiesByOrgQuery['propertiesByOrgId'][0]>
type Unit = NonNullable<GetUnitsByPropertyQuery['unitsByPropertyId'][0]>
```

## Запуск и разработка

### Генерация типов
```bash
cd frontend/backoffice
npm run codegen
```

### Запуск в режиме разработки
```bash
cd frontend/backoffice
npm run dev
```

### Запуск backend сервисов
```bash
cd backend
# Запуск всех сабграфов
npm run dev
```

## Интеграция с другими системами

### Identity Subgraph
- Управление пользователями и организациями
- Аутентификация и авторизация

### Inventory Subgraph  
- Управление объектами и единицами недвижимости
- Календарь доступности

### Billing Subgraph
- Выставление счетов за бронирования
- Обработка платежей

### Legal Subgraph
- Генерация договоров
- Управление депозитами

## Безопасность

- Все запросы требуют аутентификации
- Проверка доступности единиц недвижимости
- Валидация данных на клиенте и сервере
- Типизированные GraphQL запросы предотвращают ошибки

## Мониторинг и логирование

- Логирование всех операций с бронированиями
- Отслеживание изменений статусов
- Метрики по конверсии бронирований

## Будущие улучшения

- [ ] Календарь бронирований с визуализацией
- [ ] Уведомления о новых бронированиях
- [ ] Экспорт данных в различные форматы
- [ ] Интеграция с внешними платформами (Airbnb, Booking.com)
- [ ] Автоматическое ценообразование
- [ ] Система скидок и промокодов
