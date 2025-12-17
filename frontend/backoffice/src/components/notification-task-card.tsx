'use client'

import { ClockIcon, TrashIcon } from '@heroicons/react/24/outline'
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
  handleSaveItem: (item: any, executorIdOverride?: string) => void
  setEditingItemId: (id: string | null) => void
  removeTaskItem: (itemId: string) => void
  removeTaskItemMutation: { isPending: boolean }
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
  // Получаем компоненты даты в UTC, чтобы избежать сдвига из-за часового пояса
  const dateUTC = new Date(Date.UTC(
    scheduledDate.getUTCFullYear(),
    scheduledDate.getUTCMonth(),
    scheduledDate.getUTCDate()
  ))
  const formattedDate = dateUTC.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
  const formattedTime = scheduledDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
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
      className={`
        group relative
        bg-white dark:bg-zinc-900
        rounded-2xl
        border border-zinc-200/60 dark:border-zinc-700/60
        transition-all duration-200 ease-out
        w-full max-w-full
        ${canEdit ? 'cursor-pointer' : ''}
        ${
          isEditing 
            ? 'shadow-[0px_1px_3px_0px_rgba(0,0,0,0.3),0px_4px_8px_3px_rgba(0,0,0,0.15)] ring-2 ring-blue-500 dark:ring-blue-400 border-blue-500 dark:border-blue-400' 
            : 'shadow-[0px_1px_2px_0px_rgba(0,0,0,0.3),0px_1px_3px_1px_rgba(0,0,0,0.15)] hover:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.3),0px_2px_6px_2px_rgba(0,0,0,0.15)] active:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.3),0px_1px_3px_1px_rgba(0,0,0,0.15)]'
        }
        ${canEdit && !isEditing ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50' : ''}
      `}
    >
      {/* Material Design state layer */}
      {canEdit && !isEditing && (
        <div 
          className="absolute inset-0 rounded-2xl bg-blue-500/0 group-hover:bg-blue-500/8 dark:group-hover:bg-blue-400/8 group-active:bg-blue-500/12 dark:group-active:bg-blue-400/12 transition-colors duration-150 ease-out pointer-events-none"
        />
      )}
      
      <div className="relative p-5 space-y-4">
        {/* Header section */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Time badge - Material Design FAB-style */}
            <div 
              className={`
                flex-shrink-0
                h-10 w-10 md:h-12 md:w-12
                rounded-full
                flex items-center justify-center
                text-xs md:text-sm font-medium
                shadow-[0px_1px_2px_0px_rgba(0,0,0,0.3),0px_1px_3px_1px_rgba(0,0,0,0.15)]
                ${isCleaning 
                  ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' 
                  : 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100'
                }
              `}
            >
              {formattedTime}
            </div>
            
            {/* Title and address */}
            <div className="flex-1 min-w-0">
              <Text className="text-base md:text-lg font-medium text-zinc-900 dark:text-zinc-50 truncate leading-tight">
                {item.unitName || 'Неизвестная квартира'}
              </Text>
              {item.unitAddress && (
                <Text className="text-sm text-zinc-600 dark:text-zinc-400 truncate mt-1 leading-snug">
                  {item.unitAddress}
                </Text>
              )}
            </div>
          </div>
          
          {/* Action button */}
          {canEdit && (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Удалить эту задачу из списка?')) {
                  removeTaskItem(itemId)
                }
              }}
              disabled={removeTaskItemMutation.isPending}
              className="flex-shrink-0 h-8 w-8 p-0 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 transition-colors duration-150"
              title="Удалить"
            >
              <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
            </Button>
          )}
        </div>

        {/* Date and time info */}
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <ClockIcon className="w-4 h-4 flex-shrink-0" />
          <Text className="font-medium">{formattedTime}</Text>
          <span className="text-zinc-400 dark:text-zinc-500">•</span>
          <Text>{formattedDate}</Text>
        </div>
        
        {/* Content section */}
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

