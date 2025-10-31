'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Text } from './text'
import { Badge } from './badge'
import { Button } from './button'
import { graphqlClient } from '@/lib/graphql-client'
import { gql } from 'graphql-request'
import {
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

const GET_CLEANER_BY_USER = gql`
  query GetCleanerByUser($userId: UUID!) {
    cleaner(id: $userId) {
      id
      user {
        id
      }
      firstName
      lastName
      cleanings {
        id
        status
        scheduledAt
        completedAt
        startedAt
        unit {
          id
          name
        }
        booking {
          id
        }
      }
    }
  }
`

interface UserActivityFeedProps {
  userId: string
  orgId: string
}

export function UserActivityFeed({ userId, orgId }: UserActivityFeedProps) {
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['userRelatedEntities', userId],
    queryFn: async () => {
      try {
        const response = await graphqlClient.request(GET_CLEANER_BY_USER, { 
          userId
        }) as any
        return response
      } catch (error) {
        console.error('Failed to load cleaner data:', error)
        return null
      }
    },
    enabled: !!userId
  })

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <Text>Загрузка активности...</Text>
      </div>
    )
  }

  const userCleaner = data?.cleaner
  const cleanings = userCleaner?.cleanings || []

  // Создаем общий timeline из всех активностей
  const activities: any[] = []

  // Добавляем уборки
  cleanings.forEach((cleaning: any) => {
    activities.push({
      id: `cleaning-${cleaning.id}`,
      type: 'cleaning',
      title: `Уборка: ${cleaning.unit.name}`,
      status: cleaning.status,
      date: cleaning.scheduledAt,
      completedDate: cleaning.completedAt,
      entityId: cleaning.id,
      link: `/cleanings?cleaning=${cleaning.id}`,
      icon: SparklesIcon
    })
  })

  // Сортируем по дате (новые первые)
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'lime'
      case 'IN_PROGRESS': return 'blue'
      case 'SCHEDULED': return 'amber'
      case 'CANCELLED': return 'zinc'
      default: return 'zinc'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Завершено'
      case 'IN_PROGRESS': return 'В процессе'
      case 'SCHEDULED': return 'Запланировано'
      case 'CANCELLED': return 'Отменено'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин назад`
    if (diffHours < 24) return `${diffHours} ч назад`
    if (diffDays < 7) return `${diffDays} дн назад`
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClockIcon className="w-8 h-8 text-zinc-400" />
        </div>
        <Text className="text-zinc-500 dark:text-zinc-400">
          Нет активностей
        </Text>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-purple-700 dark:text-purple-300 mb-1">Уборок выполнено</Text>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {cleanings.filter((c: any) => c.status === 'COMPLETED').length}
              </div>
            </div>
            <SparklesIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-blue-700 dark:text-blue-300 mb-1">В процессе</Text>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {cleanings.filter((c: any) => c.status === 'IN_PROGRESS').length}
              </div>
            </div>
            <ClockIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-amber-700 dark:text-amber-300 mb-1">Запланировано</Text>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {cleanings.filter((c: any) => c.status === 'SCHEDULED').length}
              </div>
            </div>
            <CalendarIcon className="w-8 h-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-2">
        {activities.map((activity: any) => {
          const Icon = activity.icon
          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
              onClick={() => router.push(activity.link)}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activity.status === 'COMPLETED' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : activity.status === 'IN_PROGRESS'
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                <Icon className={`w-5 h-5 ${
                  activity.status === 'COMPLETED' 
                    ? 'text-green-600 dark:text-green-400' 
                    : activity.status === 'IN_PROGRESS'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Text className="font-medium truncate">{activity.title}</Text>
                  <Badge color={getStatusColor(activity.status)}>
                    {getStatusText(activity.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    {formatDate(activity.date)}
                  </div>
                  {activity.completedDate && (
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon className="w-4 h-4" />
                      Завершено {formatDate(activity.completedDate)}
                    </div>
                  )}
                </div>
              </div>

              <ArrowRightIcon className="w-5 h-5 text-zinc-400 flex-shrink-0" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

