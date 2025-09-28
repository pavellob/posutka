import { GraphQLClient } from 'graphql-request'
import { isTokenExpired, shouldRefreshToken } from './token-utils'

// Конфигурация GraphQL клиента
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql'

// Функция для получения заголовков (синхронная)
const getAuthHeaders = () => {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  
  const token = localStorage.getItem('accessToken');
  
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// Создаем простой клиент без middleware для лучшей обработки ошибок
export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: getAuthHeaders
})

// Функция для обновления токена
export const refreshToken = async () => {
  if (typeof window === 'undefined') return null;
  
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation RefreshToken($input: RefreshTokenInput!) {
            refreshToken(input: $input) {
              accessToken
              refreshToken
              expiresIn
            }
          }
        `,
        variables: {
          input: { refreshToken }
        }
      })
    });

    const result = await response.json();
    
    if (result.data?.refreshToken) {
      localStorage.setItem('accessToken', result.data.refreshToken.accessToken);
      localStorage.setItem('refreshToken', result.data.refreshToken.refreshToken);
      return result.data.refreshToken.accessToken;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Очищаем токены при ошибке
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
  
  return null;
};

// Функция для выхода
export const logout = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
};