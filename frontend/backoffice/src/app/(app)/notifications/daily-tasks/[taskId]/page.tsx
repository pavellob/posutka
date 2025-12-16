'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Select } from '@/components/select';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/dialog';
import { Squares2X2Icon, ListBulletIcon, ClockIcon, UserIcon, TrashIcon, PencilIcon, CalendarIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { graphqlRequest } from '@/lib/graphql-wrapper';
import { graphqlClient } from '@/lib/graphql-client';
import { GET_DAILY_NOTIFICATION_TASK, UPDATE_DAILY_NOTIFICATION_TASK_ITEM, SEND_DAILY_NOTIFICATION_TASK, GET_MEMBERSHIPS_BY_ORG, GET_CLEANERS, GET_MASTERS } from '@/lib/graphql-queries';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';

interface TaskItem {
  cleaningId?: string;
  repairId?: string;
  unitName: string;
  unitAddress?: string | null;
  scheduledAt: string;
  executorName?: string | null;
  executorId?: string;
  cleanerId?: string;
  masterId?: string;
  notes?: string;
  difficulty?: number;
  templateId?: string;
}

interface TaskData {
  taskType: 'CLEANING' | 'REPAIR';
  targetDate: string;
  tasksCount: number;
  tasks: TaskItem[];
}

export default function EditDailyNotificationTaskPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentOrgId } = useCurrentOrganization();
  const taskId = params.taskId as string;

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<Record<string, Partial<TaskItem & { 
    timeString?: string;
    initialTimeString?: string;
    initialExecutorId?: string;
  }>>>({});
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');

  // Получаем задачу
  const { data: taskData, isLoading } = useQuery({
    queryKey: ['dailyNotificationTask', taskId],
    queryFn: async () => {
      const response = await graphqlRequest(GET_DAILY_NOTIFICATION_TASK, { taskId });
      return response.data.task;
    },
    enabled: !!taskId,
  });

  // Получаем список менеджеров для массового назначения (исполнитель самой задачи)
  const { data: managersData } = useQuery({
    queryKey: ['managers', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const response = await graphqlClient.request(GET_MEMBERSHIPS_BY_ORG, {
        orgId: currentOrgId,
      }) as any;
      // Фильтруем только менеджеров
      const memberships = response.membershipsByOrg || [];
      return memberships
        .filter((m: any) => m.role === 'MANAGER' && m.user)
        .map((m: any) => ({
          id: m.user.id,
          firstName: m.user.name?.split(' ')[0] || '',
          lastName: m.user.name?.split(' ').slice(1).join(' ') || '',
          email: m.user.email,
          name: m.user.name,
        }));
    },
    enabled: !!currentOrgId && !!taskData,
  });

  const managers = managersData || [];

  // Парсим tasksList из note (нужно до использования в enabled)
  const taskInfo: TaskData | null = taskData?.note 
    ? JSON.parse(taskData.note) 
    : null;

  // Получаем список уборщиков (для CLEANING задач)
  const { data: cleanersData } = useQuery<any>({
    queryKey: ['cleaners', currentOrgId],
    queryFn: () => graphqlClient.request(GET_CLEANERS, {
      orgId: currentOrgId!,
      isActive: true,
      first: 100
    }),
    enabled: !!currentOrgId && !!taskInfo && taskInfo.taskType === 'CLEANING'
  });

  const cleaners = cleanersData?.cleaners?.edges?.map((edge: any) => edge.node) || [];

  // Получаем список мастеров (для REPAIR задач)
  const { data: mastersData } = useQuery<any>({
    queryKey: ['masters', currentOrgId],
    queryFn: () => graphqlClient.request(GET_MASTERS, {
      orgId: currentOrgId!,
      isActive: true,
      first: 100
    }),
    enabled: !!currentOrgId && !!taskInfo && taskInfo.taskType === 'REPAIR'
  });

  const masters = mastersData?.masters?.edges?.map((edge: any) => edge.node) || [];

  // Мутация для обновления задачи
  const updateMutation = useMutation({
    mutationFn: async ({ itemId, scheduledAt, executorId }: { itemId: string; scheduledAt?: string; executorId?: string }) => {
      return graphqlRequest(UPDATE_DAILY_NOTIFICATION_TASK_ITEM, {
        input: {
          taskId,
          itemId,
          scheduledAt,
          executorId,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyNotificationTask', taskId] });
      // Не закрываем карточку автоматически - она закроется только при изменении времени
    },
  });

  // Мутация для отправки уведомления
  const sendMutation = useMutation({
    mutationFn: async () => {
      return graphqlRequest(SEND_DAILY_NOTIFICATION_TASK, { taskId });
    },
    onSuccess: () => {
      router.push('/notifications/daily-tasks');
    },
  });

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  if (!taskData || !taskInfo) {
    return <div>Задача не найдена</div>;
  }

  if (taskData.status !== 'DRAFT') {
    return (
      <div className="space-y-4">
        <Heading level={1}>Задача уже отправлена</Heading>
        <Text>Эта задача уже была отправлена и не может быть отредактирована.</Text>
        <Button onClick={() => router.push('/notifications/daily-tasks')}>
          Вернуться к списку
        </Button>
      </div>
    );
  }

  const isCleaning = taskInfo.taskType === 'CLEANING';
  const formattedDate = new Date(taskInfo.targetDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleEdit = (item: TaskItem) => {
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
    if (isCleaning) {
      executorId = item.cleanerId;
    } else {
      executorId = item.masterId;
    }
    
    setEditingItem(itemId);
    setEditedItems({
      ...editedItems,
      [itemId]: {
        scheduledAt: item.scheduledAt, // Сохраняем исходную дату
        timeString: timeString, // Сохраняем время как строку для редактирования
        executorName: item.executorName,
        executorId: executorId, // Сохраняем cleanerId/masterId
        initialExecutorId: executorId, // Фиксируем исходное значение
        initialTimeString: timeString, // Фиксируем исходное время
      },
    });
  };

  const handleSave = (item: TaskItem, executorIdOverride?: string) => {
    const itemId = item.cleaningId || item.repairId || '';
    const edited = editedItems[itemId];
    const executorId = executorIdOverride !== undefined ? executorIdOverride : edited?.executorId;
    
    // Если время не менялось и не было смены исполнителя, не сохраняем
    if (edited?.timeString && edited.initialTimeString === edited.timeString && executorIdOverride === undefined && (edited.executorId === edited.initialExecutorId || edited.executorId === undefined)) {
      return;
    }

    // Если передан executorIdOverride, значит изменяется только исполнитель
    // Если время не изменено, но изменился исполнитель, сохраняем только исполнителя
    if (executorIdOverride !== undefined || (!edited?.timeString && executorId !== undefined)) {
      // Проверяем, изменилось ли значение (нормализуем для сравнения)
      const currentExecutorId = item.cleanerId || item.masterId || item.executorId;
      const normalizedNew = executorId || '';
      const normalizedCurrent = currentExecutorId || '';
      
      if (normalizedNew === normalizedCurrent) {
        // Значение не изменилось, не сохраняем
        return;
      }
      
      updateMutation.mutate({
        itemId,
        executorId: executorId || undefined, // Передаем undefined для удаления исполнителя
      }, {
        onSuccess: () => {
          // Не выходим из режима редактирования, если изменился только исполнитель
          // Очищаем executorId из editedItems после сохранения, чтобы селектор использовал значение из перезагруженных данных
          setEditedItems((prev) => {
            const newEditedItems = { ...prev };
            if (newEditedItems[itemId]) {
              delete newEditedItems[itemId].executorId;
              // Если остался только timeString, оставляем его
              if (Object.keys(newEditedItems[itemId]).length === 0) {
                delete newEditedItems[itemId];
              }
            }
            return newEditedItems;
          });
        }
      });
      return;
    }
    
    // Если executorIdOverride === undefined и нет edited.executorId, значит удаляем исполнителя
    if (executorIdOverride === undefined && !edited?.executorId && !edited?.timeString) {
      const currentExecutorId = item.cleanerId || item.masterId || item.executorId;
      if (currentExecutorId) {
        // Удаляем исполнителя
        updateMutation.mutate({
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
    
    // Если время не изменено и исполнитель не изменен, выходим из режима редактирования
    if (!edited?.timeString) {
      setEditingItem(null);
      return;
    }
    
    // Берем исходную дату и меняем только время
    const originalDate = new Date(item.scheduledAt);
    const [hours, minutes] = edited.timeString.split(':').map(Number);
    
    // Создаем новую дату с тем же днем, но новым временем
    const newDate = new Date(originalDate);
    newDate.setHours(hours, minutes, 0, 0);
    
    updateMutation.mutate({
      itemId,
      scheduledAt: newDate.toISOString(),
      // Используем executorId из edited, если он есть, иначе из item
      executorId: edited.executorId !== undefined ? edited.executorId : item.executorId,
    }, {
      onSuccess: () => {
        // Выходим из режима редактирования после успешного сохранения
        setEditingItem(null);
        // Очищаем editedItems для этого элемента
        const newEditedItems = { ...editedItems };
        delete newEditedItems[itemId];
        setEditedItems(newEditedItems);
      }
    });
  };

  const handleCancel = () => {
    setEditingItem(null);
  };

  const handleAssignExecutor = async () => {
    if (!selectedManagerId || !taskInfo) return;
    
    const selectedManager = managers.find((m: any) => m.id === selectedManagerId);
    if (!selectedManager) return;

    // Находим все задачи без исполнителя
    const itemsWithoutExecutor = taskInfo.tasks.filter((t: TaskItem) => !t.executorName);
    
    // Назначаем исполнителя на все задачи без исполнителя
    const promises = itemsWithoutExecutor.map((item: TaskItem) => {
      const itemId = item.cleaningId || item.repairId || '';
      return updateMutation.mutateAsync({
        itemId,
        executorId: selectedManagerId,
      });
    });

    try {
      await Promise.all(promises);
      setShowAssignDialog(false);
      setSelectedManagerId('');
      queryClient.invalidateQueries({ queryKey: ['dailyNotificationTask', taskId] });
    } catch (error) {
      console.error('Error assigning executor:', error);
    }
  };

  const handleSend = () => {
    if (confirm('Отправить уведомления? Задача будет отправлена всем менеджерам организации.')) {
      sendMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-start justify-between">
        <div>
          <Heading level={1}>
            {isCleaning ? '📋 Уборки' : '🔧 Ремонты'} на {formattedDate}
          </Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Проверьте и отредактируйте задачи перед отправкой уведомлений
          </Text>
        </div>
        {/* Кнопка назначения исполнителя в правом верхнем углу */}
        {managers.length > 0 && taskInfo.tasks.some((t: TaskItem) => !t.executorName) && (
          <Button
            onClick={() => setShowAssignDialog(true)}
            outline
            className="flex items-center gap-2 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Назначить исполнителя</span>
          </Button>
        )}
      </div>

      {/* Навигация */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8">
          <Link
            href="/notifications/daily-tasks"
            className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            ← Назад к списку
          </Link>
        </nav>
      </div>

      {/* Статистика и переключатель вида */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                Всего: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{taskInfo.tasksCount}</span>
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                С исполнителем: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{taskInfo.tasks.filter(t => t.executorName).length}</span>
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge color={isCleaning ? 'blue' : 'orange'} className="text-sm px-3 py-1">
              {isCleaning ? 'Уборки' : 'Ремонты'}
            </Badge>
            {/* Переключатель вида */}
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <Button
                onClick={() => setViewMode('cards')}
                className={`p-2 h-8 w-8 ${viewMode === 'cards' ? 'bg-blue-500 text-white shadow-md' : 'bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
                title="Карточки"
              >
                <Squares2X2Icon className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setViewMode('list')}
                className={`p-2 h-8 w-8 ${viewMode === 'list' ? 'bg-blue-500 text-white shadow-md' : 'bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
                title="Список"
              >
                <ListBulletIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Карточки или список задач */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {taskInfo.tasks.map((item, index) => {
            const itemId = item.cleaningId || item.repairId || '';
            const isEditing = editingItem === itemId;
            const edited = editedItems[itemId] || {};
            const scheduledDate = new Date(item.scheduledAt);
            // Используем локальное время для отображения
            const formattedTime = scheduledDate.toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
            const formattedDate = scheduledDate.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });

            return (
              <div
                key={itemId}
                onClick={(e) => {
                  // Не открываем редактирование, если клик был на интерактивном элементе
                  if ((e.target as HTMLElement).closest('select, input, button')) {
                    return;
                  }
                  if (!isEditing) {
                    handleEdit(item);
                  }
                }}
                className={`group relative bg-white dark:bg-zinc-800 rounded-xl shadow-sm border transition-all duration-200 cursor-pointer ${
                  isEditing 
                    ? 'border-blue-500 dark:border-blue-400 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800' 
                    : 'border-zinc-200 dark:border-zinc-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
              {/* Material Design elevation effect - убрана черная подложка */}
              <div className={`absolute inset-0 rounded-xl transition-opacity ${
                isEditing ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 opacity-0 group-hover:opacity-100'
              }`}></div>
              
                <div className="relative p-5 space-y-3">
                  {/* Заголовок карточки */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCleaning 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Text className="font-semibold text-base text-zinc-900 dark:text-zinc-100 truncate">
                            {item.unitName || 'Неизвестная квартира'}
                          </Text>
                          {item.unitAddress && (
                            <Text className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {item.unitAddress}
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      {/* Редактирование времени */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                          Время выполнения
                        </label>
                        <Input
                          type="time"
                          value={edited.timeString || (() => {
                            const date = new Date(item.scheduledAt);
                            return date.toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            });
                          })()}
                          onChange={(e) => {
                            setEditedItems({
                              ...editedItems,
                              [itemId]: {
                                ...edited,
                                timeString: e.target.value,
                              },
                            });
                          }}
                          onBlur={() => {
                            // Автосохранение при потере фокуса
                            if (edited.timeString) {
                              handleSave(item);
                            }
                          }}
                          autoFocus
                          className="w-full text-sm border-zinc-300 dark:border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(item.scheduledAt).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </div>

                          {/* Выбор исполнителя */}
                      {(() => {
                        if (isCleaning && cleaners.length > 0) {
                          return (
                            <div>
                              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                                Уборщик
                              </label>
                              <select
                            value={edited.executorId !== undefined ? (edited.executorId || '') : (item.cleanerId || item.executorId || '')}
                            onChange={(e) => {
                              const newExecutorId = e.target.value ? e.target.value : undefined;
                              setEditedItems({
                                ...editedItems,
                                [itemId]: {
                                  ...edited,
                                  executorId: newExecutorId,
                                },
                              });
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onBlur={() => {
                              const newExecutorId = editedItems[itemId]?.executorId ?? edited.executorId;
                              const currentExecutorId = item.cleanerId || item.executorId || '';
                              const initialExecutorId = edited.initialExecutorId ?? currentExecutorId;
                              const normalizedNew = newExecutorId || '';
                              const normalizedInitial = initialExecutorId || '';
                              if (normalizedNew !== normalizedInitial) {
                                handleSave(item, newExecutorId);
                              }
                            }}
                            className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          >
                            <option value="">Не назначен</option>
                            {cleaners.map((cleaner: any) => (
                              <option key={cleaner.id} value={cleaner.id}>
                                {cleaner.firstName} {cleaner.lastName}
                                {cleaner.phone ? ` (${cleaner.phone})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    } else if (!isCleaning && masters.length > 0) {
                      return (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                            Мастер
                          </label>
                            <select
                              value={edited.executorId !== undefined ? (edited.executorId || '') : (item.masterId || item.executorId || '')}
                            onChange={(e) => {
                              const newExecutorId = e.target.value ? e.target.value : undefined;
                              setEditedItems({
                                ...editedItems,
                                [itemId]: {
                                  ...edited,
                                  executorId: newExecutorId,
                                },
                              });
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onBlur={() => {
                              const newExecutorId = editedItems[itemId]?.executorId ?? edited.executorId;
                              const currentExecutorId = item.masterId || item.executorId || '';
                              const initialExecutorId = edited.initialExecutorId ?? currentExecutorId;
                              const normalizedNew = newExecutorId || '';
                              const normalizedInitial = initialExecutorId || '';
                              if (normalizedNew !== normalizedInitial) {
                                handleSave(item, newExecutorId);
                              }
                            }}
                            className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                            <option value="">Не назначен</option>
                            {masters.map((master: any) => (
                              <option key={master.id} value={master.id}>
                                {master.firstName} {master.lastName}
                                {master.phone ? ` (${master.phone})` : ''}
                              </option>
                            ))}
                            </select>
                        </div>
                      );
                    }
                    return null;
                  })()}
                    </div>
                  ) : (
                    <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      {/* Время */}
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          isCleaning 
                            ? 'bg-blue-100 dark:bg-blue-900/30' 
                            : 'bg-orange-100 dark:bg-orange-900/30'
                        }`}>
                          <ClockIcon className={`w-5 h-5 ${
                            isCleaning 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-orange-600 dark:text-orange-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {formattedTime}
                          </Text>
                          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formattedDate}
                          </Text>
                        </div>
                      </div>

                      {/* Исполнитель */}
                      <div className={`flex items-center gap-3 p-2 rounded-lg ${
                        item.executorName 
                          ? 'bg-green-50 dark:bg-green-900/20' 
                          : 'bg-zinc-50 dark:bg-zinc-900/50'
                      }`}>
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          item.executorName
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-zinc-200 dark:bg-zinc-700'
                        }`}>
                          <UserIcon className={`w-5 h-5 ${
                            item.executorName
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-zinc-400 dark:text-zinc-500'
                          }`} />
                        </div>
                        <div className="flex-1">
                          {item.executorName ? (
                            <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {item.executorName}
                            </Text>
                          ) : (
                            <Text className="text-sm italic text-zinc-500 dark:text-zinc-400">
                              Не назначен
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Список задач */
        <div className="space-y-2">
          {taskInfo.tasks.map((item: any, index: number) => {
            const itemId = item.cleaningId || item.repairId || '';
            const isEditing = editingItem === itemId;
            const edited = editedItems[itemId] || {};
            const scheduledDate = new Date(item.scheduledAt);
            const formattedTime = scheduledDate.toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });

            return (
              <div
                key={itemId}
                onClick={() => {
                  if (!isEditing) {
                    handleEdit(item);
                  }
                }}
                className={`group relative bg-white dark:bg-zinc-800 rounded-xl shadow-sm border transition-all duration-200 cursor-pointer ${
                  isEditing 
                    ? 'border-blue-500 dark:border-blue-400 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800' 
                    : 'border-zinc-200 dark:border-zinc-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                {/* Material Design elevation effect - убрана черная подложка */}
                <div className={`absolute inset-0 rounded-xl transition-opacity ${
                  isEditing ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 opacity-0 group-hover:opacity-100'
                }`}></div>
                
                <div className="relative p-3 md:p-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                    {/* Номер */}
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                      isCleaning 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                    }`}>
                      {index + 1}
                    </div>

                    {/* Информация */}
                    <div className="flex-1 min-w-0 w-full md:w-auto">
                      <Text className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                        {item.unitName || 'Неизвестная квартира'}
                      </Text>
                      {item.unitAddress && (
                        <Text className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {item.unitAddress}
                        </Text>
                      )}
                    </div>

                    {/* Время и исполнитель */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-6 w-full md:w-auto">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                        <ClockIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {formattedTime}
                        </Text>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        item.executorName 
                          ? 'bg-green-50 dark:bg-green-900/20' 
                          : 'bg-zinc-50 dark:bg-zinc-900/50'
                      }`}>
                        <UserIcon className={`w-4 h-4 ${
                          item.executorName 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`} />
                        <Text className={`text-sm ${
                          item.executorName 
                            ? 'text-zinc-900 dark:text-zinc-100 font-medium' 
                            : 'text-zinc-500 dark:text-zinc-400 italic'
                        }`}>
                          {item.executorName || 'Не назначен'}
                        </Text>
                      </div>
                    </div>

                    {/* Действия - убрана черная подложка */}
                    <div className="flex items-center gap-2 ml-auto md:ml-0">
                    </div>
                  </div>

                  {/* Редактирование в списке */}
                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                            Время
                          </label>
                          <Input
                            type="time"
                            value={edited.timeString || (() => {
                              const date = new Date(item.scheduledAt);
                              return date.toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              });
                            })()}
                            onChange={(e) => {
                              setEditedItems({
                                ...editedItems,
                                [itemId]: {
                                  ...edited,
                                  timeString: e.target.value,
                                },
                              });
                            }}
                            onBlur={() => {
                              // Автосохранение при потере фокуса
                              if (edited.timeString) {
                                handleSave(item);
                              }
                            }}
                            autoFocus
                            className="w-full text-sm border-zinc-300 dark:border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Дата: {new Date(item.scheduledAt).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </Text>
                        </div>
                        {/* Выбор исполнителя */}
                        {(() => {
                          if (isCleaning && cleaners.length > 0) {
                            return (
                              <div>
                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                                  Уборщик
                                </label>
                                <select
                                  value={edited.executorId !== undefined ? (edited.executorId || '') : (item.cleanerId || item.executorId || '')}
                                  onChange={(e) => {
                                    const newExecutorId = e.target.value ? e.target.value : undefined;
                                    setEditedItems({
                                      ...editedItems,
                                      [itemId]: {
                                        ...edited,
                                        executorId: newExecutorId,
                                      },
                                    });
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onBlur={() => {
                                    const newExecutorId = editedItems[itemId]?.executorId ?? edited.executorId;
                                    const currentExecutorId = item.cleanerId || item.executorId || '';
                                    const initialExecutorId = edited.initialExecutorId ?? currentExecutorId;
                                    const normalizedNew = newExecutorId || '';
                                    const normalizedInitial = initialExecutorId || '';
                                    if (normalizedNew !== normalizedInitial) {
                                      handleSave(item, newExecutorId);
                                    }
                                  }}
                                  className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                  <option value="">Не назначен</option>
                                  {cleaners.map((cleaner: any) => (
                                    <option key={cleaner.id} value={cleaner.id}>
                                      {cleaner.firstName} {cleaner.lastName}
                                      {cleaner.phone ? ` (${cleaner.phone})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          } else if (!isCleaning && masters.length > 0) {
                            return (
                              <div>
                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                                  Мастер
                                </label>
                            <select
                              value={edited.executorId !== undefined ? (edited.executorId || '') : (item.masterId || item.executorId || '')}
                              onChange={(e) => {
                                const newExecutorId = e.target.value ? e.target.value : undefined;
                                setEditedItems({
                                  ...editedItems,
                                  [itemId]: {
                                    ...edited,
                                    executorId: newExecutorId,
                                  },
                                });
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              onBlur={() => {
                                const newExecutorId = editedItems[itemId]?.executorId ?? edited.executorId;
                                const currentExecutorId = item.masterId || item.executorId || '';
                                const initialExecutorId = edited.initialExecutorId ?? currentExecutorId;
                                const normalizedNew = newExecutorId || '';
                                const normalizedInitial = initialExecutorId || '';
                                if (normalizedNew !== normalizedInitial) {
                                  handleSave(item, newExecutorId);
                                }
                              }}
                              className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                  <option value="">Не назначен</option>
                                  {masters.map((master: any) => (
                                    <option key={master.id} value={master.id}>
                                      {master.firstName} {master.lastName}
                                      {master.phone ? ` (${master.phone})` : ''}
                                    </option>
                                  ))}
                            </select>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Кнопка отправки */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-zinc-200 dark:border-zinc-700">
        <Button
          outline
          onClick={() => router.push('/notifications/daily-tasks')}
          className="border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700"
        >
          Отмена
        </Button>
        <Button
          onClick={handleSend}
          disabled={sendMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all px-6 py-2.5"
        >
          {sendMutation.isPending ? 'Отправка...' : '📤 Отправить уведомления'}
        </Button>
      </div>

      {/* Диалог назначения исполнителя */}
      <Dialog open={showAssignDialog} onClose={() => setShowAssignDialog(false)}>
        <DialogTitle>Назначить исполнителя</DialogTitle>
        <DialogDescription>
          Выберите менеджера для назначения на все задачи без исполнителя ({taskInfo?.tasks.filter((t: TaskItem) => !t.executorName).length || 0} задач)
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
            outline
            onClick={() => {
              setShowAssignDialog(false);
              setSelectedManagerId('');
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleAssignExecutor}
            disabled={!selectedManagerId || updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {updateMutation.isPending ? 'Назначение...' : 'Назначить'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

