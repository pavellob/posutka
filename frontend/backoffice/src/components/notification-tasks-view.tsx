'use client'

import { UserIcon, ClockIcon } from '@heroicons/react/24/outline'
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
  viewMode: 'cards' | 'list'
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
  viewMode,
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
  // Группируем задачи по исполнителям
  const tasksByExecutor = new Map<string, any[]>()
  const tasksWithoutExecutor: any[] = []
  
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
  
  // Сортируем задачи внутри каждой группы по времени
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

  if (viewMode === 'cards') {
    return (
      <div className="space-y-6">
        {/* Группы по исполнителям */}
        {Array.from(tasksByExecutor.entries()).map(([executorId, executorTasks]) => {
          const executorName = executorTasks[0]?.executorName || 'Неизвестный исполнитель'
          return (
            <div key={executorId} className="space-y-3">
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <Text className="font-semibold text-blue-900 dark:text-blue-100">
                  {executorName}
                </Text>
                <Badge color="blue" className="ml-auto">
                  {executorTasks.length} {executorTasks.length === 1 ? 'задача' : executorTasks.length < 5 ? 'задачи' : 'задач'}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {executorTasks.map((item: any) => {
                  const itemId = item.cleaningId || item.repairId || ''
                  const isEditing = editingItemId === itemId
                  const edited = editedItems[itemId] || {}
                  
                  return (
                    <NotificationTaskCard
                      key={itemId}
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
                  )
                })}
              </div>
            </div>
          )
        })}
        
        {/* Задачи без исполнителя */}
        {tasksWithoutExecutor.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <UserIcon className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <Text className="font-semibold text-zinc-600 dark:text-zinc-400">
                Без исполнителя
              </Text>
              <Badge color="zinc" className="ml-auto">
                {tasksWithoutExecutor.length} {tasksWithoutExecutor.length === 1 ? 'задача' : tasksWithoutExecutor.length < 5 ? 'задачи' : 'задач'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasksWithoutExecutor.map((item: any) => {
                const itemId = item.cleaningId || item.repairId || ''
                const isEditing = editingItemId === itemId
                const edited = editedItems[itemId] || {}
                
                return (
                  <NotificationTaskCard
                    key={itemId}
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
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // List view - упрощенная версия, можно расширить позже
  return (
    <div className="space-y-4">
      {Array.from(tasksByExecutor.entries()).map(([executorId, executorTasks]) => {
        const executorName = executorTasks[0]?.executorName || 'Неизвестный исполнитель'
        return (
          <div key={executorId} className="space-y-2">
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <Text className="font-semibold text-blue-900 dark:text-blue-100">
                {executorName}
              </Text>
              <Badge color="blue" className="ml-auto">
                {executorTasks.length} {executorTasks.length === 1 ? 'задача' : executorTasks.length < 5 ? 'задачи' : 'задач'}
              </Badge>
            </div>
            <div className="space-y-2">
              {executorTasks.map((item: any) => {
                const itemId = item.cleaningId || item.repairId || ''
                const isEditing = editingItemId === itemId
                const edited = editedItems[itemId] || {}
                
                return (
                  <NotificationTaskCard
                    key={itemId}
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
                )
              })}
            </div>
          </div>
        )
      })}
      {tasksWithoutExecutor.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <UserIcon className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            <Text className="font-semibold text-zinc-600 dark:text-zinc-400">
              Без исполнителя
            </Text>
            <Badge color="zinc" className="ml-auto">
              {tasksWithoutExecutor.length} {tasksWithoutExecutor.length === 1 ? 'задача' : tasksWithoutExecutor.length < 5 ? 'задачи' : 'задач'}
            </Badge>
          </div>
          <div className="space-y-2">
            {tasksWithoutExecutor.map((item: any) => {
              const itemId = item.cleaningId || item.repairId || ''
              const isEditing = editingItemId === itemId
              const edited = editedItems[itemId] || {}
              
              return (
                <NotificationTaskCard
                  key={itemId}
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
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

