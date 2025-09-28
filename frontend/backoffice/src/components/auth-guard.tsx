'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { logout } from '@/lib/graphql-client'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, error } = useCurrentUser()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken')
      
      if (!token) {
        console.log('No token found, redirecting to login')
        router.push('/login')
        return
      }

      // Проверяем на ошибки авторизации
      if (error && (
        error.includes('Unauthorized') || 
        error.includes('Invalid') || 
        error.includes('expired') ||
        error.includes('Session expired') ||
        error.includes('jwt expired')
      )) {
        console.log('Auth error detected, logging out and redirecting to login')
        logout()
        return
      }

      setIsChecking(false)
    }

    checkAuth()
  }, [user, loading, error, router])

  if (isChecking || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error && !error.includes('Unauthorized') && !error.includes('Invalid') && !error.includes('expired') && !error.includes('Session expired') && !error.includes('jwt expired')) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Ошибка: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Повторить
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return <>{children}</>
}
