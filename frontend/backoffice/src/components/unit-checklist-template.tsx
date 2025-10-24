'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Subheading } from './heading'
import { Text } from './text'
import { Button } from './button'
import { Input } from './input'
import { graphqlClient } from '@/lib/graphql-client'
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline'

import { GET_CLEANING_TEMPLATES_BY_UNIT, UPDATE_CLEANING_TEMPLATE_CHECKLIST } from '@/lib/graphql-queries'
import { CreateChecklistDialog } from './create-checklist-dialog'

interface UnitChecklistTemplateProps {
  unitId: string
  propertyId?: string
}

export function UnitChecklistTemplate({ unitId, propertyId }: UnitChecklistTemplateProps) {
  const queryClient = useQueryClient()
  const [newItemLabel, setNewItemLabel] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['cleaningTemplate', unitId],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_CLEANING_TEMPLATES_BY_UNIT, {
        unitId
      }) as any
      return response.cleaningTemplates?.[0]  // Берем первый темплейт
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (items: Array<{ label: string; order: number }>) => {
      if (!data?.id) throw new Error('Template not found')
      
      return await graphqlClient.request(UPDATE_CLEANING_TEMPLATE_CHECKLIST, {
        id: data.id,
        items
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaningTemplate', unitId] })
    }
  })

  const handleAddItem = () => {
    if (!newItemLabel.trim()) return
    
    const currentItems = data?.checklistItems || []
    const maxOrder = currentItems.length > 0 
      ? Math.max(...currentItems.map((item: any) => item.order))
      : 0
    
    const newItems = [
      ...currentItems.map((item: any) => ({ label: item.label, order: item.order })),
      { label: newItemLabel.trim(), order: maxOrder + 1 }
    ]
    
    updateMutation.mutate(newItems)
    setNewItemLabel('')
  }

  const handleRemoveItem = (orderToRemove: number) => {
    const currentItems = data?.checklistItems || []
    const newItems = currentItems
      .filter((item: any) => item.order !== orderToRemove)
      .map((item: any, index: number) => ({
        label: item.label,
        order: index + 1  // Пересчитываем порядок
      }))
    
    updateMutation.mutate(newItems)
  }

  const handleMoveItem = (order: number, direction: 'up' | 'down') => {
    const currentItems = [...(data?.checklistItems || [])].sort((a: any, b: any) => a.order - b.order)
    const index = currentItems.findIndex((item: any) => item.order === order)
    
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === currentItems.length - 1)
    ) {
      return
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    ;[currentItems[index], currentItems[newIndex]] = [currentItems[newIndex], currentItems[index]]
    
    const newItems = currentItems.map((item: any, idx: number) => ({
      label: item.label,
      order: idx + 1
    }))
    
    updateMutation.mutate(newItems)
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <Text>Загрузка чеклиста...</Text>
      </div>
    )
  }

  if (!data) {
    return (
      <>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ListBulletIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <Subheading className="mb-2">Чеклист не настроен</Subheading>
          <Text className="text-zinc-500 mb-6">
            Создайте чеклист уборки для этого юнита
          </Text>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Создать чеклист
          </Button>
        </div>
        
        <CreateChecklistDialog
          open={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSuccess={() => {
            setIsCreateDialogOpen(false)
            queryClient.invalidateQueries({ queryKey: ['cleaningTemplate', unitId] })
          }}
          propertyId={propertyId}
          unitId={unitId}
        />
      </>
    )
  }

  const checklistItems = [...(data.checklistItems || [])].sort((a: any, b: any) => a.order - b.order)

  return (
    <div>
      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
          <ListBulletIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <Subheading>Шаблон чеклиста уборки</Subheading>
          <Text className="text-sm text-zinc-600 dark:text-zinc-400">
            {checklistItems.length} пунктов
          </Text>
        </div>
      </div>

      {/* Информационная панель */}
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-2">Этот чеклист будет копироваться:</p>
            <ul className="space-y-1 text-blue-800 dark:text-blue-200">
              <li>• При создании новой уборки для этого юнита</li>
              <li>• Уборщик должен отметить ВСЕ пункты перед завершением</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Список пунктов */}
      <div className="space-y-2 mb-6">
        {checklistItems.map((item: any, index: number) => (
          <div
            key={item.id}
            className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3"
          >
            <span className="text-zinc-500 font-mono text-sm w-6">{item.order}</span>
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
            <Text className="flex-1">{item.label}</Text>
            
            {/* Кнопки управления */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleMoveItem(item.order, 'up')}
                disabled={index === 0 || updateMutation.isPending}
                className="p-2 text-zinc-400 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Переместить вверх"
              >
                ↑
              </button>
              <button
                onClick={() => handleMoveItem(item.order, 'down')}
                disabled={index === checklistItems.length - 1 || updateMutation.isPending}
                className="p-2 text-zinc-400 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Переместить вниз"
              >
                ↓
              </button>
              <button
                onClick={() => handleRemoveItem(item.order)}
                disabled={updateMutation.isPending}
                className="p-2 text-red-500 hover:text-red-700 disabled:opacity-30"
                title="Удалить"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Добавление нового пункта */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
        <Subheading className="mb-3">Добавить пункт</Subheading>
        <div className="flex gap-3">
          <Input
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            placeholder="Например: Протереть зеркала"
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            className="flex-1"
          />
          <Button
            onClick={handleAddItem}
            disabled={!newItemLabel.trim() || updateMutation.isPending}
            color="blue"
          >
            <PlusIcon className="w-4 h-4" />
            Добавить
          </Button>
        </div>
      </div>

      {updateMutation.isError && (
        <div className="mt-4 bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <Text className="text-sm text-red-900 dark:text-red-100">
            Ошибка при обновлении чеклиста. Попробуйте еще раз.
          </Text>
        </div>
      )}
    </div>
  )
}

