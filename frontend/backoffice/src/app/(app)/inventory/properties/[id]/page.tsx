'use client'

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Divider } from '@/components/divider'
import { graphqlClient } from '@/lib/graphql-client'
import { GET_PROPERTY_BY_ID, GET_UNITS_BY_PROPERTY } from '@/lib/graphql-queries'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  HomeIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

type PropertyDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

export default function PropertyDetailsPage(props: PropertyDetailsPageProps) {
  const params = use(props.params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'details' | 'units'>('details')

  const { data: propertyData, isLoading: propertyLoading } = useQuery({
    queryKey: ['property', params.id],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_PROPERTY_BY_ID, { 
        id: params.id 
      }) as any
      return response.property
    },
    enabled: !!params.id
  })

  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['units', params.id],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_UNITS_BY_PROPERTY, { 
        propertyId: params.id 
      }) as any
      return response.unitsByPropertyId
    },
    enabled: !!params.id && activeTab === 'units'
  })

  if (propertyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <Text>Загрузка...</Text>
        </div>
      </div>
    )
  }

  if (!propertyData) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <Heading>Объект не найден</Heading>
        <Button onClick={() => router.push('/inventory')} className="mt-4">
          Вернуться к списку
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Хлебные крошки */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <button 
          onClick={() => router.push('/inventory')}
          className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Объекты недвижимости
        </button>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-900 dark:text-white font-medium">{propertyData.title}</span>
      </div>

      {/* Заголовок с кнопкой назад */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <Heading>{propertyData.title}</Heading>
            {propertyData.isElite && (
              <Badge color="amber">⭐ Элитная</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <MapPinIcon className="w-5 h-5" />
            <Text>{propertyData.address}</Text>
          </div>
        </div>
        <Button onClick={() => router.push('/inventory')} outline>
          <ArrowLeftIcon className="w-4 h-4" />
          Назад
        </Button>
      </div>

      {/* Табы */}
      <div className="border-b border-zinc-200 dark:border-zinc-700 mb-8">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-4 px-1 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-medium'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <BuildingOfficeIcon className="w-5 h-5" />
              Параметры
            </div>
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={`pb-4 px-1 border-b-2 transition-colors ${
              activeTab === 'units'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-medium'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <HomeIcon className="w-5 h-5" />
              Квартиры
              {unitsData && <Badge color="zinc">{unitsData.length}</Badge>}
            </div>
          </button>
        </nav>
      </div>

      {/* Контент */}
      {activeTab === 'details' && (
        <div className="space-y-8">
          {/* Основные характеристики */}
          <section>
            <Subheading className="mb-4">Основные характеристики</Subheading>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
                <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Общая площадь</Text>
                <div className="text-3xl font-bold text-blue-600">
                  {propertyData.totalArea ? `${propertyData.totalArea}` : '—'}
                </div>
                <Text className="text-xs text-zinc-500 mt-1">м²</Text>
              </div>
              
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
                <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Комнаты</Text>
                <div className="text-3xl font-bold text-green-600">
                  {propertyData.rooms || '—'}
                </div>
                <Text className="text-xs text-zinc-500 mt-1">
                  {propertyData.roomsOffered && `к сдаче: ${propertyData.roomsOffered}`}
                </Text>
              </div>
              
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
                <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Этаж</Text>
                <div className="text-3xl font-bold text-purple-600">
                  {propertyData.floor || '—'}
                </div>
                <Text className="text-xs text-zinc-500 mt-1">
                  {propertyData.floorsTotal && `из ${propertyData.floorsTotal}`}
                </Text>
              </div>
              
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
                <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Год постройки</Text>
                <div className="text-3xl font-bold text-orange-600">
                  {propertyData.buildingYear || '—'}
                </div>
                <Text className="text-xs text-zinc-500 mt-1">&nbsp;</Text>
              </div>
            </div>
          </section>

          <Divider />

          {/* Тип и категория */}
          <section>
            <Subheading className="mb-4">Тип и категория</Subheading>
            <div className="flex flex-wrap gap-2">
              {propertyData.propertyType && (
                <Badge color="blue" className="text-sm px-3 py-1">{propertyData.propertyType}</Badge>
              )}
              {propertyData.category && (
                <Badge color="green" className="text-sm px-3 py-1">{propertyData.category}</Badge>
              )}
              {propertyData.dealStatus && (
                <Badge color="purple" className="text-sm px-3 py-1">{propertyData.dealStatus}</Badge>
              )}
              {propertyData.buildingType && (
                <Badge color="zinc" className="text-sm px-3 py-1">{propertyData.buildingType}</Badge>
              )}
            </div>
          </section>

          {/* Метро */}
          {propertyData.metroName && (
            <>
              <Divider />
              <section>
                <Subheading className="mb-4">Транспортная доступность</Subheading>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white">
                      M
                    </div>
                    <div>
                      <Text className="font-semibold text-lg">{propertyData.metroName}</Text>
                      {propertyData.metroTimeOnFoot && (
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                          {propertyData.metroTimeOnFoot} минут пешком
                        </Text>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Удобства */}
          <Divider />
          <section>
            <Subheading className="mb-4">Удобства</Subheading>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {propertyData.elevator && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="w-5 h-5" />
                  <Text>Лифт</Text>
                </div>
              )}
              {propertyData.parking && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="w-5 h-5" />
                  <Text>Парковка</Text>
                </div>
              )}
              {propertyData.security && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="w-5 h-5" />
                  <Text>Охрана</Text>
                </div>
              )}
              {propertyData.balcony && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="w-5 h-5" />
                  <Text>Балкон</Text>
                </div>
              )}
              {propertyData.airConditioning && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="w-5 h-5" />
                  <Text>Кондиционер</Text>
                </div>
              )}
              {propertyData.internet && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="w-5 h-5" />
                  <Text>Интернет</Text>
                </div>
              )}
              {propertyData.tv && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="w-5 h-5" />
                  <Text>ТВ</Text>
                </div>
              )}
              {propertyData.furniture && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="w-5 h-5" />
                  <Text>Мебель</Text>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'units' && (
        <div>
          {unitsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!unitsLoading && (!unitsData || unitsData.length === 0) && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-4">
                <HomeIcon className="w-8 h-8 text-zinc-400" />
              </div>
              <Subheading className="mb-2">Нет квартир</Subheading>
              <Text className="text-zinc-600 dark:text-zinc-400">
                В этом объекте пока не добавлено ни одной квартиры
              </Text>
            </div>
          )}

          {!unitsLoading && unitsData && unitsData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unitsData.map((unit: any) => (
                <div
                  key={unit.id}
                  onClick={() => router.push(`/inventory/units/${unit.id}`)}
                  className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <Subheading className="mb-1">{unit.name}</Subheading>
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                          ID: {unit.id.slice(0, 8)}...
                        </Text>
                      </div>
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/inventory/units/${unit.id}`)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        →
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <Text className="text-xs text-zinc-500 mb-1">Вместимость</Text>
                        <div className="text-xl font-bold text-blue-600">
                          {unit.capacity || '—'}
                        </div>
                      </div>
                      <div>
                        <Text className="text-xs text-zinc-500 mb-1">Кровати</Text>
                        <div className="text-xl font-bold text-green-600">
                          {unit.beds || '—'}
                        </div>
                      </div>
                      <div>
                        <Text className="text-xs text-zinc-500 mb-1">Ванные</Text>
                        <div className="text-xl font-bold text-purple-600">
                          {unit.bathrooms || '—'}
                        </div>
                      </div>
                    </div>

                    {unit.amenities && unit.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {unit.amenities.slice(0, 3).map((amenity: string, index: number) => (
                          <Badge key={index} color="zinc" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                        {unit.amenities.length > 3 && (
                          <Badge color="zinc" className="text-xs">
                            +{unit.amenities.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
