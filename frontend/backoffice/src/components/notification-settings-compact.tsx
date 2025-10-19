'use client';

import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Switch, SwitchField } from '@/components/switch';
import { Text } from '@/components/text';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { useState } from 'react';

interface NotificationSettingsCompactProps {
  userId: string;
  showTitle?: boolean;
}

const QUICK_CHANNELS = [
  { id: 'TELEGRAM', name: 'Telegram', emoji: '📱' },
  { id: 'WEBSOCKET', name: 'В приложении', emoji: '💻' },
  { id: 'EMAIL', name: 'Email', emoji: '📧' },
];

const QUICK_EVENTS = [
  { id: 'CLEANING_ASSIGNED', name: 'Уборки назначены' },
  { id: 'TASK_ASSIGNED', name: 'Задачи назначены' },
  { id: 'BOOKING_CREATED', name: 'Новые бронирования' },
];

/**
 * Компактный компонент настроек уведомлений для встраивания в диалоги
 */
export function NotificationSettingsCompact({ userId, showTitle = true }: NotificationSettingsCompactProps) {
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
  const [showTelegramInput, setShowTelegramInput] = useState(false);

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500">
        Загрузка настроек уведомлений...
      </div>
    );
  }

  const handleSaveTelegramChatId = async () => {
    if (!telegramChatId.trim()) return;
    
    try {
      await updateSettings({ telegramChatId: telegramChatId.trim() });
      setTelegramChatId('');
      setShowTelegramInput(false);
    } catch (error) {
      console.error('Failed to save Telegram chat ID:', error);
    }
  };

  return (
    <div className="space-y-4">
      {showTitle && (
        <div>
          <Text className="font-semibold text-gray-900 dark:text-white">
            Настройки уведомлений
          </Text>
          <Text className="text-sm text-gray-500">
            Управление каналами и типами уведомлений
          </Text>
        </div>
      )}

      {/* Главный переключатель */}
      <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3 bg-gray-50 dark:bg-zinc-800/50">
        <SwitchField>
          <Switch
            name="enabled"
            checked={settings?.enabled ?? true}
            onChange={(checked) => toggleNotifications(checked)}
            disabled={isUpdating}
          />
          <div className="ml-3">
            <Text className="font-medium">Включить уведомления</Text>
            <Text className="text-xs text-gray-500">
              {settings?.enabled ? 'Вы получаете уведомления' : 'Все уведомления отключены'}
            </Text>
          </div>
        </SwitchField>
      </div>

      {/* Telegram статус */}
      <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <Text className="text-sm font-medium">📱 Telegram</Text>
          {settings?.telegramChatId ? (
            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
              ✓ Подключен
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400 rounded">
              Не подключен
            </span>
          )}
        </div>
        
        {settings?.telegramChatId ? (
          <Text className="text-xs text-gray-500">
            Chat ID: {settings.telegramChatId}
          </Text>
        ) : (
          <div className="space-y-2">
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Отправьте <code className="bg-gray-100 dark:bg-zinc-700 px-1 py-0.5 rounded">/start</code> боту для подключения
            </Text>
            
            {!showTelegramInput ? (
              <button
                type="button"
                onClick={() => setShowTelegramInput(true)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Ввести Chat ID вручную
              </button>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="123456789"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="text-sm"
                />
                <Button
                  type="button"
                  onClick={handleSaveTelegramChatId}
                  disabled={!telegramChatId.trim() || isUpdating}
                  className="text-xs"
                >
                  OK
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Каналы */}
      <div>
        <Text className="text-sm font-medium mb-2">Каналы доставки</Text>
        <div className="space-y-2">
          {QUICK_CHANNELS.map((channel) => {
            const isEnabled = settings?.enabledChannels?.includes(channel.id) ?? false;
            const isDisabled = 
              !settings?.enabled || 
              (channel.id === 'TELEGRAM' && !settings?.telegramChatId);
            
            return (
              <div 
                key={channel.id}
                className={`flex items-center justify-between p-2 border rounded-lg ${
                  isEnabled 
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{channel.emoji}</span>
                  <Text className="text-sm">{channel.name}</Text>
                </div>
                <Switch
                  name={channel.id}
                  checked={isEnabled}
                  onChange={() => toggleChannel(channel.id)}
                  disabled={isDisabled || isUpdating}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Быстрые события */}
      <div>
        <Text className="text-sm font-medium mb-2">Получать уведомления о</Text>
        <div className="space-y-2">
          {QUICK_EVENTS.map((event) => {
            const isSubscribed = settings?.subscribedEvents?.includes(event.id) ?? false;
            
            return (
              <div 
                key={event.id}
                className={`flex items-center justify-between p-2 border rounded-lg ${
                  isSubscribed 
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-zinc-700'
                }`}
              >
                <Text className="text-sm">{event.name}</Text>
                <Switch
                  name={event.id}
                  checked={isSubscribed}
                  onChange={() => toggleEvent(event.id)}
                  disabled={!settings?.enabled || isUpdating}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Ссылка на полные настройки */}
      <div className="pt-2 border-t border-gray-200 dark:border-zinc-700">
        <a 
          href="/settings/notifications"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Открыть все настройки уведомлений →
        </a>
      </div>

      {/* Индикатор сохранения */}
      {isUpdating && (
        <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Сохранение...
        </div>
      )}
    </div>
  );
}

