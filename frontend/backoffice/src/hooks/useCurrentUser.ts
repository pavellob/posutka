'use client'

import { useState, useEffect } from 'react'
import { logout } from '@/lib/graphql-client'
import { graphqlRequest } from '@/lib/graphql-wrapper'
import { gql } from 'graphql-request'

const GET_ME = gql`
  query Me {
    me {
      id
      email
      name
      createdAt
      updatedAt
    }
  }
`

export function useCurrentUser() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        setLoading(true)
        setError(null)
        
        // Проверяем наличие токена
        const token = localStorage.getItem('accessToken')
        if (!token) {
          setUser(null)
          setLoading(false)
          return
        }

        const result = await graphqlRequest(GET_ME)
        setUser(result.me)
      } catch (err: any) {
        console.error('Failed to fetch current user:', err)
        setError(err.message)
        setUser(null)
        
        // Если ошибка авторизации, перенаправляем на логин
        if (err.message.includes('Unauthorized') || 
            err.message.includes('Invalid') || 
            err.message.includes('expired') ||
            err.message.includes('Session expired') ||
            err.message.includes('jwt expired')) {
          console.log('Session expired, redirecting to login...')
          logout()
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUser()
  }, [])

  return { user, loading, error }
}
