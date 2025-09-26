'use client'

import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import React, { useState } from 'react'
import { useGetPropertiesByOrgQuery, useGetUnitsByPropertyQuery, useGetAllOrganizationsQuery } from '@/lib/generated/graphql'
import { graphqlClient } from '@/lib/graphql-client'

export default function InventoryPage() {
  // Состояние для выбранного объекта
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  
  // Получаем все организации
  const { data: organizationsData, isLoading: organizationsLoading, error: organizationsError } = useGetAllOrganizationsQuery(
    graphqlClient
  )
  
  // Получаем объекты для всех организаций
  const [allProperties, setAllProperties] = useState<any[]>([])
  const [isLoadingProperties, setIsLoadingProperties] = useState(false)
  const [propertiesError, setPropertiesError] = useState<Error | null>(null)
  
  // Эффект для получения объектов из всех организаций
  React.useEffect(() => {
    console.log('Organizations data:', organizationsData)
    if (organizationsData?.organizations?.edges) {
      console.log('Found organizations:', organizationsData.organizations.edges.length)
      setIsLoadingProperties(true)
      setPropertiesError(null)
      
      const fetchAllProperties = async () => {
        try {
          const propertiesPromises = organizationsData.organizations.edges.map(async (orgEdge) => {
            const orgId = orgEdge.node.id
            // Здесь мы бы использовали useGetPropertiesByOrgQuery для каждой организации
            // Но поскольку мы не можем использовать хуки в цикле, используем прямой запрос
            const response = await graphqlClient.request(`
              query GetPropertiesByOrg($orgId: UUID!) {
                propertiesByOrgId(orgId: $orgId) {
                  id
                  title
                  address
                  amenities
                  org {
                    id
                    name
                  }
                }
              }
            `, { orgId }) as any
            return response.propertiesByOrgId
          })
          
          const allPropertiesArrays = await Promise.all(propertiesPromises)
          const flattenedProperties = allPropertiesArrays.flat()
          console.log('All properties found:', flattenedProperties.length)
          setAllProperties(flattenedProperties)
        } catch (error) {
          console.error('Error fetching properties:', error)
          setPropertiesError(error as Error)
        } finally {
          setIsLoadingProperties(false)
        }
      }
      
      fetchAllProperties()
    }
  }, [organizationsData])
  
  const { data: unitsData, isLoading: unitsLoading } = useGetUnitsByPropertyQuery(
    graphqlClient,
    {
      propertyId: selectedPropertyId || ''
    },
    {
      enabled: !!selectedPropertyId,
      queryKey: ['units', selectedPropertyId]
    }
  )
  
  // Выбираем первый объект по умолчанию
  const firstProperty = allProperties?.[0]
  if (firstProperty && !selectedPropertyId) {
    setSelectedPropertyId(firstProperty.id)
  }
  
  // Подсчет статистики
  const totalProperties = allProperties?.length || 0
  const totalUnits = unitsData?.unitsByPropertyId?.length || 0
  const availableUnits = unitsData?.unitsByPropertyId?.filter(unit => unit)?.length || 0

  if (organizationsLoading || isLoadingProperties) {
    return (
      <div className="space-y-6">
        <div>
          <Heading level={1}>Управление Инвентарем</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Загрузка данных...
          </Text>
        </div>
      </div>
    )
  }

  if (organizationsError || propertiesError) {
    return (
      <div className="space-y-6">
        <div>
          <Heading level={1}>Управление Инвентарем</Heading>
          <Text className="mt-2 text-red-600 dark:text-red-400">
            Ошибка загрузки данных: {organizationsError?.message || propertiesError?.message || 'Неизвестная ошибка'}
          </Text>
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Управление Инвентарем</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление всеми объектами недвижимости, единицами и их характеристиками из всех организаций
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🏢</span>
            </div>
            <Heading level={3}>Объекты</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">{totalProperties}</Text>
          <Text className="text-sm text-zinc-500">Недвижимость</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🏠</span>
            </div>
            <Heading level={3}>Единицы</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">{totalUnits}</Text>
          <Text className="text-sm text-zinc-500">Доступно</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🛏️</span>
            </div>
            <Heading level={3}>Кровати</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">
            {unitsData?.unitsByPropertyId?.reduce((sum, unit) => sum + unit.beds, 0) || 0}
          </Text>
          <Text className="text-sm text-zinc-500">Всего мест</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">👥</span>
            </div>
            <Heading level={3}>Вместимость</Heading>
          </div>
          <Text className="text-2xl font-bold text-purple-600">
            {unitsData?.unitsByPropertyId?.reduce((sum, unit) => sum + unit.capacity, 0) || 0}
          </Text>
          <Text className="text-sm text-zinc-500">Гостей</Text>
        </div>
      </div>

      {/* Список объектов недвижимости */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <Heading level={2}>Объекты Недвижимости</Heading>
          <Text className="text-zinc-600 dark:text-zinc-400">
            Управление всеми объектами недвижимости в системе
          </Text>
        </div>
        <div className="p-6">
          {allProperties?.length === 0 ? (
            <div className="text-center py-8">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏢</span>
                </div>
                <Heading level={3} className="mb-2">Нет объектов недвижимости</Heading>
                <Text className="text-zinc-500 mb-4">
                  В системе пока нет объектов недвижимости. Создайте организацию и добавьте объекты для начала работы.
                </Text>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <Text className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Совет:</strong> Запустите команду <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">./scripts/migrate-and-seed.sh</code> для создания тестовых данных.
                  </Text>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allProperties?.map((property) => (
                <div
                  key={property.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPropertyId === property.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                  onClick={() => setSelectedPropertyId(property.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Heading level={4} className="text-lg">{property.title}</Heading>
                    {selectedPropertyId === property.id && (
                      <Badge color="blue">Выбрано</Badge>
                    )}
                  </div>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    {property.address}
                  </Text>
                  {property.amenities && property.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {property.amenities.slice(0, 3).map((amenity: string, index: number) => (
                        <Badge key={index} color="zinc" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {property.amenities.length > 3 && (
                        <Badge color="zinc" className="text-xs">
                          +{property.amenities.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Список единиц недвижимости для выбранного объекта */}
      {selectedPropertyId && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
            <Heading level={2}>Единицы Недвижимости</Heading>
            <Text className="text-zinc-600 dark:text-zinc-400">
              Единицы в выбранном объекте недвижимости
            </Text>
          </div>
          <div className="p-6">
            {unitsLoading ? (
              <div className="text-center py-8">
                <Text className="text-zinc-500">Загрузка единиц...</Text>
              </div>
            ) : unitsData?.unitsByPropertyId?.length === 0 ? (
              <div className="text-center py-8">
                <Text className="text-zinc-500">Нет единиц в этом объекте</Text>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unitsData?.unitsByPropertyId?.map((unit) => (
                  <div
                    key={unit.id}
                    className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Heading level={4} className="text-lg">{unit.name}</Heading>
                      <Badge color="green">Доступно</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Text className="text-zinc-500">Кровати:</Text>
                        <Text className="font-medium">{unit.beds}</Text>
                      </div>
                      <div>
                        <Text className="text-zinc-500">Вместимость:</Text>
                        <Text className="font-medium">{unit.capacity}</Text>
                      </div>
                      <div>
                        <Text className="text-zinc-500">Ванные:</Text>
                        <Text className="font-medium">{unit.bathrooms}</Text>
                      </div>
                      <div>
                        <Text className="text-zinc-500">Удобства:</Text>
                        <Text className="font-medium">{unit.amenities?.length || 0}</Text>
                      </div>
                    </div>
                    {unit.amenities && unit.amenities.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                        <div className="flex flex-wrap gap-1">
                          {unit.amenities.slice(0, 2).map((amenity: string, index: number) => (
                            <Badge key={index} color="zinc" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {unit.amenities.length > 2 && (
                            <Badge color="zinc" className="text-xs">
                              +{unit.amenities.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
