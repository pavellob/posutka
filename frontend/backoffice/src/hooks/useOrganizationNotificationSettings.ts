import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-request';

const GET_ORGANIZATION_NOTIFICATION_SETTINGS = gql`
  query GetOrganizationNotificationSettings($orgId: UUID!) {
    organizationNotificationSettings(orgId: $orgId) {
      orgId
      dailyCleaningNotificationEnabled
      dailyCleaningNotificationTime
      dailyRepairNotificationEnabled
      dailyRepairNotificationTime
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_ORGANIZATION_NOTIFICATION_SETTINGS = gql`
  mutation UpdateOrganizationNotificationSettings($input: UpdateOrganizationNotificationSettingsInput!) {
    updateOrganizationNotificationSettings(input: $input) {
      orgId
      dailyCleaningNotificationEnabled
      dailyCleaningNotificationTime
      dailyRepairNotificationEnabled
      dailyRepairNotificationTime
      updatedAt
    }
  }
`;

export interface OrganizationNotificationSettings {
  orgId: string;
  dailyCleaningNotificationEnabled: boolean;
  dailyCleaningNotificationTime?: string | null;
  dailyRepairNotificationEnabled: boolean;
  dailyRepairNotificationTime?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationSettingsInput {
  orgId: string;
  dailyCleaningNotificationEnabled?: boolean;
  dailyCleaningNotificationTime?: string;
  dailyRepairNotificationEnabled?: boolean;
  dailyRepairNotificationTime?: string;
}

/**
 * Hook для управления настройками уведомлений организации.
 */
export function useOrganizationNotificationSettings(orgId: string) {
  const queryClient = useQueryClient();
  
  // Получение настроек
  const { data, isLoading, error, refetch } = useQuery<{ organizationNotificationSettings: OrganizationNotificationSettings }>({
    queryKey: ['organizationNotificationSettings', orgId],
    queryFn: () => graphqlClient.request(GET_ORGANIZATION_NOTIFICATION_SETTINGS, { orgId }),
    enabled: !!orgId,
  });
  
  // Обновление настроек
  const updateMutation = useMutation({
    mutationFn: (input: UpdateOrganizationSettingsInput) => 
      graphqlClient.request(UPDATE_ORGANIZATION_NOTIFICATION_SETTINGS, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationNotificationSettings', orgId] });
    },
  });
  
  const settings = data?.organizationNotificationSettings;
  
  // Вспомогательные методы
  const updateSettings = (input: Partial<UpdateOrganizationSettingsInput>) => {
    return updateMutation.mutateAsync({
      orgId,
      ...input,
    });
  };
  
  const updateCleaningSchedule = (enabled: boolean, time: string) => {
    return updateSettings({
      dailyCleaningNotificationEnabled: enabled,
      dailyCleaningNotificationTime: time || undefined,
    });
  };
  
  const updateRepairSchedule = (enabled: boolean, time: string) => {
    return updateSettings({
      dailyRepairNotificationEnabled: enabled,
      dailyRepairNotificationTime: time || undefined,
    });
  };
  
  return {
    settings,
    isLoading,
    error,
    refetch,
    updateSettings,
    updateCleaningSchedule,
    updateRepairSchedule,
    isUpdating: updateMutation.isPending,
  };
}

