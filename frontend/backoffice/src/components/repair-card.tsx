'use client'

import { Badge } from '@/components/badge'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown'
import { EllipsisVerticalIcon, ClockIcon, UserIcon, HomeIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface RepairCardProps {
  repair: any
  onUpdateStatus?: (repairId: string, status: string) => void
  onStartRepair?: (repair: any) => void
}

export function RepairCard({ repair, onUpdateStatus, onStartRepair }: RepairCardProps) {
  const router = useRouter()

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'PLANNED': { color: 'orange' as const, text: 'Запланирован' },
      'IN_PROGRESS': { color: 'blue' as const, text: 'В процессе' },
      'COMPLETED': { color: 'green' as const, text: 'Завершён' },
      'CANCELLED': { color: 'red' as const, text: 'Отменён' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'zinc' as const, text: status }
    return <Badge color={statusInfo.color}>{statusInfo.text}</Badge>
  }

  const scheduledDate = repair.scheduledAt ? new Date(repair.scheduledAt) : null

  return (
    <div 
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => router.push(`/repairs/${repair.id}`)}
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        {getStatusBadge(repair.status)}
        <Dropdown>
          <DropdownButton 
            className="bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-none p-1"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <EllipsisVerticalIcon className="w-5 h-5" />
          </DropdownButton>
          <DropdownMenu className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg">
            {repair.status === 'PLANNED' && (onUpdateStatus || onStartRepair) && (
              <DropdownItem onClick={(e) => { 
                e.stopPropagation()
                if (onStartRepair) {
                  onStartRepair(repair)
                } else if (onUpdateStatus) {
                  onUpdateStatus(repair.id, 'IN_PROGRESS')
                }
              }}>
                ▶️ Начать
              </DropdownItem>
            )}
            {repair.status === 'IN_PROGRESS' && onUpdateStatus && (
              <DropdownItem 
                onClick={(e) => { 
                  e.stopPropagation()
                  onUpdateStatus(repair.id, 'COMPLETED')
                }}
              >
                ✅ Завершить
              </DropdownItem>
            )}
            <DropdownItem onClick={(e) => { e.stopPropagation(); router.push(`/repairs/${repair.id}`) }}>
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
            {repair.unit?.property?.title || 'N/A'}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {repair.unit?.name}
          </Text>
        </div>
      </div>

      {/* Дата */}
      {scheduledDate && (
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
      )}

      {/* Мастер */}
      <div className="flex items-center gap-3">
        <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          {repair.master && (repair.master.id || repair.master.firstName) ? (
            <>
              <Text className="text-sm text-gray-900 dark:text-white">
                {repair.master.firstName} {repair.master.lastName}
              </Text>
              {repair.master.rating && (
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  ⭐ {repair.master.rating.toFixed(1)}
                </Text>
              )}
            </>
          ) : (
            <Text className="text-sm text-gray-500 dark:text-gray-400">Мастер не назначен</Text>
          )}
        </div>
      </div>

      {/* Бейджи */}
      <div className="flex flex-wrap gap-2">
        {repair.booking && (
          <Badge color="green">С бронированием</Badge>
        )}
      </div>
    </div>
  )
}

