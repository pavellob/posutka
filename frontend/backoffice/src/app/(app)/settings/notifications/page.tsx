'use client';

import { NotificationSettings } from '@/components/notification-settings';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Heading } from '@/components/heading';

export default function NotificationsSettingsPage() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Пожалуйста, войдите в систему</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <NotificationSettings userId={user.id} />
    </div>
  );
}

