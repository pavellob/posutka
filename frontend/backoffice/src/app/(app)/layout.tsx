'use client'

import { getEvents } from '@/data'
import { ApplicationLayout } from './application-layout'
import { AuthGuard } from '@/components/auth-guard'
import { useTokenRefresh } from '@/hooks/useTokenRefresh'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Автоматическое обновление токенов
  useTokenRefresh()

  return (
    <AuthGuard>
      <ApplicationLayout events={[]}>{children}</ApplicationLayout>
    </AuthGuard>
  )
}