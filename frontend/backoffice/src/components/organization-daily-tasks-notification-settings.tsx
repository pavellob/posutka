'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-request';
import { Button } from '@/components/button';
import { Heading, Subheading } from '@/components/heading';
import { Input } from '@/components/input';
import { Text } from '@/components/text';
import { Badge } from '@/components/badge';
import { Switch, SwitchField } from '@/components/switch';
import { Divider } from '@/components/divider';
import { useOrganizationNotificationSettings } from '@/hooks/useOrganizationNotificationSettings';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { graphqlRequest } from '@/lib/graphql-wrapper';
import { GET_TASKS } from '@/lib/graphql-queries';

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

interface OrganizationDailyTasksNotificationSettingsProps {
  orgId: string;
}

export function OrganizationDailyTasksNotificationSettings({
  orgId,
}: OrganizationDailyTasksNotificationSettingsProps) {
  const { settings, updateCleaningSchedule, updateRepairSchedule, isUpdating } = 
    useOrganizationNotificationSettings(orgId);
  const router = useRouter();

  const [cleaningDate, setCleaningDate] = useState<string>('');
  const [repairDate, setRepairDate] = useState<string>('');
  const [isSendingCleaning, setIsSendingCleaning] = useState(false);
  const [isSendingRepair, setIsSendingRepair] = useState(false);

  // Получаем задачи в статусе DRAFT типа DAILY_NOTIFICATION
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['dailyNotificationTasks', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const response = await graphqlRequest(GET_TASKS, {
        orgId,
        status: 'DRAFT',
        type: 'DAILY_NOTIFICATION',
        first: 100,
      });
      return response.data.tasks;
    },
    enabled: !!orgId,
  });

  const tasks = tasksData?.edges?.map((e: any) => e.node) || [];

  // Получаем завтрашнюю дату по умолчанию
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const handleSendCleaningNotification = async () => {
    if (!orgId) {
      alert('Организация не найдена');
      return;
    }

    const targetDate = cleaningDate || getTomorrowDate();

    setIsSendingCleaning(true);
    try {
      await graphqlClient.request(CREATE_DAILY_NOTIFICATION_TASK, {
        input: {
          orgId,
          taskType: 'CLEANING',
          targetDate: new Date(targetDate).toISOString(),
        },
      });

      alert('Задача создана. Теперь вы можете отредактировать её перед отправкой.');
      setCleaningDate('');
      refetchTasks();
    } catch (error) {
      console.error('Failed to send cleaning notification', error);
      alert('Не удалось отправить уведомление. Проверьте консоль для деталей.');
    } finally {
      setIsSendingCleaning(false);
    }
  };

  const handleSendRepairNotification = async () => {
    if (!orgId) {
      alert('Организация не найдена');
      return;
    }

    const targetDate = repairDate || getTomorrowDate();

    setIsSendingRepair(true);
    try {
      await graphqlClient.request(CREATE_DAILY_NOTIFICATION_TASK, {
        input: {
          orgId,
          taskType: 'REPAIR',
          targetDate: new Date(targetDate).toISOString(),
        },
      });

      alert('Задача создана. Теперь вы можете отредактировать её перед отправкой.');
      setRepairDate('');
      refetchTasks();
    } catch (error) {
      console.error('Failed to send repair notification', error);
      alert('Не удалось отправить уведомление. Проверьте консоль для деталей.');
    } finally {
      setIsSendingRepair(false);
    }
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
                updateCleaningSchedule(
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
                  updateCleaningSchedule(true, e.target.value)
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
                updateRepairSchedule(
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
                  updateRepairSchedule(true, e.target.value)
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

      <Divider />

      {/* Раздел: Предварительные задачи для редактирования */}
      <div>
        <Subheading>Предварительные задачи для редактирования</Subheading>
        <Text className="mt-1 mb-4">
          Задачи, созданные автоматически или вручную, ожидающие отправки. Вы можете отредактировать время и исполнителя перед отправкой уведомлений.
        </Text>

        {tasksLoading ? (
          <div className="text-zinc-500">Загрузка...</div>
        ) : tasks.length === 0 ? (
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 text-center">
            <Text className="text-zinc-600 dark:text-zinc-400">
              Нет задач, ожидающих отправки. Задачи создаются автоматически по расписанию или вручную выше.
            </Text>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task: any) => {
              let taskInfo: any = null;
              try {
                taskInfo = task.note ? JSON.parse(task.note) : null;
              } catch (e) {
                // ignore
              }

              const isCleaning = taskInfo?.taskType === 'CLEANING';
              const formattedDate = taskInfo?.targetDate
                ? new Date(taskInfo.targetDate).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Неизвестная дата';

              return (
                <div
                  key={task.id}
                  className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <Badge color={isCleaning ? 'blue' : 'orange'}>
                      {isCleaning ? '📋 Уборки' : '🔧 Ремонты'}
                    </Badge>
                    <Badge color="yellow">Черновик</Badge>
                  </div>
                  <div>
                    <Text className="font-medium">{formattedDate}</Text>
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                      Задач: {taskInfo?.tasksCount || 0}
                    </Text>
                  </div>
                  <Button
                    onClick={() => router.push(`/notifications/daily-tasks/${task.id}`)}
                    className="w-full"
                  >
                    Редактировать и отправить
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

