'use client';

import { useQuery } from '@tanstack/react-query';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { graphqlRequest } from '@/lib/graphql-wrapper';
import { GET_TASKS } from '@/lib/graphql-queries';

export default function DailyTasksNotificationPage() {
  const { currentOrgId } = useCurrentOrganization();
  const router = useRouter();

  // Получаем задачи в статусе DRAFT типа DAILY_NOTIFICATION
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['dailyNotificationTasks', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return null;
      const response = await graphqlRequest(GET_TASKS, {
        orgId: currentOrgId,
        status: 'DRAFT',
        type: 'DAILY_NOTIFICATION',
        first: 100,
      });
      return response.data.tasks;
    },
    enabled: !!currentOrgId,
  });

  const tasks = tasksData?.edges?.map((e: any) => e.node) || [];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <Heading level={1}>Рассылка задач на день</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Просмотрите и отредактируйте задачи перед отправкой уведомлений
        </Text>
      </div>

      {/* Табы */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8">
          <Link
            href="/notifications"
            className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            Список уведомлений
          </Link>
          <Link
            href="/notifications/templates"
            className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            Шаблоны
          </Link>
          <Link
            href="/notifications/daily-tasks"
            className="whitespace-nowrap border-b-2 border-blue-500 px-1 py-4 text-sm font-medium text-blue-600 dark:text-blue-400"
          >
            Рассылка задач на день
          </Link>
        </nav>
      </div>

      {/* Список задач */}
      {isLoading ? (
        <div>Загрузка...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 text-center">
          <Text className="text-zinc-600 dark:text-zinc-400">
            Нет задач, ожидающих отправки. Задачи создаются автоматически по расписанию.
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
  );
}
