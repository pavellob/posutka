'use client'

import { useState, useEffect } from 'react'
import { useCurrentUser } from './useCurrentUser'

const CURRENT_ORG_KEY = 'currentOrganizationId'

export function useCurrentOrganization() {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  
  // Получаем пользователя с организациями
  const { user, loading: userLoading, error: userError } = useCurrentUser()

  // Инициализация из Local Storage
  useEffect(() => {
    const savedOrgId = localStorage.getItem(CURRENT_ORG_KEY)
    if (savedOrgId) {
      setCurrentOrgId(savedOrgId)
    } else if (user?.organizations && user.organizations.length > 0) {
      // Если нет сохраненной организации, выбираем первую доступную
      const firstOrg = user.organizations[0]
      setCurrentOrgId(firstOrg.id)
      localStorage.setItem(CURRENT_ORG_KEY, firstOrg.id)
    }
  }, [user])

  // Функция для смены организации
  const switchOrganization = (orgId: string) => {
    setCurrentOrgId(orgId)
    localStorage.setItem(CURRENT_ORG_KEY, orgId)
  }

  // Получаем текущую организацию
  const currentOrganization = user?.organizations?.find(
    (org: any) => org.id === currentOrgId
  )

  return {
    currentOrganization,
    currentOrgId,
    organizations: user?.organizations || [],
    isLoading: userLoading,
    error: userError,
    switchOrganization,
  }
}
