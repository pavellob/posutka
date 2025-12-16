'use client'

import { Button } from '@/components/button'
import { Text } from '@/components/text'
import { TaskTemplateSelector } from '@/components/task-template-selector'
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

interface NotificationTaskEditFormProps {
  item: any
  itemId: string
  edited: EditedItem
  editedItems: Record<string, EditedItem>
  setEditedItems: (items: Record<string, EditedItem>) => void
  handleSaveItem: (item: any, executorIdOverride?: string) => void
  setEditingItemId: (id: string | null) => void
  task: Task
  isCleaning: boolean
  cleanersData?: any
  mastersData?: any
}

export function NotificationTaskEditForm({
  item,
  itemId,
  edited,
  editedItems,
  setEditedItems,
  handleSaveItem,
  setEditingItemId,
  task,
  isCleaning,
  cleanersData,
  mastersData,
}: NotificationTaskEditFormProps) {
  return (
    <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
      {/* Time Selection */}
      <div className="space-y-1">
        <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
          Время
        </Text>
        <input
          type="time"
          value={edited.timeString !== undefined ? edited.timeString : (item.timeString || '')}
          onChange={(e) => {
            setEditedItems({
              ...editedItems,
              [itemId]: {
                ...edited,
                timeString: e.target.value,
              },
            })
          }}
          onBlur={() => {
            const currentTime = edited.timeString !== undefined ? edited.timeString : (item.timeString || '')
            const initialTime = edited.initialTimeString !== undefined ? edited.initialTimeString : ''
            if (currentTime && initialTime && currentTime !== initialTime) {
              handleSaveItem(item)
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Executor Selection */}
      <div className="space-y-1">
        <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
          Исполнитель
        </Text>
        <select
          value={edited.executorId !== undefined ? (edited.executorId || '') : (item.executorId || item.cleanerId || item.masterId || '')}
          onChange={(e) => {
            const newExecutorId = e.target.value
            const updatedEdited = {
              ...edited,
              executorId: newExecutorId,
            }
            const updatedEditedItems = {
              ...editedItems,
              [itemId]: updatedEdited,
            }
            setEditedItems(updatedEditedItems)
            // Сохраняем сразу при изменении исполнителя, передавая обновленный edited через executorIdOverride
            // handleSaveItem будет использовать executorIdOverride, который имеет приоритет над edited.executorId
            handleSaveItem(item, newExecutorId)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">Не назначен</option>
          {isCleaning ? (
            cleanersData?.cleaners?.edges?.map((edge: any) => (
              <option key={edge.node.id} value={edge.node.id}>
                {edge.node.firstName} {edge.node.lastName}
              </option>
            ))
          ) : (
            mastersData?.masters?.edges?.map((edge: any) => (
              <option key={edge.node.id} value={edge.node.id}>
                {edge.node.firstName} {edge.node.lastName}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Notes, Difficulty и Template для уборок */}
      {isCleaning && (
        <>
          {item.notes !== undefined && (
            <div className="space-y-1">
              <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                Заметки
              </Text>
              <textarea
                value={edited.notes !== undefined ? (edited.notes || '') : (item.notes || '')}
                onChange={(e) => {
                  setEditedItems({
                    ...editedItems,
                    [itemId]: {
                      ...edited,
                      notes: e.target.value,
                    },
                  })
                }}
                onBlur={() => {
                  if (edited.notes !== edited.initialNotes) {
                    handleSaveItem(item)
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                rows={2}
                className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Добавить заметку..."
              />
            </div>
          )}

          {/* Difficulty Selection */}
          <div className="space-y-1">
            <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
              Сложность
            </Text>
            <select
              value={edited.difficulty !== undefined ? (edited.difficulty ?? '') : (item.difficulty ?? '')}
              onChange={(e) => {
                const newDifficulty = e.target.value === '' ? null : parseInt(e.target.value, 10)
                setEditedItems({
                  ...editedItems,
                  [itemId]: {
                    ...edited,
                    difficulty: newDifficulty,
                  },
                })
              }}
              onBlur={() => {
                if (edited.difficulty !== edited.initialDifficulty) {
                  handleSaveItem(item)
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Не указана</option>
              {[0, 1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>
                  D{level} {level === 0 ? '(Очень легко)' : level === 1 ? '(Легко)' : level === 2 ? '(Средне)' : level === 3 ? '(Сложно)' : level === 4 ? '(Очень сложно)' : '(Экстремально)'}
                </option>
              ))}
            </select>
          </div>

          {/* Template Selection */}
          <TaskTemplateSelector
            item={item}
            itemId={itemId}
            edited={edited}
            editedItems={editedItems}
            setEditedItems={setEditedItems}
            handleSaveItem={handleSaveItem}
            task={task}
          />
        </>
      )}
    </div>
  )
}

