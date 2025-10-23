'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Dialog } from '@/components/dialog'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown'
import { 
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { GET_TASK_BY_ID, UPDATE_TASK_STATUS, ASSIGN_TASK, GET_CLEANING_BY_TASK } from '@/lib/graphql-queries'
import type { GetTaskByIdQuery } from '@/lib/generated/graphql'

type Task = NonNullable<GetTaskByIdQuery['task']>

// Тип для ответа запроса уборки по задаче
type CleaningByTaskResponse = {
  cleaningByTask?: {
    id: string
    status: string
    cleaner?: {
      firstName: string
      lastName: string
    }
  } | null
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const [showAssignDialog, setShowAssignDialog] = useState(false)

  // Разворачиваем params с помощью React.use()
  const { id } = use(params)

  // Запрос задачи по ID
  const { data: taskData, isLoading: taskLoading, error: taskError } = useQuery<GetTaskByIdQuery>({
    queryKey: ['task', id],
    queryFn: () => graphqlClient.request(GET_TASK_BY_ID, { id }),
    enabled: !!id
  })

  // Запрос связанной уборки (только для задач типа CLEANING)
  const { data: cleaningData } = useQuery<CleaningByTaskResponse>({
    queryKey: ['cleaningByTask', id],
    queryFn: () => graphqlClient.request(GET_CLEANING_BY_TASK, { taskId: id }),
    enabled: !!id && taskData?.task?.type === 'CLEANING'
  })

  // Мутация обновления статуса
  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      graphqlClient.request(UPDATE_TASK_STATUS, { id, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  // Мутация назначения задачи
  const assignTaskMutation = useMutation({
    mutationFn: (input: any) => graphqlClient.request(ASSIGN_TASK, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowAssignDialog(false)
    }
  })

  const handleUpdateStatus = async (status: string) => {
    if (taskData?.task) {
      await updateTaskStatusMutation.mutateAsync({ 
        id: taskData.task.id, 
        status 
      })
    }
  }

  const handleAssignTask = async (assigneeId: string) => {
    if (taskData?.task) {
      await assignTaskMutation.mutateAsync({
        taskId: taskData.task.id,
        providerId: assigneeId
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'TODO': { color: 'orange' as const, text: 'Ожидает' },
      'IN_PROGRESS': { color: 'blue' as const, text: 'В работе' },
      'DONE': { color: 'green' as const, text: 'Завершена' },
      'CANCELED': { color: 'red' as const, text: 'Отменена' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'zinc' as const, text: status }
    return <Badge color={statusInfo.color}>{statusInfo.text}</Badge>
  }

  const getTypeBadge = (type: string) => {
    const typeMap = {
      'CLEANING': { color: 'blue' as const, text: 'Уборка' },
      'CHECKIN': { color: 'green' as const, text: 'Заселение' },
      'CHECKOUT': { color: 'purple' as const, text: 'Выселение' },
      'MAINTENANCE': { color: 'orange' as const, text: 'Обслуживание' },
      'INVENTORY': { color: 'cyan' as const, text: 'Инвентаризация' }
    }
    const typeInfo = typeMap[type as keyof typeof typeMap] || { color: 'zinc' as const, text: type }
    return <Badge color={typeInfo.color}>{typeInfo.text}</Badge>
  }

  if (orgLoading || taskLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <Text>Загрузка задачи...</Text>
        </div>
      </div>
    )
  }

  if (taskError || !taskData?.task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Text className="text-red-600 mb-4">Ошибка загрузки задачи</Text>
          <Text className="text-zinc-500 mb-4">Задача не найдена или произошла ошибка</Text>
          <Button onClick={() => router.back()}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </div>
      </div>
    )
  }

  const task = taskData.task

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => router.back()}
            className="border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <div>
            <Heading level={1}>Детали задачи</Heading>
            <Text className="text-zinc-600 dark:text-zinc-400 mt-1">
              ID: {task.id}
            </Text>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {getTypeBadge(task.type)}
          {getStatusBadge(task.status)}
          <Dropdown>
            <DropdownButton className="bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300">
              <EllipsisVerticalIcon className="w-5 h-5" />
            </DropdownButton>
            <DropdownMenu className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg">
              <DropdownItem onClick={() => router.push(`/tasks/${task.id}/edit`)}>
                <PencilIcon className="w-4 h-4 mr-2" />
                Редактировать
              </DropdownItem>
              {task.status === 'TODO' && (
                <DropdownItem onClick={() => setShowAssignDialog(true)}>
                  <UserIcon className="w-4 h-4 mr-2" />
                  Назначить исполнителя
                </DropdownItem>
              )}
              {task.status === 'IN_PROGRESS' && (
                <DropdownItem onClick={() => handleUpdateStatus('DONE')}>
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Завершить
                </DropdownItem>
              )}
              {(task.status === 'TODO' || task.status === 'IN_PROGRESS') && (
                <DropdownItem onClick={() => handleUpdateStatus('CANCELED')}>
                  <XCircleIcon className="w-4 h-4 mr-2" />
                  Отменить
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {/* Основная информация */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Левая колонка - основная информация */}
        <div className="lg:col-span-2 space-y-6">
          {/* Описание задачи */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4">Описание</Subheading>
            {task.note ? (
              <Text className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {task.note}
              </Text>
            ) : (
              <Text className="text-zinc-500 italic">Описание не указано</Text>
            )}
          </div>

          {/* Связанные объекты */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4">Связанные объекты</Subheading>
            <div className="space-y-4">
              {/* Объект недвижимости */}
              {task.unit?.property && (
                <div 
                  className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                  onClick={() => router.push(`/inventory/properties/${task.unit?.property?.id}`)}
                >
                  <HomeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {task.unit.property.title}
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      Юнит: {task.unit.name}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {task.unit.property.address}
                    </Text>
                    <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      🔗 Нажмите для перехода к объекту
                    </Text>
                  </div>
                </div>
              )}

              {/* Юнит (если есть отдельно) */}
              {task.unit && !task.unit.property && (
                <div 
                  className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                  onClick={() => router.push(`/inventory/units/${task.unit?.id}`)}
                >
                  <HomeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <Text className="font-medium text-gray-900 dark:text-white">
                      Юнит: {task.unit.name}
                    </Text>
                    <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      🔗 Нажмите для перехода к юниту
                    </Text>
                  </div>
                </div>
              )}

              {/* Бронирование */}
              {task.booking && (
                <div 
                  className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                  onClick={() => router.push(`/bookings/${task.booking?.id}`)}
                >
                  <CalendarIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {task.booking.guest.name}
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {task.booking.guest.email}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(task.booking.checkIn).toLocaleDateString('ru-RU')} - {new Date(task.booking.checkOut).toLocaleDateString('ru-RU')}
                    </Text>
                    <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      🔗 Нажмите для перехода к бронированию
                    </Text>
                  </div>
                </div>
              )}

              {/* Информация о связи с уборкой для задач типа CLEANING */}
              {task.type === 'CLEANING' && (
                <div 
                  className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                  onClick={() => {
                    // Если есть связанная уборка, переходим к ней, иначе к списку уборок
                    const cleaning = cleaningData?.cleaningByTask as CleaningByTaskResponse['cleaningByTask']
                    if (cleaning?.id) {
                      router.push(`/cleanings/${cleaning.id}`)
                    } else {
                      router.push('/cleanings')
                    }
                  }}
                >
                  <SparklesIcon className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {cleaningData?.cleaningByTask ? 'Уборка создана' : 'Уборка не создана'}
                    </Text>
                    {cleaningData?.cleaningByTask ? (
                      <>
                        <Text className="text-sm text-gray-500 dark:text-gray-400">
                          Статус: {(cleaningData.cleaningByTask as CleaningByTaskResponse['cleaningByTask'])?.status === 'SCHEDULED' ? 'Запланирована' :
                                   (cleaningData.cleaningByTask as CleaningByTaskResponse['cleaningByTask'])?.status === 'IN_PROGRESS' ? 'В процессе' :
                                   (cleaningData.cleaningByTask as CleaningByTaskResponse['cleaningByTask'])?.status === 'COMPLETED' ? 'Завершена' : (cleaningData.cleaningByTask as CleaningByTaskResponse['cleaningByTask'])?.status}
                        </Text>
                        {(cleaningData.cleaningByTask as CleaningByTaskResponse['cleaningByTask'])?.cleaner && (
                          <Text className="text-sm text-gray-500 dark:text-gray-400">
                            Уборщик: {(cleaningData.cleaningByTask as CleaningByTaskResponse['cleaningByTask'])?.cleaner?.firstName} {(cleaningData.cleaningByTask as CleaningByTaskResponse['cleaningByTask'])?.cleaner?.lastName}
                          </Text>
                        )}
                        <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          🔗 Нажмите для перехода к уборке
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text className="text-sm text-gray-500 dark:text-gray-400">
                          Уборка еще не создана для этой задачи
                        </Text>
                        <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          🔗 Нажмите для перехода к уборкам
                        </Text>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Чеклист (если есть) */}
          {task.checklist && task.checklist.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <Subheading className="mb-4">Чеклист</Subheading>
              <div className="space-y-3">
                {task.checklist.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="flex-shrink-0">
                      {item.isChecked ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-zinc-300 dark:border-zinc-600 rounded-full" />
                      )}
                    </div>
                    <Text className={`flex-1 ${item.isChecked ? 'line-through text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {item.label}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Правая колонка - метаданные */}
        <div className="space-y-6">
          {/* Статус и приоритет */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4">Статус</Subheading>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Text className="text-sm font-medium">Статус:</Text>
                {getStatusBadge(task.status)}
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-sm font-medium">Тип:</Text>
                {getTypeBadge(task.type)}
              </div>
            </div>
          </div>

          {/* Сроки */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4">Сроки</Subheading>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-zinc-500" />
                <div>
                  <Text className="text-sm font-medium">Создано:</Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(task.createdAt).toLocaleString('ru-RU')}
                  </Text>
                </div>
              </div>
              {task.dueAt && (
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-zinc-500" />
                  <div>
                    <Text className="text-sm font-medium">Срок выполнения:</Text>
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(task.dueAt).toLocaleString('ru-RU')}
                    </Text>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-zinc-500" />
                <div>
                  <Text className="text-sm font-medium">Обновлено:</Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(task.updatedAt).toLocaleString('ru-RU')}
                  </Text>
                </div>
              </div>
            </div>
          </div>

          {/* Исполнитель */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4">Исполнитель</Subheading>
            {task.assignedTo ? (
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <Text className="font-medium">{task.assignedTo.name}</Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                    {task.assignedTo.contact}
                  </Text>
                  {task.assignedTo.rating && (
                    <Text className="text-sm text-yellow-600">
                      ⭐ {task.assignedTo.rating}
                    </Text>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Text className="text-zinc-500 mb-3">Исполнитель не назначен</Text>
                {task.status === 'TODO' && (
            <Button 
              onClick={() => setShowAssignDialog(true)}
              className="text-sm px-3 py-1"
            >
                    Назначить
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Действия */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4">Действия</Subheading>
            <div className="space-y-2">
              {task.status === 'TODO' && (
                <Button 
                  onClick={() => setShowAssignDialog(true)}
                  className="w-full"
                  disabled={!!task.assignedTo}
                >
                  {task.assignedTo ? 'Исполнитель назначен' : 'Назначить исполнителя'}
                </Button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <Button 
                  onClick={() => handleUpdateStatus('DONE')}
                  className="w-full"
                >
                  Завершить задачу
                </Button>
              )}
              {(task.status === 'TODO' || task.status === 'IN_PROGRESS') && (
                <Button 
                  onClick={() => handleUpdateStatus('CANCELED')}
                  className="w-full border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                >
                  Отменить задачу
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Диалог назначения исполнителя */}
      <Dialog open={showAssignDialog} onClose={() => setShowAssignDialog(false)}>
        <div className="p-6">
          <Heading level={2} className="mb-4">Назначить исполнителя</Heading>
          <Text className="mb-4">
            Выберите исполнителя для этой задачи
          </Text>
          <div className="space-y-3">
            {/* Здесь можно добавить список доступных исполнителей */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <Text className="text-yellow-800 dark:text-yellow-200">
                Функция назначения исполнителей будет добавлена в следующих версиях.
              </Text>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
