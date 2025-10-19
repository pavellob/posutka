import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-request';

const GET_USER_NOTIFICATION_SETTINGS = gql`
  query GetUserNotificationSettings($userId: UUID!) {
    userNotificationSettings(userId: $userId) {
      userId
      telegramChatId
      email
      phone
      enabled
      enabledChannels
      subscribedEvents
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_NOTIFICATION_SETTINGS = gql`
  mutation UpdateNotificationSettings($input: UpdateNotificationSettingsInput!) {
    updateNotificationSettings(input: $input) {
      userId
      telegramChatId
      email
      phone
      enabled
      enabledChannels
      subscribedEvents
      updatedAt
    }
  }
`;

export interface NotificationSettings {
  userId: string;
  telegramChatId?: string | null;
  email?: string | null;
  phone?: string | null;
  enabled: boolean;
  enabledChannels: string[];
  subscribedEvents: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  userId: string;
  telegramChatId?: string;
  email?: string;
  phone?: string;
  enabled?: boolean;
  enabledChannels?: string[];
  subscribedEvents?: string[];
}

/**
 * Hook для управления настройками уведомлений пользователя.
 */
export function useNotificationSettings(userId: string) {
  const queryClient = useQueryClient();
  
  // Получение настроек
  const { data, isLoading, error, refetch } = useQuery<{ userNotificationSettings: NotificationSettings }>({
    queryKey: ['notificationSettings', userId],
    queryFn: () => graphqlClient.request(GET_USER_NOTIFICATION_SETTINGS, { userId }),
    enabled: !!userId,
  });
  
  // Обновление настроек
  const updateMutation = useMutation({
    mutationFn: (input: UpdateSettingsInput) => 
      graphqlClient.request(UPDATE_NOTIFICATION_SETTINGS, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings', userId] });
    },
  });
  
  const settings = data?.userNotificationSettings;
  
  // Вспомогательные методы
  const updateSettings = (input: Partial<UpdateSettingsInput>) => {
    return updateMutation.mutateAsync({
      userId,
      ...input,
    });
  };
  
  const toggleNotifications = (enabled: boolean) => {
    return updateSettings({ enabled });
  };
  
  const setTelegramChatId = (telegramChatId: string) => {
    return updateSettings({ telegramChatId });
  };
  
  const toggleChannel = (channel: string) => {
    const currentChannels = settings?.enabledChannels || [];
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];
    
    return updateSettings({ enabledChannels: newChannels });
  };
  
  const toggleEvent = (event: string) => {
    const currentEvents = settings?.subscribedEvents || [];
    const newEvents = currentEvents.includes(event)
      ? currentEvents.filter(e => e !== event)
      : [...currentEvents, event];
    
    return updateSettings({ subscribedEvents: newEvents });
  };
  
  return {
    settings,
    isLoading,
    error,
    refetch,
    updateSettings,
    toggleNotifications,
    setTelegramChatId,
    toggleChannel,
    toggleEvent,
    isUpdating: updateMutation.isPending,
  };
}

