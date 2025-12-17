'use client'

import { useState, use, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/dialog'
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
  SparklesIcon,
  UserPlusIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { graphqlClient } from '@/lib/graphql-client'
import { graphqlRequest } from '@/lib/graphql-wrapper'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { GET_TASK_BY_ID, UPDATE_TASK_STATUS, ASSIGN_TASK, GET_SERVICE_PROVIDERS, GET_CLEANERS, GET_MASTERS, SCHEDULE_CLEANING, SCHEDULE_REPAIR, GET_UNITS_BY_PROPERTY, GET_PROPERTIES_BY_ORG, UPDATE_DAILY_NOTIFICATION_TASK_ITEM, SEND_DAILY_NOTIFICATION_TASK, UPDATE_TASK, GET_MEMBERSHIPS_BY_ORG, GET_CHECKLISTS_BY_UNIT, GET_CHECKLIST_TEMPLATE, GET_CLEANING, GET_BOOKINGS } from '@/lib/graphql-queries'
import { findAdjacentBookings, formatCheckInOutInfo } from '@/lib/booking-utils'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { TrashIcon } from '@heroicons/react/24/outline'
import { TaskTemplateNameDisplay } from '@/components/task-template-name-display'
import { TaskTemplateSelector } from '@/components/task-template-selector'
import { NotificationTasksView, type EditedItem } from '@/components/notification-tasks-view'
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
  
  // Состояние для редактирования карточек DAILY_NOTIFICATION
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editedItems, setEditedItems] = useState<Record<string, EditedItem>>({})
  const [showAssignDailyDialog, setShowAssignDailyDialog] = useState(false)
  const [selectedManagerId, setSelectedManagerId] = useState<string>('')

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
  const { data: providersData } = useQuery<any>({
    queryKey: ['serviceProviders', taskData?.task?.type],
    queryFn: () => graphqlClient.request(GET_SERVICE_PROVIDERS, {
      serviceTypes: taskData?.task?.type && taskData.task.type !== 'CLEANING' 
        ? [taskData.task.type] 
        : undefined
    }),
    enabled: !!taskData?.task && taskData.task.type !== 'CLEANING'
  })

  // Запрос уборщиков (для CLEANING задач и DAILY_NOTIFICATION)
  const { data: cleanersData } = useQuery<any>({
    queryKey: ['cleaners', currentOrgId],
    queryFn: () => graphqlClient.request(GET_CLEANERS, {
      orgId: currentOrgId!,
      isActive: true,
      first: 100
    }),
    enabled: !!currentOrgId && ((taskData?.task?.type as any) === 'CLEANING' || (taskData?.task?.type as any) === 'DAILY_NOTIFICATION')
  })

  const cleaners = cleanersData?.cleaners?.edges?.map((edge: any) => edge.node) || []

  // Запрос менеджеров (для DAILY_NOTIFICATION задач)
  const { data: managersData } = useQuery<any>({
    queryKey: ['managers', currentOrgId],
    queryFn: () => graphqlClient.request(GET_MEMBERSHIPS_BY_ORG, {
      orgId: currentOrgId!,
    }),
    enabled: !!currentOrgId && (taskData?.task?.type as any) === 'DAILY_NOTIFICATION',
  });

  const managers = managersData?.membershipsByOrg
    ?.filter((m: any) => m.role === 'MANAGER' && m.user)
    .map((m: any) => ({
      id: m.user.id,
      firstName: m.user.name?.split(' ')[0] || '',
      lastName: m.user.name?.split(' ').slice(1).join(' ') || '',
      email: m.user.email,
      name: m.user.name,
    })) || [];
  const taskNoteInfo = useMemo(() => {
    try {
      return taskData?.task?.note ? JSON.parse(taskData.task.note) : {};
    } catch {
      return {};
    }
  }, [taskData?.task?.note]);

  // Запрос мастеров (для MAINTENANCE задач и DAILY_NOTIFICATION с типом REPAIR)
  const { data: mastersData } = useQuery<any>({
    queryKey: ['masters', currentOrgId],
    queryFn: () => graphqlClient.request(GET_MASTERS, {
      orgId: currentOrgId!,
      isActive: true,
      first: 100
    }),
    enabled: !!currentOrgId && ((taskData?.task?.type as any) === 'MAINTENANCE' || (taskData?.task?.type as any) === 'DAILY_NOTIFICATION')
  })

  const masters = mastersData?.masters?.edges?.map((edge: any) => edge.node) || []

  // Получаем бронирования для связанной уборки (если есть) - ДО условий возврата
  const sourceCleaning = taskData?.task ? (taskData.task as any)?.source?.cleaning : null
  const sourceCleaningUnitId = sourceCleaning?.unit?.id
  const sourceCleaningScheduledAt = sourceCleaning?.scheduledAt

  const { data: sourceCleaningBookingsData } = useQuery({
    queryKey: ['bookings', sourceCleaningUnitId, sourceCleaningScheduledAt],
    queryFn: async () => {
      if (!sourceCleaningUnitId || !sourceCleaningScheduledAt) return null
      
      // Получаем бронирования за период ±7 дней от даты уборки
      const scheduledDate = new Date(sourceCleaningScheduledAt)
      const fromDate = new Date(scheduledDate)
      fromDate.setDate(fromDate.getDate() - 7)
      const toDate = new Date(scheduledDate)
      toDate.setDate(toDate.getDate() + 7)

      const response = await graphqlClient.request(GET_BOOKINGS, {
        unitId: sourceCleaningUnitId,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        first: 50,
      }) as any

      return response.bookings?.edges?.map((edge: any) => edge.node) || []
    },
    enabled: !!sourceCleaningUnitId && !!sourceCleaningScheduledAt,
  })

  // Находим ближайшие бронирования для связанной уборки
  const { checkoutBooking: sourceCleaningCheckout, checkinBooking: sourceCleaningCheckin } = sourceCleaningScheduledAt && sourceCleaningBookingsData
    ? findAdjacentBookings(sourceCleaningBookingsData, sourceCleaningScheduledAt)
    : { checkoutBooking: null, checkinBooking: null }
  const { checkoutText: sourceCleaningCheckoutText, checkinText: sourceCleaningCheckinText } = formatCheckInOutInfo(sourceCleaningCheckout, sourceCleaningCheckin)

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

  // Мутация обновления задачи
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => 
      graphqlClient.request(UPDATE_TASK, { id, input: { note } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  // Мутация обновления задачи в DAILY_NOTIFICATION
  const updateDailyTaskItemMutation = useMutation({
    mutationFn: async ({ itemId, scheduledAt, executorId, notes, difficulty, templateId }: { itemId: string; scheduledAt?: string; executorId?: string | null; notes?: string; difficulty?: number; templateId?: string }) => {
      // Создаем input объект, исключая undefined поля
      // Если executorId это пустая строка '', передаем null для удаления исполнителя
      const input: any = {
        taskId: id,
        itemId,
      };
      if (scheduledAt !== undefined) input.scheduledAt = scheduledAt;
      // Если executorId это пустая строка, передаем null для удаления
      // Если executorId это undefined, не передаем поле вообще
      if (executorId !== undefined) {
        input.executorId = executorId === '' ? null : executorId;
      }
      if (notes !== undefined) input.notes = notes;
      if (difficulty !== undefined) input.difficulty = difficulty;
      if (templateId !== undefined) input.templateId = templateId;
      
      console.log('📤 Mutation input:', input);
      
      return graphqlRequest(UPDATE_DAILY_NOTIFICATION_TASK_ITEM, { input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      // Не закрываем карточку автоматически - она закроется только при изменении времени
    },
  });

  // Мутация отправки DAILY_NOTIFICATION
  const sendDailyNotificationMutation = useMutation({
    mutationFn: async () => {
      return graphqlRequest(SEND_DAILY_NOTIFICATION_TASK, { taskId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Мутация для удаления задачи из списка
  const removeTaskItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!taskData?.task?.note) throw new Error('Task note not found');
      
      const taskInfo = JSON.parse(taskData.task.note);
      const tasksList = taskInfo.tasks || [];
      const filteredTasks = tasksList.filter((t: any) => 
        t.cleaningId !== itemId && t.repairId !== itemId
      );
      
      taskInfo.tasks = filteredTasks;
      taskInfo.tasksCount = filteredTasks.length;
      
      return graphqlClient.request(UPDATE_TASK, {
        id: id,
        input: {
          note: JSON.stringify(taskInfo),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    },
  });

  const removeTaskItem = (itemId: string) => {
    removeTaskItemMutation.mutate(itemId);
  };

  // Обработчики для редактирования
  const handleEditItem = (item: any) => {
    const itemId = item.cleaningId || item.repairId || '';
    const scheduledDate = new Date(item.scheduledAt);
    // Извлекаем только время в формате HH:mm для редактирования
    const timeString = scheduledDate.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    // Определяем executorId в зависимости от типа задачи
    let executorId = item.executorId;
    if (isDailyNotification && task.note) {
      try {
        const taskInfo = JSON.parse(task.note);
        if (taskInfo.taskType === 'CLEANING') {
          executorId = item.cleanerId;
        } else if (taskInfo.taskType === 'REPAIR') {
          executorId = item.masterId;
        }
      } catch (e) {
        // Если не удалось распарсить, используем executorId
      }
    }
    
    setEditingItemId(itemId);
    setEditedItems({
      ...editedItems,
      [itemId]: {
        scheduledAt: item.scheduledAt, // Сохраняем исходную дату для восстановления
        timeString: timeString, // Сохраняем время как строку для редактирования
        initialTimeString: timeString, // Фиксируем исходное время
        executorId: executorId, // Сохраняем текущего исполнителя (cleanerId/masterId)
        initialExecutorId: executorId, // Фиксируем исходное значение, чтобы не триггерить сохранение при открытии селекта
        notes: item.notes || '', // Загружаем notes
        initialNotes: item.notes || '', // Фиксируем исходные notes
        difficulty: item.difficulty !== undefined ? item.difficulty : null, // Загружаем difficulty
        initialDifficulty: item.difficulty !== undefined ? item.difficulty : null, // Фиксируем исходную difficulty
        templateId: item.templateId || '', // Загружаем templateId
        initialTemplateId: item.templateId || '', // Фиксируем исходный templateId
      },
    });
  };

  const handleSaveItem = (item: any, executorIdOverride?: string) => {
    const itemId = item.cleaningId || item.repairId || '';
    const edited = editedItems[itemId];
    const executorId = executorIdOverride !== undefined ? executorIdOverride : edited?.executorId;
    
    // Проверяем, что изменилось
    // Для времени: проверяем, что timeString установлен и отличается от initialTimeString
    const currentTimeString = edited?.timeString !== undefined ? edited.timeString : null;
    const initialTimeString = edited?.initialTimeString !== undefined ? edited.initialTimeString : null;
    const timeChanged = currentTimeString !== null && initialTimeString !== null && currentTimeString !== initialTimeString;
    
    // Для исполнителя: если передан executorIdOverride, это явное изменение
    // Также проверяем, изменился ли edited.executorId от initialExecutorId
    const currentExecutorId = item.cleanerId || item.masterId || item.executorId || '';
    const newExecutorId = executorIdOverride !== undefined ? executorIdOverride : (edited?.executorId !== undefined ? edited.executorId : '');
    const initialExecutorId = edited?.initialExecutorId || '';
    
    // Исполнитель изменился, если:
    // 1. Передан executorIdOverride (даже если это пустая строка для удаления)
    // 2. Или edited.executorId отличается от initialExecutorId
    const executorChanged = executorIdOverride !== undefined || (edited?.executorId !== undefined && newExecutorId !== initialExecutorId);
    
    const notesChanged = edited?.notes !== undefined && edited.notes !== edited.initialNotes;
    const difficultyChanged = edited?.difficulty !== undefined && edited.difficulty !== edited.initialDifficulty;
    const templateChanged = edited?.templateId !== undefined && edited.templateId !== edited.initialTemplateId;
    
    // Если передан executorIdOverride или изменяется только исполнитель (без времени)
    if (executorIdOverride !== undefined || (!timeChanged && executorChanged)) {
      // Нормализуем значения для сравнения
      const normalizedNew = newExecutorId || '';
      const normalizedCurrent = currentExecutorId || '';
      
      // Если исполнитель не изменился и нет других изменений, выходим
      if (normalizedNew === normalizedCurrent && !notesChanged && !difficultyChanged && !templateChanged) {
        return;
      }
      
      // Если newExecutorId пустая строка, передаем null для удаления исполнителя
      // Важно: явно проверяем на пустую строку, чтобы отличить удаление от отсутствия изменений
      // Попробуем передавать пустую строку вместо null, так как бэкенд может не обрабатывать null
      const executorIdToSave = normalizedNew === '' ? '' : normalizedNew;
      
      console.log('🔄 Saving executor change:', {
        itemId,
        currentExecutorId: normalizedCurrent,
        newExecutorId: normalizedNew,
        executorIdToSave,
        executorIdOverride,
        executorChanged
      });
      
      updateDailyTaskItemMutation.mutate({
        itemId,
        executorId: executorIdToSave, // Всегда передаем, если мы в этой ветке
        notes: notesChanged ? edited.notes : undefined,
        difficulty: difficultyChanged ? (edited.difficulty !== null && edited.difficulty !== undefined ? edited.difficulty : undefined) : undefined,
        templateId: templateChanged ? edited.templateId : undefined,
      }, {
        onSuccess: () => {
          // Оставляем executorId в editedItems, чтобы селект сохранял выбранное значение,
          // пока данные не подтянутся после invalidateQueries
          queryClient.invalidateQueries({ queryKey: ['task', id] });
        }
      });
      return;
    }
    
    // Если изменяются только notes, difficulty или templateId (без времени и исполнителя)
    if (!timeChanged && !executorChanged && (notesChanged || difficultyChanged || templateChanged)) {
      updateDailyTaskItemMutation.mutate({
        itemId,
        notes: notesChanged ? edited.notes : undefined,
        difficulty: difficultyChanged ? (edited.difficulty !== null && edited.difficulty !== undefined ? edited.difficulty : undefined) : undefined,
        templateId: templateChanged ? edited.templateId : undefined,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['task', id] });
        }
      });
      return;
    }
    
    // Если executorIdOverride === undefined и нет edited.executorId, значит удаляем исполнителя
    if (executorIdOverride === undefined && !edited?.executorId && !timeChanged && !notesChanged && !difficultyChanged && !templateChanged) {
      const currentExecutorId = item.cleanerId || item.masterId || item.executorId;
      if (currentExecutorId) {
        // Удаляем исполнителя
        updateDailyTaskItemMutation.mutate({
          itemId,
          executorId: undefined,
        }, {
          onSuccess: () => {
            // Не выходим из режима редактирования
          }
        });
      }
      return;
    }
    
    // Если время не изменено и нет других изменений, выходим из режима редактирования
    if (!timeChanged && !executorChanged && !notesChanged && !difficultyChanged && !templateChanged) {
      setEditingItemId(null);
      return;
    }
    
    // Берем исходную дату и меняем только время
    const originalDate = new Date(item.scheduledAt);
    const timeString = edited.timeString || '00:00';
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Создаем новую дату с тем же днем, но новым временем
    const newDate = new Date(originalDate);
    newDate.setHours(hours, minutes, 0, 0);
    
    // Обрабатываем executorId: если он изменился или нужно удалить (пустая строка)
    let executorIdToSave: string | undefined = undefined;
    if (executorChanged) {
      const newExecutorId = executorIdOverride !== undefined ? executorIdOverride : (edited?.executorId || '');
      executorIdToSave = newExecutorId === '' ? undefined : newExecutorId;
    } else if (edited?.executorId !== undefined) {
      // Если executorId был установлен в edited, но не изменился, используем его
      executorIdToSave = edited.executorId === '' ? undefined : edited.executorId;
    }
    
    updateDailyTaskItemMutation.mutate({
      itemId,
      scheduledAt: newDate.toISOString(),
      executorId: executorIdToSave,
      notes: notesChanged ? edited.notes : undefined,
      difficulty: difficultyChanged ? (edited.difficulty ?? undefined) : undefined,
      templateId: templateChanged ? edited.templateId : undefined,
    }, {
      onSuccess: () => {
        // Выходим из режима редактирования после успешного сохранения
        setEditingItemId(null);
        // Очищаем editedItems для этого элемента
        const newEditedItems = { ...editedItems };
        delete newEditedItems[itemId];
        setEditedItems(newEditedItems);
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  // Обертка для setEditedItems для соответствия типу компонента
  const handleSetEditedItems = (items: Record<string, EditedItem>) => {
    setEditedItems(items);
  };

  // Функция для назначения менеджера на саму задачу DAILY_NOTIFICATION
  const handleAssignDailyExecutor = async () => {
    if (!selectedManagerId || !taskData?.task) return;
    
    // Для DAILY_NOTIFICATION задач назначаем менеджера через updateTask
    // Сохраняем информацию о менеджере в note
    const taskInfo = JSON.parse(taskData.task.note || '{}');
    taskInfo.assignedManagerId = selectedManagerId;
    
    // Находим имя менеджера
    const manager = managers.find((m: any) => m.id === selectedManagerId);
    if (manager) {
      taskInfo.assignedManagerName = manager.name || `${manager.firstName} ${manager.lastName}`.trim();
    }
    
    await updateTaskMutation.mutateAsync({
      id: taskData.task.id,
      note: JSON.stringify(taskInfo),
    });

    setShowAssignDailyDialog(false);
    setSelectedManagerId('');
  };

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
      'DRAFT': { color: 'yellow' as const, text: 'Черновик' },
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
      'INVENTORY': { color: 'cyan' as const, text: 'Инвентаризация' },
      'DAILY_NOTIFICATION': { color: 'blue' as const, text: 'Ежедневное уведомление' }
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
  const isDailyNotification = (task.type as any) === 'DAILY_NOTIFICATION'
  const isDraftStatus = (task.status as any) === 'DRAFT'
  const isTodoStatus = (task.status as any) === 'TODO'
  const isInProgressStatus = (task.status as any) === 'IN_PROGRESS'
  const isDoneStatus = (task.status as any) === 'DONE'
  const isCanceledStatus = (task.status as any) === 'CANCELED'

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
          {/* Кнопка назначения исполнителя для DAILY_NOTIFICATION вместо кебаба */}
          {isDailyNotification && (isDraftStatus || isTodoStatus) && managers.length > 0 && !task.assignedTo && (
            <Button
              onClick={() => setShowAssignDailyDialog(true)}
              className="flex items-center gap-2 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <UserPlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Назначить исполнителя</span>
            </Button>
          )}
          {/* Кебаб для других типов задач */}
          {!isDailyNotification && (
            <Dropdown>
              <DropdownButton className="bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300">
                <EllipsisVerticalIcon className="w-5 h-5" />
              </DropdownButton>
              <DropdownMenu className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg">
                <DropdownItem onClick={() => router.push(`/tasks/${task.id}/edit`)}>
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Редактировать
                </DropdownItem>
                {isTodoStatus && (
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
                {(isTodoStatus || isInProgressStatus) && (
                  <DropdownItem onClick={() => handleUpdateStatus('CANCELED')}>
                    <XCircleIcon className="w-4 h-4 mr-2" />
                    Отменить
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Основная информация */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Левая колонка - основная информация */}
        <div className="lg:col-span-2 space-y-6">
          {/* Описание задачи или карточки для DAILY_NOTIFICATION */}
          {isDailyNotification && task.note ? (() => {
            try {
              const taskInfo = JSON.parse(task.note);
              const isCleaning = taskInfo.taskType === 'CLEANING';
              const targetDate = new Date(taskInfo.targetDate);
              const dateUTC = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
              const formattedDate = dateUTC.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });

              return (
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  {/* Заголовок с переключателем вида */}
                  <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <Subheading className="mb-1 text-zinc-900 dark:text-zinc-100">
                          {isCleaning ? '📋 Уборки' : '🔧 Ремонты'} на {formattedDate}
                        </Subheading>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                              Всего: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{taskInfo.tasksCount || taskInfo.tasks?.length || 0}</span>
                            </Text>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                              С исполнителем: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{taskInfo.tasks?.filter((t: any) => t.executorName).length || 0}</span>
                            </Text>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={isCleaning ? 'blue' : 'orange'} className="text-sm px-3 py-1">
                          {isCleaning ? 'Уборки' : 'Ремонты'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                  {/* Карточки задач */}
                  {taskInfo.tasks && taskInfo.tasks.length > 0 ? (
                    <NotificationTasksView
                      tasks={taskInfo.tasks}
                      editingItemId={editingItemId}
                      editedItems={editedItems}
                      setEditedItems={handleSetEditedItems}
                      handleEditItem={handleEditItem}
                      handleSaveItem={handleSaveItem}
                      setEditingItemId={setEditingItemId}
                      removeTaskItem={removeTaskItem}
                      removeTaskItemMutation={removeTaskItemMutation}
                      task={task}
                      isCleaning={isCleaning}
                      isDailyNotification={isDailyNotification}
                      isDoneStatus={isDoneStatus}
                      isCanceledStatus={isCanceledStatus}
                      isDraftStatus={isDraftStatus}
                      cleanersData={cleanersData}
                      mastersData={mastersData}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <Text className="text-zinc-500 dark:text-zinc-400 text-lg mb-2">
                        Задачи не найдены
                      </Text>
                      <Text className="text-zinc-400 dark:text-zinc-500 text-sm">
                        Для этой даты не запланировано {isCleaning ? 'уборок' : 'ремонтов'}
                      </Text>
                    </div>
                  )}
                  {/* Кнопка отправки уведомлений - всегда доступна для DAILY_NOTIFICATION */}
                  {isDailyNotification && (
                    <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                      <Button
                        onClick={() => {
                          if (confirm('Отправить уведомления? Задача будет отправлена всем менеджерам организации.')) {
                            sendDailyNotificationMutation.mutate();
                          }
                        }}
                        disabled={sendDailyNotificationMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all px-6 py-2.5 rounded-lg font-medium"
                      >
                        {sendDailyNotificationMutation.isPending ? 'Отправка...' : '📤 Отправить уведомления'}
                      </Button>
                    </div>
                  )}
                  </div>
                </div>
              );
            } catch (e) {
              // Если не удалось распарсить JSON, показываем сообщение об ошибке
              console.error('Failed to parse task.note:', e, task.note);
              return (
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="p-6">
                    <Subheading className="mb-4">Ежедневное уведомление</Subheading>
                    <Text className="text-zinc-500 dark:text-zinc-400 mb-2">
                      Не удалось загрузить данные о задачах. Ошибка парсинга JSON.
                    </Text>
                    {task.note && (
                      <details className="mt-4">
                        <summary className="text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
                          Показать содержимое note
                        </summary>
                        <Text className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap text-xs mt-2 font-mono bg-zinc-50 dark:bg-zinc-800 p-3 rounded">
                          {task.note}
                        </Text>
                      </details>
                    )}
                  </div>
                </div>
              );
            }
          })() : isDailyNotification ? (
            // Для DAILY_NOTIFICATION если note пустой, показываем сообщение
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="p-6">
                <Subheading className="mb-4">Ежедневное уведомление</Subheading>
                <Text className="text-zinc-500 dark:text-zinc-400">
                  Данные о задачах отсутствуют. Возможно, задача еще не была полностью создана.
                </Text>
              </div>
            </div>
          ) : (
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
          )}

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
                      {(() => {
                        const checkIn = new Date(task.booking.checkIn)
                        const checkOut = new Date(task.booking.checkOut)
                        const checkInUTC = new Date(Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate()))
                        const checkOutUTC = new Date(Date.UTC(checkOut.getUTCFullYear(), checkOut.getUTCMonth(), checkOut.getUTCDate()))
                        return `${checkInUTC.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' })} - ${checkOutUTC.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' })}`
                      })()}
                    </Text>
                    <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      🔗 Нажмите для перехода к бронированию
                    </Text>
                  </div>
                </div>
              )}

              {/* Информация о связи с уборкой через source */}
              {(taskData?.task as any)?.source?.type === 'CLEANING' && (taskData?.task as any)?.source?.cleaning && (
                <div 
                  className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                  onClick={() => {
                    const source = (taskData?.task as any)?.source
                    if (source?.cleaning?.id) {
                      router.push(`/cleanings/${source.cleaning.id}`)
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
                    {(taskData?.task as any)?.source?.cleaning?.status && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Статус: {(taskData?.task as any)?.source?.cleaning?.status === 'SCHEDULED' ? 'Запланирована' :
                                 (taskData?.task as any)?.source?.cleaning?.status === 'IN_PROGRESS' ? 'В процессе' :
                                 (taskData?.task as any)?.source?.cleaning?.status === 'COMPLETED' ? 'Завершена' :
                                 (taskData?.task as any)?.source?.cleaning?.status === 'APPROVED' ? 'Одобрена' :
                                 (taskData?.task as any)?.source?.cleaning?.status}
                      </Text>
                    )}
                    {(taskData?.task as any)?.source?.cleaning?.cleaner && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Уборщик: {(taskData?.task as any)?.source?.cleaning?.cleaner?.firstName} {(taskData?.task as any)?.source?.cleaning?.cleaner?.lastName}
                      </Text>
                    )}
                    {(taskData?.task as any)?.source?.cleaning?.scheduledAt && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Запланирована: {(() => {
                          const date = new Date((taskData?.task as any)?.source?.cleaning?.scheduledAt)
                          const dateUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
                          const dateStr = dateUTC.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' })
                          const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
                          return `${dateStr} ${timeStr}`
                        })()}
                      </Text>
                    )}
                    {(taskData?.task as any)?.source?.cleaning?.completedAt && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Завершена: {(() => {
                          const date = new Date((taskData?.task as any)?.source?.cleaning?.completedAt)
                          const dateUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
                          const dateStr = dateUTC.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' })
                          const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
                          return `${dateStr} ${timeStr}`
                        })()}
                      </Text>
                    )}
                    {/* Информация о бронированиях */}
                    {(sourceCleaningCheckoutText || sourceCleaningCheckinText) && (
                      <div className="mt-2 space-y-1">
                        {sourceCleaningCheckoutText && (
                          <Text className="text-sm font-medium text-gray-900 dark:text-white">
                            {sourceCleaningCheckoutText}
                          </Text>
                        )}
                        {sourceCleaningCheckinText && (
                          <Text className="text-sm font-medium text-gray-900 dark:text-white">
                            {sourceCleaningCheckinText}
                          </Text>
                        )}
                      </div>
                    )}
                    <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      🔗 Нажмите для перехода к уборке
                    </Text>
                  </div>
                </div>
              )}

              {/* Информация о связи с ремонтом через source */}
              {(taskData?.task as any)?.source?.type === 'REPAIR' && (taskData?.task as any)?.source?.repair && (
                <div 
                  className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                  onClick={() => {
                    const source = (taskData?.task as any)?.source
                    if (source?.repair?.id) {
                      router.push(`/repairs/${source.repair.id}`)
                    } else {
                      router.push('/repairs')
                    }
                  }}
                >
                  <SparklesIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <Text className="font-medium text-gray-900 dark:text-white">
                      Связанный ремонт
                    </Text>
                    {(taskData?.task as any)?.source?.repair?.status && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Статус: {(taskData?.task as any)?.source?.repair?.status === 'SCHEDULED' ? 'Запланирован' :
                                 (taskData?.task as any)?.source?.repair?.status === 'IN_PROGRESS' ? 'В процессе' :
                                 (taskData?.task as any)?.source?.repair?.status === 'COMPLETED' ? 'Завершен' :
                                 (taskData?.task as any)?.source?.repair?.status === 'CANCELLED' ? 'Отменен' :
                                 (taskData?.task as any)?.source?.repair?.status}
                      </Text>
                    )}
                    {(taskData?.task as any)?.source?.repair?.master && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Мастер: {(taskData?.task as any)?.source?.repair?.master?.firstName} {(taskData?.task as any)?.source?.repair?.master?.lastName}
                      </Text>
                    )}
                    {(taskData?.task as any)?.source?.repair?.scheduledAt && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Запланирован: {(() => {
                          const date = new Date((taskData?.task as any)?.source?.repair?.scheduledAt)
                          const dateUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
                          const dateStr = dateUTC.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' })
                          const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
                          return `${dateStr} ${timeStr}`
                        })()}
                      </Text>
                    )}
                    {(taskData?.task as any)?.source?.repair?.completedAt && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        Завершен: {(() => {
                          const date = new Date((taskData?.task as any)?.source?.repair?.completedAt)
                          const dateUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
                          const dateStr = dateUTC.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' })
                          const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
                          return `${dateStr} ${timeStr}`
                        })()}
                      </Text>
                    )}
                    <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      🔗 Нажмите для перехода к ремонту
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
                    {(() => {
                      const date = new Date(task.createdAt)
                      const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' })
                      const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
                      return `${dateStr} ${timeStr}`
                    })()}
                  </Text>
                </div>
              </div>
              {task.dueAt && (
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-zinc-500" />
                  <div>
                    <Text className="text-sm font-medium">Срок выполнения:</Text>
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                      {(() => {
                        const date = new Date(task.dueAt)
                        const dateUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
                        const dateStr = dateUTC.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' })
                        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
                        return `${dateStr} ${timeStr}`
                      })()}
                    </Text>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-zinc-500" />
                <div>
                  <Text className="text-sm font-medium">Обновлено:</Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                    {(() => {
                      const date = new Date(task.updatedAt)
                      const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' })
                      const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
                      return `${dateStr} ${timeStr}`
                    })()}
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
            ) : (taskData?.task as any)?.assignedMaster ? (
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-orange-600" />
                <div>
                  <Text className="font-medium">Мастер</Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                    ID: {(taskData?.task as any)?.assignedMaster?.id}
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
            ) : (isDailyNotification && taskNoteInfo?.assignedManagerId) ? (
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <Text className="font-medium">{taskNoteInfo.assignedManagerName || 'Менеджер назначен'}</Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                    ID: {taskNoteInfo.assignedManagerId}
                  </Text>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Text className="text-zinc-500 mb-3">Исполнитель не назначен</Text>
                {isTodoStatus && !isDailyNotification && (
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
              {/* Выпадающий список для изменения статуса */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Изменить статус
                </label>
                <Select
                  value={task.status}
                  onChange={(e) => {
                    if (e.target.value !== task.status) {
                      handleUpdateStatus(e.target.value);
                    }
                  }}
                  className="w-full"
                  disabled={updateTaskStatusMutation.isPending}
                >
                  <option value="DRAFT">Черновик</option>
                  <option value="TODO">Ожидает</option>
                  <option value="IN_PROGRESS">В работе</option>
                  <option value="DONE">Завершена</option>
                  <option value="CANCELED">Отменена</option>
                </Select>
              </div>
              {isTodoStatus && !isDailyNotification && (
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
              {(isTodoStatus || isInProgressStatus) && (
                <Button 
                  outline
                  onClick={() => handleUpdateStatus('CANCELED')}
                  className="w-full !text-zinc-800 dark:!text-zinc-100"
                >
                  Отменить задачу
                </Button>
              )}
              {/* Создать уборку из задачи */}
              {task.type === 'CLEANING' && task.unit && isTodoStatus && !(taskData?.task as any)?.source?.cleaning && (
                <Button 
                  onClick={() => setShowCreateCleaningDialog(true)}
                  className="w-full"
                  color="blue"
                >
                  Создать уборку
                </Button>
              )}
              {/* Создать ремонт из задачи */}
              {task.type === 'MAINTENANCE' && task.unit && isTodoStatus && (
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
                  if (!task.unit) {
                    alert('Юнит не указан для этой задачи')
                    return
                  }
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
                  if (!task.unit) {
                    alert('Юнит не указан для этой задачи')
                    return
                  }
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

      {/* Диалог назначения исполнителя для DAILY_NOTIFICATION */}
      {isDailyNotification && (isDraftStatus || isTodoStatus) && (
        <Dialog open={showAssignDailyDialog} onClose={() => setShowAssignDailyDialog(false)}>
          <DialogTitle>Назначить исполнителя</DialogTitle>
          <DialogDescription>
            Выберите менеджера для назначения на задачу уведомления. Менеджер будет получать уведомления о задачах.
          </DialogDescription>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Менеджер
                </label>
                <Select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full"
                >
                  <option value="">Выберите менеджера</option>
                  {managers.map((manager: any) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name || `${manager.firstName} ${manager.lastName}`.trim()}
                      {manager.email ? ` (${manager.email})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </DialogBody>
          <DialogActions>
            <Button
              onClick={() => {
                setShowAssignDailyDialog(false);
                setSelectedManagerId('');
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleAssignDailyExecutor}
              disabled={!selectedManagerId || updateTaskMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {updateTaskMutation.isPending ? 'Назначение...' : 'Назначить'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

    </div>
  )
}
