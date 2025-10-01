'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Table } from '@/components/table'
import { Select } from '@/components/select'
import { Input } from '@/components/input'
import { Dialog } from '@/components/dialog'
import { GET_TASKS, GET_SERVICE_PROVIDERS, ASSIGN_TASK, UPDATE_TASK_STATUS } from '@/lib/graphql-queries'
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
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

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'PENDING': { color: 'orange' as const, text: 'Ожидает' },
      'IN_PROGRESS': { color: 'blue' as const, text: 'В работе' },
      'COMPLETED': { color: 'green' as const, text: 'Завершена' },
      'CANCELLED': { color: 'red' as const, text: 'Отменена' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'zinc' as const, text: status }
    return <Badge color={statusInfo.color}>{statusInfo.text}</Badge>
  }

  const getTypeBadge = (type: string) => {
    const typeMap = {
      'CLEANING': { color: 'blue' as const, text: 'Уборка' },
      'MAINTENANCE': { color: 'orange' as const, text: 'Обслуживание' },
      'INSPECTION': { color: 'purple' as const, text: 'Инспекция' },
      'REPAIR': { color: 'red' as const, text: 'Ремонт' }
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Heading level={1}>Задачи</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Управление операционными задачами и их выполнение
          </Text>
        </div>
        <Button>Создать задачу</Button>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Статус</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Все статусы</option>
              <option value="PENDING">Ожидает</option>
              <option value="IN_PROGRESS">В работе</option>
              <option value="COMPLETED">Завершена</option>
              <option value="CANCELLED">Отменена</option>
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
              <option value="MAINTENANCE">Обслуживание</option>
              <option value="INSPECTION">Инспекция</option>
              <option value="REPAIR">Ремонт</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Поиск</label>
            <Input
              placeholder="Поиск по задачам..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => refetch()} className="w-full">
              Применить фильтры
            </Button>
          </div>
        </div>
      </div>

      {/* Таблица задач */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Тип</th>
              <th>Статус</th>
              <th>Срок</th>
              <th>Объект</th>
              <th>Бронирование</th>
              <th>Исполнитель</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="font-mono text-sm">{task.id.slice(0, 8)}...</td>
                <td>{getTypeBadge(task.type)}</td>
                <td>{getStatusBadge(task.status)}</td>
                <td>{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : '-'}</td>
                <td>
                  {task.unit?.property?.title && (
                    <div>
                      <Text className="font-medium">{task.unit.property.title}</Text>
                      <Text className="text-sm text-zinc-500">{task.unit.name}</Text>
                    </div>
                  )}
                </td>
                <td>
                  {task.booking && (
                    <div>
                      <Text className="font-medium">{task.booking.guest.name}</Text>
                      <Text className="text-sm text-zinc-500">
                        {new Date(task.booking.checkIn).toLocaleDateString()} - {new Date(task.booking.checkOut).toLocaleDateString()}
                      </Text>
                    </div>
                  )}
                </td>
                <td>
                  {task.assignedTo ? (
                    <div>
                      <Text className="font-medium">{task.assignedTo.name}</Text>
                      <Text className="text-sm text-zinc-500">{task.assignedTo.contact}</Text>
                    </div>
                  ) : (
                    <Text className="text-zinc-500">Не назначен</Text>
                  )}
                </td>
                <td>
                  <div className="flex gap-2">
                    {String(task.status) === 'PENDING' && (
                      <Button
                        onClick={() => {
                          setSelectedTask(task)
                          setShowAssignDialog(true)
                        }}
                      >
                        Назначить
                      </Button>
                    )}
                    {String(task.status) === 'IN_PROGRESS' && (
                      <Button
                        onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                      >
                        Завершить
                      </Button>
                    )}
                    {String(task.status) === 'PENDING' && (
                      <Button
                        color="red"
                        onClick={() => handleUpdateStatus(task.id, 'CANCELLED')}
                      >
                        Отменить
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Диалог назначения задачи */}
      <Dialog open={showAssignDialog} onClose={() => setShowAssignDialog(false)}>
        <div className="p-6">
          <Heading level={2} className="mb-4">Назначить задачу</Heading>
          <Text className="mb-4">
            Выберите поставщика услуг для задачи: {selectedTask?.id}
          </Text>
          <div className="space-y-3">
            {providersData?.serviceProviders?.map((provider) => (
              <div
                key={provider.id}
                className="p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
                onClick={() => selectedTask && handleAssignTask(selectedTask.id, provider.id)}
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
    </div>
  )
}
