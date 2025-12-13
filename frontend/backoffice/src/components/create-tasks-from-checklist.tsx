'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'
import { CREATE_TASKS_FROM_CHECKLIST, GET_SERVICE_PROVIDERS, GET_CLEANERS, GET_MASTERS, CREATE_TASK_FROM_CHECKLIST_ITEM } from '@/lib/graphql-queries'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Input } from '@/components/input'
import { Checkbox } from '@/components/checkbox'

interface CreateTasksFromChecklistProps {
  cleaningId?: string
  repairId?: string
  checklistInstance: {
    id: string
    items: Array<{
      id: string
      key: string
      title: string
      description?: string
      type: string
      requiresPhoto: boolean
    }>
    answers: Array<{
      itemKey: string
      value: any
      note?: string
    }>
    attachments: Array<{
      itemKey: string
    }>
  }
  orgId: string
  unitId?: string
  cleaner?: { id: string; firstName: string; lastName: string } | null
  master?: { id: string; firstName: string; lastName: string } | null
  onSuccess?: () => void
}

interface TaskItemInput {
  itemKey: string
  selected: boolean
  title?: string // Название задачи (для обычных задач)
  description: string
  assigneeId: string
  assigneeType: 'PROVIDER' | 'CLEANER' | 'MASTER'
  dueAt?: string
  isCustom?: boolean // Флаг для обычной задачи (не из чеклиста)
}

export function CreateTasksFromChecklist({
  cleaningId,
  repairId,
  checklistInstance,
  orgId,
  unitId,
  cleaner,
  master,
  onSuccess,
}: CreateTasksFromChecklistProps) {
  // Все хуки должны вызываться до любых условных return'ов
  const queryClient = useQueryClient()
  const [taskItems, setTaskItems] = useState<Map<string, TaskItemInput>>(new Map())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [tasksCreated, setTasksCreated] = useState(false)

  // Определяем неуспешные пункты
  const failedItems = useMemo(() => {
    console.log('[CreateTasksFromChecklist] Processing checklistInstance:', checklistInstance)
    if (!checklistInstance?.items || checklistInstance.items.length === 0) {
      console.log('[CreateTasksFromChecklist] No items in checklist')
      return []
    }
    const attachments = checklistInstance.attachments || []
    const answers = checklistInstance.answers || []
    
    return checklistInstance.items.filter((item) => {
      const itemKey = item.key || item.id
      if (!itemKey) return false
      
      const requiresPhoto = item.requiresPhoto
      const isBool = item.type === 'BOOL'
      const answer = answers.find((a) => a.itemKey === itemKey)
      
      // Если требуется фото, проверяем наличие фото
      if (requiresPhoto) {
        const itemAttachments = attachments.filter(
          (a) => a.itemKey === itemKey
        )
        const hasPhoto = itemAttachments.length >= 1
        
        // Если есть фото, но есть ответ - проверяем ответ тоже
        if (hasPhoto && answer) {
          // Для булевых значений: false = неуспешно (даже если есть фото)
          if (isBool && answer.value === false) {
            return true
          }
          // Для других типов: если есть фото, считаем успешным
          return false
        }
        
        // Нет фото - неуспешно
        return !hasPhoto
      }
      
      // Для пунктов без требования фото проверяем только ответ
      // Нет ответа - неуспешно
      if (!answer || answer.value === undefined || answer.value === null) {
        return true
      }
      
      // Для булевых значений: false = неуспешно
      if (isBool) {
        return answer.value === false
      }
      
      // Для числовых значений: 0 или отрицательное = неуспешно
      if (typeof answer.value === 'number') {
        return answer.value <= 0
      }
      
      // Для строковых значений: проверяем положительные значения
      if (typeof answer.value === 'string') {
        const lowerValue = answer.value.toLowerCase().trim()
        return !(
          lowerValue === 'true' ||
          lowerValue === 'yes' ||
          lowerValue === 'да' ||
          lowerValue === '1' ||
          lowerValue === 'выполнено' ||
          lowerValue === 'done' ||
          lowerValue === 'ok'
        )
      }
      
      // Для других типов считаем успешным, если есть значение
      return false
    })
  }, [checklistInstance])

  // Загружаем поставщиков услуг
  const { data: providersData } = useQuery({
    queryKey: ['service-providers', orgId],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_SERVICE_PROVIDERS, {
        serviceTypes: ['MAINTENANCE'],
      }) as any
      return response.serviceProviders || []
    },
    enabled: !!orgId,
  })

  // Загружаем уборщиков
  const { data: cleanersData } = useQuery({
    queryKey: ['cleaners', orgId],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_CLEANERS, {
        orgId,
        isActive: true,
        first: 100,
      }) as any
      return response.cleaners?.edges?.map((edge: any) => edge.node) || []
    },
    enabled: !!orgId,
  })

  // Загружаем мастеров
  const { data: mastersData } = useQuery({
    queryKey: ['masters', orgId],
    queryFn: async () => {
      try {
        const response = await graphqlClient.request(GET_MASTERS, {
          orgId,
          isActive: true,
          first: 100,
        }) as any
        // Проверяем разные возможные структуры ответа
        if (Array.isArray(response.masters)) {
          return response.masters
        }
        if (response.masters?.edges && Array.isArray(response.masters.edges)) {
          return response.masters.edges.map((edge: any) => edge.node) || []
        }
        if (response.masters?.nodes && Array.isArray(response.masters.nodes)) {
          return response.masters.nodes
        }
        return []
      } catch (error) {
        console.error('Error fetching masters:', error)
        return []
      }
    },
    enabled: !!orgId,
  })


  const updateTaskItem = (itemKey: string, updates: Partial<TaskItemInput>) => {
    setTaskItems((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(itemKey)
      if (current) {
        newMap.set(itemKey, { ...current, ...updates })
      }
      return newMap
    })
  }

  const addCustomTask = () => {
    if (!newTaskTitle.trim()) {
      alert('Введите название задачи')
      return
    }
    
    const customTaskKey = `custom-${Date.now()}`
    setTaskItems((prev) => {
      const newMap = new Map(prev)
      newMap.set(customTaskKey, {
        itemKey: customTaskKey,
        selected: true,
        title: newTaskTitle.trim(),
        description: '',
        assigneeId: master?.id || cleaner?.id || '',
        assigneeType: master ? 'MASTER' : cleaner ? 'CLEANER' : 'MASTER',
        dueAt: undefined,
        isCustom: true,
      })
      return newMap
    })
    setNewTaskTitle('')
  }

  const removeTaskItem = (itemKey: string) => {
    setTaskItems((prev) => {
      const newMap = new Map(prev)
      newMap.delete(itemKey)
      return newMap
    })
  }

  const createTasksMutation = useMutation({
    mutationFn: async (input: any) => {
      return graphqlClient.request(CREATE_TASKS_FROM_CHECKLIST, { input }) as any
    },
    onSuccess: () => {
      if (cleaningId) {
        queryClient.invalidateQueries({ queryKey: ['cleaning', cleaningId] })
      }
      if (repairId) {
        queryClient.invalidateQueries({ queryKey: ['repair', repairId] })
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onSuccess?.()
    },
  })


  const handleSubmit = async () => {
    const selectedItems = Array.from(taskItems.values()).filter((item) => item.selected)
    
    if (selectedItems.length === 0) {
      alert('Выберите хотя бы один пункт для создания задачи')
      return
    }

    // Разделяем задачи из чеклиста и обычные задачи
    const checklistItems = selectedItems.filter(item => !item.isCustom)
    const customItems = selectedItems.filter(item => item.isCustom)

    // Валидация
    for (const item of selectedItems) {
      if (!item.description.trim()) {
        const itemTitle = item.isCustom 
          ? 'обычная задача' 
          : failedItems.find((i) => i.key === item.itemKey)?.title || 'пункт'
        alert(`Заполните описание задачи для "${itemTitle}"`)
        return
      }
      if (!item.assigneeId) {
        const itemTitle = item.isCustom 
          ? 'обычная задача' 
          : failedItems.find((i) => i.key === item.itemKey)?.title || 'пункт'
        alert(`Выберите исполнителя для "${itemTitle}"`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      let sourceId: string | undefined

      // Сначала создаем задачи из чеклиста, чтобы получить sourceId
      if (checklistItems.length > 0) {
        const input: any = {
          items: checklistItems.map((item) => ({
            itemKey: item.itemKey,
            description: item.description,
            assigneeId: item.assigneeId,
            assigneeType: item.assigneeType,
            dueAt: item.dueAt || undefined,
          })),
        }
        
        if (cleaningId) {
          input.cleaningId = cleaningId
        }
        if (repairId) {
          input.repairId = repairId
        }
        
        const createdChecklistTasks = await createTasksMutation.mutateAsync(input)
        
        // Получаем sourceId из первой созданной задачи
        if (createdChecklistTasks && createdChecklistTasks.length > 0 && createdChecklistTasks[0]?.source?.id) {
          sourceId = createdChecklistTasks[0].source.id
        }
      }

      // Создаем обычные задачи и привязываем их к той же уборке/ремонту через sourceId
      if (customItems.length > 0) {
        // Если sourceId еще не получен (нет задач из чеклиста), создаем временную задачу из чеклиста для получения sourceId
        if (!sourceId && (cleaningId || repairId) && checklistInstance.items && checklistInstance.items.length > 0) {
          try {
            const tempInput: any = {
              items: [{
                itemKey: checklistInstance.items[0].key,
                description: customItems[0].description || 'Временная задача для получения sourceId',
                assigneeId: customItems[0].assigneeId,
                assigneeType: customItems[0].assigneeType,
                dueAt: customItems[0].dueAt || undefined,
              }],
            }
            if (cleaningId) {
              tempInput.cleaningId = cleaningId
            }
            if (repairId) {
              tempInput.repairId = repairId
            }
            const tempResult = await createTasksMutation.mutateAsync(tempInput)
            if (tempResult && tempResult.length > 0 && tempResult[0]?.source?.id) {
              sourceId = tempResult[0].source.id
            }
          } catch (e) {
            console.warn('Could not get sourceId for custom tasks', e)
          }
        }

        await Promise.all(
          customItems.map(async (item) => {
            const input: any = {
              orgId,
              type: 'MAINTENANCE',
              unitId: unitId || undefined,
              note: item.title ? `${item.title}: ${item.description || ''}` : item.description || undefined,
              dueAt: item.dueAt || undefined,
              sourceId: sourceId || undefined, // Привязываем к уборке/ремонту через sourceId
            }

            if (item.assigneeType === 'MASTER') {
              input.assignedMasterId = item.assigneeId
            } else if (item.assigneeType === 'CLEANER') {
              input.assignedCleanerId = item.assigneeId
            } else if (item.assigneeType === 'PROVIDER') {
              input.assignedProviderId = item.assigneeId
            }

            return graphqlClient.request(CREATE_TASK_FROM_CHECKLIST_ITEM, { input }) as any
          })
        )
        // Инвалидация будет выполнена после всех задач в конце handleSubmit
      }

      // Инвалидируем все запросы после создания всех задач
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      if (cleaningId) {
        queryClient.invalidateQueries({ queryKey: ['cleaning', cleaningId] })
        queryClient.invalidateQueries({ queryKey: ['cleaning-tasks', cleaningId] })
      }
      if (repairId) {
        queryClient.invalidateQueries({ queryKey: ['repair', repairId] })
        queryClient.invalidateQueries({ queryKey: ['repair-tasks', repairId] })
        // Инвалидируем с orgId тоже, если он используется в ключе
        if (orgId) {
          queryClient.invalidateQueries({ queryKey: ['repair-tasks', repairId, orgId] })
        }
      }

      // Сброс формы и скрытие компонента
      setTaskItems(new Map())
      setTasksCreated(true)
      
      // Вызываем onSuccess после всех обновлений
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create tasks:', error)
      alert('Не удалось создать задачи. Попробуйте еще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Инициализируем taskItems для всех неуспешных пунктов, если еще не инициализированы
  // НЕ сбрасываем tasksCreated при изменении failedItems, чтобы форма не появлялась снова
  useEffect(() => {
    // Если задачи уже созданы, не инициализируем заново
    if (tasksCreated) return
    
    if (taskItems.size === 0 && failedItems.length > 0) {
      const initialItems = new Map<string, TaskItemInput>()
      failedItems.forEach((item) => {
        const itemKey = item.key || item.id
        if (!itemKey) return
        initialItems.set(itemKey, {
          itemKey: itemKey,
          selected: true, // По умолчанию все включены
          description: item.title || '', // По умолчанию используем название пункта
          assigneeId: master?.id || cleaner?.id || '',
          assigneeType: master ? 'MASTER' : cleaner ? 'CLEANER' : 'MASTER',
          dueAt: undefined,
        })
      })
      setTaskItems(initialItems)
    }
  }, [failedItems, taskItems.size, master, cleaner, tasksCreated])

  // Проверяем валидность checklistInstance после всех хуков
  if (!checklistInstance || !checklistInstance.items) {
    return null
  }

  // Если задачи уже созданы, не показываем компонент
  if (tasksCreated) {
    return null
  }

  const selectedCount = Array.from(taskItems.values()).filter((item) => item.selected).length
  const allTaskItems = Array.from(taskItems.entries())

  // Компонент для отображения одного элемента задачи
  const TaskItemCard = ({ itemKey, taskItem, item }: { itemKey: string; taskItem: TaskItemInput; item?: any }) => {
    const answer = item ? checklistInstance.answers.find((a: any) => a.itemKey === item.key) : null

    return (
      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div onClick={() => updateTaskItem(itemKey, { selected: !taskItem.selected })}>
            <Checkbox checked={taskItem.selected} />
          </div>
          <div className="flex-1 space-y-2">
            {item && (
              <div>
                <Heading level={6} className="mb-1">
                  {item.title}
                </Heading>
                {item.description && (
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                    {item.description}
                  </Text>
                )}
                {answer?.note && (
                  <Text className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Комментарий: {answer.note}
                  </Text>
                )}
              </div>
            )}
            {taskItem.isCustom && (
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={taskItem.title || ''}
                    onChange={(e) => updateTaskItem(itemKey, { title: e.target.value })}
                    placeholder="Название задачи"
                    className="w-full font-semibold"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => removeTaskItem(itemKey)}
                  className="text-red-600 hover:text-red-800 text-sm ml-2"
                >
                  Удалить
                </Button>
              </div>
            )}

            {taskItem.selected && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Описание задачи *
                  </label>
                  <Textarea
                    value={taskItem.description}
                    onChange={(e) => updateTaskItem(itemKey, { description: e.target.value })}
                    placeholder="Что нужно сделать?"
                    rows={2}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Тип исполнителя
                    </label>
                    <Select
                      value={taskItem.assigneeType}
                      onChange={(e) =>
                        updateTaskItem(itemKey, {
                          assigneeType: e.target.value as 'PROVIDER' | 'CLEANER' | 'MASTER',
                          assigneeId: '', // Сбрасываем при смене типа
                        })
                      }
                      className="w-full"
                    >
                      <option value="MASTER">Мастер</option>
                      <option value="PROVIDER">Поставщик услуг</option>
                      <option value="CLEANER">Уборщик</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Исполнитель *
                    </label>
                    <Select
                      value={taskItem.assigneeId}
                      onChange={(e) => updateTaskItem(itemKey, { assigneeId: e.target.value })}
                      className="w-full"
                    >
                      <option value="">Выберите исполнителя</option>
                      {taskItem.assigneeType === 'MASTER'
                        ? (Array.isArray(mastersData) ? mastersData : []).map((master: any) => (
                            <option key={master.id} value={master.id}>
                              {master.firstName} {master.lastName}
                              {master.type && ` (${master.type})`}
                            </option>
                          ))
                        : taskItem.assigneeType === 'PROVIDER'
                          ? (Array.isArray(providersData) ? providersData : []).map((provider: any) => (
                              <option key={provider.id} value={provider.id}>
                                {provider.name}
                              </option>
                            ))
                          : (Array.isArray(cleanersData) ? cleanersData : []).map((cleaner: any) => (
                              <option key={cleaner.id} value={cleaner.id}>
                                {cleaner.firstName} {cleaner.lastName}
                              </option>
                            ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Срок выполнения (опционально)
                  </label>
                  <Input
                    type="datetime-local"
                    value={taskItem.dueAt || ''}
                    onChange={(e) =>
                      updateTaskItem(itemKey, { dueAt: e.target.value || undefined })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 space-y-4">
      <div>
        <Heading level={4}>Создать задачи</Heading>
        <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {failedItems.length > 0
            ? `Найдено ${failedItems.length} неуспешных пунктов. Выберите пункты, для которых нужно создать задачи, или добавьте обычную задачу.`
            : 'Все пункты чек-листа выполнены успешно. Вы можете создать обычную задачу.'}
        </Text>
      </div>

      <div className="space-y-4">
        {/* Задачи из чеклиста */}
        {failedItems.map((item) => {
          const itemKey = item.key || item.id
          if (!itemKey) return null
          const taskItem = taskItems.get(itemKey)
          if (!taskItem) return null
          return <TaskItemCard key={itemKey} itemKey={itemKey} taskItem={taskItem} item={item} />
        })}

        {/* Обычные задачи */}
        {allTaskItems
          .filter(([itemKey]) => taskItems.get(itemKey)?.isCustom)
          .map(([itemKey, taskItem]) => (
            <TaskItemCard key={itemKey} itemKey={itemKey} taskItem={taskItem} />
          ))}

        {/* Форма добавления новой задачи */}
        <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-4">
          <div className="flex gap-2">
            <Input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Введите название задачи"
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomTask()
                }
              }}
            />
            <Button
              onClick={addCustomTask}
              disabled={!newTaskTitle.trim()}
            >
              Добавить задачу
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          Выбрано: {selectedCount} {selectedCount === 1 ? 'задача' : selectedCount < 5 ? 'задачи' : 'задач'}
        </Text>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedCount === 0}
        >
          {isSubmitting ? 'Создаём задачи...' : `Создать задачи (${selectedCount})`}
        </Button>
      </div>
    </div>
  )
}

