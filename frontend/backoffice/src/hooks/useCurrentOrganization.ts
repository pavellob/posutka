'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GET_ORGANIZATIONS } from '@/lib/graphql-queries'
import { graphqlClient } from '@/lib/graphql-client'
import type { GetOrganizationsQuery } from '@/lib/generated/graphql'

const CURRENT_ORG_KEY = 'currentOrganizationId'

export function useCurrentOrganization() {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)

  // Получаем организации пользователя
  const { data: organizationsData, isLoading, error } = useQuery<GetOrganizationsQuery>({
    queryKey: ['organizations'],
    queryFn: () => graphqlClient.request(GET_ORGANIZATIONS, { first: 100 }),
  })

  // Инициализация из Local Storage
  useEffect(() => {
    const savedOrgId = localStorage.getItem(CURRENT_ORG_KEY)
    if (savedOrgId) {
      setCurrentOrgId(savedOrgId)
    } else if (organizationsData?.organizations?.edges && organizationsData.organizations.edges.length > 0) {
      // Если нет сохраненной организации, выбираем первую доступную
      const firstOrg = organizationsData.organizations.edges[0].node
      setCurrentOrgId(firstOrg.id)
      localStorage.setItem(CURRENT_ORG_KEY, firstOrg.id)
    }
  }, [organizationsData])

  // Функция для смены организации
  const switchOrganization = (orgId: string) => {
    setCurrentOrgId(orgId)
    localStorage.setItem(CURRENT_ORG_KEY, orgId)
  }

  // Получаем текущую организацию
  const currentOrganization = organizationsData?.organizations?.edges?.find(
    edge => edge.node.id === currentOrgId
  )?.node

  return {
    currentOrganization,
    currentOrgId,
    organizations: organizationsData?.organizations?.edges?.map(edge => edge.node) || [],
    isLoading,
    error,
    switchOrganization,
  }
}
