'use client'

import { ClockIcon, ArrowTopRightOnSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/button'
import { Text } from '@/components/text'
import { NotificationTaskEditForm } from '@/components/notification-task-edit-form'
import { NotificationTaskContent } from '@/components/notification-task-content'
import type { GetTaskByIdQuery } from '@/lib/generated/graphql'

type Task = NonNullable<GetTaskByIdQuery['task']>

type EditedItem = {
  scheduledAt?: string
  timeString?: string
  initialTimeString?: string
  executorId?: string
  initialExecutorId?: string
  notes?: string
  initialNotes?: string
  difficulty?: number | null
  initialDifficulty?: number | null
  templateId?: string
  initialTemplateId?: string
}

interface NotificationTaskCardProps {
  item: any
  itemId: string
  isEditing: boolean
  edited: EditedItem
  editedItems: Record<string, EditedItem>
  setEditedItems: (items: Record<string, EditedItem>) => void
  handleEditItem: (item: any) => void
  handleSaveItem: (item: any) => void
  setEditingItemId: (id: string | null) => void
  removeTaskItem: (itemId: string) => void
  removeTaskItemMutation: { isPending: boolean }
  setSelectedCleaningId: (id: string | null) => void
  task: Task
  isCleaning: boolean
  isDailyNotification: boolean
  isDoneStatus: boolean
  isCanceledStatus: boolean
  isDraftStatus: boolean
  cleanersData?: any
  mastersData?: any
}

export function NotificationTaskCard({
  item,
  itemId,
  isEditing,
  edited,
  editedItems,
  setEditedItems,
  handleEditItem,
  handleSaveItem,
  setEditingItemId,
  removeTaskItem,
  removeTaskItemMutation,
  setSelectedCleaningId,
  task,
  isCleaning,
  isDailyNotification,
  isDoneStatus,
  isCanceledStatus,
  isDraftStatus,
  cleanersData,
  mastersData,
}: NotificationTaskCardProps) {
  const scheduledDate = new Date(item.scheduledAt)
  const formattedTime = scheduledDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const formattedDate = scheduledDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  const canEdit = isDailyNotification 
    ? (!isDoneStatus && !isCanceledStatus)
    : isDraftStatus

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('select, input, button')) {
          return
        }
        if (!isEditing && canEdit) {
          handleEditItem(item)
        }
      }}
      className={`group relative bg-white dark:bg-zinc-800 rounded-xl shadow-sm border transition-all duration-200 ${
        canEdit ? 'cursor-pointer' : ''
      } ${
        isEditing 
          ? 'border-blue-500 dark:border-blue-400 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800' 
          : 'border-zinc-200 dark:border-zinc-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600'
      }`}
    >
      {/* Material Design elevation effect */}
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
                {formattedTime}
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
          <div className="flex items-center gap-1 ml-2">
            {/* Кнопка для открытия уборки в модалке (только для уборок) */}
            {isCleaning && item.cleaningId && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedCleaningId(item.cleaningId)
                }}
                className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 border-transparent bg-transparent"
                title="Открыть уборку"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </Button>
            )}
            {canEdit && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Удалить эту задачу из списка?')) {
                    removeTaskItem(itemId)
                  }
                }}
                disabled={removeTaskItemMutation.isPending}
                className="h-8 w-8 p-0 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 border-transparent bg-transparent"
                title="Удалить"
              >
                <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
              </Button>
            )}
          </div>
        </div>

        {/* Время и дата */}
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <ClockIcon className="w-4 h-4" />
          <Text className="font-medium">{formattedTime}</Text>
          <Text className="text-zinc-400 dark:text-zinc-500">•</Text>
          <Text>{formattedDate}</Text>
        </div>
        
        {/* Контент карточки - редактирование или отображение */}
        {isEditing ? (
          <NotificationTaskEditForm
            item={item}
            itemId={itemId}
            edited={edited}
            editedItems={editedItems}
            setEditedItems={setEditedItems}
            handleSaveItem={handleSaveItem}
            setEditingItemId={setEditingItemId}
            task={task}
            isCleaning={isCleaning}
            cleanersData={cleanersData}
            mastersData={mastersData}
          />
        ) : (
          <NotificationTaskContent
            item={item}
            task={task}
            isCleaning={isCleaning}
          />
        )}
      </div>
    </div>
  )
}

