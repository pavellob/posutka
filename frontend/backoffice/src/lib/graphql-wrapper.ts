import { graphqlClient, refreshToken, logout } from './graphql-client'
import { isTokenExpired, shouldRefreshToken } from './token-utils'

/**
 * Обертка для GraphQL запросов с автоматической обработкой ошибок авторизации
 */
export async function graphqlRequest<T = any>(
  query: string, 
  variables?: any
): Promise<T> {
  try {
    // Проверяем токен перед запросом
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      
      if (token && isTokenExpired(token)) {
        console.log('Token expired, attempting refresh...');
        const newToken = await refreshToken();
        if (!newToken) {
          console.log('Failed to refresh token, redirecting to login...');
          logout();
          throw new Error('Session expired. Please login again.');
        }
      } else if (token && shouldRefreshToken(token)) {
        console.log('Token needs refresh, attempting refresh...');
        await refreshToken();
      }
    }

    const result = await graphqlClient.request(query, variables) as any;
    
    // Проверяем на ошибки авторизации
    if (result.errors) {
      const authError = result.errors.find((error: any) => 
        error.message.includes('Unauthorized') || 
        error.message.includes('Invalid') ||
        error.message.includes('expired') ||
        error.message.includes('jwt expired') ||
        error.extensions?.code === 'INTERNAL_SERVER_ERROR'
      );
      
      if (authError) {
        console.log('Auth error detected:', authError.message);
        
        // Пытаемся обновить токен
        const newToken = await refreshToken();
        if (newToken) {
          console.log('Token refreshed, retrying request...');
          // Повторяем запрос с новым токеном
          const retryResult = await graphqlClient.request(query, variables) as any;
          return retryResult;
        } else {
          console.log('Failed to refresh token, redirecting to login...');
          // Если не удалось обновить токен, перенаправляем на логин
          logout();
          throw new Error('Session expired. Please login again.');
        }
      }
    }
    
    return result;
  } catch (error: any) {
    console.error('GraphQL request failed:', error);
    
    // Проверяем, является ли ошибка ошибкой авторизации
    if (error.message?.includes('Unauthorized') || 
        error.message?.includes('Invalid') ||
        error.message?.includes('expired') ||
        error.message?.includes('jwt expired') ||
        error.message?.includes('Session expired')) {
      console.log('Auth error in catch block, redirecting to login...');
      logout();
    }
    
    throw error;
  }
}
