import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-request';

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      name
      organizations {
        id
        name
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
  
  return {
    currentUserId: data?.me?.id,
    currentUser: data?.me,
    user: data?.me, // Обратная совместимость
    loading: isLoading, // Обратная совместимость
    isLoading,
    error: error ? (error as any).message || String(error) : undefined,
  };
}
