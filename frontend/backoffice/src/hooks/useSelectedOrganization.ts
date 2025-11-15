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
    if (!user?.organizations) {
      setIsLoading(false)
      return
    }

    const savedOrgId = localStorage.getItem('selectedOrganizationId')
    let targetOrg: any | null = null

    if (savedOrgId) {
      targetOrg = user.organizations.find((o: any) => o.id === savedOrgId) ?? null
    }

    if (!targetOrg && user.organizations.length > 0) {
      targetOrg = user.organizations[0]
    }

    if (targetOrg) {
      if (selectedOrg?.id !== targetOrg.id) {
        setSelectedOrg({
          id: targetOrg.id,
          name: targetOrg.name,
          initials: targetOrg.name.substring(0, 2).toUpperCase(),
          color: targetOrg.color || 'bg-blue-500'
        })
      }
      if (savedOrgId !== targetOrg.id) {
        localStorage.setItem('selectedOrganizationId', targetOrg.id)
      }
    }

    setIsLoading(false)
  }, [user, forceUpdate, selectedOrg?.id])

  // Слушаем изменения localStorage из других вкладок/компонентов
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedOrganizationId' && e.newValue) {
        setForceUpdate(prev => prev + 1)
      }
    }

    // Также слушаем изменения localStorage в той же вкладке
    const handleLocalStorageChange = () => {
      const currentSavedId = localStorage.getItem('selectedOrganizationId')
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
