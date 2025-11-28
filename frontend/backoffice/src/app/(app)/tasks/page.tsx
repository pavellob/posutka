'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Select } from '@/components/select'
import { Input } from '@/components/input'
import { Dialog } from '@/components/dialog'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown'
import { Squares2X2Icon, TableCellsIcon, EllipsisVerticalIcon, ViewColumnsIcon } from '@heroicons/react/24/outline'
import { GET_TASKS, GET_SERVICE_PROVIDERS, GET_CLEANERS, GET_MASTERS, ASSIGN_TASK, UPDATE_TASK_STATUS, SCHEDULE_CLEANING } from '@/lib/graphql-queries'

// Компонент карточки задачи
function TaskCard({ task, onAssign, onUpdateStatus, onEdit }: { 
  task: Task; 
  onAssign: (task: Task) => void;
  onUpdateStatus: (taskId: string, status: string) => void;
  onEdit: (task: Task) => void;
}) {
  const router = useRouter()
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

  return (
    <div 
      className="p-6 space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => router.push(`/tasks/${task.id}`)}
    >
      <div className="flex items-center space-x-2">
        {getTypeBadge(task.type)}
        {getStatusBadge(task.status)}
      </div>
      
      {task.note && (
        <Text className="text-sm text-gray-700 dark:text-gray-300">
          {task.note}
        </Text>
      )}

      {/* Основная информация */}
      <div className="space-y-3">
        {/* Срок выполнения */}
        {task.dueAt && (
          <div>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              Срок: {new Date(task.dueAt).toLocaleDateString()}
            </Text>
          </div>
        )}

        {/* Объект недвижимости */}
        {task.unit?.property && (
          <div>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              {task.unit.property.title}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {task.unit.name}
            </Text>
          </div>
        )}

        {/* Бронирование */}
        {task.booking && (
          <div>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              {task.booking.guest.name}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(task.booking.checkIn).toLocaleDateString()} - {new Date(task.booking.checkOut).toLocaleDateString()}
            </Text>
          </div>
        )}

        {/* Исполнитель */}
        <div>
          {task.assignedTo ? (
            <>
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {task.assignedTo.name}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {task.assignedTo.contact}
              </Text>
              {/* Показываем информацию о связи с уборкой для задач типа CLEANING */}
              {task.type === 'CLEANING' && (
                <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  🔗 При назначении создается уборка
                </Text>
              )}
            </>
          ) : (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Не назначен
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}
import { CreateTaskDialog } from '@/components/create-task-dialog'
import { EditTaskDialog } from '@/components/edit-task-dialog'
import { KanbanBoard } from '@/components/kanban-board'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import type { 
  GetTasksQuery, 
  GetServiceProvidersQuery,
  AssignTaskMutation,
  UpdateTaskStatusMutation
} from '@/lib/generated/graphql'

// Используем сгенерированные типы
type Task = NonNullable<GetTasksQuery['tasks']['edges'][0]>['node']
type ServiceProvider = NonNullable<GetServiceProvidersQuery['serviceProviders'][0]>

export default function TasksPage() {
  const router = useRouter()
  // Состояние для переключения вида (таблица/карточки/канбан)
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'kanban'>('table')
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [assigneeType, setAssigneeType] = useState<'master' | 'provider'>('master')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: ''
  })
  
  const queryClient = useQueryClient()

  // Получаем текущую организацию пользователя
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const orgId = currentOrgId

  // Запрос задач
  const { data: tasksData, isLoading: tasksLoading, refetch } = useQuery<GetTasksQuery>({
    queryKey: ['tasks', orgId, filters.status, filters.type],
    queryFn: () => graphqlClient.request(GET_TASKS, {
      orgId: orgId!,
      status: filters.status || undefined,
      type: filters.type || undefined,
      first: 20
    }),
    enabled: !!orgId
  })

  // Запрос поставщиков услуг
  const { data: providersData } = useQuery<GetServiceProvidersQuery>({
    queryKey: ['serviceProviders', filters.type],
    queryFn: () => graphqlClient.request(GET_SERVICE_PROVIDERS, {
      serviceTypes: filters.type ? [filters.type] : undefined
    })
  })

  // Запрос уборщиков (для задач CLEANING)
  const { data: cleanersData } = useQuery<any>({
    queryKey: ['cleaners', orgId],
    queryFn: () => graphqlClient.request(GET_CLEANERS, {
      orgId: orgId!,
      isActive: true,
      first: 100
    }),
    enabled: !!orgId
  })

  // Запрос мастеров (для задач MAINTENANCE)
  const { data: mastersData } = useQuery<any>({
    queryKey: ['masters', orgId],
    queryFn: () => graphqlClient.request(GET_MASTERS, {
      orgId: orgId!,
      isActive: true,
      first: 100
    }),
    enabled: !!orgId
  })

  // Мутации
  const assignTaskMutation = useMutation<AssignTaskMutation, Error, any>({
    mutationFn: (input: any) => graphqlClient.request(ASSIGN_TASK, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowAssignDialog(false)
    }
  })

  const scheduleCleaningMutation = useMutation({
    mutationFn: (input: any) => graphqlClient.request(SCHEDULE_CLEANING, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanings'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const updateTaskStatusMutation = useMutation<UpdateTaskStatusMutation, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      graphqlClient.request(UPDATE_TASK_STATUS, { id, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const handleAssignTask = async (taskId: string, assigneeId: string, taskType: string, assigneeType?: 'master' | 'provider') => {
    // Для задач типа CLEANING назначаем уборщика и сразу создаем запись Cleaning
    if (taskType === 'CLEANING') {
      // Сначала назначаем уборщика на задачу
      await assignTaskMutation.mutateAsync({
        taskId,
        cleanerId: assigneeId
      })
      
      // Затем автоматически создаем запись Cleaning
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        try {
          const cleaningResult = await scheduleCleaningMutation.mutateAsync({
            orgId: orgId!,
            cleanerId: assigneeId,
            unitId: task.unit?.id,
            bookingId: task.booking?.id,
            taskId: taskId,
            scheduledAt: task.dueAt || new Date().toISOString(),
            notes: task.note || 'Создано автоматически при назначении уборщика',
            requiresLinenChange: false,
            checklistItems: [
              { label: 'Пропылесосить все комнаты', isChecked: false, order: 0 },
              { label: 'Помыть полы', isChecked: false, order: 1 },
              { label: 'Протереть пыль', isChecked: false, order: 2 },
              { label: 'Убрать в ванной', isChecked: false, order: 3 },
              { label: 'Убрать на кухне', isChecked: false, order: 4 },
              { label: 'Сменить постельное белье', isChecked: false, order: 5 },
              { label: 'Проверить все приборы', isChecked: false, order: 6 },
              { label: 'Вынести мусор', isChecked: false, order: 7 }
            ]
          })
          
          // Показываем уведомление об успешном создании с возможностью перейти к уборкам
          const cleanerName = cleanersData?.cleaners?.edges?.find((edge: any) => edge.node.id === assigneeId)?.node
          const cleanerFullName = cleanerName ? `${cleanerName.firstName} ${cleanerName.lastName}` : 'уборщик'
          
          if (confirm(`✅ Успешно!\n\n• Уборщик ${cleanerFullName} назначен на задачу\n• Уборка создана и добавлена в список со статусом "Запланирована"\n\nПерейти на страницу уборок?`)) {
            window.location.href = '/cleanings'
          }
        } catch (error) {
          console.error('Ошибка при создании уборки:', error)
          alert('⚠️ Уборщик назначен на задачу, но не удалось автоматически создать запись уборки.\n\nПожалуйста, создайте уборку вручную через страницу /cleanings или кнопку "Выполнить уборку".')
        }
      }
    } else if (taskType === 'MAINTENANCE') {
      // Для задач типа MAINTENANCE можем назначить мастера или организацию
      if (assigneeType === 'master') {
        assignTaskMutation.mutate({
          taskId,
          masterId: assigneeId
        })
      } else {
        assignTaskMutation.mutate({
          taskId,
          providerId: assigneeId
        })
      }
    } else {
      // Для остальных типов задач просто назначаем провайдера
      assignTaskMutation.mutate({
        taskId,
        providerId: assigneeId
      })
    }
  }

  const handleUpdateStatus = async (taskId: string, status: string) => {
    updateTaskStatusMutation.mutate({ id: taskId, status })
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setShowEditDialog(true)
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

  // Показываем загрузку если организация еще не загружена
  if (orgLoading || !orgId) {
    return (
      <div className="space-y-6">
        <div>
          <Heading level={1}>Задачи</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Загрузка организации...
          </Text>
        </div>
      </div>
    )
  }

  if (tasksLoading) {
    return (
      <div className="space-y-6">
        <Heading level={1}>Задачи</Heading>
        <Text>Загрузка...</Text>
      </div>
    )
  }

  const tasks = tasksData?.tasks?.edges?.map(edge => edge.node) || []

  // Подсчет статистики
  const totalTasks = tasks.length
  const backlogTasks = tasks.filter(t => t.status === 'TODO' && !t.assignedTo).length
  const todoTasks = tasks.filter(t => t.status === 'TODO' && t.assignedTo).length
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const doneTasks = tasks.filter(t => t.status === 'DONE').length
  const canceledTasks = tasks.filter(t => t.status === 'CANCELED').length

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <Heading level={1}>Задачи</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Управление операционными задачами и их выполнение
          </Text>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-black hover:bg-gray-800 text-white border-gray-600">
          Создать задачу
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="p-6">
          <Heading level={3} className="mb-4">Всего задач</Heading>
          <Text className="text-2xl font-bold text-blue-600">{totalTasks}</Text>
          <Text className="text-sm text-zinc-500">Задач в системе</Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">Backlog</Heading>
          <Text className="text-2xl font-bold text-gray-600">{backlogTasks}</Text>
          <Text className="text-sm text-zinc-500">
            {totalTasks > 0 ? `${Math.round((backlogTasks / totalTasks) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">Ожидают</Heading>
          <Text className="text-2xl font-bold text-orange-600">{todoTasks}</Text>
          <Text className="text-sm text-zinc-500">
            {totalTasks > 0 ? `${Math.round((todoTasks / totalTasks) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">В работе</Heading>
          <Text className="text-2xl font-bold text-blue-600">{inProgressTasks}</Text>
          <Text className="text-sm text-zinc-500">
            {totalTasks > 0 ? `${Math.round((inProgressTasks / totalTasks) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">Завершены</Heading>
          <Text className="text-2xl font-bold text-green-600">{doneTasks}</Text>
          <Text className="text-sm text-zinc-500">
            {totalTasks > 0 ? `${Math.round((doneTasks / totalTasks) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">Отменены</Heading>
          <Text className="text-2xl font-bold text-red-600">{canceledTasks}</Text>
          <Text className="text-sm text-zinc-500">
            {totalTasks > 0 ? `${Math.round((canceledTasks / totalTasks) * 100)}%` : '0%'}
          </Text>
        </div>
      </div>

      {/* Фильтры */}
      <div className="space-y-4">
        <Heading level={2}>Фильтры</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Статус</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Все статусы</option>
              <option value="TODO">Ожидает</option>
              <option value="IN_PROGRESS">В работе</option>
              <option value="DONE">Завершена</option>
              <option value="CANCELED">Отменена</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Тип</label>
            <Select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">Все типы</option>
              <option value="CLEANING">Уборка</option>
              <option value="CHECKIN">Заселение гостя</option>
              <option value="CHECKOUT">Выселение гостя</option>
              <option value="MAINTENANCE">Техническое обслуживание</option>
              <option value="INVENTORY">Инвентаризация</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Поиск</label>
            <Input
              placeholder="Поиск по заметкам..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button 
              onClick={() => refetch()} 
              className="flex-1 bg-black hover:bg-gray-800 text-white border-gray-600"
            >
              Применить
            </Button>
            <Button 
              onClick={() => setFilters({ status: '', type: '', search: '' })}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-gray-300 dark:border-zinc-600"
            >
              Сбросить
            </Button>
          </div>
        </div>
        
        {/* Активные фильтры */}
        {(filters.status || filters.type || filters.search) && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex flex-wrap gap-2">
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">Активные фильтры:</Text>
              {filters.status && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                  Статус: {filters.status === 'TODO' ? 'Ожидает' : filters.status === 'IN_PROGRESS' ? 'В работе' : filters.status === 'DONE' ? 'Завершена' : filters.status === 'CANCELED' ? 'Отменена' : filters.status}
                  <button onClick={() => setFilters({ ...filters, status: '' })} className="ml-1 hover:text-blue-600">×</button>
                </span>
              )}
              {filters.type && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-xs">
                  Тип: {filters.type === 'CLEANING' ? 'Уборка' : filters.type === 'CHECKIN' ? 'Заселение' : filters.type === 'CHECKOUT' ? 'Выселение' : filters.type === 'MAINTENANCE' ? 'Обслуживание' : filters.type === 'INVENTORY' ? 'Инвентаризация' : filters.type}
                  <button onClick={() => setFilters({ ...filters, type: '' })} className="ml-1 hover:text-green-600">×</button>
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-full text-xs">
                  Поиск: &ldquo;{filters.search}&rdquo;
                  <button onClick={() => setFilters({ ...filters, search: '' })} className="ml-1 hover:text-orange-600">×</button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Таблица задач */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Heading level={2}>Задачи</Heading>
          <div className="flex items-center space-x-4">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Показано: {tasks.length}
            </Text>
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
                <Button
                  onClick={() => setViewMode('table')}
                  className={`p-2 bg-transparent hover:bg-gray-200 dark:hover:bg-zinc-600 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 ${viewMode === 'table' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''}`}
                  title="Таблица"
                >
                  <TableCellsIcon className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 bg-transparent hover:bg-gray-200 dark:hover:bg-zinc-600 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''}`}
                  title="Карточки"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 bg-transparent hover:bg-gray-200 dark:hover:bg-zinc-600 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 ${viewMode === 'kanban' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''}`}
                  title="Канбан"
                >
                  <ViewColumnsIcon className="w-4 h-4" />
                </Button>
              </div>
          </div>
        </div>
        
        {/* Контент в зависимости от выбранного вида */}
        {viewMode === 'kanban' ? (
          <KanbanBoard
            tasks={tasks as any}
            onUpdateStatus={handleUpdateStatus}
            onEdit={handleEditTask as any}
            onAssign={(task) => {
              setSelectedTask(task as any)
              setShowAssignDialog(true)
            }}
            onAssignTask={(taskId: string, assigneeId: string, taskType: string) => 
              handleAssignTask(taskId, assigneeId, taskType)
            }
            onDragToAssign={(task) => {
              setSelectedTask(task as any)
              setShowAssignDialog(true)
            }}
          />
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow className="bg-gray-50 dark:bg-zinc-900">
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Тип</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Срок</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Объект</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Бронирование</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Исполнитель</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow 
                    key={task.id} 
                    className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150 cursor-pointer"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(task.type)}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(task.status)}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Text className="text-sm text-gray-900 dark:text-white">
                        {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : '-'}
                      </Text>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {task.unit?.property?.title && (
                        <div>
                          <Text className="font-medium text-gray-900 dark:text-white">{task.unit.property.title}</Text>
                          <Text className="text-sm text-gray-500 dark:text-gray-400">{task.unit.name}</Text>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {task.booking && (
                        <div>
                          <Text className="font-medium text-gray-900 dark:text-white">{task.booking.guest.name}</Text>
                          <Text className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(task.booking.checkIn).toLocaleDateString()} - {new Date(task.booking.checkOut).toLocaleDateString()}
                          </Text>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {task.type === 'CLEANING' && task.assignedCleaner ? (
                        <div>
                          <Text className="font-medium text-gray-900 dark:text-white">
                            🧹 {task.assignedCleaner.firstName} {task.assignedCleaner.lastName}
                          </Text>
                          {task.assignedCleaner.rating && (
                            <Text className="text-sm text-yellow-600">
                              ⭐ {task.assignedCleaner.rating.toFixed(1)}
                            </Text>
                          )}
                          {task.assignedCleaner.phone && (
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              {task.assignedCleaner.phone}
                            </Text>
                          )}
                          {/* Показываем информацию о связи с уборкой */}
                          <div className="mt-1">
                            <Text className="text-xs text-blue-600 dark:text-blue-400">
                              🔗 При назначении создается уборка
                            </Text>
                          </div>
                        </div>
                      ) : task.assignedTo ? (
                        <div>
                          <Text className="font-medium text-gray-900 dark:text-white">{task.assignedTo.name}</Text>
                          <Text className="text-sm text-gray-500 dark:text-gray-400">{task.assignedTo.contact}</Text>
                        </div>
                      ) : (
                        <Text className="text-gray-500 dark:text-gray-400">Не назначен</Text>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onAssign={(task) => {
                    setSelectedTask(task)
                    setShowAssignDialog(true)
                  }}
                  onUpdateStatus={handleUpdateStatus}
                  onEdit={handleEditTask}
                />
              ))}
            </div>
            {tasks.length === 0 && (
              <div className="text-center py-12">
                <Text className="text-gray-500 dark:text-gray-400">
                  Задачи не найдены
                </Text>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Диалог назначения задачи */}
      <Dialog open={showAssignDialog} onClose={() => {
        setShowAssignDialog(false)
        setAssigneeType('master')
      }}>
        <div className="p-6">
          <Heading level={2} className="mb-4">Назначить задачу</Heading>
          <Text className="mb-4">
            {selectedTask?.type === 'CLEANING' 
              ? 'Выберите уборщика для выполнения уборки' 
              : selectedTask?.type === 'MAINTENANCE'
              ? 'Выберите исполнителя для задачи'
              : 'Выберите поставщика услуг для задачи'}
          </Text>
          
          {selectedTask?.type === 'MAINTENANCE' && (
            <div className="mb-4">
              <Text className="mb-2 text-sm font-medium">Тип исполнителя:</Text>
              <Select
                value={assigneeType}
                onChange={(e) => setAssigneeType(e.target.value as 'master' | 'provider')}
              >
                <option value="master">Мастер</option>
                <option value="provider">Организация</option>
              </Select>
            </div>
          )}
          
          <div className="space-y-3">
            {selectedTask?.type === 'CLEANING' ? (
              // Показываем уборщиков для задач типа CLEANING
              cleanersData?.cleaners?.edges?.map((edge: any) => {
                const cleaner = edge.node
                return (
                  <div
                    key={cleaner.id}
                    className="p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    onClick={() => {
                      if (selectedTask) {
                        handleAssignTask(selectedTask.id, cleaner.id, selectedTask.type)
                        setShowAssignDialog(false)
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <Text className="font-medium">
                          🧹 {cleaner.firstName} {cleaner.lastName}
                        </Text>
                        {cleaner.phone && (
                          <Text className="text-sm text-zinc-500">{cleaner.phone}</Text>
                        )}
                      </div>
                      {cleaner.rating && (
                        <Badge color="yellow">⭐ {cleaner.rating.toFixed(1)}</Badge>
                      )}
                    </div>
                  </div>
                )
              })
            ) : selectedTask?.type === 'MAINTENANCE' ? (
              // Для задач типа MAINTENANCE показываем мастеров или организации в зависимости от выбора
              assigneeType === 'master' ? (
                mastersData?.masters?.edges?.map((edge: any) => {
                  const master = edge.node
                  return (
                    <div
                      key={master.id}
                      className="p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
                      onClick={() => {
                        if (selectedTask) {
                          handleAssignTask(selectedTask.id, master.id, selectedTask.type, 'master')
                          setShowAssignDialog(false)
                          setAssigneeType('master')
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <Text className="font-medium">
                            🔧 {master.firstName} {master.lastName}
                          </Text>
                          {master.phone && (
                            <Text className="text-sm text-zinc-500">{master.phone}</Text>
                          )}
                        </div>
                        {master.rating && (
                          <Badge color="yellow">⭐ {master.rating.toFixed(1)}</Badge>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                providersData?.serviceProviders?.map((provider) => (
                  <div
                    key={provider.id}
                    className="p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    onClick={() => {
                      if (selectedTask) {
                        handleAssignTask(selectedTask.id, provider.id, selectedTask.type, 'provider')
                        setShowAssignDialog(false)
                        setAssigneeType('master')
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <Text className="font-medium">{provider.name}</Text>
                        <Text className="text-sm text-zinc-500">{provider.contact}</Text>
                      </div>
                      <Badge color="blue">Рейтинг: {provider.rating}</Badge>
                    </div>
                  </div>
                ))
              )
            ) : (
              // Показываем поставщиков услуг для остальных типов задач
              providersData?.serviceProviders?.map((provider) => (
                <div
                  key={provider.id}
                  className="p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
                  onClick={() => {
                    if (selectedTask) {
                      handleAssignTask(selectedTask.id, provider.id, selectedTask.type)
                      setShowAssignDialog(false)
                    }
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <Text className="font-medium">{provider.name}</Text>
                      <Text className="text-sm text-zinc-500">{provider.contact}</Text>
                    </div>
                    <Badge color="blue">Рейтинг: {provider.rating}</Badge>
                  </div>
                </div>
              ))
            )}
            {selectedTask?.type === 'CLEANING' && (!cleanersData?.cleaners?.edges || cleanersData.cleaners.edges.length === 0) && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <Text className="text-yellow-800 dark:text-yellow-200">
                  Нет доступных уборщиков. Добавьте уборщиков на странице <Link href="/cleanings" className="underline">Уборки</Link>.
                </Text>
              </div>
            )}
            {selectedTask?.type === 'MAINTENANCE' && assigneeType === 'master' && (!mastersData?.masters?.edges || mastersData.masters.edges.length === 0) && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <Text className="text-yellow-800 dark:text-yellow-200">
                  Нет доступных мастеров. Добавьте мастеров на странице <Link href="/repairs/masters" className="underline">Ремонтники</Link>.
                </Text>
              </div>
            )}
            {selectedTask?.type === 'MAINTENANCE' && assigneeType === 'provider' && (!providersData?.serviceProviders || providersData.serviceProviders.length === 0) && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <Text className="text-yellow-800 dark:text-yellow-200">
                  Нет доступных организаций для этого типа задачи.
                </Text>
              </div>
            )}
            {selectedTask?.type !== 'CLEANING' && selectedTask?.type !== 'MAINTENANCE' && (!providersData?.serviceProviders || providersData.serviceProviders.length === 0) && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <Text className="text-yellow-800 dark:text-yellow-200">
                  Нет доступных поставщиков услуг для этого типа задачи.
                </Text>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Диалог создания задачи */}
      <CreateTaskDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }}
        orgId={orgId!}
      />

      {/* Диалог редактирования задачи */}
      <EditTaskDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        task={selectedTask}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
          setShowEditDialog(false)
        }}
      />
    </div>
  )
}
