import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-request';

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      name
      memberships {
        id
        role
        organization {
          id
          name
        }
      }
    }
  }
`;

/**
 * Hook для получения текущего пользователя.
 */
export function useCurrentUser() {
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['currentUser'],
    queryFn: () => graphqlClient.request(GET_CURRENT_USER),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 минут
  });

  const normalizedUser = useMemo(() => {
    const rawUser = data?.me;
    if (!rawUser) return null;

    const memberships = rawUser.memberships ?? [];
    const organizations = memberships
      .map((membership: any) => {
        if (!membership?.organization) return null;
        return {
          id: membership.organization.id,
          name: membership.organization.name,
          role: membership.role,
          membershipId: membership.id,
          membership,
        };
      })
      .filter(Boolean);

    return {
      ...rawUser,
      memberships,
      organizations,
    };
  }, [data?.me]);

  return {
    currentUserId: normalizedUser?.id,
    currentUser: normalizedUser,
    user: normalizedUser, // Обратная совместимость
    loading: isLoading, // Обратная совместимость
    isLoading,
    error: error ? (error as any).message || String(error) : undefined,
  };
}
