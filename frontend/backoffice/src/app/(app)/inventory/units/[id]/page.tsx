'use client'

import { use, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Divider } from '@/components/divider'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { graphqlClient } from '@/lib/graphql-client'
import { 
  GET_UNIT_BY_ID, 
  GET_CLEANERS,
  GET_UNIT_PREFERRED_CLEANERS,
  ADD_PREFERRED_CLEANER,
  REMOVE_PREFERRED_CLEANER,
  UPDATE_UNIT,
  GET_CLEANING_PRICING_RULE,
  CALCULATE_CLEANING_COST
} from '@/lib/graphql-queries'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  HomeIcon,
  UserGroupIcon,
  BellAlertIcon,
  CheckCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { UnitChecklistTemplate } from '@/components/unit-checklist-template'
import { UnitChecklistView } from '@/components/unit-checklist-view'
import { UnitChecklistEditorView } from '@/components/unit-checklist-editor-view'
import { Textarea } from '@/components/textarea'

type UnitDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

export default function UnitDetailsPage(props: UnitDetailsPageProps) {
  const params = use(props.params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'cleaners' | 'checklist' | 'instructions'>('cleaners')
  const { currentOrgId } = useCurrentOrganization()
  const queryClient = useQueryClient()

  // Автоматически переключаемся на вкладку из query параметра
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'checklist') {
      setActiveTab('checklist')
    } else if (tab === 'instructions') {
      setActiveTab('instructions')
    } else if (tab === 'cleaners') {
      setActiveTab('cleaners')
    }
  }, [searchParams])

  // Обновляем URL при переключении вкладок
  const handleTabChange = (tab: 'cleaners' | 'checklist' | 'instructions') => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'checklist') {
      params.set('tab', 'checklist')
    } else if (tab === 'instructions') {
      params.set('tab', 'instructions')
    } else {
      params.delete('tab')
    }
    router.push(`${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
  }

  const { data: unitData, isLoading: unitLoading } = useQuery({
    queryKey: ['unit', params.id],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_UNIT_BY_ID, { 
        id: params.id 
      }) as any
      return response.unit
    },
    enabled: !!params.id
  })

  const { data: cleanersData, isLoading: cleanersLoading } = useQuery({
    queryKey: ['cleaners', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return { cleaners: { edges: [] } }
      
      const response = await graphqlClient.request(GET_CLEANERS, { 
        orgId: currentOrgId 
      }) as any
      return response
    },
    enabled: !!currentOrgId
  })

  const { data: preferredData, refetch: refetchPreferred } = useQuery({
    queryKey: ['unitPreferredCleaners', params.id],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_UNIT_PREFERRED_CLEANERS, { 
        unitId: params.id 
      }) as any
      return response.unitPreferredCleaners
    },
    enabled: !!params.id
  })

  const addCleanerMutation = useMutation({
    mutationFn: async (cleanerId: string) => {
      return await graphqlClient.request(ADD_PREFERRED_CLEANER, {
        unitId: params.id,
        cleanerId
      })
    },
    onSuccess: () => {
      refetchPreferred()
    }
  })

  const removeCleanerMutation = useMutation({
    mutationFn: async (cleanerId: string) => {
      return await graphqlClient.request(REMOVE_PREFERRED_CLEANER, {
        unitId: params.id,
        cleanerId
      })
    },
    onSuccess: () => {
      refetchPreferred()
    }
  })

  const availableCleaners = cleanersData?.cleaners?.edges?.map((edge: any) => edge.node) || []
  const preferredCleanerIds = new Set(preferredData?.map((p: any) => p.cleaner.id) || [])

  const filteredCleaners = availableCleaners.filter((cleaner: any) => {
    const fullName = `${cleaner.firstName} ${cleaner.lastName}`.toLowerCase()
    const telegram = cleaner.telegramUsername?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || telegram.includes(query)
  })

  const handleToggleCleaner = (cleanerId: string) => {
    if (preferredCleanerIds.has(cleanerId)) {
      removeCleanerMutation.mutate(cleanerId)
    } else {
      addCleanerMutation.mutate(cleanerId)
    }
  }

  if (unitLoading || cleanersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <Text>Загрузка...</Text>
        </div>
      </div>
    )
  }

  if (!unitData) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <Heading>Квартира не найдена</Heading>
        <Button onClick={() => router.back()} className="mt-4">
          Назад
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
          className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          Объекты
        </button>
        <span className="text-zinc-400">/</span>
        {unitData.property && (
          <>
            <button 
              onClick={() => router.push(`/inventory/properties/${unitData.property.id}`)}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              {unitData.property.title}
            </button>
            <span className="text-zinc-400">/</span>
          </>
        )}
        <span className="text-zinc-900 dark:text-white font-medium">{unitData.name}</span>
      </div>

      {/* Заголовок */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
              <HomeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <Heading>{unitData.name}</Heading>
              {unitData.property && (
                <Text className="text-zinc-600 dark:text-zinc-400">
                  {unitData.property.title}
                </Text>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => router.back()} outline>
          <ArrowLeftIcon className="w-4 h-4" />
          Назад
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Левая колонка - информация */}
        <div className="lg:col-span-1 space-y-8">
          {/* Характеристики */}
          <section>
            <Subheading className="mb-4">Характеристики</Subheading>
            <div className="space-y-3">
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                <Text className="text-xs text-zinc-500 mb-1">Вместимость</Text>
                <div className="text-2xl font-bold text-blue-600">
                  {unitData.capacity || '—'} <span className="text-sm font-normal text-zinc-500">чел</span>
                </div>
              </div>
              
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                <Text className="text-xs text-zinc-500 mb-1">Кровати</Text>
                <div className="text-2xl font-bold text-green-600">
                  {unitData.beds || '—'} <span className="text-sm font-normal text-zinc-500">шт</span>
                </div>
              </div>
              
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                <Text className="text-xs text-zinc-500 mb-1">Ванные</Text>
                <div className="text-2xl font-bold text-purple-600">
                  {unitData.bathrooms || '—'} <span className="text-sm font-normal text-zinc-500">шт</span>
                </div>
              </div>
            </div>
          </section>

          {/* Параметры ценообразования */}
          <section>
            <Subheading className="mb-4">Параметры ценообразования</Subheading>
            <UnitPricingEditor unitId={params.id} unitData={unitData} />
          </section>

          {/* Удобства */}
          {unitData.amenities && unitData.amenities.length > 0 && (
            <>
              <Divider soft />
              <section>
                <Subheading className="mb-4">Удобства</Subheading>
                <div className="space-y-2">
                  {unitData.amenities.map((amenity: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <Text className="text-zinc-700 dark:text-zinc-300">{amenity}</Text>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Правая колонка */}
        <div className="lg:col-span-2">
          {/* Вкладки */}
          <div className="flex gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => handleTabChange('cleaners')}
              className={`
                px-4 py-3 font-medium transition-colors border-b-2
                ${activeTab === 'cleaners'
                  ? 'border-green-600 text-green-600 dark:text-green-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }
              `}
            >
              Уборщики
            </button>
            <button
              onClick={() => handleTabChange('checklist')}
              className={`
                px-4 py-3 font-medium transition-colors border-b-2
                ${activeTab === 'checklist'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }
              `}
            >
              Чеклист уборки
            </button>
            <button
              onClick={() => handleTabChange('instructions')}
              className={`
                px-4 py-3 font-medium transition-colors border-b-2
                ${activeTab === 'instructions'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }
              `}
            >
              Инструкция
            </button>
          </div>

          <div className="sticky top-6">
            {activeTab === 'cleaners' && (
              <>
                {/* Заголовок секции */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                    <UserGroupIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <Subheading>Привязанные уборщики</Subheading>
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                      {preferredCleanerIds.size} из {availableCleaners.length} уборщиков
                    </Text>
                  </div>
                </div>

            {/* Информационная панель */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <BellAlertIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-2">Автоматические уведомления:</p>
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• Привязанные уборщики получат уведомления о новых уборках</li>
                    <li>• Могут самостоятельно назначить себя через Telegram</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Поиск */}
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input
                type="search"
                placeholder="Поиск по имени или Telegram..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Список уборщиков */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredCleaners.length === 0 && (
                <div className="text-center py-12">
                  <Text className="text-zinc-500">
                    {searchQuery ? 'Уборщики не найдены' : 'Нет доступных уборщиков'}
                  </Text>
                </div>
              )}

              {filteredCleaners.map((cleaner: any) => {
                const isPreferred = preferredCleanerIds.has(cleaner.id)
                
                return (
                  <div
                    key={cleaner.id}
                    className={`
                      group relative bg-white dark:bg-zinc-900 rounded-lg p-4 border-2 transition-all
                      ${isPreferred 
                        ? 'border-green-500 dark:border-green-600 shadow-sm' 
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      {/* Аватар */}
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg
                        ${isPreferred ? 'bg-green-500' : 'bg-zinc-400'}
                      `}>
                        {cleaner.firstName[0]}{cleaner.lastName[0]}
                      </div>

                      {/* Информация */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Text className="font-medium text-zinc-900 dark:text-white truncate">
                            {cleaner.firstName} {cleaner.lastName}
                          </Text>
                          {isPreferred && (
                            <Badge color="green" className="text-xs">
                              ✓ Привязан
                            </Badge>
                          )}
                          {!cleaner.isActive && (
                            <Badge color="red" className="text-xs">
                              Неактивен
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {cleaner.telegramUsername && (
                            <span className="truncate">@{cleaner.telegramUsername}</span>
                          )}
                          {cleaner.rating && (
                            <span className="flex items-center gap-1">
                              <StarIcon className="w-4 h-4 text-yellow-500" />
                              {cleaner.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Кнопка */}
                      <button
                        onClick={() => handleToggleCleaner(cleaner.id)}
                        disabled={!cleaner.isActive || addCleanerMutation.isPending || removeCleanerMutation.isPending}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                          ${isPreferred
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50'
                            : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-950/50'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {isPreferred ? (
                          <>
                            <XMarkIcon className="w-5 h-5" />
                            <span>Отвязать</span>
                          </>
                        ) : (
                          <>
                            <UserPlusIcon className="w-5 h-5" />
                            <span>Привязать</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
              </>
            )}

            {activeTab === 'checklist' && (
              <UnitChecklistEditorView 
                unitId={params.id}
                unitName={unitData?.name}
              />
            )}

            {activeTab === 'instructions' && unitData && (
              <UnitCheckInInstructionsEditor 
                unitId={params.id}
                unitData={unitData}
              />
            )}
          </div>
        </div>
      </div>

      {/* Техническая информация */}
      <div className="mt-12">
        <details className="group">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
            Техническая информация
          </summary>
          <div className="mt-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <dl className="space-y-2 text-sm">
              <div className="flex">
                <dt className="w-32 text-zinc-600 dark:text-zinc-400">ID юнита:</dt>
                <dd className="font-mono text-zinc-900 dark:text-white">{unitData.id}</dd>
              </div>
              {unitData.property && (
                <div className="flex">
                  <dt className="w-32 text-zinc-600 dark:text-zinc-400">ID объекта:</dt>
                  <dd className="font-mono text-zinc-900 dark:text-white">{unitData.property.id}</dd>
                </div>
              )}
            </dl>
          </div>
        </details>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d4d4d8;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a1a1aa;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #52525b;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #71717a;
        }
      `}</style>

    </div>
  )
}

// Компонент для редактирования параметров ценообразования
function UnitPricingEditor({ unitId, unitData }: { unitId: string; unitData: any }) {
  const queryClient = useQueryClient()
  const { currentOrgId } = useCurrentOrganization()
  const [grade, setGrade] = useState<string>(unitData?.grade?.replace('GRADE_', '') || '0')
  const [difficulty, setDifficulty] = useState<string>(unitData?.cleaningDifficulty?.replace('D', '') || '0')
  const [isSaving, setIsSaving] = useState(false)

  // Обновляем локальное состояние при изменении данных
  useEffect(() => {
    setGrade(unitData?.grade?.replace('GRADE_', '') || '0')
    setDifficulty(unitData?.cleaningDifficulty?.replace('D', '') || '0')
  }, [unitData])

  // Загрузка правила ценообразования
  const { data: pricingRuleData } = useQuery<any>({
    queryKey: ['pricingRule', currentOrgId, unitId],
    queryFn: () => graphqlClient.request(GET_CLEANING_PRICING_RULE, {
      orgId: currentOrgId!,
      unitId: unitId,
    }),
    enabled: !!currentOrgId && !!unitId,
  })

  const pricingRule = pricingRuleData?.cleaningPricingRule

  // Расчет стоимости уборки
  const { data: costQuoteData } = useQuery<any>({
    queryKey: ['cleaningCost', unitId, grade, difficulty, pricingRule?.mode],
    queryFn: () => {
      const gradeEnum = `GRADE_${grade}`
      const difficultyEnum = `D${difficulty}`
      return graphqlClient.request(CALCULATE_CLEANING_COST, {
        unitId: unitId,
        grade: gradeEnum,
        difficulty: difficultyEnum,
        mode: pricingRule?.mode || 'BASIC',
      })
    },
    enabled: !!unitId && !!pricingRule && grade !== undefined && difficulty !== undefined,
  })

  const costQuote = costQuoteData?.calculateCleaningCost

  // Форматирование денег
  const formatMoney = (amount: number, currency: string): string => {
    const value = amount / 100 // конвертируем из копеек
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const updateMutation = useMutation({
    mutationFn: async (input: { grade?: string; cleaningDifficulty?: string }) => {
      return graphqlClient.request(UPDATE_UNIT, {
        id: unitId,
        input: {
          grade: input.grade ? `GRADE_${input.grade}` : undefined,
          cleaningDifficulty: input.cleaningDifficulty ? `D${input.cleaningDifficulty}` : undefined,
        }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] })
      queryClient.invalidateQueries({ queryKey: ['cleaningCost', unitId] })
      setIsSaving(false)
    },
    onError: () => {
      setIsSaving(false)
    }
  })

  const handleSave = () => {
    setIsSaving(true)
    updateMutation.mutate({ grade, cleaningDifficulty: difficulty })
  }

  const getDifficultyLabel = (difficulty: number) => {
    const labels = ['Очень простая', 'Простая', 'Средняя', 'Сложная', 'Очень сложная', 'Экстремально сложная']
    return labels[difficulty] || 'Не указано'
  }

  const hasChanges = 
    grade !== (unitData?.grade?.replace('GRADE_', '') || '0') ||
    difficulty !== (unitData?.cleaningDifficulty?.replace('D', '') || '0')

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
      {/* Информация о правиле и стоимости */}
      {(pricingRule || costQuote) && (
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 space-y-3 border border-zinc-200 dark:border-zinc-700">
          {pricingRule && (
            <div>
              <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Применяемое правило ценообразования:
              </Text>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Text className="text-zinc-500 dark:text-zinc-400">Базовая цена:</Text>
                  <Text className="font-semibold">
                    {formatMoney(pricingRule.baseCleaningPrice.amount, pricingRule.baseCleaningPrice.currency)}
                  </Text>
                </div>
                <div>
                  <Text className="text-zinc-500 dark:text-zinc-400">Режим:</Text>
                  <Badge color={pricingRule.mode === 'BASIC' ? 'zinc' : 'orange'} className="text-xs">
                    {pricingRule.mode}
                  </Badge>
                </div>
                <div>
                  <Text className="text-zinc-500 dark:text-zinc-400">Шаг градации:</Text>
                  <Text className="font-semibold">{pricingRule.gradeStep}</Text>
                </div>
                <div>
                  <Text className="text-zinc-500 dark:text-zinc-400">Шаг сложности:</Text>
                  <Text className="font-semibold">{pricingRule.difficultyStep}</Text>
                </div>
              </div>
            </div>
          )}
          
          {costQuote && (
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Рассчитанная стоимость уборки:
              </Text>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Text className="text-zinc-500 dark:text-zinc-400">Базовая цена:</Text>
                  <Text className="font-semibold">
                    {formatMoney(costQuote.base.amount, costQuote.base.currency)}
                  </Text>
                </div>
                <div>
                  <Text className="text-zinc-500 dark:text-zinc-400">Коэф. градации:</Text>
                  <Text className="font-semibold">{costQuote.gradeCoefficient.toFixed(2)}x</Text>
                </div>
                <div>
                  <Text className="text-zinc-500 dark:text-zinc-400">Коэф. сложности:</Text>
                  <Text className="font-semibold">{costQuote.difficultyCoefficient.toFixed(2)}x</Text>
                </div>
                <div>
                  <Text className="text-zinc-500 dark:text-zinc-400">Итоговая стоимость:</Text>
                  <Text className="font-semibold text-lg text-green-600 dark:text-green-400">
                    {formatMoney(costQuote.total.amount, costQuote.total.currency)}
                  </Text>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Градация */}
        <div>
          <label htmlFor="grade" className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
            Градация (0-10)
          </label>
          <Select
            id="grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="mt-1"
          >
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={i.toString()}>
                GRADE_{i}
              </option>
            ))}
          </Select>
          <Text className="text-xs text-zinc-500 mt-1">
            Размер юнита для расчёта стоимости уборки
          </Text>
        </div>

        {/* Сложность по умолчанию */}
        <div>
          <label htmlFor="cleaningDifficulty" className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
            Сложность уборки (0-5)
          </label>
          <Select
            id="cleaningDifficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="mt-1"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <option key={i} value={i.toString()}>
                D{i} - {getDifficultyLabel(i)}
              </option>
            ))}
          </Select>
          <Text className="text-xs text-zinc-500 mt-1">
            Сложность по умолчанию (может быть изменена при уборке)
          </Text>
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Button
            outline
            onClick={() => {
              setGrade(unitData?.grade?.replace('GRADE_', '') || '0')
              setDifficulty(unitData?.cleaningDifficulty?.replace('D', '') || '0')
            }}
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      )}
    </div>
  )
}

// Компонент для редактирования инструкции по заселению
function UnitCheckInInstructionsEditor({ unitId, unitData }: { unitId: string; unitData: any }) {
  const [instructions, setInstructions] = useState(unitData?.checkInInstructions || '')
  const [isSaving, setIsSaving] = useState(false)
  const queryClient = useQueryClient()

  const updateUnitMutation = useMutation({
    mutationFn: async (input: any) => {
      return await graphqlClient.request(UPDATE_UNIT, {
        id: unitId,
        input
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] })
      setIsSaving(false)
    },
    onError: (error: any) => {
      console.error('Failed to update unit instructions:', error)
      alert('Ошибка при сохранении инструкции: ' + (error.message || 'Неизвестная ошибка'))
      setIsSaving(false)
    }
  })

  const handleSave = async () => {
    setIsSaving(true)
    await updateUnitMutation.mutateAsync({
      checkInInstructions: instructions || null
    })
  }

  const hasChanges = instructions !== (unitData?.checkInInstructions || '')

  return (
    <div className="space-y-6">
      {/* Заголовок секции */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
          <HomeIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <Subheading>Инструкция по заселению</Subheading>
          <Text className="text-sm text-zinc-600 dark:text-zinc-400">
            Статичная инструкция для гостя (без переменных)
          </Text>
        </div>
      </div>

      {/* Информационная панель */}
      <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 mb-6 border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-3">
          <BellAlertIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-900 dark:text-purple-100">
            <p className="font-medium mb-2">Использование инструкции:</p>
            <ul className="space-y-1 text-purple-800 dark:text-purple-200">
              <li>• Инструкция будет доступна в шаблонах уведомлений как <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">payload.checkInInstructions</code></li>
              <li>• Инструкция статична и не использует переменные</li>
              <li>• Можно использовать эмодзи и форматирование</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Текстовое поле */}
      <div>
        <label htmlFor="checkInInstructions" className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
          Инструкция по заселению
        </label>
        <Textarea
          id="checkInInstructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="🗺️ Как пройти к квартире&#10;&#10;Адрес: ...&#10;&#10;🔑 Как открыть электронный замок&#10;..."
          rows={20}
          className="font-mono text-sm"
        />
        <Text className="text-xs text-zinc-500 mt-2">
          Введите инструкцию по заселению для гостя. Она будет подставляться в уведомления о бронировании.
        </Text>
      </div>

      {hasChanges && (
        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Button
            outline
            onClick={() => {
              setInstructions(unitData?.checkInInstructions || '')
            }}
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      )}
    </div>
  )
}
