'use client'

import { PencilIcon } from '@heroicons/react/24/outline'
import { Text } from '@/components/text'
import { TaskTemplateNameDisplay } from '@/components/task-template-name-display'
import type { GetTaskByIdQuery } from '@/lib/generated/graphql'

type Task = NonNullable<GetTaskByIdQuery['task']>

interface NotificationTaskContentProps {
  item: any
  task: Task
  isCleaning: boolean
}

export function NotificationTaskContent({ item, task, isCleaning }: NotificationTaskContentProps) {
  if (!isCleaning || (!item.notes && item.difficulty === undefined && !item.templateId)) {
    return null
  }

  return (
    <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
      {item.notes && (
        <div className="flex items-start gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30">
            <PencilIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 uppercase tracking-wide">
              Заметки
            </Text>
            <Text className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
              {item.notes}
            </Text>
          </div>
        </div>
      )}
      {item.difficulty !== undefined && item.difficulty !== null && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
          <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/30">
            <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">
              D{item.difficulty}
            </Text>
          </div>
          <div className="flex-1">
            <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-0.5 uppercase tracking-wide">
              Сложность
            </Text>
            <Text className="text-sm text-zinc-900 dark:text-zinc-100">
              {item.difficulty === 0 ? 'Очень легко' : 
               item.difficulty === 1 ? 'Легко' : 
               item.difficulty === 2 ? 'Средне' : 
               item.difficulty === 3 ? 'Сложно' : 
               item.difficulty === 4 ? 'Очень сложно' : 
               'Экстремально'}
            </Text>
          </div>
        </div>
      )}
      {item.templateId && (
        <TaskTemplateNameDisplay 
          templateId={item.templateId} 
          unitId={item.unitId || task.unit?.id || null}
          cleaningId={item.cleaningId || null}
        />
      )}
    </div>
  )
}

