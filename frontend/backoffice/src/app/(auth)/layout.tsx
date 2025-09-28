'use client'

import { AuthLayout } from '@/components/auth-layout'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    // Если пользователь уже авторизован, перенаправляем в приложение
    const token = localStorage.getItem('accessToken')
    if (token) {
      router.push('/')
    }
  }, [router])

  return <AuthLayout>{children}</AuthLayout>
}