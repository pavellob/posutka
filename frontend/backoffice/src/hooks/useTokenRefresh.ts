'use client'

import { useEffect, useRef } from 'react'
import { refreshToken } from '@/lib/graphql-client'
import { shouldRefreshToken, isTokenExpired } from '@/lib/token-utils'

/**
 * Хук для автоматического обновления JWT токенов
 */
export function useTokenRefresh() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const checkAndRefreshToken = async () => {
      if (typeof window === 'undefined') return

      const token = localStorage.getItem('accessToken')
      if (!token) return

      // Проверяем, истек ли токен
      if (isTokenExpired(token)) {
        console.log('Token expired, attempting refresh...')
        const newToken = await refreshToken()
        if (!newToken) {
          console.log('Failed to refresh token, user will be logged out')
          // logout() будет вызван в refreshToken при ошибке
        }
        return
      }

      // Проверяем, нужно ли обновить токен
      if (shouldRefreshToken(token)) {
        console.log('Token needs refresh, attempting refresh...')
        await refreshToken()
      }
    }

    // Проверяем токен сразу
    checkAndRefreshToken()

    // Устанавливаем интервал для проверки каждые 2 минуты
    intervalRef.current = setInterval(checkAndRefreshToken, 2 * 60 * 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return null
}
