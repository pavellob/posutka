'use client';

import { OrganizationDailyTasksNotificationSettings } from '@/components/organization-daily-tasks-notification-settings';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function OrganizationNotificationsSettingsPage() {
  const { currentOrgId, isLoading } = useCurrentOrganization();
  const pathname = usePathname();
  const activeTab = pathname === '/settings/organization-notifications/daily-tasks' ? 'daily-tasks' : 'main';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Загрузка...</div>
      </div>
    );
  }

  if (!currentOrgId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Организация не найдена</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Заголовок */}
      <div>
        <Heading level={1}>Настройки уведомлений организации</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Настройка рассылки уведомлений о задачах на день для организации
        </Text>
      </div>

      {/* Табы */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8">
          <Link
            href="/settings/organization-notifications"
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'main'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            Общие настройки
          </Link>
          <Link
            href="/settings/organization-notifications/daily-tasks"
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'daily-tasks'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            Рассылка задач на день
          </Link>
        </nav>
      </div>

      {/* Контент в зависимости от активного таба */}
      {activeTab === 'daily-tasks' ? (
        <OrganizationDailyTasksNotificationSettings orgId={currentOrgId} />
      ) : (
        <div className="space-y-6">
          <Text>Общие настройки уведомлений организации (в разработке)</Text>
        </div>
      )}
    </div>
  );
}


