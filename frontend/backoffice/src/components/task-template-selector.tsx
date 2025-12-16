'use client'

import { useQuery } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'
import { GET_CHECKLISTS_BY_UNIT, GET_CLEANING } from '@/lib/graphql-queries'
import type { GetTaskByIdQuery } from '@/lib/generated/graphql'

type Task = NonNullable<GetTaskByIdQuery['task']>

export function TaskTemplateSelector({ 
  item, 
  itemId, 
  edited, 
  editedItems, 
  setEditedItems, 
  handleSaveItem, 
  task 
}: {
  item: any
  itemId: string
  edited: any
  editedItems: any
  setEditedItems: any
  handleSaveItem: (item: any, executorIdOverride?: string) => void
  task: Task
}) {
  // Получаем unitId из задачи
  // Приоритет: 1) item.unitId, 2) task.unit.id, 3) из taskInfo в task.note, 4) из уборки по cleaningId
  
  // Сначала пробуем из самого item (это самый надежный источник)
  const itemUnitId = item.unitId
  
  // Пробуем из задачи
  const taskUnitId = task.unit?.id
  
  // Пробуем из task.note
  let noteUnitId: string | null = null
  if (task.note) {
    try {
      const taskInfo = JSON.parse(task.note)
      const taskItem = taskInfo.tasks?.find((t: any) => (t.cleaningId || t.repairId) === itemId)
      if (taskItem?.unitId) {
        noteUnitId = taskItem.unitId
      }
    } catch (e) {
      // Игнорируем ошибки парсинга
    }
  }
  
  // Если есть cleaningId, получаем unitId из уборки
  const cleaningId = item.cleaningId || (itemId && !itemUnitId && !taskUnitId && !noteUnitId ? itemId : null)
  const { data: cleaningData } = useQuery<any>({
    queryKey: ['cleaning', cleaningId],
    queryFn: async () => {
      if (!cleaningId) return null
      try {
        const result = await graphqlClient.request(GET_CLEANING, { id: cleaningId })
        return result
      } catch (error) {
        console.error('Error fetching cleaning:', error)
        return null
      }
    },
    enabled: !!cleaningId && !itemUnitId && !taskUnitId && !noteUnitId, // Запрашиваем только если нет unitId из других источников
  })
  
  // Определяем финальный unitId с приоритетом
  const unitId = itemUnitId || taskUnitId || noteUnitId || cleaningData?.cleaning?.unit?.id || null
  
  console.log('TemplateSelector - Determining unitId:', {
    itemId: itemId,
    cleaningId: cleaningId,
    itemUnitId: itemUnitId,
    taskUnitId: taskUnitId,
    noteUnitId: noteUnitId,
    fromTaskNote: task.note ? 'yes' : 'no',
    fromCleaning: cleaningData?.cleaning?.unit?.id || null,
    finalUnitId: unitId,
    item: item
  })

  const { data: templatesData, isLoading: templatesLoading, error: templatesError } = useQuery<any>({
    queryKey: ['checklistTemplates', unitId],
    queryFn: async () => {
      console.log('Fetching checklist templates for unitId:', unitId)
      if (!unitId) {
        console.log('No unitId provided, returning empty array')
        return { checklistsByUnit: [] }
      }
      try {
        const result = await graphqlClient.request(GET_CHECKLISTS_BY_UNIT, { unitId })
        console.log('Checklist templates result:', result)
        return result
      } catch (error) {
        console.error('Error fetching checklist templates:', error)
        throw error
      }
    },
    enabled: !!unitId,
  })

  const templates = templatesData?.checklistsByUnit || []
  
  console.log('TemplateSelector - unitId:', unitId, 'templates:', templates, 'loading:', templatesLoading, 'error:', templatesError)

  const handleTemplateChange = (templateId: string) => {
    const selectedTemplate = templates.find((t: any) => t.id === templateId)
    let newDifficulty = edited.difficulty !== undefined ? edited.difficulty : (item.difficulty !== undefined ? item.difficulty : null)
    
    // Применяем модификатор сложности (0-5, как у уборки)
    if (selectedTemplate && selectedTemplate.difficultyModifier !== undefined && selectedTemplate.difficultyModifier !== null) {
      if (newDifficulty !== null && newDifficulty !== undefined) {
        // Если сложность уже есть, добавляем модификатор и ограничиваем 0-5
        newDifficulty = Math.max(0, Math.min(5, newDifficulty + selectedTemplate.difficultyModifier))
      } else {
        // Если сложность не задана, устанавливаем значение модификатора
        newDifficulty = selectedTemplate.difficultyModifier
      }
    }

    setEditedItems({
      ...editedItems,
      [itemId]: {
        ...edited,
        templateId: templateId || '',
        difficulty: newDifficulty,
      },
    })
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
        Шаблон чеклиста
      </label>
      {templatesLoading && (
        <div className="text-xs text-gray-500">Загрузка шаблонов...</div>
      )}
      {templatesError && (
        <div className="text-xs text-red-500">Ошибка загрузки: {templatesError.message}</div>
      )}
      {!unitId && (
        <div className="text-xs text-yellow-600">unitId не определен</div>
      )}
      <select
        value={edited.templateId !== undefined ? (edited.templateId || '') : (item.templateId || '')}
        onChange={(e) => {
          console.log('Template select changed:', e.target.value)
          handleTemplateChange(e.target.value)
        }}
        onBlur={() => {
          if (edited.templateId !== edited.initialTemplateId || edited.difficulty !== edited.initialDifficulty) {
            handleSaveItem(item)
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        disabled={templatesLoading || !unitId}
        className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Не выбран</option>
        {templates.length === 0 && !templatesLoading && unitId && (
          <option value="" disabled>Нет доступных шаблонов</option>
        )}
        {templates.map((template: any) => (
          <option key={template.id} value={template.id}>
            {template.name || `Чеклист ${template.version || ''}`}
            {template.difficultyModifier !== undefined && template.difficultyModifier !== null && template.difficultyModifier !== 0 && (
              ` (${template.difficultyModifier > 0 ? '+' : ''}${template.difficultyModifier} к сложности)`
            )}
          </option>
        ))}
      </select>
    </div>
  )
}

