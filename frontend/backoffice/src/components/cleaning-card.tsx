'use client'

import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown'
import { EllipsisVerticalIcon, ClockIcon, UserIcon, HomeIcon, CheckCircleIcon, EyeIcon, PlayIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface CleaningCardProps {
  cleaning: any
  onUpdateStatus?: (cleaningId: string, status: string) => void
  onStartCleaning?: (cleaning: any) => void
  onAssign?: (cleaning: any) => void
}

export function CleaningCard({ cleaning, onUpdateStatus, onStartCleaning, onAssign }: CleaningCardProps) {
  const router = useRouter()

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'SCHEDULED': { color: 'blue' as const, text: 'Запланирована' },
      'IN_PROGRESS': { color: 'yellow' as const, text: 'В процессе' },
      'COMPLETED': { color: 'green' as const, text: 'Завершена' },
      'APPROVED': { color: 'green' as const, text: 'Проверена' },
      'CANCELLED': { color: 'red' as const, text: 'Отменена' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'zinc' as const, text: status }
    return <Badge color={statusInfo.color}>{statusInfo.text}</Badge>
  }

  const scheduledDate = new Date(cleaning.scheduledAt)
  const completedItems = cleaning.checklistItems?.filter((item: any) => item.isChecked).length || 0
  const totalItems = cleaning.checklistItems?.length || 0

  return (
    <div 
      className="group relative bg-white dark:bg-zinc-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.2)]"
      onClick={() => router.push(`/cleanings/${cleaning.id}`)}
    >
      {/* Контент карточки */}
      <div className="p-4">
        {/* Заголовок и действия */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge(cleaning.status)}
            </div>
            <Text className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {cleaning.unit?.name || 'N/A'}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {cleaning.unit?.property?.title || 'Без объекта'}
            </Text>
          </div>
          {/* Действия при наведении */}
          <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/cleanings/${cleaning.id}`)
              }}
              className="p-1.5 rounded-full bg-white dark:bg-zinc-700 shadow-md hover:bg-gray-50 dark:hover:bg-zinc-600 transition-colors"
              title="Подробнее"
            >
              <EyeIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            {cleaning.status === 'SCHEDULED' && (onUpdateStatus || onStartCleaning) && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (onStartCleaning) {
                    onStartCleaning(cleaning)
                  } else if (onUpdateStatus) {
                    onUpdateStatus(cleaning.id, 'IN_PROGRESS')
                  }
                }}
                className="p-1.5 rounded-full bg-white dark:bg-zinc-700 shadow-md hover:bg-gray-50 dark:hover:bg-zinc-600 transition-colors"
                title="Начать"
              >
                <PlayIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
              </button>
            )}
          </div>
        </div>

        {/* Дата и время */}
        <div className="flex items-center gap-2 mb-2">
          <ClockIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <Text className="text-xs text-gray-600 dark:text-gray-300">
            {scheduledDate.toLocaleDateString('ru-RU', { 
              day: 'numeric', 
              month: 'short'
            })}
            {' '}
            {scheduledDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </div>

        {/* Уборщик */}
        <div className="flex items-center gap-2 mb-2">
          <UserIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {cleaning.cleaner && (cleaning.cleaner.id || cleaning.cleaner.firstName) ? (
              <>
                <Text className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {cleaning.cleaner.firstName} {cleaning.cleaner.lastName}
                </Text>
                {cleaning.cleaner.rating && (
                  <Text className="text-[10px] text-gray-500 dark:text-gray-400">
                    ⭐ {cleaning.cleaner.rating.toFixed(1)}
                  </Text>
                )}
              </>
            ) : (
              <Text className="text-xs text-gray-500 dark:text-gray-400">Не назначен</Text>
            )}
          </div>
        </div>

        {/* Чеклист прогресс */}
        {totalItems > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <Text className="text-[10px] text-gray-500 dark:text-gray-400">
                {completedItems}/{totalItems}
              </Text>
              <Text className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
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

        {/* Бейджи - компактно */}
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-zinc-700">
          {cleaning.requiresLinenChange && (
            <Badge color="blue" className="text-[10px] px-1 py-0">Белье</Badge>
          )}
          {cleaning.taskId && (
            <Badge color="purple" className="text-[10px] px-1 py-0">Задача</Badge>
          )}
          {cleaning.booking && (
            <Badge color="green" className="text-[10px] px-1 py-0">Бронирование</Badge>
          )}
        </div>

        {/* Кнопка "Взять в работу" если нет исполнителя - компактная */}
        {onAssign && !cleaning.cleaner && (cleaning.status === 'SCHEDULED' || !cleaning.status) && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAssign(cleaning)
            }}
            className="mt-2 w-full text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            Взять в работу
          </button>
        )}
      </div>
    </div>
  )
}

