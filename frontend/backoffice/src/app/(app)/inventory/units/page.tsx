'use client'

import { useQuery } from '@tanstack/react-query'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { graphqlClient } from '@/lib/graphql-client'
import { GET_PROPERTIES_BY_ORG, GET_UNITS_BY_PROPERTY } from '@/lib/graphql-queries'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { useRouter } from 'next/navigation'

export default function UnitsPage() {
  const router = useRouter()
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()

  // Получить все объекты недвижимости организации
  const { data: propertiesData, isLoading: propertiesLoading } = useQuery({
    queryKey: ['propertiesWithUnits', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return { propertiesByOrgId: [] }
      
      const response = await graphqlClient.request(GET_PROPERTIES_BY_ORG, { 
        orgId: currentOrgId 
      }) as any
      return response
    },
    enabled: !!currentOrgId
  })

  // Получить units для каждого property
  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['allUnits', currentOrgId],
    queryFn: async () => {
      if (!propertiesData?.propertiesByOrgId) return []
      
      const allUnits = []
      
      for (const property of propertiesData.propertiesByOrgId) {
        const response = await graphqlClient.request(GET_UNITS_BY_PROPERTY, { 
          propertyId: property.id 
        }) as any
        
        // Units уже содержат property из GraphQL запроса
        allUnits.push(...response.unitsByPropertyId)
      }
      
      return allUnits
    },
    enabled: !!propertiesData?.propertiesByOrgId && propertiesData.propertiesByOrgId.length > 0
  })

  if (orgLoading || propertiesLoading || unitsLoading) {
    return (
      <div className="space-y-6">
        <Heading level={1}>Загрузка юнитов...</Heading>
      </div>
    )
  }

  const units = unitsData || []

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-8 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <Heading level={1} className="text-2xl font-bold text-gray-900 dark:text-white">
              Юниты
            </Heading>
            <Text className="mt-2 text-gray-600 dark:text-gray-300 text-lg">
              Управление юнитами, привязка уборщиков и настройка чеклистов уборки
            </Text>
          </div>
        </div>
      </div>

      {/* Таблица юнитов */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <Heading level={2} className="text-lg font-semibold text-gray-900 dark:text-white">
                Все юниты
              </Heading>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Всего: {units.length}
            </div>
          </div>
        </div>

        {units.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <Text className="text-gray-500 dark:text-gray-400 text-lg">
              Юниты не найдены
            </Text>
            <Text className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Добавьте объекты недвижимости и юниты в разделе "Управление объектами"
            </Text>
            <Button
              onClick={() => router.push('/inventory')}
              color="blue"
              className="mt-4"
            >
              Перейти к объектам
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow className="bg-gray-50 dark:bg-zinc-900">
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Квартира
                  </TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Объект
                  </TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Вместимость
                  </TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Кровати
                  </TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ванные
                  </TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Удобства
                  </TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Действия
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {units.map((unit: any) => (
                  <TableRow 
                    key={unit.id} 
                    className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150 cursor-pointer"
                    onClick={() => router.push(`/inventory/units/${unit.id}`)}
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Text className="font-medium text-gray-900 dark:text-white">
                        {unit.name}
                      </Text>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div>
                        <Text className="font-medium text-gray-900 dark:text-white">
                          {unit.property.title}
                        </Text>
                        <Text className="text-sm text-gray-500 dark:text-gray-400">
                          {unit.property.address}
                        </Text>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Text className="text-blue-600 font-semibold">
                        {unit.capacity || '—'}
                      </Text>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Text className="text-green-600 font-semibold">
                        {unit.beds || '—'}
                      </Text>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Text className="text-purple-600 font-semibold">
                        {unit.bathrooms || '—'}
                      </Text>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {unit.amenities && unit.amenities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {unit.amenities.slice(0, 3).map((amenity: string, index: number) => (
                            <Badge key={index} color="blue" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {unit.amenities.length > 3 && (
                            <Badge color="zinc" className="text-xs">
                              +{unit.amenities.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Text className="text-gray-400">—</Text>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/inventory/units/${unit.id}`)
                          }}
                          color="blue"
                          className="text-sm"
                        >
                          👥 Уборщики
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/inventory/units/${unit.id}?tab=checklist`)
                          }}
                          outline
                          className="text-sm"
                        >
                          📋 Чеклист
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

