'use client'

import { useState, use, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Fieldset, Label } from '@/components/fieldset'
import { 
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { GET_TASK_BY_ID, UPDATE_TASK } from '@/lib/graphql-queries'
import type { GetTaskByIdQuery } from '@/lib/generated/graphql'

type Task = NonNullable<GetTaskByIdQuery['task']>

export default function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  
  // Разворачиваем params с помощью React.use()
  const { id } = use(params)
  
  const [formData, setFormData] = useState({
    type: '',
    status: '',
    dueAt: '',
    note: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Запрос задачи по ID
  const { data: taskData, isLoading: taskLoading, error: taskError } = useQuery<GetTaskByIdQuery>({
    queryKey: ['task', id],
    queryFn: () => graphqlClient.request(GET_TASK_BY_ID, { id: id }),
    enabled: !!id,
  })

  // Обновляем форму при получении данных
  useEffect(() => {
    if (taskData?.task) {
      setFormData({
        type: taskData.task.type || '',
        status: taskData.task.status || '',
        dueAt: taskData.task.dueAt ? new Date(taskData.task.dueAt).toISOString().slice(0, 16) : '',
        note: taskData.task.note || ''
      })
    }
  }, [taskData])

  // Мутация обновления задачи
  const updateTaskMutation = useMutation({
    mutationFn: (input: any) => graphqlClient.request(UPDATE_TASK, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      router.push(`/tasks/${id}`)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskData?.task) return

    setIsSubmitting(true)
    try {
      await updateTaskMutation.mutateAsync({
        id: taskData.task.id,
        type: formData.type,
        status: formData.status,
        dueAt: formData.dueAt ? new Date(formData.dueAt).toISOString() : null,
        note: formData.note
      })
    } catch (error) {
      console.error('Ошибка при обновлении задачи:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push(`/tasks/${id}`)
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
            onClick={() => router.push(`/tasks/${task.id}`)}
            outline
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <div>
            <Heading level={1}>Редактирование задачи</Heading>
            <Text className="text-zinc-600 dark:text-zinc-400 mt-1">
              ID: {task.id}
            </Text>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {getTypeBadge(task.type)}
          {getStatusBadge(task.status)}
        </div>
      </div>

      {/* Форма редактирования */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Fieldset>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Тип задачи */}
              <div>
                <Label htmlFor="type">Тип задачи</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="">Выберите тип</option>
                  <option value="CLEANING">Уборка</option>
                  <option value="CHECKIN">Заселение</option>
                  <option value="CHECKOUT">Выселение</option>
                  <option value="MAINTENANCE">Обслуживание</option>
                  <option value="INVENTORY">Инвентаризация</option>
                </Select>
              </div>

              {/* Статус */}
              <div>
                <Label htmlFor="status">Статус</Label>
                <Select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="">Выберите статус</option>
                  <option value="TODO">Ожидает</option>
                  <option value="IN_PROGRESS">В работе</option>
                  <option value="DONE">Завершена</option>
                  <option value="CANCELED">Отменена</option>
                </Select>
              </div>
            </div>

            {/* Срок выполнения */}
            <div>
              <Label htmlFor="dueAt">Срок выполнения</Label>
              <Input
                id="dueAt"
                type="datetime-local"
                value={formData.dueAt}
                onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
              />
            </div>

            {/* Описание */}
            <div>
              <Label htmlFor="note">Описание задачи</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={4}
                placeholder="Введите описание задачи..."
              />
            </div>
          </Fieldset>

          {/* Информация о связанных объектах */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-6">
            <Subheading className="mb-4">Связанные объекты</Subheading>
            <div className="space-y-4">
              {/* Объект недвижимости */}
              {task.unit?.property && (
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg">
                  <div className="flex-1">
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {task.unit.property.title}
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {task.unit.name}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {task.unit.property.address}
                    </Text>
                  </div>
                </div>
              )}

              {/* Бронирование */}
              {task.booking && (
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg">
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
                  </div>
                </div>
              )}

              {/* Исполнитель */}
              {task.assignedTo && (
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg">
                  <div className="flex-1">
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {task.assignedTo.name}
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {task.assignedTo.contact}
                    </Text>
                    {task.assignedTo.rating && (
                      <Text className="text-sm text-yellow-600">
                        ⭐ {task.assignedTo.rating}
                      </Text>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              onClick={handleCancel}
              outline
              disabled={isSubmitting}
            >
              <XMarkIcon className="w-4 h-4 mr-2" />
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
