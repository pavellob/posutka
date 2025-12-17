'use client'

import { UserIcon } from '@heroicons/react/24/outline'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { NotificationTaskCard } from '@/components/notification-task-card'
import type { GetTaskByIdQuery } from '@/lib/generated/graphql'

type Task = NonNullable<GetTaskByIdQuery['task']>

export type EditedItem = {
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

interface NotificationTasksViewProps {
  tasks: any[]
  editingItemId: string | null
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

export function NotificationTasksView({
  tasks,
  editingItemId,
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
}: NotificationTasksViewProps) {
  // Пытаемся использовать группировку из task.note (если есть), иначе группируем на клиенте
  let tasksByExecutor = new Map<string, any[]>()
  let tasksWithoutExecutor: any[] = []
  
  try {
    if (task.note) {
      const taskInfo = JSON.parse(task.note)
      // Если есть executorGroups в taskInfo, используем их
      if (taskInfo.executorGroups && Array.isArray(taskInfo.executorGroups)) {
        taskInfo.executorGroups.forEach((group: any) => {
          if (group.executorId && group.tasks) {
            tasksByExecutor.set(group.executorId, group.tasks)
          }
        })
        // Используем tasksWithoutExecutor из taskInfo, если есть
        if (taskInfo.tasksWithoutExecutor && Array.isArray(taskInfo.tasksWithoutExecutor)) {
          tasksWithoutExecutor = taskInfo.tasksWithoutExecutor
        }
      } else {
        // Fallback: группируем на клиенте
        tasks?.forEach((item: any) => {
          const executorId = item.executorId || item.cleanerId || item.masterId
          const executorName = item.executorName
          
          if (executorId && executorName) {
            if (!tasksByExecutor.has(executorId)) {
              tasksByExecutor.set(executorId, [])
            }
            tasksByExecutor.get(executorId)!.push(item)
          } else {
            tasksWithoutExecutor.push(item)
          }
        })
      }
    } else {
      // Fallback: группируем на клиенте
      tasks?.forEach((item: any) => {
        const executorId = item.executorId || item.cleanerId || item.masterId
        const executorName = item.executorName
        
        if (executorId && executorName) {
          if (!tasksByExecutor.has(executorId)) {
            tasksByExecutor.set(executorId, [])
          }
          tasksByExecutor.get(executorId)!.push(item)
        } else {
          tasksWithoutExecutor.push(item)
        }
      })
    }
  } catch (error) {
    // Если ошибка парсинга, группируем на клиенте
    tasks?.forEach((item: any) => {
      const executorId = item.executorId || item.cleanerId || item.masterId
      const executorName = item.executorName
      
      if (executorId && executorName) {
        if (!tasksByExecutor.has(executorId)) {
          tasksByExecutor.set(executorId, [])
        }
        tasksByExecutor.get(executorId)!.push(item)
      } else {
        tasksWithoutExecutor.push(item)
      }
    })
  }
  
  // Сортируем задачи внутри каждой группы по времени (на случай если группа пришла не отсортированной)
  tasksByExecutor.forEach((tasks) => {
    tasks.sort((a, b) => {
      const timeA = new Date(a.scheduledAt).getTime()
      const timeB = new Date(b.scheduledAt).getTime()
      return timeA - timeB
    })
  })
  
  // Сортируем задачи без исполнителя по времени
  tasksWithoutExecutor.sort((a, b) => {
    const timeA = new Date(a.scheduledAt).getTime()
    const timeB = new Date(b.scheduledAt).getTime()
    return timeA - timeB
  })

  // List view - список (одна карточка под другой)
  return (
    <div className="space-y-4 md:space-y-6">
      {Array.from(tasksByExecutor.entries()).map(([executorId, executorTasks]) => {
        // Пытаемся получить имя исполнителя из первой задачи или из taskInfo
        let executorName = executorTasks[0]?.executorName
        if (!executorName && task.note) {
          try {
            const taskInfo = JSON.parse(task.note)
            const executorGroup = taskInfo.executorGroups?.find((g: any) => g.executorId === executorId)
            executorName = executorGroup?.executorName || 'Неизвестный исполнитель'
          } catch (e) {
            executorName = executorName || 'Неизвестный исполнитель'
          }
        } else {
          executorName = executorName || 'Неизвестный исполнитель'
        }
        return (
          <div key={executorId} className="space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200/50 dark:border-blue-900/30 shadow-sm">
              <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/50">
                <UserIcon className="w-4 h-4 text-blue-700 dark:text-blue-300" />
              </div>
              <Text className="font-semibold text-base text-blue-900 dark:text-blue-100">
                {executorName}
              </Text>
              <Badge color="blue" className="ml-auto">
                {executorTasks.length} {executorTasks.length === 1 ? 'задача' : executorTasks.length < 5 ? 'задачи' : 'задач'}
              </Badge>
            </div>
            <div className="space-y-3">
              {executorTasks.map((item: any) => {
                const itemId = item.cleaningId || item.repairId || ''
                const isEditing = editingItemId === itemId
                const edited = editedItems[itemId] || {}
                
                return (
                  <div key={itemId} className="w-full">
                    <NotificationTaskCard
                      item={item}
                      itemId={itemId}
                      isEditing={isEditing}
                      edited={edited}
                      editedItems={editedItems}
                      setEditedItems={setEditedItems}
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
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      {tasksWithoutExecutor.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/50 dark:border-zinc-700/30 shadow-sm">
            <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-700/50">
              <UserIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </div>
            <Text className="font-semibold text-base text-zinc-700 dark:text-zinc-300">
              Без исполнителя
            </Text>
            <Badge color="zinc" className="ml-auto">
              {tasksWithoutExecutor.length} {tasksWithoutExecutor.length === 1 ? 'задача' : tasksWithoutExecutor.length < 5 ? 'задачи' : 'задач'}
            </Badge>
          </div>
          <div className="space-y-3">
            {tasksWithoutExecutor.map((item: any) => {
              const itemId = item.cleaningId || item.repairId || ''
              const isEditing = editingItemId === itemId
              const edited = editedItems[itemId] || {}
              
              return (
                <div key={itemId} className="w-full">
                  <NotificationTaskCard
                    item={item}
                    itemId={itemId}
                    isEditing={isEditing}
                    edited={edited}
                    editedItems={editedItems}
                    setEditedItems={setEditedItems}
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
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

