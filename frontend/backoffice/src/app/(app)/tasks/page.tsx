'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Select } from '@/components/select'
import { Input } from '@/components/input'
import { Dialog } from '@/components/dialog'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown'
import { Squares2X2Icon, TableCellsIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import { GET_TASKS, GET_SERVICE_PROVIDERS, ASSIGN_TASK, UPDATE_TASK_STATUS } from '@/lib/graphql-queries'

// Компонент карточки задачи
function TaskCard({ task, onAssign, onUpdateStatus, onEdit }: { 
  task: Task; 
  onAssign: (task: Task) => void;
  onUpdateStatus: (taskId: string, status: string) => void;
  onEdit: (task: Task) => void;
}) {
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
    <div className="p-6 space-y-4">
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
            </>
          ) : (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Не назначен
            </Text>
          )}
        </div>
      </div>

      {/* Действия */}
      <div className="flex justify-end">
        <Dropdown>
          <DropdownButton className="bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300">
            <EllipsisVerticalIcon className="w-5 h-5" />
          </DropdownButton>
          <DropdownMenu className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg [&>*]:hover:!bg-gray-100 [&>*]:dark:hover:!bg-zinc-700 [&>*]:focus:!bg-gray-100 [&>*]:dark:focus:!bg-zinc-700 [&>*]:hover:!text-gray-900 [&>*]:dark:hover:!text-white [&>*]:focus:!text-gray-900 [&>*]:dark:focus:!text-white">
            <DropdownItem onClick={() => onEdit(task)}>
              Редактировать
            </DropdownItem>
            {task.status === 'TODO' && (
              <DropdownItem onClick={() => onAssign(task)}>
                Назначить
              </DropdownItem>
            )}
            {task.status === 'IN_PROGRESS' && (
              <DropdownItem onClick={() => onUpdateStatus(task.id, 'DONE')}>
                Завершить
              </DropdownItem>
            )}
            {(task.status === 'TODO' || task.status === 'IN_PROGRESS') && (
              <DropdownItem onClick={() => onUpdateStatus(task.id, 'CANCELED')}>
                Отменить
              </DropdownItem>
            )}
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  )
}
import { CreateTaskDialog } from '@/components/create-task-dialog'
import { EditTaskDialog } from '@/components/edit-task-dialog'
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
  // Состояние для переключения вида (таблица/карточки)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
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

  // Мутации
  const assignTaskMutation = useMutation<AssignTaskMutation, Error, any>({
    mutationFn: (input: any) => graphqlClient.request(ASSIGN_TASK, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowAssignDialog(false)
    }
  })

  const updateTaskStatusMutation = useMutation<UpdateTaskStatusMutation, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      graphqlClient.request(UPDATE_TASK_STATUS, { id, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const handleAssignTask = async (taskId: string, providerId: string) => {
    assignTaskMutation.mutate({
      taskId,
      providerId
    })
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
  const todoTasks = tasks.filter(t => t.status === 'TODO').length
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="p-6">
          <Heading level={3} className="mb-4">Всего задач</Heading>
          <Text className="text-2xl font-bold text-blue-600">{totalTasks}</Text>
          <Text className="text-sm text-zinc-500">Задач в системе</Text>
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
                >
                  <TableCellsIcon className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 bg-transparent hover:bg-gray-200 dark:hover:bg-zinc-600 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''}`}
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </Button>
              </div>
          </div>
        </div>
        
        {/* Контент в зависимости от выбранного вида */}
        {viewMode === 'table' ? (
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
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Действия</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150">
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
                      {task.assignedTo ? (
                        <div>
                          <Text className="font-medium text-gray-900 dark:text-white">{task.assignedTo.name}</Text>
                          <Text className="text-sm text-gray-500 dark:text-gray-400">{task.assignedTo.contact}</Text>
                        </div>
                      ) : (
                        <Text className="text-gray-500 dark:text-gray-400">Не назначен</Text>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Dropdown>
                        <DropdownButton className="bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300">
                          <EllipsisVerticalIcon className="w-5 h-5" />
                        </DropdownButton>
                        <DropdownMenu className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg [&>*]:hover:!bg-gray-100 [&>*]:dark:hover:!bg-zinc-700 [&>*]:focus:!bg-gray-100 [&>*]:dark:focus:!bg-zinc-700 [&>*]:hover:!text-gray-900 [&>*]:dark:hover:!text-white [&>*]:focus:!text-gray-900 [&>*]:dark:focus:!text-white">
                          <DropdownItem onClick={() => handleEditTask(task)}>
                            Редактировать
                          </DropdownItem>
                          {String(task.status) === 'TODO' && (
                            <DropdownItem onClick={() => {
                              setSelectedTask(task)
                              setShowAssignDialog(true)
                            }}>
                              Назначить
                            </DropdownItem>
                          )}
                          {String(task.status) === 'IN_PROGRESS' && (
                            <DropdownItem onClick={() => handleUpdateStatus(task.id, 'DONE')}>
                              Завершить
                            </DropdownItem>
                          )}
                          {(String(task.status) === 'TODO' || String(task.status) === 'IN_PROGRESS') && (
                            <DropdownItem onClick={() => handleUpdateStatus(task.id, 'CANCELED')}>
                              Отменить
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
      <Dialog open={showAssignDialog} onClose={() => setShowAssignDialog(false)}>
        <div className="p-6">
          <Heading level={2} className="mb-4">Назначить задачу</Heading>
          <Text className="mb-4">
            Выберите поставщика услуг для задачи
          </Text>
          <div className="space-y-3">
            {providersData?.serviceProviders?.map((provider) => (
              <div
                key={provider.id}
                className="p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
                onClick={() => {
                  if (selectedTask) {
                    handleAssignTask(selectedTask.id, provider.id)
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
            ))}
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
