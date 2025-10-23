'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Stat } from '@/app/stat'
import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
// import { Card } from '@/components/card' // Компонент не существует, заменим на div
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { 
  GET_DASHBOARD_STATS, 
  GET_RECENT_TASKS, 
  GET_RECENT_NOTIFICATIONS 
} from '@/lib/graphql-queries'
import { 
  CalendarDaysIcon,
  HomeIcon,
  UserGroupIcon,
  SparklesIcon,
  ClockIcon,
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const router = useRouter()
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Обновляем время каждую минуту
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Запрос статистики дашборда
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['dashboard-stats', currentOrgId],
    queryFn: () => graphqlClient.request(GET_DASHBOARD_STATS, { orgId: currentOrgId }),
    enabled: !!currentOrgId,
    retry: 1
  })

  // Запрос последних задач
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['recent-tasks', currentOrgId],
    queryFn: () => graphqlClient.request(GET_RECENT_TASKS, { orgId: currentOrgId, first: 5 }),
    enabled: !!currentOrgId
  })

  // Запрос последних уведомлений
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['recent-notifications', currentOrgId],
    queryFn: () => graphqlClient.request(GET_RECENT_NOTIFICATIONS, { orgId: currentOrgId, first: 5 }),
    enabled: !!currentOrgId
  })

  if (orgLoading || dashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <Text>Загрузка дашборда...</Text>
        </div>
      </div>
    )
  }

  if (dashboardError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Text className="text-red-600 mb-4">Ошибка загрузки дашборда</Text>
          <Text className="text-zinc-500">Попробуйте обновить страницу</Text>
        </div>
      </div>
    )
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'PENDING': { color: 'orange' as const, text: 'В ожидании' },
      'IN_PROGRESS': { color: 'blue' as const, text: 'В работе' },
      'COMPLETED': { color: 'green' as const, text: 'Завершена' },
      'CANCELLED': { color: 'red' as const, text: 'Отменена' },
      'SCHEDULED': { color: 'purple' as const, text: 'Запланирована' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'zinc' as const, text: status }
    return <Badge color={statusInfo.color}>{statusInfo.text}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      'LOW': { color: 'green' as const, text: 'Низкий' },
      'MEDIUM': { color: 'orange' as const, text: 'Средний' },
      'HIGH': { color: 'red' as const, text: 'Высокий' },
      'URGENT': { color: 'red' as const, text: 'Срочный' }
    }
    const priorityInfo = priorityMap[priority as keyof typeof priorityMap] || { color: 'zinc' as const, text: priority }
    return <Badge color={priorityInfo.color}>{priorityInfo.text}</Badge>
  }

  return (
    <div className="space-y-8">
      {/* Заголовок с временем */}
      <div className="flex items-center justify-between">
        <div>
          <Heading>Добро пожаловать в КАКДОМА</Heading>
          <Text className="text-zinc-600 dark:text-zinc-400 mt-1">
            {formatDate(currentTime)} • {formatTime(currentTime)}
          </Text>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <ClockIcon className="w-4 h-4" />
          <Text>Обновлено: {formatTime(currentTime)}</Text>
        </div>
      </div>

      {/* Основная статистика на сегодня */}
      <div>
        <Subheading className="mb-4">Статистика на сегодня</Subheading>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Активные брони</Text>
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardData?.activeBookings?.pageInfo?.totalCount || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HomeIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Свободные объекты</Text>
                <div className="text-2xl font-bold text-green-600">
                  {dashboardData?.todayCleanings?.pageInfo?.totalCount || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Работающие сотрудники</Text>
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardData?.workingStaff?.pageInfo?.totalCount || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SparklesIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Уборки сегодня</Text>
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardData?.todayCleanings?.pageInfo?.totalCount || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Детальная информация об уборках */}
      {dashboardData?.todayCleanings?.edges && dashboardData.todayCleanings.edges.length > 0 && (
        <div>
          <Subheading className="mb-4">Уборки на сегодня</Subheading>
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Table>
        <TableHead>
          <TableRow>
                  <TableHeader>Время</TableHeader>
                  <TableHeader>Объект</TableHeader>
                  <TableHeader>Уборщик</TableHeader>
                  <TableHeader>Статус</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
                {dashboardData.todayCleanings.edges.map(({ node: cleaning }) => (
                  <TableRow 
                    key={cleaning.id}
                    onClick={() => router.push(`/cleanings/${cleaning.id}`)}
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <TableCell>
                      {new Date(cleaning.scheduledAt).toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </TableCell>
              <TableCell>
                      <div>
                        <Text className="font-medium">{cleaning.unit.name}</Text>
                        <Text className="text-sm text-zinc-500">{cleaning.unit.property.title}</Text>
                </div>
              </TableCell>
                    <TableCell>
                      {cleaning.cleaner ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6" />
                          <Text>{cleaning.cleaner.firstName} {cleaning.cleaner.lastName}</Text>
                        </div>
                      ) : (
                        <Text className="text-zinc-500">Не назначен</Text>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(cleaning.status)}
                    </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
          </div>
        </div>
      )}

      {/* Дашборд с задачами и уведомлениями */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Последние задачи */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Subheading>Последние задачи</Subheading>
            <Button href="/tasks" outline size="sm">
              Все задачи
            </Button>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            {tasksLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <Text className="mt-2">Загрузка задач...</Text>
              </div>
            ) : tasksData?.tasks?.edges?.length > 0 ? (
              <div className="space-y-4">
                {tasksData.tasks.edges.map(({ node: task }) => (
                  <div 
                    key={task.id} 
                    className="flex items-start justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Text className="font-medium">{task.type}</Text>
                        <Badge color="blue">{task.status}</Badge>
                      </div>
                      <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                        Тип: {task.type}
                      </Text>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>Создано: {new Date(task.createdAt).toLocaleDateString('ru-RU')}</span>
                        {task.dueAt && (
                          <span>Срок: {new Date(task.dueAt).toLocaleDateString('ru-RU')}</span>
                        )}
                        {task.assignedTo && (
                          <span>Исполнитель: {task.assignedTo.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(task.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Text className="text-zinc-500">Нет задач</Text>
              </div>
            )}
          </div>
        </div>

        {/* Последние уведомления */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Subheading>Последние уведомления</Subheading>
            <Button href="/notifications" outline size="sm">
              Все уведомления
            </Button>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            {notificationsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <Text className="mt-2">Загрузка уведомлений...</Text>
              </div>
            ) : notificationsData?.tasks?.edges?.length > 0 ? (
              <div className="space-y-4">
                {notificationsData.tasks.edges.map(({ node: task }) => (
                  <div 
                    key={task.id} 
                    className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <BellIcon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Text className="font-medium">{task.type}</Text>
                        <Badge color="orange">
                          Задача
                        </Badge>
                      </div>
                      <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                        Статус: {task.status}
                      </Text>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>Создано: {new Date(task.createdAt).toLocaleDateString('ru-RU')}</span>
                        {task.dueAt && (
                          <span>Срок: {new Date(task.dueAt).toLocaleDateString('ru-RU')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Text className="text-zinc-500">Нет уведомлений</Text>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
