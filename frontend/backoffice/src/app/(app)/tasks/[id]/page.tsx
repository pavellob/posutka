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
import { GET_TASK_BY_ID, UPDATE_TASK_STATUS, ASSIGN_TASK, GET_SERVICE_PROVIDERS, GET_CLEANERS, GET_MASTERS, SCHEDULE_CLEANING, SCHEDULE_REPAIR, GET_UNITS_BY_PROPERTY, GET_PROPERTIES_BY_ORG } from '@/lib/graphql-queries'
import { Select } from '@/components/select'
import type { GetTaskByIdQuery } from '@/lib/generated/graphql'

type Task = NonNullable<GetTaskByIdQuery['task']>


export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('')
  const [assigneeType, setAssigneeType] = useState<'master' | 'provider'>('master')
  const [showCreateCleaningDialog, setShowCreateCleaningDialog] = useState(false)
  const [showCreateRepairDialog, setShowCreateRepairDialog] = useState(false)

  // Разворачиваем params с помощью React.use()
  const { id } = use(params)

  // Запрос задачи по ID
  const { data: taskData, isLoading: taskLoading, error: taskError } = useQuery<GetTaskByIdQuery>({
    queryKey: ['task', id],
    queryFn: () => graphqlClient.request(GET_TASK_BY_ID, { id }),
    enabled: !!id
  })

  // Связь с уборкой теперь получается через task.source.cleaning

  // Запрос поставщиков услуг (для не-CLEANING задач)
  const { data: providersData } = useQuery({
    queryKey: ['serviceProviders', taskData?.task?.type],
    queryFn: () => graphqlClient.request(GET_SERVICE_PROVIDERS, {
      serviceTypes: taskData?.task?.type && taskData.task.type !== 'CLEANING' 
        ? [taskData.task.type] 
        : undefined
    }),
    enabled: !!taskData?.task && taskData.task.type !== 'CLEANING'
  })

  // Запрос уборщиков (для CLEANING задач)
  const { data: cleanersData } = useQuery({
    queryKey: ['cleaners', currentOrgId],
    queryFn: () => graphqlClient.request(GET_CLEANERS, {
      orgId: currentOrgId!,
      isActive: true,
      first: 100
    }),
    enabled: !!currentOrgId && taskData?.task?.type === 'CLEANING'
  })

  // Запрос мастеров (для MAINTENANCE задач)
  const { data: mastersData } = useQuery({
    queryKey: ['masters', currentOrgId],
    queryFn: () => graphqlClient.request(GET_MASTERS, {
      orgId: currentOrgId!,
      isActive: true,
      first: 100
    }),
    enabled: !!currentOrgId && taskData?.task?.type === 'MAINTENANCE'
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

  const handleAssignTask = async () => {
    if (!taskData?.task || !selectedAssigneeId) {
      return
    }

    const input: any = {
      taskId: taskData.task.id,
    }

    // В зависимости от типа задачи назначаем либо provider, либо cleaner, либо master
    if (taskData.task.type === 'CLEANING') {
      input.cleanerId = selectedAssigneeId
    } else if (taskData.task.type === 'MAINTENANCE') {
      if (assigneeType === 'master') {
        input.masterId = selectedAssigneeId
      } else {
        input.providerId = selectedAssigneeId
      }
    } else {
      input.providerId = selectedAssigneeId
    }

    await assignTaskMutation.mutateAsync({ input })
    setSelectedAssigneeId('')
    setAssigneeType('master')
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

              {/* Информация о связи с уборкой через source */}
              {task.source?.type === 'CLEANING' && task.source.cleaning && (
                <div 
                  className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                  onClick={() => {
                    if (task.source?.cleaning?.id) {
                      router.push(`/cleanings/${task.source.cleaning.id}`)
                    } else {
                      router.push('/cleanings')
                    }
                  }}
                >
                  <SparklesIcon className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <Text className="font-medium text-gray-900 dark:text-white">
                      Связанная уборка
                    </Text>
                    {task.source.cleaning.status && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Статус: {task.source.cleaning.status === 'SCHEDULED' ? 'Запланирована' :
                                 task.source.cleaning.status === 'IN_PROGRESS' ? 'В процессе' :
                                 task.source.cleaning.status === 'COMPLETED' ? 'Завершена' :
                                 task.source.cleaning.status === 'APPROVED' ? 'Одобрена' :
                                 task.source.cleaning.status}
                      </Text>
                    )}
                    {task.source.cleaning.cleaner && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Уборщик: {task.source.cleaning.cleaner.firstName} {task.source.cleaning.cleaner.lastName}
                      </Text>
                    )}
                    {task.source.cleaning.scheduledAt && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Запланирована: {new Date(task.source.cleaning.scheduledAt).toLocaleString('ru-RU')}
                      </Text>
                    )}
                    {task.source.cleaning.completedAt && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Завершена: {new Date(task.source.cleaning.completedAt).toLocaleString('ru-RU')}
                      </Text>
                    )}
                    <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      🔗 Нажмите для перехода к уборке
                    </Text>
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
            {task.assignedCleaner ? (
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <Text className="font-medium">
                    {task.assignedCleaner.firstName} {task.assignedCleaner.lastName}
                  </Text>
                  {task.assignedCleaner.phone && (
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                      {task.assignedCleaner.phone}
                    </Text>
                  )}
                  {task.assignedCleaner.email && (
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                      {task.assignedCleaner.email}
                    </Text>
                  )}
                  {task.assignedCleaner.rating && (
                    <Text className="text-sm text-yellow-600">
                      ⭐ {task.assignedCleaner.rating.toFixed(1)}
                    </Text>
                  )}
                </div>
              </div>
            ) : task.assignedMaster ? (
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-orange-600" />
                <div>
                  <Text className="font-medium">Мастер</Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                    ID: {task.assignedMaster.id}
                  </Text>
                </div>
              </div>
            ) : task.assignedTo ? (
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
              {/* Создать уборку из задачи */}
              {task.type === 'CLEANING' && task.unit && task.status === 'TODO' && !task.source?.cleaning && (
                <Button 
                  onClick={() => setShowCreateCleaningDialog(true)}
                  className="w-full"
                  color="blue"
                >
                  Создать уборку
                </Button>
              )}
              {/* Создать ремонт из задачи */}
              {task.type === 'MAINTENANCE' && task.unit && task.status === 'TODO' && (
                <Button 
                  onClick={() => setShowCreateRepairDialog(true)}
                  className="w-full"
                  color="orange"
                >
                  Создать ремонт
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Диалог назначения исполнителя */}
      <Dialog open={showAssignDialog} onClose={() => {
        setShowAssignDialog(false)
        setSelectedAssigneeId('')
        setAssigneeType('master')
      }}>
        <div className="p-6 space-y-4">
          <Heading level={2} className="mb-4">Назначить исполнителя</Heading>
          <Text className="mb-4">
            Выберите исполнителя для этой задачи
          </Text>
          
          {task.type === 'CLEANING' ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Уборщик
              </label>
              <Select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="w-full"
              >
                <option value="">Выберите уборщика</option>
                {cleanersData?.cleaners?.edges?.map((edge: any) => {
                  const cleaner = edge.node
                  return (
                    <option key={cleaner.id} value={cleaner.id}>
                      {cleaner.firstName} {cleaner.lastName}
                      {cleaner.phone && ` - ${cleaner.phone}`}
                      {cleaner.rating && ` (⭐ ${cleaner.rating.toFixed(1)})`}
                    </option>
                  )
                })}
              </Select>
              {cleanersData?.cleaners?.edges?.length === 0 && (
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  Нет доступных уборщиков
                </Text>
              )}
            </div>
          ) : task.type === 'MAINTENANCE' ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Тип исполнителя
              </label>
              <Select
                value={assigneeType}
                onChange={(e) => {
                  setAssigneeType(e.target.value as 'master' | 'provider')
                  setSelectedAssigneeId('')
                }}
                className="w-full"
              >
                <option value="master">Мастер</option>
                <option value="provider">Организация</option>
              </Select>
              
              {assigneeType === 'master' ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Мастер
                  </label>
                  <Select
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="w-full"
                  >
                    <option value="">Выберите мастера</option>
                    {mastersData?.masters?.edges?.map((edge: any) => {
                      const master = edge.node
                      return (
                        <option key={master.id} value={master.id}>
                          {master.firstName} {master.lastName}
                          {master.phone && ` - ${master.phone}`}
                        </option>
                      )
                    })}
                  </Select>
                  {mastersData?.masters?.edges?.length === 0 && (
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                      Нет доступных мастеров
                    </Text>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Поставщик услуг
                  </label>
                  <Select
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="w-full"
                  >
                    <option value="">Выберите поставщика</option>
                    {providersData?.serviceProviders?.map((provider: any) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                        {provider.contact && ` - ${provider.contact}`}
                        {provider.rating && ` (⭐ ${provider.rating.toFixed(1)})`}
                      </option>
                    ))}
                  </Select>
                  {providersData?.serviceProviders?.length === 0 && (
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                      Нет доступных поставщиков услуг
                    </Text>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Поставщик услуг
              </label>
              <Select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="w-full"
              >
                <option value="">Выберите поставщика</option>
                {providersData?.serviceProviders?.map((provider: any) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                    {provider.contact && ` - ${provider.contact}`}
                    {provider.rating && ` (⭐ ${provider.rating.toFixed(1)})`}
                  </option>
                ))}
              </Select>
              {providersData?.serviceProviders?.length === 0 && (
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  Нет доступных поставщиков услуг
                </Text>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              outline
              onClick={() => {
                setShowAssignDialog(false)
                setSelectedAssigneeId('')
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleAssignTask}
              disabled={!selectedAssigneeId || assignTaskMutation.isPending}
            >
              {assignTaskMutation.isPending ? 'Назначаем...' : 'Назначить'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Диалог создания уборки из задачи */}
      {showCreateCleaningDialog && task.unit && currentOrgId && (
        <Dialog open={showCreateCleaningDialog} onClose={() => setShowCreateCleaningDialog(false)}>
          <DialogTitle>Создать уборку из задачи</DialogTitle>
          <DialogDescription>
            Создать уборку для задачи: {task.note || 'Без описания'}
          </DialogDescription>
          <DialogBody>
            <div className="space-y-4">
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                Квартира: {task.unit.property?.title} · {task.unit.name}
              </Text>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                Уборка будет создана и привязана к этой задаче.
              </Text>
            </div>
          </DialogBody>
          <DialogActions>
            <Button outline onClick={() => setShowCreateCleaningDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={async () => {
                try {
                  const scheduledAt = new Date().toISOString()
                  await graphqlClient.request(SCHEDULE_CLEANING, {
                    input: {
                      orgId: currentOrgId,
                      unitId: task.unit.id,
                      scheduledAt,
                      taskId: task.id,
                      notes: task.note || undefined,
                    }
                  })
                  queryClient.invalidateQueries({ queryKey: ['task', id] })
                  queryClient.invalidateQueries({ queryKey: ['cleanings'] })
                  setShowCreateCleaningDialog(false)
                  router.push('/cleanings')
                } catch (error: any) {
                  alert(`Ошибка: ${error.message || 'Не удалось создать уборку'}`)
                }
              }}
            >
              Создать уборку
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Диалог создания ремонта из задачи */}
      {showCreateRepairDialog && task.unit && currentOrgId && (
        <Dialog open={showCreateRepairDialog} onClose={() => setShowCreateRepairDialog(false)}>
          <DialogTitle>Создать ремонт из задачи</DialogTitle>
          <DialogDescription>
            Создать ремонт для задачи: {task.note || 'Без описания'}
          </DialogDescription>
          <DialogBody>
            <div className="space-y-4">
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                Квартира: {task.unit.property?.title} · {task.unit.name}
              </Text>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                Ремонт будет создан и привязан к этой задаче.
              </Text>
            </div>
          </DialogBody>
          <DialogActions>
            <Button outline onClick={() => setShowCreateRepairDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={async () => {
                try {
                  const scheduledAt = new Date().toISOString()
                  await graphqlClient.request(SCHEDULE_REPAIR, {
                    input: {
                      orgId: currentOrgId,
                      unitId: task.unit.id,
                      scheduledAt,
                      taskId: task.id,
                      notes: task.note || undefined,
                    }
                  })
                  queryClient.invalidateQueries({ queryKey: ['task', id] })
                  queryClient.invalidateQueries({ queryKey: ['repairs'] })
                  setShowCreateRepairDialog(false)
                  router.push('/repairs')
                } catch (error: any) {
                  alert(`Ошибка: ${error.message || 'Не удалось создать ремонт'}`)
                }
              }}
            >
              Создать ремонт
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  )
}
