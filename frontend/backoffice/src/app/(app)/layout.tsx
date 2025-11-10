'use client'

import { getEvents } from '@/data'
import { ApplicationLayout } from './application-layout'
import { AuthGuard } from '@/components/auth-guard'
import { useTokenRefresh } from '@/hooks/useTokenRefresh'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Автоматическое обновление токенов
  useTokenRefresh()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastUrlRef = useRef<string>('')

  // Обработка обновления URL при открытии из Telegram Mini App
  useEffect(() => {
    // Если приложение открыто в Telegram Mini App, обрабатываем обновления URL
    if (typeof window !== 'undefined') {
      // Проверяем, что мы в Telegram Mini App
      const isTelegramWebApp = 
        window.location.search.includes('tgWebAppStartParam') || 
        window.location.search.includes('tgWebAppPlatform') ||
        (window as any).Telegram?.WebApp !== undefined

      if (isTelegramWebApp) {
        // Инициализируем последний URL
        lastUrlRef.current = window.location.pathname + window.location.search

        // Функция проверки изменений URL
        const checkUrlChange = () => {
          const currentUrl = window.location.pathname + window.location.search
          
          // Если URL изменился, обновляем роутер Next.js
          if (currentUrl !== lastUrlRef.current) {
            console.log('🔄 URL changed in Telegram Mini App:', {
              from: lastUrlRef.current,
              to: currentUrl
            })
            
            // Обновляем роутер для синхронизации состояния
            // Передаем путь с query параметрами
            const newPath = window.location.pathname
            const newSearch = window.location.search
            
            // router.replace принимает путь и query параметры
            router.replace(newPath + newSearch)
            
            lastUrlRef.current = currentUrl
          }
        }

        // Проверяем изменения URL периодически (для Telegram Mini App)
        // Это нужно потому что Telegram может обновлять URL через history API
        const interval = setInterval(checkUrlChange, 500)
        
        // Также слушаем popstate события (навигация назад/вперед)
        window.addEventListener('popstate', checkUrlChange)
        
        return () => {
          clearInterval(interval)
          window.removeEventListener('popstate', checkUrlChange)
        }
      }
    }
  }, [router, pathname, searchParams])

  return (
    <AuthGuard>
      <ApplicationLayout events={[]}>{children}</ApplicationLayout>
    </AuthGuard>
  )
}