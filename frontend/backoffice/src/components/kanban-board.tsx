'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent, closestCorners, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown'
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'

// Типы для канбан-доски
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED'
type KanbanColumnType = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'DONE'

interface Task {
  id: string
  type: string
  status: TaskStatus
  note?: string | null
  dueAt?: string | null
  unit?: {
    name: string
    property?: {
      title: string
    }
  }
  booking?: {
    guest: {
      name: string
    }
    checkIn: string
    checkOut: string
  }
  assignedTo?: {
    name: string
    contact: string
  }
  createdAt: string
  updatedAt: string
  checklist?: any
  org?: any
}

interface KanbanColumn {
  id: KanbanColumnType
  title: string
  color: string
  tasks: Task[]
}

interface KanbanBoardProps {
  tasks: Task[]
  onUpdateStatus: (taskId: string, status: TaskStatus) => void
  onEdit: (task: Task) => void
  onAssign: (task: Task) => void
  onAssignTask: (taskId: string, assigneeId: string, taskType: string) => void
  onDragToAssign: (task: Task) => void
}

// Компонент карточки задачи для канбана
function KanbanTaskCard({ task, onEdit, onAssign, onUpdateStatus, onAssignTask }: {
  task: Task
  onEdit: (task: Task) => void
  onAssign: (task: Task) => void
  onUpdateStatus: (taskId: string, status: TaskStatus) => void
  onAssignTask: (taskId: string, assigneeId: string, taskType: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled: false
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getTypeBadge = (type: string) => {
    const typeMap = {
      'CLEANING': { color: 'blue' as const, text: 'Уборка' },
      'CHECKIN': { color: 'green' as const, text: 'Заселение' },
      'CHECKOUT': { color: 'purple' as const, text: 'Выселение' },
      'MAINTENANCE': { color: 'orange' as const, text: 'Обслуживание' },
      'INVENTORY': { color: 'cyan' as const, text: 'Инвентаризация' }
    }
    const typeInfo = typeMap[type as keyof typeof typeMap] || { color: 'zinc' as const, text: type }
    return <Badge color={typeInfo.color}>{typeInfo.text}</Badge>
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm
        hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 
        cursor-grab active:cursor-grabbing group relative
        ${isDragging ? 'opacity-50 shadow-lg rotate-2 scale-105' : ''}
      `}
    >
      <div className="space-y-3">
        {/* Drag область - только для контента */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing min-h-[100px]">
          {/* Тип и статус */}
          <div className="flex items-center justify-between">
            {getTypeBadge(task.type)}
          </div>

          {/* Заметка */}
          {task.note && (
            <Text className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
              {task.note}
            </Text>
          )}

          {/* Срок выполнения */}
          {task.dueAt && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Срок: {new Date(task.dueAt).toLocaleDateString()}
            </div>
          )}

          {/* Объект недвижимости */}
          {task.unit?.property && (
            <div className="text-xs">
              <div className="font-medium text-gray-900 dark:text-white">
                {task.unit.property.title}
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                {task.unit.name}
              </div>
            </div>
          )}

          {/* Бронирование */}
          {task.booking && (
            <div className="text-xs">
              <div className="font-medium text-gray-900 dark:text-white">
                {task.booking.guest.name}
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                {new Date(task.booking.checkIn).toLocaleDateString()} - {new Date(task.booking.checkOut).toLocaleDateString()}
              </div>
            </div>
          )}

          {/* Исполнитель */}
          <div className="text-xs">
            {task.assignedTo ? (
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {task.assignedTo.name}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {task.assignedTo.contact}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                <span>⚠️</span>
                <span>Не назначен</span>
              </div>
            )}
          </div>
        </div>

        {/* Действия */}
        <div 
          className="flex justify-end relative z-10 pointer-events-auto" 
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
          onTouchStart={(e: React.TouchEvent) => e.stopPropagation()}
        >
          <Dropdown>
            <DropdownButton 
              className="bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 p-1 relative z-20 pointer-events-auto"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
              onTouchStart={(e: React.TouchEvent) => e.stopPropagation()}
            >
              <EllipsisVerticalIcon className="w-4 h-4" />
            </DropdownButton>
            <DropdownMenu className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg z-[9999] [&>*]:hover:!bg-gray-100 [&>*]:dark:hover:!bg-zinc-700 [&>*]:focus:!bg-gray-100 [&>*]:dark:focus:!bg-zinc-700 [&>*]:hover:!text-gray-900 [&>*]:dark:hover:!text-white [&>*]:focus:!text-gray-900 [&>*]:dark:focus:!text-white">
              <DropdownItem onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                onEdit(task)
              }}>
                Редактировать
              </DropdownItem>
              {task.status === 'TODO' && (
                <DropdownItem onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  onAssign(task)
                }}>
                  Назначить
                </DropdownItem>
              )}
              {task.status === 'IN_PROGRESS' && (
                <DropdownItem onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  onUpdateStatus(task.id, 'DONE')
                }}>
                  Завершить
                </DropdownItem>
              )}
              {(task.status === 'TODO' || task.status === 'IN_PROGRESS') && (
                <DropdownItem onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  onUpdateStatus(task.id, 'CANCELED')
                }}>
                  Отменить
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  )
}

// Компонент drop зоны для колонки
function ColumnDropZone({ columnId }: { columnId: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${columnId}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] rounded-lg border-2 border-dashed transition-colors duration-200 ${
        isOver 
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-300 dark:border-zinc-600'
      }`}
    />
  )
}

// Компонент колонки канбана
function KanbanColumn({ column, tasks, onEdit, onAssign, onUpdateStatus, onAssignTask }: {
  column: KanbanColumn
  tasks: Task[]
  onEdit: (task: Task) => void
  onAssign: (task: Task) => void
  onUpdateStatus: (taskId: string, status: TaskStatus) => void
  onAssignTask: (taskId: string, assigneeId: string, taskType: string) => void
}) {
  const getColumnColor = (color: string) => {
    const colorMap = {
      'gray': 'bg-gray-500',
      'orange': 'bg-orange-500',
      'blue': 'bg-blue-500', 
      'green': 'bg-green-500'
    }
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-500'
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 border border-gray-200 dark:border-zinc-700 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-zinc-700">
        {/* Заголовок колонки */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getColumnColor(column.color)}`}></div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{column.title}</h3>
            {column.id === 'BACKLOG' && (
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700 px-2 py-1 rounded">
                Не назначены
              </span>
            )}
          </div>
          <span className="bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-sm font-medium">
            {tasks.length}
          </span>
        </div>

        {/* Задачи в колонке */}
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          <div 
            className="space-y-3 min-h-[300px]"
            data-column-id={column.id}
            id={`column-${column.id}`}
          >
            {tasks.map((task) => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onAssign={onAssign}
                onUpdateStatus={onUpdateStatus}
                onAssignTask={onAssignTask}
              />
            ))}
            {tasks.length === 0 ? (
              <ColumnDropZone columnId={column.id} />
            ) : null}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

// Основной компонент канбан-доски
export function KanbanBoard({ tasks, onUpdateStatus, onEdit, onAssign, onAssignTask, onDragToAssign }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // Определяем колонки канбана
  const columns: KanbanColumn[] = [
    {
      id: 'BACKLOG',
      title: 'Backlog',
      color: 'gray',
      tasks: tasks.filter(task => task.status === 'TODO' && !task.assignedTo)
    },
    {
      id: 'TODO',
      title: 'Ожидают',
      color: 'orange',
      tasks: tasks.filter(task => task.status === 'TODO' && task.assignedTo)
    },
    {
      id: 'IN_PROGRESS',
      title: 'В работе',
      color: 'blue',
      tasks: tasks.filter(task => task.status === 'IN_PROGRESS')
    },
    {
      id: 'DONE',
      title: 'Завершены',
      color: 'green',
      tasks: tasks.filter(task => task.status === 'DONE')
    }
  ]

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    console.log('Drag started:', task?.id)
    setActiveTask(task || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Находим активную задачу
    const activeTask = tasks.find(task => task.id === activeId)
    if (!activeTask) return

    // Определяем новую колонку на основе overId
    let newStatus: TaskStatus = activeTask.status

    // Если перетаскиваем над другой задачей, определяем колонку по статусу этой задачи
    const overTask = tasks.find(task => task.id === overId)
    if (overTask) {
      newStatus = overTask.status
    } else {
      // Если перетаскиваем над drop зоной
      if (overId.startsWith('drop-')) {
        const columnId = overId.replace('drop-', '')
        console.log('Drop zone:', columnId)
        
        if (columnId === 'BACKLOG') {
          newStatus = 'TODO'
        } else if (columnId === 'TODO') {
          newStatus = 'TODO'
        } else if (columnId === 'IN_PROGRESS') {
          newStatus = 'IN_PROGRESS'
        } else if (columnId === 'DONE') {
          newStatus = 'DONE'
        }
      } else if (overId.startsWith('column-')) {
        // Если перетаскиваем над колонкой с задачами
        const columnId = overId.replace('column-', '')
        console.log('Column with tasks:', columnId)
        
        if (columnId === 'BACKLOG') {
          newStatus = 'TODO'
        } else if (columnId === 'TODO') {
          newStatus = 'TODO'
        } else if (columnId === 'IN_PROGRESS') {
          newStatus = 'IN_PROGRESS'
        } else if (columnId === 'DONE') {
          newStatus = 'DONE'
        }
      }
    }

    // Обновляем статус только если он изменился
    if (newStatus !== activeTask.status) {
      console.log('Drag over - updating status:', activeTask.status, '->', newStatus)
      onUpdateStatus(activeId, newStatus)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('Drag ended:', active.id, over?.id)
    
    const activeId = active.id as string
    const activeTask = tasks.find(task => task.id === activeId)
    
    // Если перетаскиваем из Backlog в TODO и задача не назначена
    if (activeTask && activeTask.status === 'TODO' && !activeTask.assignedTo && over?.id === 'TODO') {
      // Открываем диалог назначения
      onDragToAssign(activeTask)
    }

    setActiveTask(null)
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex space-x-6 overflow-x-auto pb-4 min-h-[500px]">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={column.tasks}
            onEdit={onEdit}
            onAssign={onAssign}
            onUpdateStatus={onUpdateStatus}
            onAssignTask={onAssignTask}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="bg-white dark:bg-zinc-800 border-2 border-blue-300 dark:border-blue-600 rounded-lg p-4 shadow-2xl opacity-95 rotate-2 scale-105">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge color="blue">Перемещение</Badge>
              </div>
              {activeTask.note && (
                <Text className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {activeTask.note}
                </Text>
              )}
              {activeTask.unit?.property && (
                <div className="text-xs">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {activeTask.unit.property.title}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {activeTask.unit.name}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
