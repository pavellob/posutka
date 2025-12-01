'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { Heading } from '@/components/heading'
import { ClockIcon, UserIcon, HomeIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

type RepairStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

interface Repair {
  id: string
  status: RepairStatus
  scheduledAt?: string
  unit?: {
    name: string
    property?: {
      title: string
    }
  }
  master?: {
    id: string
    firstName: string
    lastName: string
    rating?: number
  }
  booking?: any
}

interface Column {
  id: RepairStatus
  title: string
  color: string
  repairs: Repair[]
}

interface RepairKanbanBoardProps {
  repairs: Repair[]
  onUpdateStatus: (repairId: string, status: RepairStatus) => void
}

// Карточка ремонта для канбана
function KanbanRepairCard({ repair }: { repair: Repair }) {
  const router = useRouter()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: repair.id,
    disabled: false
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const scheduledDate = repair.scheduledAt ? new Date(repair.scheduledAt) : null

  const handleClick = (e: React.MouseEvent) => {
    // Только если не происходит drag
    if (!isDragging) {
      router.push(`/repairs/${repair.id}`)
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
            {repair.unit?.property?.title || 'N/A'}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {repair.unit?.name}
          </Text>
        </div>
      </div>

      {/* Дата */}
      {scheduledDate && (
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <Text className="text-xs text-gray-600 dark:text-gray-300">
            {scheduledDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            {' '}
            {scheduledDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </div>
      )}

      {/* Мастер */}
      {repair.master && (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <Text className="text-xs text-gray-600 dark:text-gray-300 truncate">
            {repair.master.firstName} {repair.master.lastName}
          </Text>
          {repair.master.rating && (
            <Text className="text-xs text-gray-500">⭐ {repair.master.rating.toFixed(1)}</Text>
          )}
        </div>
      )}

      {/* Бейджи */}
      <div className="flex flex-wrap gap-1">
        {repair.booking && (
          <Badge color="green" className="text-xs">Бронирование</Badge>
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
      className="flex-1 min-w-[280px] sm:min-w-[300px] bg-gray-50 dark:bg-zinc-900 rounded-lg p-3 sm:p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${column.color}`} />
          <Heading level={3} className="text-sm font-semibold">
            {column.title}
          </Heading>
        </div>
        <Badge color="zinc">{column.repairs.length}</Badge>
      </div>

      <SortableContext items={column.repairs.map(r => r.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {column.repairs.map(repair => (
            <KanbanRepairCard key={repair.id} repair={repair} />
          ))}
        </div>
      </SortableContext>

      {column.repairs.length === 0 && (
        <div className="text-center py-8">
          <Text className="text-sm text-gray-400 dark:text-gray-500">
            Нет ремонтов
          </Text>
        </div>
      )}
    </div>
  )
}

export function RepairKanbanBoard({ repairs, onUpdateStatus }: RepairKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const columns: Column[] = [
    {
      id: 'PLANNED',
      title: 'Запланировано',
      color: 'bg-orange-500',
      repairs: repairs.filter(r => r.status === 'PLANNED')
    },
    {
      id: 'IN_PROGRESS',
      title: 'В процессе',
      color: 'bg-blue-500',
      repairs: repairs.filter(r => r.status === 'IN_PROGRESS')
    },
    {
      id: 'COMPLETED',
      title: 'Завершено',
      color: 'bg-green-500',
      repairs: repairs.filter(r => r.status === 'COMPLETED')
    },
    {
      id: 'CANCELLED',
      title: 'Отменено',
      color: 'bg-red-500',
      repairs: repairs.filter(r => r.status === 'CANCELLED')
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

    const repairId = active.id as string
    const newStatus = over.id as RepairStatus

    // Проверяем, что это валидный статус
    if (['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(newStatus)) {
      const repair = repairs.find(r => r.id === repairId)
      if (repair && repair.status !== newStatus) {
        onUpdateStatus(repairId, newStatus)
      }
    }

    setActiveId(null)
  }

  const activeRepair = activeId ? repairs.find(r => r.id === activeId) : null

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-600">
        {columns.map(column => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>

      <DragOverlay>
        {activeRepair ? <KanbanRepairCard repair={activeRepair} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

