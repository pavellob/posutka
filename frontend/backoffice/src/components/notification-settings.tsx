'use client';

import { useState } from 'react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Button } from '@/components/button';
import { Heading, Subheading } from '@/components/heading';
import { Input } from '@/components/input';
import { Text } from '@/components/text';
import { Switch, SwitchField } from '@/components/switch';
import { Divider } from '@/components/divider';

interface NotificationSettingsProps {
  userId: string;
}

const AVAILABLE_CHANNELS = [
  { id: 'TELEGRAM', name: 'Telegram', description: 'Получать уведомления в Telegram' },
  { id: 'WEBSOCKET', name: 'В приложении', description: 'Real-time уведомления в браузере' },
  { id: 'EMAIL', name: 'Email', description: 'Уведомления на почту' },
  { id: 'SMS', name: 'SMS', description: 'SMS уведомления' },
];

const EVENT_GROUPS = {
  cleaning: {
    name: 'Уборки',
    events: [
      { id: 'CLEANING_AVAILABLE', name: 'Доступна уборка' },
      { id: 'CLEANING_ASSIGNED', name: 'Уборка назначена' },
      { id: 'CLEANING_STARTED', name: 'Уборка начата' },
      { id: 'CLEANING_COMPLETED', name: 'Уборка завершена' },
      { id: 'CLEANING_PRECHECK_COMPLETED', name: 'Приёмка завершена' },
      { id: 'CLEANING_READY_FOR_REVIEW', name: 'Требуется финальная проверка' },
      { id: 'CLEANING_DIFFICULTY_SET', name: 'Сложность уборки указана' },
      { id: 'CLEANING_APPROVED', name: 'Уборка одобрена' },
      { id: 'CLEANING_CANCELLED', name: 'Уборка отменена' },
    ],
  },
  tasks: {
    name: 'Задачи',
    events: [
      { id: 'TASK_CREATED', name: 'Задача создана' },
      { id: 'TASK_ASSIGNED', name: 'Задача назначена' },
      { id: 'TASK_STATUS_CHANGED', name: 'Статус задачи изменен' },
      { id: 'TASK_COMPLETED', name: 'Задача завершена' },
    ],
  },
  bookings: {
    name: 'Бронирования',
    events: [
      { id: 'BOOKING_CREATED', name: 'Бронирование создано' },
      { id: 'BOOKING_CONFIRMED', name: 'Бронирование подтверждено' },
      { id: 'BOOKING_UPDATED', name: 'Бронирование обновлено' },
      { id: 'BOOKING_CANCELLED', name: 'Бронирование отменено' },
      { id: 'BOOKING_CHECKIN', name: 'Заселение' },
      { id: 'BOOKING_CHECKOUT', name: 'Выселение' },
    ],
  },
  payments: {
    name: 'Платежи',
    events: [
      { id: 'PAYMENT_RECEIVED', name: 'Платеж получен' },
      { id: 'PAYMENT_FAILED', name: 'Платеж не прошел' },
      { id: 'INVOICE_CREATED', name: 'Счет создан' },
      { id: 'INVOICE_OVERDUE', name: 'Счет просрочен' },
    ],
  },
  repairs: {
    name: 'Ремонты',
    events: [
      { id: 'REPAIR_CREATED', name: 'Ремонт создан' },
      { id: 'REPAIR_ASSIGNED', name: 'Ремонт назначен' },
      { id: 'REPAIR_INSPECTION_COMPLETED', name: 'Осмотр завершен' },
      { id: 'REPAIR_STARTED', name: 'Ремонт начат' },
      { id: 'REPAIR_COMPLETED', name: 'Ремонт завершен' },
      { id: 'REPAIR_CANCELLED', name: 'Ремонт отменен' },
    ],
  },
};

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const {
    settings,
    isLoading,
    updateSettings,
    toggleNotifications,
    toggleChannel,
    toggleEvent,
    isUpdating,
  } = useNotificationSettings(userId);

  const [telegramChatId, setTelegramChatId] = useState('');
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-zinc-500">Загрузка настроек...</div>
      </div>
    );
  }

  const handleSaveTelegramChatId = async () => {
    if (!telegramChatId.trim()) return;
    
    setIsSavingTelegram(true);
    try {
      await updateSettings({ telegramChatId: telegramChatId.trim() });
      setTelegramChatId('');
    } catch (error) {
      console.error('Failed to save Telegram chat ID:', error);
      alert('Не удалось сохранить Telegram ID. Проверьте подключение и повторите попытку.');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Основные настройки */}
      <div>
        <Heading>Настройки уведомлений</Heading>
        <Text>Управляйте каналами и типами уведомлений</Text>
        
        <div className="mt-6">
          <SwitchField>
            <Switch
              name="enabled"
              checked={settings?.enabled ?? true}
              onChange={(checked) => toggleNotifications(checked)}
              disabled={isUpdating}
            />
            <div className="ml-3">
              <Text>Включить уведомления</Text>
              <Text className="text-sm text-zinc-500">
                Получать уведомления о событиях в системе
              </Text>
            </div>
          </SwitchField>
        </div>
      </div>

      <Divider />

      {/* Telegram настройки */}
      <div>
        <Subheading>Telegram</Subheading>
        <Text className="mt-1">
          Для получения уведомлений в Telegram, отправьте команду <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm">/start</code> боту
        </Text>
        
        {settings?.telegramChatId ? (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <Text className="font-medium">Telegram подключен</Text>
            </div>
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Chat ID: {settings.telegramChatId}
            </Text>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Text className="text-sm text-blue-700 dark:text-blue-300">
              Telegram еще не подключен. Напишите боту /start для автоматической привязки.
            </Text>
          </div>
        )}

        {/* Ручной ввод Chat ID (опционально) */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
            Ввести Chat ID вручную
          </summary>
          <div className="mt-3 flex gap-2">
            <Input
              type="text"
              placeholder="123456789"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              disabled={isSavingTelegram}
            />
            <Button
              onClick={handleSaveTelegramChatId}
              disabled={!telegramChatId.trim() || isSavingTelegram}
            >
              {isSavingTelegram ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </details>
      </div>

      <Divider />

      {/* Каналы доставки */}
      <div>
        <Subheading>Каналы доставки</Subheading>
        <Text className="mt-1">Выберите, как вы хотите получать уведомления</Text>
        
        <div className="mt-4 space-y-4">
          {AVAILABLE_CHANNELS.map((channel) => {
            const isEnabled = settings?.enabledChannels?.includes(channel.id) ?? false;
            const isDisabled = 
              !settings?.enabled || 
              (channel.id === 'TELEGRAM' && !settings?.telegramChatId) ||
              (channel.id === 'EMAIL' && !settings?.email);
            
            return (
              <SwitchField key={channel.id}>
                <Switch
                  name={channel.id}
                  checked={isEnabled}
                  onChange={() => toggleChannel(channel.id)}
                  disabled={isDisabled || isUpdating}
                />
                <div className="ml-3">
                  <Text>{channel.name}</Text>
                  <Text className="text-sm text-zinc-500">
                    {channel.description}
                    {channel.id === 'TELEGRAM' && !settings?.telegramChatId && (
                      <span className="text-amber-600"> (требуется подключение)</span>
                    )}
                  </Text>
                </div>
              </SwitchField>
            );
          })}
        </div>
      </div>

      <Divider />

      {/* Типы событий */}
      <div>
        <Subheading>Типы событий</Subheading>
        <Text className="mt-1">Выберите события, о которых хотите получать уведомления</Text>
        
        <div className="mt-6 space-y-6">
          {Object.entries(EVENT_GROUPS).map(([groupKey, group]) => (
            <div key={groupKey}>
              <Text className="font-semibold mb-3">{group.name}</Text>
              <div className="space-y-3 pl-4">
                {group.events.map((event) => {
                  const isSubscribed = settings?.subscribedEvents?.includes(event.id) ?? false;
                  
                  return (
                    <SwitchField key={event.id}>
                      <Switch
                        name={event.id}
                        checked={isSubscribed}
                        onChange={() => toggleEvent(event.id)}
                        disabled={!settings?.enabled || isUpdating}
                      />
                      <Text className="ml-3">{event.name}</Text>
                    </SwitchField>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Статус сохранения */}
      {isUpdating && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Сохранение...
        </div>
      )}
    </div>
  );
}

