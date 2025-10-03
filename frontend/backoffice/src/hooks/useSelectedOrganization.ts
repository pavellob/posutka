'use client'

import { useState, useEffect } from 'react'
import { useCurrentUser } from './useCurrentUser'

export interface Organization {
  id: string
  name: string
  initials: string
  color: string
}

export function useSelectedOrganization() {
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [forceUpdate, setForceUpdate] = useState(0)
  const { user } = useCurrentUser()

  useEffect(() => {
    console.log('🔄 useSelectedOrganization useEffect triggered:', { 
      userOrgs: user?.organizations?.length,
      forceUpdate 
    })
    
    if (!user?.organizations) {
      setIsLoading(false)
      return
    }

    // Загружаем выбранную организацию из localStorage
    const savedOrgId = localStorage.getItem('selectedOrganizationId')
    console.log('🔍 Loading organization from localStorage:', { savedOrgId })
    
    if (savedOrgId) {
      const org = user.organizations.find((o: any) => o.id === savedOrgId)
      if (org) {
        console.log('✅ Found saved organization:', { name: org.name, id: org.id })
        setSelectedOrg({
          id: org.id,
          name: org.name,
          initials: org.name.substring(0, 2).toUpperCase(),
          color: org.color || 'bg-blue-500'
        })
      } else {
        console.log('❌ Saved organization not found in user organizations')
      }
    } else if (user.organizations.length > 0) {
      // Если нет сохраненной организации, используем первую
      const firstOrg = user.organizations[0]
      console.log('🔄 Using first organization:', { name: firstOrg.name, id: firstOrg.id })
      setSelectedOrg({
        id: firstOrg.id,
        name: firstOrg.name,
        initials: firstOrg.name.substring(0, 2).toUpperCase(),
        color: firstOrg.color || 'bg-blue-500'
      })
    }
    setIsLoading(false)
  }, [user, forceUpdate])

  // Слушаем изменения localStorage из других вкладок/компонентов
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedOrganizationId' && e.newValue) {
        console.log('🔄 Storage change detected:', { newValue: e.newValue })
        setForceUpdate(prev => prev + 1)
      }
    }

    // Также слушаем изменения localStorage в той же вкладке
    const handleLocalStorageChange = () => {
      const currentSavedId = localStorage.getItem('selectedOrganizationId')
      console.log('🔄 Local storage change detected:', { currentSavedId })
      setForceUpdate(prev => prev + 1)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('organizationChanged', handleLocalStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('organizationChanged', handleLocalStorageChange)
    }
  }, [])

  const changeOrganization = (org: Organization) => {
    console.log('🔄 changeOrganization called:', { 
      newOrg: org.name, 
      newOrgId: org.id,
      currentOrg: selectedOrg?.name,
      currentOrgId: selectedOrg?.id 
    })
    setSelectedOrg(org)
    localStorage.setItem('selectedOrganizationId', org.id)
    // Принудительно обновляем хук
    setForceUpdate(prev => prev + 1)
    // Уведомляем об изменении через событие для обновления других компонентов
    window.dispatchEvent(new CustomEvent('organizationChanged', { detail: org }))
  }

  const getSelectedOrgId = () => {
    // Проверяем localStorage на случай, если состояние не синхронизировано
    const savedOrgId = localStorage.getItem('selectedOrganizationId')
    const currentOrgId = selectedOrg?.id || null
    
    console.log('🔍 getSelectedOrgId called:', { 
      currentOrgId, 
      savedOrgId,
      selectedOrg: selectedOrg?.name,
      areEqual: currentOrgId === savedOrgId
    })
    
    // Возвращаем значение из localStorage, если оно есть, иначе из состояния
    return savedOrgId || currentOrgId
  }

  const getAllOrganizations = () => {
    if (!user?.organizations) return []
    
    return user.organizations.map((org: any) => ({
      id: org.id,
      name: org.name,
      initials: org.name.substring(0, 2).toUpperCase(),
      color: org.color || 'bg-blue-500'
    }))
  }

  return {
    selectedOrg,
    isLoading,
    changeOrganization,
    getSelectedOrgId,
    getAllOrganizations
  }
}
