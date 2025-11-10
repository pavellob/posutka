'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Select } from '@/components/select'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown'
import { Squares2X2Icon, TableCellsIcon, ViewColumnsIcon, EllipsisVerticalIcon, PlusIcon } from '@heroicons/react/24/outline'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { ScheduleCleaningDialog } from '@/components/schedule-cleaning-dialog'
import { CleaningDetailsDialog } from '@/components/cleaning-details-dialog'
import { CreateCleanerDialog } from '@/components/create-cleaner-dialog'
import { CleanerDetailsDialog } from '@/components/cleaner-details-dialog'
import { EditCleanerDialog } from '@/components/edit-cleaner-dialog'
import { CleaningCard } from '@/components/cleaning-card'
import { CleaningKanbanBoard } from '@/components/cleaning-kanban-board'
import { CreateChecklistDialog } from '@/components/create-checklist-dialog'
import { 
  GET_CLEANINGS, 
  GET_CLEANERS,
  GET_PROPERTIES_BY_ORG,
  GET_UNITS_BY_PROPERTY,
  COMPLETE_CLEANING,
  CANCEL_CLEANING,
  DEACTIVATE_CLEANER,
  ACTIVATE_CLEANER
} from '@/lib/graphql-queries'

function CleaningsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'cleanings' | 'cleaners' | 'templates'>('cleanings')
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'kanban'>('table')
  const [filters, setFilters] = useState({
    status: '',
    cleanerId: ''
  })
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedCleaningId, setSelectedCleaningId] = useState<string | null>(null)
  const [isCreateCleanerDialogOpen, setIsCreateCleanerDialogOpen] = useState(false)
  const [isCleanerDetailsDialogOpen, setIsCleanerDetailsDialogOpen] = useState(false)
  const [isEditCleanerDialogOpen, setIsEditCleanerDialogOpen] = useState(false)
  const [selectedCleanerId, setSelectedCleanerId] = useState<string | null>(null)
  const [isCreateChecklistDialogOpen, setIsCreateChecklistDialogOpen] = useState(false)
  
  const queryClient = useQueryClient()
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const orgId = currentOrgId

  // Открываем диалог деталей при наличии id в URL
  useEffect(() => {
    const cleaningId = searchParams.get('id')
    if (cleaningId) {
      setSelectedCleaningId(cleaningId)
      setIsDetailsDialogOpen(true)
    }
  }, [searchParams])

  // Запрос уборок
  const { data: cleaningsData, isLoading: cleaningsLoading } = useQuery({
    queryKey: ['cleanings', orgId, filters.status, filters.cleanerId],
    queryFn: () => graphqlClient.request(GET_CLEANINGS, {
      orgId: orgId!,
      status: filters.status || undefined,
      cleanerId: filters.cleanerId || undefined,
      first: 50
    }),
    enabled: !!orgId
  })

  // Запрос уборщиков (все - и активные, и деактивированные)
  const { data: cleanersData } = useQuery({
    queryKey: ['cleaners', orgId],
    queryFn: () => graphqlClient.request(GET_CLEANERS, {
      orgId: orgId!,
      // Не фильтруем по isActive - показываем всех
      first: 100
    }),
    enabled: !!orgId
  })

  // Запрос объектов недвижимости
  const { data: propertiesData } = useQuery({
    queryKey: ['properties', orgId],
    queryFn: () => graphqlClient.request(GET_PROPERTIES_BY_ORG, {
      orgId: orgId!
    }),
    enabled: !!orgId
  })

  // Получаем все units из всех properties
  const properties = (propertiesData as any)?.propertiesByOrgId || []
  
  // Запросы для получения units каждого property
  const unitsQueries = useQuery({
    queryKey: ['all-units', orgId, properties.map((p: any) => p.id).join(',')],
    queryFn: async () => {
      if (properties.length === 0) return []
      
      const allUnitsPromises = properties.map((property: any) =>
        graphqlClient.request(GET_UNITS_BY_PROPERTY, { propertyId: property.id })
      )
      
      const results = await Promise.all(allUnitsPromises)
      const allUnits = results.flatMap((result: any) => result.unitsByPropertyId || [])
      return allUnits
    },
    enabled: !!orgId && properties.length > 0
  })

  const allUnits = unitsQueries.data || []

  // Мутации - startCleaningMutation удалена, теперь используем диалог

  const completeCleaningMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => 
      graphqlClient.request(COMPLETE_CLEANING, { id, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanings'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const cancelCleaningMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      graphqlClient.request(CANCEL_CLEANING, { id, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanings'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  // Мутация деактивации уборщика
  const deactivateCleanerMutation = useMutation({
    mutationFn: (id: string) => graphqlClient.request(DEACTIVATE_CLEANER, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaners'] })
    },
    onError: (error: any) => {
      alert(`Ошибка: ${error.message || 'Не удалось деактивировать уборщика'}`)
    }
  })

  // Мутация активации уборщика
  const activateCleanerMutation = useMutation({
    mutationFn: (id: string) => graphqlClient.request(ACTIVATE_CLEANER, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaners'] })
    },
    onError: (error: any) => {
      alert(`Ошибка: ${error.message || 'Не удалось активировать уборщика'}`)
    }
  })

  const handleDeactivateCleaner = (cleanerId: string, cleanerName: string) => {
    if (confirm(`Вы уверены, что хотите деактивировать уборщика ${cleanerName}?\n\nУборщик будет перемещен в деактивированные, но его можно будет активировать снова.`)) {
      deactivateCleanerMutation.mutate(cleanerId)
    }
  }

  const handleActivateCleaner = (cleanerId: string, cleanerName: string) => {
    if (confirm(`Вы уверены, что хотите активировать уборщика ${cleanerName}?`)) {
      activateCleanerMutation.mutate(cleanerId)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'SCHEDULED': { color: 'orange' as const, text: 'Запланирована' },
      'IN_PROGRESS': { color: 'blue' as const, text: 'В процессе' },
      'COMPLETED': { color: 'green' as const, text: 'Завершена' },
      'APPROVED': { color: 'green' as const, text: 'Проверена' },
      'CANCELLED': { color: 'red' as const, text: 'Отменена' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'zinc' as const, text: status }
    return <Badge color={statusInfo.color}>{statusInfo.text}</Badge>
  }

  if (orgLoading || !orgId) {
    return (
      <div className="space-y-6">
        <div>
          <Heading level={1}>Уборки</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Загрузка организации...
          </Text>
        </div>
      </div>
    )
  }

  if (cleaningsLoading) {
    return (
      <div className="space-y-6">
        <Heading level={1}>Уборки</Heading>
        <Text>Загрузка...</Text>
      </div>
    )
  }

  const cleanings = (cleaningsData as any)?.cleanings?.edges?.map((edge: any) => edge.node) || []
  const cleaners = (cleanersData as any)?.cleaners?.edges?.map((edge: any) => edge.node) || []

  // Подсчет статистики для уборок
  const totalCleanings = cleanings.length
  const scheduledCleanings = cleanings.filter((c: any) => c.status === 'SCHEDULED').length
  const inProgressCleanings = cleanings.filter((c: any) => c.status === 'IN_PROGRESS').length
  const completedCleanings = cleanings.filter((c: any) => c.status === 'COMPLETED').length
  const approvedCleanings = cleanings.filter((c: any) => c.status === 'APPROVED').length
  const cancelledCleanings = cleanings.filter((c: any) => c.status === 'CANCELLED').length

  // Подсчет статистики для уборщиков
  const totalCleaners = cleaners.length
  const activeCleaners = cleaners.filter((c: any) => c.isActive).length
  const inactiveCleaners = cleaners.filter((c: any) => !c.isActive).length

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <Heading level={1}>Управление уборками</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Уборки и уборщики в одном месте
          </Text>
        </div>
        {activeTab === 'cleanings' && (
          <Button 
            onClick={() => setIsScheduleDialogOpen(true)} 
            className="bg-black hover:bg-gray-800 text-white border-gray-600"
          >
            Запланировать уборку
          </Button>
        )}
        {activeTab === 'cleaners' && (
          <Button 
            onClick={() => setIsCreateCleanerDialogOpen(true)} 
            className="bg-black hover:bg-gray-800 text-white border-gray-600"
          >
            + Добавить уборщика
          </Button>
        )}
      </div>

      {/* Вкладки */}
      <div className="border-b border-gray-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('cleanings')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'cleanings'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            🧹 Уборки ({totalCleanings})
          </button>
          <button
            onClick={() => setActiveTab('cleaners')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'cleaners'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            👤 Уборщики ({totalCleaners})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'templates'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            📋 Чеклисты
          </button>
        </nav>
      </div>

      {/* Контент вкладки "Уборки" */}
      {activeTab === 'cleanings' && (
        <>
          {/* Статистика уборок */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="p-6">
          <Heading level={3} className="mb-4">Всего уборок</Heading>
          <Text className="text-2xl font-bold text-blue-600">{totalCleanings}</Text>
          <Text className="text-sm text-zinc-500">Уборок в системе</Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">Запланировано</Heading>
          <Text className="text-2xl font-bold text-orange-600">{scheduledCleanings}</Text>
          <Text className="text-sm text-zinc-500">
            {totalCleanings > 0 ? `${Math.round((scheduledCleanings / totalCleanings) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">В процессе</Heading>
          <Text className="text-2xl font-bold text-blue-600">{inProgressCleanings}</Text>
          <Text className="text-sm text-zinc-500">
            {totalCleanings > 0 ? `${Math.round((inProgressCleanings / totalCleanings) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">Завершены</Heading>
          <Text className="text-2xl font-bold text-green-600">{completedCleanings}</Text>
          <Text className="text-sm text-zinc-500">
            {totalCleanings > 0 ? `${Math.round((completedCleanings / totalCleanings) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">Проверены</Heading>
          <Text className="text-2xl font-bold text-green-700">{approvedCleanings}</Text>
          <Text className="text-sm text-zinc-500">
            {totalCleanings > 0 ? `${Math.round((approvedCleanings / totalCleanings) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">Отменены</Heading>
          <Text className="text-2xl font-bold text-red-600">{cancelledCleanings}</Text>
          <Text className="text-sm text-zinc-500">
            {totalCleanings > 0 ? `${Math.round((cancelledCleanings / totalCleanings) * 100)}%` : '0%'}
          </Text>
        </div>
      </div>

      {/* Фильтры */}
      <div className="space-y-4">
        <Heading level={2}>Фильтры</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Статус</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Все статусы</option>
              <option value="SCHEDULED">Запланирована</option>
              <option value="IN_PROGRESS">В процессе</option>
              <option value="COMPLETED">Завершена</option>
              <option value="APPROVED">Проверена</option>
              <option value="CANCELLED">Отменена</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Уборщик</label>
            <Select
              value={filters.cleanerId}
              onChange={(e) => setFilters({ ...filters, cleanerId: e.target.value })}
            >
              <option value="">Все уборщики</option>
              {cleaners.map((cleaner: any) => (
                <option key={cleaner.id} value={cleaner.id}>
                  {cleaner.firstName} {cleaner.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              onClick={() => setFilters({ status: '', cleanerId: '' })}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-gray-300 dark:border-zinc-600"
            >
              Сбросить фильтры
            </Button>
          </div>
        </div>
      </div>

      {/* Таблица уборок */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Heading level={2}>Уборки ({cleanings.length})</Heading>
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
            <Button
              onClick={() => setViewMode('table')}
              className={`p-2 bg-transparent hover:bg-gray-200 dark:hover:bg-zinc-600 border-0 text-gray-700 dark:text-gray-300 ${viewMode === 'table' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''}`}
              title="Таблица"
            >
              <TableCellsIcon className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setViewMode('cards')}
              className={`p-2 bg-transparent hover:bg-gray-200 dark:hover:bg-zinc-600 border-0 text-gray-700 dark:text-gray-300 ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''}`}
              title="Карточки"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setViewMode('kanban')}
              className={`p-2 bg-transparent hover:bg-gray-200 dark:hover:bg-zinc-600 border-0 text-gray-700 dark:text-gray-300 ${viewMode === 'kanban' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''}`}
              title="Канбан"
            >
              <ViewColumnsIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {cleanings.length === 0 ? (
          <div className="text-center py-12">
            <Text className="text-gray-500 dark:text-gray-400">
              Уборок не найдено
            </Text>
          </div>
        ) : viewMode === 'kanban' ? (
          <CleaningKanbanBoard
            cleanings={cleanings}
            onUpdateStatus={(cleaningId, status) => {
              if (status === 'COMPLETED') {
                completeCleaningMutation.mutate({ id: cleaningId, input: {} })
              } else if (status === 'IN_PROGRESS') {
                router.push(`/cleanings/${cleaningId}`)
              } else if (status === 'CANCELLED') {
                cancelCleaningMutation.mutate({ id: cleaningId, reason: 'Отменено' })
              }
            }}
          />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cleanings.map((cleaning: any) => (
              <CleaningCard
                key={cleaning.id}
                cleaning={cleaning}
                onUpdateStatus={(cleaningId, status) => {
                  if (status === 'COMPLETED') {
                    completeCleaningMutation.mutate({ id: cleaningId, input: {} })
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow className="bg-gray-50 dark:bg-zinc-900">
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Запланировано</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Квартира</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Уборщик</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Связь</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Смена белья</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Документы</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {cleanings.map((cleaning: any) => (
                  <TableRow 
                    key={cleaning.id} 
                    className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150 cursor-pointer"
                    onClick={() => router.push(`/cleanings/${cleaning.id}`)}
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(cleaning.status)}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Text className="text-sm text-gray-900 dark:text-white">
                        {new Date(cleaning.scheduledAt).toLocaleString()}
                      </Text>
                      {cleaning.startedAt && (
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          Начата: {new Date(cleaning.startedAt).toLocaleTimeString()}
                        </Text>
                      )}
                      {cleaning.completedAt && (
                        <Text className="text-xs text-green-600">
                          Завершена: {new Date(cleaning.completedAt).toLocaleTimeString()}
                        </Text>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Text className="font-medium text-gray-900 dark:text-white">{cleaning.unit?.name || 'N/A'}</Text>
                      {cleaning.booking && (
                        <Badge color="purple">С бронированием</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Text className="font-medium text-gray-900 dark:text-white">
                          {cleaning.cleaner?.firstName} {cleaning.cleaner?.lastName}
                        </Text>
                        {cleaning.cleaner?.rating && (
                          <Text className="text-sm text-gray-500 dark:text-gray-400">
                            ⭐ {cleaning.cleaner.rating.toFixed(1)}
                          </Text>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {cleaning.taskId ? (
                        <div className="space-y-1">
                          <Badge color="purple">Связана с задачей</Badge>
                          <a 
                            href={`/tasks`}
                            className="text-xs text-blue-600 hover:text-blue-800 block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Перейти к задачам →
                          </a>
                        </div>
                      ) : (
                        <Text className="text-gray-500 dark:text-gray-400 text-sm">Без задачи</Text>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {cleaning.requiresLinenChange ? (
                        <Badge color="blue">Да</Badge>
                      ) : (
                        <Badge color="zinc">Нет</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {cleaning.documents && cleaning.documents.length > 0 ? (
                        <div className="space-y-1">
                          {cleaning.documents.map((doc: any) => (
                            <div key={doc.id}>
                              <Badge color={doc.type === 'PRE_CLEANING_ACCEPTANCE' ? 'orange' : 'green'}>
                                {doc.type === 'PRE_CLEANING_ACCEPTANCE' ? 'Приемка' : 'Сдача'}
                                {doc.photos && ` (${doc.photos.length}📷)`}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Text className="text-gray-500 dark:text-gray-400">-</Text>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
        </>
      )}

      {/* Контент вкладки "Уборщики" */}
      {activeTab === 'cleaners' && (
        <>
          {/* Статистика уборщиков */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
              <Heading level={3} className="mb-2">Всего уборщиков</Heading>
              <Text className="text-3xl font-bold text-blue-600">{totalCleaners}</Text>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
              <Heading level={3} className="mb-2">Активных</Heading>
              <Text className="text-3xl font-bold text-green-600">{activeCleaners}</Text>
              <Text className="text-sm text-zinc-500">
                {totalCleaners > 0 ? `${Math.round((activeCleaners / totalCleaners) * 100)}%` : '0%'}
              </Text>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
              <Heading level={3} className="mb-2">Неактивных</Heading>
              <Text className="text-3xl font-bold text-red-600">{inactiveCleaners}</Text>
              <Text className="text-sm text-zinc-500">
                {totalCleaners > 0 ? `${Math.round((inactiveCleaners / totalCleaners) * 100)}%` : '0%'}
              </Text>
            </div>
          </div>

          {/* Информационный блок для новых пользователей */}
          {totalCleaners === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
              <Heading level={3} className="text-blue-900 dark:text-blue-100 mb-2">
                👋 Добро пожаловать!
              </Heading>
              <Text className="text-blue-800 dark:text-blue-200 mb-4">
                У вас пока нет уборщиков. Чтобы начать планировать уборки, добавьте первого уборщика.
              </Text>
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <p><strong>Шаг 1:</strong> Убедитесь, что у вас есть пользователь в системе (страница IAM)</p>
                <p><strong>Шаг 2:</strong> Нажмите кнопку &ldquo;+ Добавить уборщика&rdquo;</p>
                <p><strong>Шаг 3:</strong> Выберите пользователя и заполните данные</p>
              </div>
            </div>
          )}

          {/* Таблица уборщиков */}
          {totalCleaners > 0 && (
            <div className="space-y-4">
              <Heading level={2}>Список уборщиков ({totalCleaners})</Heading>
              
              <div className="overflow-x-auto">
                <Table className="min-w-full bg-white dark:bg-zinc-800">
                  <TableHead>
                    <TableRow className="bg-gray-50 dark:bg-zinc-900">
                      <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</TableHeader>
                      <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ФИО</TableHeader>
                      <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Контакты</TableHeader>
                      <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Рейтинг</TableHeader>
                      <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Дата создания</TableHeader>
                      <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Действия</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cleaners.map((cleaner: any) => (
                      <TableRow 
                        key={cleaner.id} 
                        className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150"
                      >
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          {cleaner.isActive ? (
                            <Badge color="green">Активен</Badge>
                          ) : (
                            <Badge color="red">Неактивен</Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <Text className="font-medium text-gray-900 dark:text-white">
                              {cleaner.firstName} {cleaner.lastName}
                            </Text>
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {cleaner.id.substring(0, 8)}...
                            </Text>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="space-y-1">
                            {cleaner.phone && (
                              <Text className="text-sm text-gray-900 dark:text-white">
                                📞 {cleaner.phone}
                              </Text>
                            )}
                            {cleaner.email && (
                              <Text className="text-sm text-gray-900 dark:text-white">
                                ✉️ {cleaner.email}
                              </Text>
                            )}
                            {!cleaner.phone && !cleaner.email && (
                              <Text className="text-sm text-gray-500 dark:text-gray-400">
                                Нет контактов
                              </Text>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          {cleaner.rating ? (
                            <div>
                              <Text className="text-lg font-bold text-yellow-600">
                                ⭐ {cleaner.rating.toFixed(1)}
                              </Text>
                            </div>
                          ) : (
                            <Text className="text-gray-500 dark:text-gray-400">
                              Нет рейтинга
                            </Text>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <Text className="text-sm text-gray-900 dark:text-white">
                            {new Date(cleaner.createdAt).toLocaleDateString()}
                          </Text>
                          <Text className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(cleaner.createdAt).toLocaleTimeString()}
                          </Text>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <Dropdown>
                            <DropdownButton className="bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300">
                              <EllipsisVerticalIcon className="w-5 h-5" />
                            </DropdownButton>
                            <DropdownMenu className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg">
                              <DropdownItem onClick={() => {
                                setSelectedCleanerId(cleaner.id)
                                setIsCleanerDetailsDialogOpen(true)
                              }}>
                                Подробнее
                              </DropdownItem>
                              <DropdownItem onClick={() => {
                                setSelectedCleanerId(cleaner.id)
                                setIsEditCleanerDialogOpen(true)
                              }}>
                                Редактировать
                              </DropdownItem>
                              {cleaner.isActive ? (
                                <DropdownItem 
                                  onClick={() => handleDeactivateCleaner(cleaner.id, `${cleaner.firstName} ${cleaner.lastName}`)}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  Деактивировать
                                </DropdownItem>
                              ) : (
                                <DropdownItem 
                                  onClick={() => handleActivateCleaner(cleaner.id, `${cleaner.firstName} ${cleaner.lastName}`)}
                                  className="text-green-600 dark:text-green-400"
                                >
                                  Активировать
                                </DropdownItem>
                              )}
                            </DropdownMenu>
                          </Dropdown>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Контент вкладки "Чеклисты" */}
      {activeTab === 'templates' && (
        <div className="max-w-6xl mx-auto py-8">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            {/* Header with Create Checklist button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex-1">
                <Heading level={2} className="mb-2">Темплейты чеклистов</Heading>
                <Text className="text-zinc-600 dark:text-zinc-400">
                  Управление чеклистами для каждого юнита. Создайте или отредактируйте чеклист для конкретного юнита.
                </Text>
              </div>
              <Button 
                onClick={() => setIsCreateChecklistDialogOpen(true)}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">📋 Создать чеклист</span>
                <span className="sm:hidden">📋 Создать</span>
              </Button>
            </div>
            
            {/* Список юнитов с темплейтами */}
            <div className="space-y-4">
              {allUnits.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-4">
                    <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <Heading level={3} className="mb-2">Нет юнитов</Heading>
                  <Text className="text-zinc-600 dark:text-zinc-400 mb-4">
                    Сначала создайте юниты в разделе &quot;Объекты недвижимости&quot;
                  </Text>
                  <Button
                    onClick={() => router.push('/inventory')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Перейти к объектам
                  </Button>
                </div>
              ) : (
                allUnits.map((unit: any) => (
                  <button
                    key={unit.id}
                    onClick={() => router.push(`/inventory/units/${unit.id}?tab=checklist`)}
                    className="w-full text-left bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Text className="font-medium text-zinc-900 dark:text-white mb-1">
                          {unit.name}
                        </Text>
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                          {unit.property?.title || 'Без объекта'}
                        </Text>
                        {unit.property?.address && (
                          <Text className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                            {unit.property.address}
                          </Text>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Text className="text-sm text-blue-600 dark:text-blue-400">
                          Редактировать чеклист
                        </Text>
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Диалог планирования уборки */}
      <ScheduleCleaningDialog
        isOpen={isScheduleDialogOpen}
        onClose={() => setIsScheduleDialogOpen(false)}
        orgId={orgId || ''}
        units={allUnits}
      />

      {/* Диалог деталей уборки */}
      <CleaningDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => {
          setIsDetailsDialogOpen(false)
          setSelectedCleaningId(null)
          // Удаляем id из URL при закрытии диалога
          router.push('/cleanings')
        }}
        cleaningId={selectedCleaningId}
      />

      {/* Диалог создания уборщика */}
      <CreateCleanerDialog
        isOpen={isCreateCleanerDialogOpen}
        onClose={() => setIsCreateCleanerDialogOpen(false)}
        orgId={orgId || ''}
      />

      {/* Диалог деталей уборщика */}
      <CleanerDetailsDialog
        isOpen={isCleanerDetailsDialogOpen}
        onClose={() => {
          setIsCleanerDetailsDialogOpen(false)
          setSelectedCleanerId(null)
        }}
        cleanerId={selectedCleanerId}
        orgId={orgId || ''}
      />

      {/* Диалог редактирования уборщика */}
      <EditCleanerDialog
        isOpen={isEditCleanerDialogOpen}
        onClose={() => {
          setIsEditCleanerDialogOpen(false)
          setSelectedCleanerId(null)
        }}
        cleanerId={selectedCleanerId}
      />

      <CreateChecklistDialog
        open={isCreateChecklistDialogOpen}
        onClose={() => setIsCreateChecklistDialogOpen(false)}
        onSuccess={() => {
          setIsCreateChecklistDialogOpen(false)
          // Обновляем данные
        }}
      />
    </div>
  )
}

export default function CleaningsPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <CleaningsPageContent />
    </Suspense>
  )
}

