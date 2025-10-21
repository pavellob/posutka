'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { Heading } from '@/components/heading'
import { ClockIcon, UserIcon, HomeIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

type CleaningStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

interface Cleaning {
  id: string
  status: CleaningStatus
  scheduledAt: string
  requiresLinenChange?: boolean
  unit?: {
    name: string
    property?: {
      title: string
    }
  }
  cleaner?: {
    id: string
    firstName: string
    lastName: string
    rating?: number
  }
  checklistItems?: Array<{
    id: string
    isChecked: boolean
  }>
  taskId?: string
  booking?: any
}

interface Column {
  id: CleaningStatus
  title: string
  color: string
  cleanings: Cleaning[]
}

interface CleaningKanbanBoardProps {
  cleanings: Cleaning[]
  onUpdateStatus: (cleaningId: string, status: CleaningStatus) => void
}

// Карточка уборки для канбана
function KanbanCleaningCard({ cleaning }: { cleaning: Cleaning }) {
  const router = useRouter()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: cleaning.id,
    disabled: false
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const scheduledDate = new Date(cleaning.scheduledAt)
  const completedItems = cleaning.checklistItems?.filter((item: any) => item.isChecked).length || 0
  const totalItems = cleaning.checklistItems?.length || 0

  const handleClick = (e: React.MouseEvent) => {
    // Только если не происходит drag
    if (!isDragging) {
      router.push(`/cleanings/${cleaning.id}`)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      onClick={handleClick}
    >
      {/* Объект */}
      <div className="flex items-start gap-2">
        <HomeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <Text className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {cleaning.unit?.property?.title || 'N/A'}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {cleaning.unit?.name}
          </Text>
        </div>
      </div>

      {/* Дата */}
      <div className="flex items-center gap-2">
        <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <Text className="text-xs text-gray-600 dark:text-gray-300">
          {scheduledDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          {' '}
          {scheduledDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </div>

      {/* Уборщик */}
      {cleaning.cleaner && (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <Text className="text-xs text-gray-600 dark:text-gray-300 truncate">
            {cleaning.cleaner.firstName} {cleaning.cleaner.lastName}
          </Text>
          {cleaning.cleaner.rating && (
            <Text className="text-xs text-gray-500">⭐ {cleaning.cleaner.rating.toFixed(1)}</Text>
          )}
        </div>
      )}

      {/* Прогресс чеклиста */}
      {totalItems > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {completedItems}/{totalItems}
            </Text>
            <Text className="text-xs font-medium text-gray-900 dark:text-white">
              {Math.round((completedItems / totalItems) * 100)}%
            </Text>
          </div>
          <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1">
            <div 
              className="bg-green-600 h-1 rounded-full transition-all"
              style={{ width: `${(completedItems / totalItems) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Бейджи */}
      <div className="flex flex-wrap gap-1">
        {cleaning.requiresLinenChange && (
          <Badge color="blue" className="text-xs">Смена белья</Badge>
        )}
        {cleaning.taskId && (
          <Badge color="purple" className="text-xs">Задача</Badge>
        )}
      </div>
    </div>
  )
}

// Колонка канбана
function KanbanColumn({ column }: { column: Column }) {
  const { setNodeRef } = useSortable({ id: column.id })

  return (
    <div 
      ref={setNodeRef}
      className="flex-1 min-w-[300px] bg-gray-50 dark:bg-zinc-900 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${column.color}`} />
          <Heading level={3} className="text-sm font-semibold">
            {column.title}
          </Heading>
        </div>
        <Badge color="zinc">{column.cleanings.length}</Badge>
      </div>

      <SortableContext items={column.cleanings.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {column.cleanings.map(cleaning => (
            <KanbanCleaningCard key={cleaning.id} cleaning={cleaning} />
          ))}
        </div>
      </SortableContext>

      {column.cleanings.length === 0 && (
        <div className="text-center py-8">
          <Text className="text-sm text-gray-400 dark:text-gray-500">
            Нет уборок
          </Text>
        </div>
      )}
    </div>
  )
}

export function CleaningKanbanBoard({ cleanings, onUpdateStatus }: CleaningKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const columns: Column[] = [
    {
      id: 'SCHEDULED',
      title: 'Запланировано',
      color: 'bg-blue-500',
      cleanings: cleanings.filter(c => c.status === 'SCHEDULED')
    },
    {
      id: 'IN_PROGRESS',
      title: 'В процессе',
      color: 'bg-yellow-500',
      cleanings: cleanings.filter(c => c.status === 'IN_PROGRESS')
    },
    {
      id: 'COMPLETED',
      title: 'Завершено',
      color: 'bg-green-500',
      cleanings: cleanings.filter(c => c.status === 'COMPLETED')
    },
    {
      id: 'CANCELLED',
      title: 'Отменено',
      color: 'bg-red-500',
      cleanings: cleanings.filter(c => c.status === 'CANCELLED')
    }
  ]

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const cleaningId = active.id as string
    const newStatus = over.id as CleaningStatus

    // Проверяем, что это валидный статус
    if (['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(newStatus)) {
      const cleaning = cleanings.find(c => c.id === cleaningId)
      if (cleaning && cleaning.status !== newStatus) {
        onUpdateStatus(cleaningId, newStatus)
      }
    }

    setActiveId(null)
  }

  const activeCleaning = activeId ? cleanings.find(c => c.id === activeId) : null

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(column => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>

      <DragOverlay>
        {activeCleaning ? <KanbanCleaningCard cleaning={activeCleaning} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

