'use client'

import { useQuery } from '@tanstack/react-query'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { graphqlClient } from '@/lib/graphql-client'
import { GET_CHECKLISTS_BY_UNIT, GET_CLEANING } from '@/lib/graphql-queries'
import { Text } from '@/components/text'

export function TaskTemplateNameDisplay({ 
  templateId, 
  unitId, 
  cleaningId, 
  compact 
}: { 
  templateId: string
  unitId?: string | null
  cleaningId?: string | null
  compact?: boolean 
}) {
  // Если unitId не передан, пытаемся получить его из уборки по cleaningId
  const cleaningIdToUse = cleaningId || null
  const { data: cleaningData } = useQuery<any>({
    queryKey: ['cleaningForTemplate', cleaningIdToUse],
    queryFn: async () => {
      if (!cleaningIdToUse || unitId) return null
      try {
        const result = await graphqlClient.request(GET_CLEANING, { id: cleaningIdToUse })
        return result
      } catch (error) {
        return null
      }
    },
    enabled: !!cleaningIdToUse && !unitId,
  })

  const finalUnitId = unitId || cleaningData?.cleaning?.unit?.id || null

  // Получаем список шаблонов и находим нужный по ID
  const { data: templatesData } = useQuery<any>({
    queryKey: ['checklistTemplates', finalUnitId],
    queryFn: async () => {
      if (!finalUnitId) return { checklistsByUnit: [] }
      return graphqlClient.request(GET_CHECKLISTS_BY_UNIT, { unitId: finalUnitId })
    },
    enabled: !!finalUnitId && !!templateId,
  })

  const templates = templatesData?.checklistsByUnit || []
  const template = templates.find((t: any) => t.id === templateId)

  // Компактная версия для списка
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
        <SparklesIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <Text className="text-xs text-zinc-600 dark:text-zinc-400">
          {template?.name || `Шаблон: ${templateId.length > 12 ? templateId.substring(0, 12) + '...' : templateId}`}
        </Text>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
      <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30">
        <SparklesIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex-1">
        <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-0.5 uppercase tracking-wide">
          Шаблон чеклиста
        </Text>
        <Text className="text-sm text-zinc-900 dark:text-zinc-100">
          {template?.name || (templateId.length > 20 ? `${templateId.substring(0, 20)}...` : templateId)}
        </Text>
      </div>
    </div>
  )
}

