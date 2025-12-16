'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-request';
import { Button } from '@/components/button';
import { Heading, Subheading } from '@/components/heading';
import { Input } from '@/components/input';
import { Text } from '@/components/text';
import { Switch, SwitchField } from '@/components/switch';
import { Divider } from '@/components/divider';
import { useOrganizationNotificationSettings } from '@/hooks/useOrganizationNotificationSettings';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const CREATE_DAILY_NOTIFICATION_TASK = gql`
  mutation CreateDailyNotificationTask($input: CreateDailyNotificationTaskInput!) {
    createDailyNotificationTask(input: $input) {
      id
      type
      org {
        id
      }
    }
  }
`;

interface DailyTasksNotificationSettingsProps {
  userId: string;
}

export function DailyTasksNotificationSettings({
  userId,
}: DailyTasksNotificationSettingsProps) {
  const { currentUser } = useCurrentUser();
  const { settings, updateSettings, isUpdating } = useOrganizationNotificationSettings(
    currentUser?.orgId || ''
  );
  const queryClient = useQueryClient();

  const [cleaningDate, setCleaningDate] = useState<string>('');
  const [repairDate, setRepairDate] = useState<string>('');
  const [isSendingCleaning, setIsSendingCleaning] = useState(false);
  const [isSendingRepair, setIsSendingRepair] = useState(false);

  // Получаем завтрашнюю дату по умолчанию
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const handleSendCleaningNotification = async () => {
    if (!currentUser?.orgId) {
      alert('Организация не найдена');
      return;
    }

    const targetDate = cleaningDate || getTomorrowDate();

    setIsSendingCleaning(true);
    try {
      await graphqlClient.request(CREATE_DAILY_NOTIFICATION_TASK, {
        input: {
          orgId: currentUser.orgId,
          taskType: 'CLEANING',
          targetDate: new Date(targetDate).toISOString(),
        },
      });

      alert('Уведомление об уборках отправлено');
      setCleaningDate('');
    } catch (error) {
      console.error('Failed to send cleaning notification', error);
      alert('Не удалось отправить уведомление. Проверьте консоль для деталей.');
    } finally {
      setIsSendingCleaning(false);
    }
  };

  const handleSendRepairNotification = async () => {
    if (!currentUser?.orgId) {
      alert('Организация не найдена');
      return;
    }

    const targetDate = repairDate || getTomorrowDate();

    setIsSendingRepair(true);
    try {
      await graphqlClient.request(CREATE_DAILY_NOTIFICATION_TASK, {
        input: {
          orgId: currentUser.orgId,
          taskType: 'REPAIR',
          targetDate: new Date(targetDate).toISOString(),
        },
      });

      alert('Уведомление о ремонтах отправлено');
      setRepairDate('');
    } catch (error) {
      console.error('Failed to send repair notification', error);
      alert('Не удалось отправить уведомление. Проверьте консоль для деталей.');
    } finally {
      setIsSendingRepair(false);
    }
  };

  const handleUpdateCleaningSchedule = async (
    enabled: boolean,
    time: string
  ) => {
    await updateSettings({
      dailyCleaningNotificationEnabled: enabled,
      dailyCleaningNotificationTime: time || undefined,
    });
  };

  const handleUpdateRepairSchedule = async (
    enabled: boolean,
    time: string
  ) => {
    await updateSettings({
      dailyRepairNotificationEnabled: enabled,
      dailyRepairNotificationTime: time || undefined,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <Heading>Рассылка задач на день</Heading>
        <Text className="mt-2">
          Настройте автоматическую рассылку уведомлений о завтрашних уборках и
          ремонтах или отправьте уведомление вручную.
        </Text>
      </div>

      <Divider />

      {/* Раздел: Уборки */}
      <div>
        <Subheading>Уборки</Subheading>
        <Text className="mt-1 mb-4">
          Настройте автоматическую рассылку уведомлений об уборках на завтра
        </Text>

        <div className="space-y-4">
          <SwitchField>
            <Switch
              name="dailyCleaningNotificationEnabled"
              checked={settings?.dailyCleaningNotificationEnabled ?? false}
              onChange={(checked) =>
                handleUpdateCleaningSchedule(
                  checked,
                  settings?.dailyCleaningNotificationTime || '09:00'
                )
              }
              disabled={isUpdating}
            />
            <div className="ml-3">
              <Text>Включить автоматическую рассылку</Text>
              <Text className="text-sm text-zinc-500">
                Уведомления будут отправляться каждый день в указанное время
              </Text>
            </div>
          </SwitchField>

          {settings?.dailyCleaningNotificationEnabled && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Время отправки
              </label>
              <Input
                type="time"
                value={settings.dailyCleaningNotificationTime || '09:00'}
                onChange={(e) =>
                  handleUpdateCleaningSchedule(true, e.target.value)
                }
                disabled={isUpdating}
                className="w-48"
              />
            </div>
          )}

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Text className="mb-2 font-medium">Отправить уведомление сейчас</Text>
            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Дата (по умолчанию - завтра)
                </label>
                <Input
                  type="date"
                  value={cleaningDate}
                  onChange={(e) => setCleaningDate(e.target.value)}
                  min={getTomorrowDate()}
                  disabled={isSendingCleaning}
                  className="w-48"
                />
              </div>
              <Button
                onClick={handleSendCleaningNotification}
                disabled={isSendingCleaning}
              >
                {isSendingCleaning ? 'Отправка...' : 'Отправить'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* Раздел: Ремонты */}
      <div>
        <Subheading>Ремонты</Subheading>
        <Text className="mt-1 mb-4">
          Настройте автоматическую рассылку уведомлений о ремонтах на завтра
        </Text>

        <div className="space-y-4">
          <SwitchField>
            <Switch
              name="dailyRepairNotificationEnabled"
              checked={settings?.dailyRepairNotificationEnabled ?? false}
              onChange={(checked) =>
                handleUpdateRepairSchedule(
                  checked,
                  settings?.dailyRepairNotificationTime || '09:00'
                )
              }
              disabled={isUpdating}
            />
            <div className="ml-3">
              <Text>Включить автоматическую рассылку</Text>
              <Text className="text-sm text-zinc-500">
                Уведомления будут отправляться каждый день в указанное время
              </Text>
            </div>
          </SwitchField>

          {settings?.dailyRepairNotificationEnabled && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Время отправки
              </label>
              <Input
                type="time"
                value={settings.dailyRepairNotificationTime || '09:00'}
                onChange={(e) =>
                  handleUpdateRepairSchedule(true, e.target.value)
                }
                disabled={isUpdating}
                className="w-48"
              />
            </div>
          )}

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Text className="mb-2 font-medium">Отправить уведомление сейчас</Text>
            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Дата (по умолчанию - завтра)
                </label>
                <Input
                  type="date"
                  value={repairDate}
                  onChange={(e) => setRepairDate(e.target.value)}
                  min={getTomorrowDate()}
                  disabled={isSendingRepair}
                  className="w-48"
                />
              </div>
              <Button
                onClick={handleSendRepairNotification}
                disabled={isSendingRepair}
              >
                {isSendingRepair ? 'Отправка...' : 'Отправить'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
