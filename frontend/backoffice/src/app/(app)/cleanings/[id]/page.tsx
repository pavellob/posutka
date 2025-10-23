'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Checkbox, CheckboxField, CheckboxGroup } from '@/components/checkbox'
import { Label } from '@/components/fieldset'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/dialog'
import { graphqlClient } from '@/lib/graphql-client'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeftIcon,
  HomeIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'

const GET_CLEANING = `
  query GetCleaning($id: UUID!) {
    cleaning(id: $id) {
      id
      status
      scheduledAt
      startedAt
      completedAt
      requiresLinenChange
      notes
      unit {
        id
        name
        property {
          id
          title
        }
      }
      cleaner {
        id
        firstName
        lastName
        telegramUsername
        rating
      }
      checklistItems {
        id
        label
        isChecked
        order
      }
    }
  }
`

const START_CLEANING = `
  mutation StartCleaning($id: UUID!) {
    startCleaning(id: $id) {
      id
      status
      startedAt
    }
  }
`

const COMPLETE_CLEANING = `
  mutation CompleteCleaning($id: UUID!) {
    completeCleaning(id: $id, input: {}) {
      id
      status
      completedAt
    }
  }
`

const UPDATE_CHECKLIST = `
  mutation UpdateCleaningChecklist($id: UUID!, $items: [ChecklistItemInput!]!) {
    updateCleaningChecklist(id: $id, items: $items) {
      id
      checklistItems {
        id
        label
        isChecked
        order
      }
    }
  }
`

const ASSIGN_CLEANING_TO_ME = `
  mutation AssignCleaningToMe($cleaningId: UUID!) {
    assignCleaningToMe(cleaningId: $cleaningId) {
      id
      status
      cleaner {
        id
        firstName
        lastName
      }
    }
  }
`

type CleaningDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

export default function CleaningDetailsPage(props: CleaningDetailsPageProps) {
  const params = use(props.params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'details' | 'checklist'>('details')
  const [showAssignDialog, setShowAssignDialog] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['cleaning', params.id],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_CLEANING, {
        id: params.id
      }) as any
      return response.cleaning
    }
  })

  const startMutation = useMutation({
    mutationFn: async () => {
      return await graphqlClient.request(START_CLEANING, {
        id: params.id
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', params.id] })
    }
  })

  const updateChecklistMutation = useMutation({
    mutationFn: async (items: Array<{ label: string; isChecked: boolean; order: number }>) => {
      return await graphqlClient.request(UPDATE_CHECKLIST, {
        id: params.id,
        items
      })
    },
    onSuccess: () => {
      // Просто перезагружаем данные с сервера
      queryClient.invalidateQueries({ queryKey: ['cleaning', params.id] })
    }
  })

  const completeMutation = useMutation({
    mutationFn: async () => {
      return await graphqlClient.request(COMPLETE_CLEANING, {
        id: params.id
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', params.id] })
    }
  })

  const assignCleaningMutation = useMutation({
    mutationFn: async () => {
      return await graphqlClient.request(ASSIGN_CLEANING_TO_ME, {
        cleaningId: params.id
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', params.id] })
      // Показываем уведомление об успехе и перенаправляем на страницу уборки
      setTimeout(() => {
        router.push(`/cleanings/${params.id}`)
      }, 1000)
    },
    onError: (error: any) => {
      console.error('Failed to assign cleaning:', error)
      alert('❌ Ошибка при назначении уборки: ' + (error.message || 'Неизвестная ошибка'))
    }
  })

  const handleAssignCleaning = useCallback(() => {
    setShowAssignDialog(true)
  }, [])

  const handleConfirmAssign = () => {
    assignCleaningMutation.mutate()
    setShowAssignDialog(false)
  }

  const handleCancelAssign = () => {
    setShowAssignDialog(false)
  }

  // Открываем нужную вкладку из URL параметра
  useEffect(() => {
    const tab = searchParams.get('tab')
    const action = searchParams.get('action')
    
    if (tab === 'checklist') {
      setActiveTab('checklist')
    }
    
    if (action === 'assign') {
      // Показываем диалог назначения уборки
      handleAssignCleaning()
    }
  }, [searchParams, handleAssignCleaning])

  const handleToggleCheckbox = (itemId: string) => {
    if (!data?.checklistItems || updateChecklistMutation.isPending) return
    
    console.log('🖱️ Checkbox clicked:', {
      itemId,
      currentItemsCount: data.checklistItems.length,
      hasDuplicates: data.checklistItems.length !== new Set(data.checklistItems.map((i: any) => i.id)).size
    })
    
    // Отправляем обновление на сервер (все items с актуальным состоянием)
    const updatedItems = data.checklistItems.map((item: any) => ({
      label: item.label,
      isChecked: item.id === itemId ? !item.isChecked : item.isChecked,
      order: item.order
    }))
    
    console.log('📤 Sending to server:', {
      itemsCount: updatedItems.length,
      items: updatedItems
    })
    
    updateChecklistMutation.mutate(updatedItems)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <Text>Загрузка...</Text>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <Heading>Уборка не найдена</Heading>
        <Button onClick={() => router.push('/cleanings')} className="mt-4">
          Вернуться к списку
        </Button>
      </div>
    )
  }

  const cleaning = data
  const scheduledDate = new Date(cleaning.scheduledAt)
  const formattedDate = scheduledDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const formattedTime = scheduledDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const statusColors: Record<string, string> = {
    SCHEDULED: 'blue',
    IN_PROGRESS: 'yellow',
    COMPLETED: 'green',
    CANCELLED: 'red',
  }

  const statusLabels: Record<string, string> = {
    SCHEDULED: 'Запланирована',
    IN_PROGRESS: 'В процессе',
    COMPLETED: 'Завершена',
    CANCELLED: 'Отменена',
  }

  const completedItems = cleaning.checklistItems?.filter((item: any) => item.isChecked).length || 0
  const totalItems = cleaning.checklistItems?.length || 0

  return (
    <div className="max-w-5xl mx-auto">
      {/* Хлебные крошки */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <button 
          onClick={() => router.push('/cleanings')}
          className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          Уборки
        </button>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-900 dark:text-white font-medium">
          {cleaning.unit.property?.title} - {cleaning.unit.name}
        </span>
      </div>

      {/* Заголовок */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
              <HomeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <Heading>{cleaning.unit.property?.title}</Heading>
              <Text className="text-zinc-600 dark:text-zinc-400">{cleaning.unit.name}</Text>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge color={statusColors[cleaning.status] as any}>
              {statusLabels[cleaning.status] || cleaning.status}
            </Badge>
            {cleaning.requiresLinenChange && (
              <Badge color="amber">Требуется смена белья</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {cleaning.status === 'SCHEDULED' && (
            <Button 
              onClick={() => startMutation.mutate()} 
              disabled={startMutation.isPending}
              color="blue"
            >
              {startMutation.isPending ? 'Начинаем...' : '▶️ Начать'}
            </Button>
          )}
          {cleaning.status === 'IN_PROGRESS' && (
            <>
              <Button 
                onClick={() => completeMutation.mutate()} 
                disabled={completeMutation.isPending || completedItems < totalItems}
                color="green"
                title={completedItems < totalItems ? 'Выполните все пункты чеклиста' : ''}
              >
                {completeMutation.isPending ? 'Завершение...' : '✅ Завершить'}
              </Button>
              {completedItems < totalItems && (
                <Badge color="amber" className="self-center">
                  Осталось: {totalItems - completedItems}
                </Badge>
              )}
            </>
          )}
          <Button onClick={() => router.back()} outline>
            <ArrowLeftIcon className="w-4 h-4" />
            Назад
          </Button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="border-b border-gray-200 dark:border-zinc-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'details'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            📄 Детали
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'checklist'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            ✅ Чеклист {totalItems > 0 && `(${completedItems}/${totalItems})`}
          </button>
        </nav>
      </div>

      {/* Контент вкладки "Детали" */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка */}
        <div className="lg:col-span-1 space-y-6">
          {/* Информация о времени */}
          <section className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
            <Subheading className="mb-4">Время</Subheading>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <Text className="text-xs text-zinc-500 mb-1">Запланирована</Text>
                  <Text className="font-medium">{formattedDate}</Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">{formattedTime}</Text>
                </div>
              </div>
              
              {cleaning.startedAt && (
                <div className="flex items-start gap-3">
                  <ClockIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <Text className="text-xs text-zinc-500 mb-1">Начата</Text>
                    <Text className="font-medium">
                      {new Date(cleaning.startedAt).toLocaleString('ru-RU')}
                    </Text>
                  </div>
                </div>
              )}
              
              {cleaning.completedAt && (
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <Text className="text-xs text-zinc-500 mb-1">Завершена</Text>
                    <Text className="font-medium">
                      {new Date(cleaning.completedAt).toLocaleString('ru-RU')}
                    </Text>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Уборщик */}
          {cleaning.cleaner && (
            <section className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
              <Subheading className="mb-4">Уборщик</Subheading>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {cleaning.cleaner.firstName[0]}{cleaning.cleaner.lastName[0]}
                </div>
                <div className="flex-1">
                  <Text className="font-medium">
                    {cleaning.cleaner.firstName} {cleaning.cleaner.lastName}
                  </Text>
                  {cleaning.cleaner.telegramUsername && (
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                      @{cleaning.cleaner.telegramUsername}
                    </Text>
                  )}
                  {cleaning.cleaner.rating && (
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                      ⭐ {cleaning.cleaner.rating.toFixed(1)}
                    </Text>
                  )}
                </div>
              </div>
            </section>
          )}

          {!cleaning.cleaner && cleaning.status === 'SCHEDULED' && (
            <section className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-6 border border-amber-200 dark:border-amber-800">
              <Subheading className="mb-2">Уборщик не назначен</Subheading>
              <Text className="text-sm text-amber-900 dark:text-amber-100">
                Уборка ожидает назначения уборщика
              </Text>
            </section>
          )}

          {/* Заметки */}
          {cleaning.notes && (
            <section className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
              <Subheading className="mb-3">Заметки</Subheading>
              <Text className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {cleaning.notes}
              </Text>
            </section>
          )}
        </div>
      </div>
      )}

      {/* Контент вкладки "Чеклист" */}
      {activeTab === 'checklist' && (
        <div className="max-w-4xl">
          {cleaning.status !== 'IN_PROGRESS' && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <Text className="text-sm text-amber-900 dark:text-amber-100">
                {cleaning.status === 'SCHEDULED' ? (
                  <>⏸️ Чеклист станет доступен после начала уборки. Нажмите кнопку &quot;▶️ Начать&quot; выше.</>
                ) : cleaning.status === 'COMPLETED' ? (
                  <>✅ Уборка завершена. Чеклист доступен только для просмотра.</>
                ) : (
                  <>❌ Чеклист недоступен для редактирования.</>
                )}
              </Text>
            </div>
          )}

          <section className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <Subheading>Чеклист</Subheading>
              <div className="flex items-center gap-4">
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                  {completedItems} из {totalItems} выполнено
                </Text>
                <Badge color={completedItems === totalItems && totalItems > 0 ? 'green' : 'amber'}>
                  {Math.round((completedItems / (totalItems || 1)) * 100)}%
                </Badge>
              </div>
            </div>

            {cleaning.checklistItems && cleaning.checklistItems.length > 0 ? (
              <CheckboxGroup>
                {cleaning.checklistItems
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((item: any) => {
                    const canEdit = cleaning.status === 'IN_PROGRESS'
                    
                    return (
                      <CheckboxField key={item.id}>
                        <Checkbox
                          checked={item.isChecked}
                          onChange={() => handleToggleCheckbox(item.id)}
                          disabled={!canEdit || updateChecklistMutation.isPending}
                          color="green"
                        />
                        <Label className={item.isChecked ? 'line-through text-zinc-500' : ''}>
                          <span className="text-zinc-500 font-mono text-xs mr-2">{item.order}.</span>
                          {item.label}
                        </Label>
                      </CheckboxField>
                    )
                  })}
              </CheckboxGroup>
            ) : (
              <div className="text-center py-12">
                <Text className="text-zinc-500">Чеклист пуст</Text>
              </div>
            )}

            {/* Прогресс бар */}
            {totalItems > 0 && (
              <div className="mt-6">
                <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(completedItems / totalItems) * 100}%` }}
                  />
                </div>
                <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 text-center">
                  {completedItems === totalItems && totalItems > 0
                    ? '🎉 Все пункты выполнены! Можно завершить уборку.'
                    : `Осталось выполнить: ${totalItems - completedItems} пунктов`}
                </Text>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Техническая информация */}
      <div className="mt-8">
        <details className="group">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
            Техническая информация
          </summary>
          <div className="mt-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <dl className="space-y-2 text-sm">
              <div className="flex">
                <dt className="w-32 text-zinc-600 dark:text-zinc-400">ID уборки:</dt>
                <dd className="font-mono text-zinc-900 dark:text-white">{cleaning.id}</dd>
              </div>
              {cleaning.unit && (
                <div className="flex">
                  <dt className="w-32 text-zinc-600 dark:text-zinc-400">ID юнита:</dt>
                  <dd className="font-mono text-zinc-900 dark:text-white">{cleaning.unit.id}</dd>
                </div>
              )}
              {cleaning.cleaner && (
                <div className="flex">
                  <dt className="w-32 text-zinc-600 dark:text-zinc-400">ID уборщика:</dt>
                  <dd className="font-mono text-zinc-900 dark:text-white">{cleaning.cleaner.id}</dd>
                </div>
              )}
            </dl>
          </div>
        </details>
      </div>

      {/* Диалог назначения уборки */}
      <Dialog open={showAssignDialog} onClose={handleCancelAssign}>
        <DialogTitle>
          {data?.cleaner ? '⚠️ Уборка уже назначена' : '🎯 Взять уборку в работу'}
        </DialogTitle>
        <DialogDescription>
          {data?.cleaner 
            ? `Эта уборка уже назначена на уборщика ${data.cleaner.firstName} ${data.cleaner.lastName}.`
            : 'Вы хотите взять эту уборку в работу? После назначения вы сможете начать выполнение уборки.'
          }
        </DialogDescription>
        <DialogBody>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <HomeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <Text className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {data?.unit?.name}
                </Text>
                <Text className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  {data?.unit?.property?.title}
                </Text>
                {data?.scheduledAt && (
                  <Text className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                    📅 {new Date(data.scheduledAt).toLocaleString('ru-RU')}
                  </Text>
                )}
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button outline onClick={handleCancelAssign} disabled={assignCleaningMutation.isPending}>
            {data?.cleaner ? 'Закрыть' : 'Отмена'}
          </Button>
          {!data?.cleaner && (
            <Button 
              onClick={handleConfirmAssign} 
              disabled={assignCleaningMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {assignCleaningMutation.isPending ? 'Назначаем...' : '🎯 Взять уборку'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  )
}

