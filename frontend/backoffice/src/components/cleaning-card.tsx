'use client'

import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown'
import { EllipsisVerticalIcon, ClockIcon, UserIcon, HomeIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface CleaningCardProps {
  cleaning: any
  onUpdateStatus?: (cleaningId: string, status: string) => void
}

export function CleaningCard({ cleaning, onUpdateStatus }: CleaningCardProps) {
  const router = useRouter()

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'SCHEDULED': { color: 'blue' as const, text: 'Запланирована' },
      'IN_PROGRESS': { color: 'yellow' as const, text: 'В процессе' },
      'COMPLETED': { color: 'green' as const, text: 'Завершена' },
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
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => router.push(`/cleanings/${cleaning.id}`)}
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        {getStatusBadge(cleaning.status)}
        <Dropdown>
          <DropdownButton 
            className="bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-none p-1"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <EllipsisVerticalIcon className="w-5 h-5" />
          </DropdownButton>
          <DropdownMenu className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg">
            {cleaning.status === 'SCHEDULED' && onUpdateStatus && (
              <DropdownItem onClick={(e) => { e.stopPropagation(); router.push(`/cleanings/start/${cleaning.id}`) }}>
                ▶️ Начать
              </DropdownItem>
            )}
            {cleaning.status === 'IN_PROGRESS' && onUpdateStatus && (
              <DropdownItem 
                onClick={(e) => { 
                  e.stopPropagation()
                  onUpdateStatus(cleaning.id, 'COMPLETED')
                }}
                disabled={completedItems < totalItems}
              >
                ✅ Завершить
              </DropdownItem>
            )}
            <DropdownItem onClick={(e) => { e.stopPropagation(); router.push(`/cleanings/${cleaning.id}`) }}>
              📋 Подробнее
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      {/* Объект */}
      <div className="flex items-start gap-3">
        <HomeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <Text className="font-medium text-gray-900 dark:text-white">
            {cleaning.unit?.property?.title || 'N/A'}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {cleaning.unit?.name}
          </Text>
        </div>
      </div>

      {/* Дата */}
      <div className="flex items-center gap-3">
        <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div>
          <Text className="text-sm text-gray-900 dark:text-white">
            {scheduledDate.toLocaleDateString('ru-RU', { 
              day: 'numeric', 
              month: 'long',
              year: 'numeric'
            })}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {scheduledDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </div>
      </div>

      {/* Уборщик */}
      {cleaning.cleaner && (
        <div className="flex items-center gap-3">
          <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <div>
            <Text className="text-sm text-gray-900 dark:text-white">
              {cleaning.cleaner.firstName} {cleaning.cleaner.lastName}
            </Text>
            {cleaning.cleaner.rating && (
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                ⭐ {cleaning.cleaner.rating.toFixed(1)}
              </Text>
            )}
          </div>
        </div>
      )}

      {/* Чеклист прогресс */}
      {totalItems > 0 && (
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Чеклист: {completedItems}/{totalItems}
              </Text>
              <Text className="text-xs font-medium text-gray-900 dark:text-white">
                {Math.round((completedItems / totalItems) * 100)}%
              </Text>
            </div>
            <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5">
              <div 
                className="bg-green-600 h-1.5 rounded-full transition-all"
                style={{ width: `${(completedItems / totalItems) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Бейджи */}
      <div className="flex flex-wrap gap-2">
        {cleaning.requiresLinenChange && (
          <Badge color="blue">Смена белья</Badge>
        )}
        {cleaning.taskId && (
          <Badge color="purple">Связана с задачей</Badge>
        )}
        {cleaning.booking && (
          <Badge color="green">С бронированием</Badge>
        )}
      </div>
    </div>
  )
}

