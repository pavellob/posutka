# 🔌 Интеграция Notifications с другими subgraphs

## Пример: Отправка уведомления при назначении уборщика

### 1. В cleaning-subgraph

**Файл:** `backend/cleaning-subgraph/src/resolvers/index.ts`

```typescript
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('cleaning-resolvers');

// Создаем mock gRPC клиент (заменить на реальный после генерации proto)
const sendNotification = async (request: any) => {
  try {
    // В будущем: const client = new NotificationsServiceClient('localhost:4111');
    // await client.SendNotification(request);
    
    logger.info('Would send notification:', request);
  } catch (error) {
    logger.error('Failed to send notification:', error);
  }
};

export const resolvers = {
  Mutation: {
    scheduleCleaning: async (_: unknown, { input }: any, { dl, prisma }: Context) => {
      const cleaning = await dl.scheduleCleaning(input);
      
      // Получаем данные уборщика
      const cleaner = await dl.getCleaner(cleaning.cleanerId);
      const unit = await dl.getUnit(cleaning.unitId);
      
      // Определяем userId и получаем настройки уведомлений
      const targetUserId = cleaner.userId || cleaner.id;
      const userSettings = await prisma.userNotificationSettings.findUnique({
        where: { userId: targetUserId }
      });
      
      // Отправляем уведомление пользователю, ассоциированному с уборщиком
      if (userSettings?.telegramChatId) {
        await sendNotification({
          event_type: 14, // CLEANING_ASSIGNED
          org_id: cleaning.orgId,
          recipient_ids: [userSettings.telegramChatId],
          channels: [0, 4], // TELEGRAM + WEBSOCKET
          priority: 2, // HIGH
          title: '🧹 Новая уборка назначена!',
          message: `Вам назначена уборка в квартире "${unit.name}"\n\nДата: ${new Date(cleaning.scheduledAt).toLocaleString('ru')}`,
          metadata: JSON.stringify({
            cleaningId: cleaning.id,
            unitId: unit.id,
            unitName: unit.name,
            scheduledAt: cleaning.scheduledAt,
            requiresLinenChange: cleaning.requiresLinenChange,
            userId: targetUserId,
          }),
          action_url: `https://app.posutka.com/cleanings/${cleaning.id}`,
          action_text: 'Открыть детали уборки →',
        });
        
        logger.info('Notification sent to user associated with cleaner', {
          userId: targetUserId,
          cleanerId: cleaner.id,
          cleaningId: cleaning.id,
        });
      }
      
      return cleaning;
    },
    
    startCleaning: async (_: unknown, { id }: { id: string }, { dl }: Context) => {
      const cleaning = await dl.startCleaning(id);
      
      // Уведомляем менеджера о начале уборки
      // TODO: получить telegram ID менеджера
      
      return cleaning;
    },
    
    completeCleaning: async (_: unknown, { id, input }: any, { dl, prisma }: Context) => {
      const cleaning = await dl.completeCleaning(id, input);
      
      const cleaner = await dl.getCleaner(cleaning.cleanerId);
      
      // Определяем userId и получаем настройки уведомлений
      const targetUserId = cleaner.userId || cleaner.id;
      const userSettings = await prisma.userNotificationSettings.findUnique({
        where: { userId: targetUserId }
      });
      
      // Уведомляем пользователя о завершении
      if (userSettings?.telegramChatId) {
        await sendNotification({
          event_type: 12, // CLEANING_COMPLETED
          org_id: cleaning.orgId,
          recipient_ids: [userSettings.telegramChatId],
          channels: [0], // TELEGRAM
          priority: 1, // NORMAL
          title: '✅ Уборка завершена!',
          message: `Спасибо за работу! Уборка в ${cleaning.unit.name} отмечена как завершенная.`,
          metadata: JSON.stringify({
            cleaningId: cleaning.id,
            completedAt: cleaning.completedAt,
            userId: targetUserId,
          }),
        });
      }
      
      return cleaning;
    },
  },
};
```

### 2. В ops-subgraph

**Файл:** `backend/ops-subgraph/src/resolvers/index.ts`

```typescript
export const sharedResolvers = {
  assignTask: async (dl: IOpsDL, input: any) => {
    logger.info('Assigning task', { input });
    
    const task = await dl.assignTask(input);
    
    // Если задача типа CLEANING и назначен уборщик
    if (task.type === 'CLEANING' && input.cleanerId) {
      // Отправляем уведомление
      await sendNotification({
        event_type: 21, // TASK_ASSIGNED
        org_id: task.orgId,
        recipient_ids: [/* telegram ID уборщика */],
        channels: [0, 4], // TELEGRAM + WEBSOCKET
        priority: 2, // HIGH
        title: '📋 Новая задача!',
        message: `Вам назначена задача по уборке`,
        action_url: `https://app.posutka.com/tasks/${task.id}`,
        action_text: 'Открыть задачу',
      });
    }
    
    return task;
  },
};
```

### 3. В bookings-subgraph

```typescript
export const resolvers = {
  Mutation: {
    createBooking: async (_: unknown, { input }: any, { dl }: Context) => {
      const booking = await dl.createBooking(input);
      
      const guest = await dl.getGuest(booking.guestId);
      
      // Уведомляем гостя о создании бронирования
      if (guest?.email) {
        await sendNotification({
          event_type: 1, // BOOKING_CREATED
          org_id: booking.orgId,
          recipient_ids: [guest.email],
          channels: [1], // EMAIL (когда реализуем)
          priority: 1, // NORMAL
          title: '🎉 Бронирование создано!',
          message: `Ваше бронирование подтверждено на даты ${booking.checkIn} - ${booking.checkOut}`,
          metadata: JSON.stringify({
            bookingId: booking.id,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
          }),
          action_url: `https://app.posutka.com/bookings/${booking.id}`,
          action_text: 'Посмотреть детали',
        });
      }
      
      return booking;
    },
  },
};
```

## WebSocket Client Example (Frontend)

**Файл:** `frontend/backoffice/src/hooks/useNotifications.ts`

```typescript
import { useEffect, useState } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  priority: string;
  actionUrl?: string;
  actionText?: string;
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4020');
    
    ws.onopen = () => {
      setConnected(true);
      
      // Подписываемся на уведомления
      ws.send(JSON.stringify({
        type: 'subscribe',
        userId: userId,
        events: ['CLEANING_ASSIGNED', 'TASK_CREATED', 'BOOKING_CREATED']
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'notification') {
        setNotifications(prev => [data.data, ...prev]);
        
        // Показать toast
        toast.success(data.data.title, {
          description: data.data.message,
          action: data.data.actionUrl ? {
            label: data.data.actionText || 'Открыть',
            onClick: () => window.location.href = data.data.actionUrl
          } : undefined
        });
      }
    };
    
    ws.onclose = () => {
      setConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, [userId]);
  
  return { notifications, connected };
}
```

## Примеры уведомлений

### 1. Уборщику при назначении

```
🧹 Новая уборка назначена!

Вам назначена уборка в квартире "Москва, Арбат 1"

Дата: 14 октября 2025, 10:00

• ID уборки: clean_abc123
• Квартира: Москва, Арбат 1
• Смена белья: Да

[Открыть детали уборки →]
```

### 2. Менеджеру при завершении уборки

```
✅ Уборка завершена!

Уборщик Иван Петров завершил уборку в "Москва, Арбат 1"

• Время: 14 октября 2025, 12:30
• Длительность: 2.5 часа
• Все пункты чеклиста выполнены ✓

[Посмотреть отчет →]
```

### 3. Гостю за день до заселения

```
🏠 Напоминание о заселении

Завтра в 14:00 вас ждут в "Москва, Арбат 1"

Не забудьте:
• Паспорт
• Подтверждение бронирования

[Открыть детали бронирования →]
```

## Настройка в package.json workspace

Добавить в `pnpm-workspace.yaml`:

```yaml
packages:
  - 'backend/notifications-subgraph'
```

Добавить в `package.json` scripts:

```json
{
  "scripts": {
    "dev:notifications": "pnpm --filter notifications-subgraph dev",
    "build:notifications": "pnpm --filter notifications-subgraph build"
  }
}
```

## Deployment

Добавить в `docker-compose.yml`:

```yaml
notifications-subgraph:
  build:
    context: .
    dockerfile: backend/notifications-subgraph/Dockerfile
  ports:
    - "4011:4011"  # GraphQL
    - "4111:4111"  # gRPC
    - "4020:4020"  # WebSocket
  environment:
    - DATABASE_URL=${DATABASE_URL}
    - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    - PORT=4011
    - GRPC_PORT=4111
    - WS_PORT=4020
  depends_on:
    - postgres
```

## Мониторинг провайдеров

```graphql
query ProviderStatus {
  # TODO: Добавить query для статистики провайдеров
  __type(name: "Channel") {
    enumValues {
      name
    }
  }
}
```

## Следующие шаги

1. ✅ Создана структура notifications-subgraph
2. ✅ Реализован provider pattern
3. ✅ Реализован Telegram провайдер
4. ✅ Реализован WebSocket провайдер
5. ✅ Создана gRPC интеграция
6. 🔄 TODO: Добавить Prisma модели
7. 🔄 TODO: Реализовать Email провайдер
8. 🔄 TODO: Добавить в gateway-mesh
9. 🔄 TODO: Интегрировать с cleaning-subgraph
10. 🔄 TODO: Добавить frontend компоненты

