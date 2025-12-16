'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Select } from '@/components/select'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { GET_NOTIFICATIONS, MARK_AS_READ, MARK_ALL_AS_READ } from '@/lib/graphql-queries'
import Link from 'next/link'

export default function NotificationsPage() {
  const pathname = usePathname()
  const activeTab = pathname === '/notifications' ? 'list' : pathname === '/notifications/templates' ? 'templates' : 'list'
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  
  const queryClient = useQueryClient()
  const { currentUserId } = useCurrentUser()
  
  // Запрос уведомлений
  const { data: notificationsData, isLoading } = useQuery<any>({
    queryKey: ['notifications', currentUserId, filter, eventTypeFilter],
    queryFn: () => graphqlClient.request(GET_NOTIFICATIONS, {
      userId: currentUserId!,
      unreadOnly: filter === 'unread',
      eventType: eventTypeFilter || undefined,
      first: 100,
    }),
    enabled: !!currentUserId,
  })
  
  // Мутации
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => graphqlClient.request(MARK_AS_READ, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  
  const markAllAsReadMutation = useMutation({
    mutationFn: () => graphqlClient.request(MARK_ALL_AS_READ, { userId: currentUserId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  
  const notifications = notificationsData?.notifications?.edges?.map((edge: any) => edge.node) || []
  const unreadCount = notifications.filter((n: any) => !n.readAt).length
  
  const getEventIcon = (eventType: string) => {
    const iconMap: Record<string, string> = {
      'CLEANING_ASSIGNED': '🧹',
      'CLEANING_COMPLETED': '✅',
      'CLEANING_CANCELLED': '❌',
      'CLEANING_STARTED': '▶️',
      'TASK_ASSIGNED': '📋',
      'TASK_COMPLETED': '✓',
      'BOOKING_CREATED': '🏠',
      'PAYMENT_RECEIVED': '💰',
      'SYSTEM_ALERT': '🔔',
    }
    return iconMap[eventType] || '📬'
  }
  
  const getEventLabel = (eventType: string) => {
    const labelMap: Record<string, string> = {
      'CLEANING_ASSIGNED': 'Уборка назначена',
      'CLEANING_COMPLETED': 'Уборка завершена',
      'CLEANING_CANCELLED': 'Уборка отменена',
      'CLEANING_STARTED': 'Уборка начата',
      'TASK_ASSIGNED': 'Задача назначена',
      'TASK_COMPLETED': 'Задача завершена',
      'BOOKING_CREATED': 'Бронирование создано',
      'PAYMENT_RECEIVED': 'Платеж получен',
      'SYSTEM_ALERT': 'Системное оповещение',
    }
    return labelMap[eventType] || eventType
  }
  
  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      'URGENT': { color: 'red' as const, text: 'Срочно' },
      'HIGH': { color: 'orange' as const, text: 'Важно' },
      'NORMAL': { color: 'blue' as const, text: 'Обычное' },
      'LOW': { color: 'zinc' as const, text: 'Низкий' },
    }
    const info = priorityMap[priority as keyof typeof priorityMap] || { color: 'zinc' as const, text: priority }
    return <Badge color={info.color}>{info.text}</Badge>
  }
  
  if (!currentUserId) {
    return (
      <div className="space-y-6">
        <Heading level={1}>Уведомления</Heading>
        <Text>Загрузка пользователя...</Text>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Heading level={1}>Уведомления</Heading>
        <Text>Загрузка...</Text>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <Heading level={1}>Уведомления</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            История всех уведомлений системы
          </Text>
        </div>
        {unreadCount > 0 && (
          <Button 
            onClick={() => markAllAsReadMutation.mutate()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Отметить все как прочитанные ({unreadCount})
          </Button>
        )}
      </div>

      {/* Табы */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8">
          <Link
            href="/notifications"
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            Список уведомлений
          </Link>
          <Link
            href="/notifications/templates"
            className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            Шаблоны
          </Link>
        </nav>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Heading level={3} className="mb-2">Всего</Heading>
          <Text className="text-3xl font-bold text-blue-600">{notifications.length}</Text>
        </div>
        
        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Heading level={3} className="mb-2">Непрочитанные</Heading>
          <Text className="text-3xl font-bold text-orange-600">{unreadCount}</Text>
        </div>
        
        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Heading level={3} className="mb-2">Прочитанные</Heading>
          <Text className="text-3xl font-bold text-green-600">{notifications.length - unreadCount}</Text>
        </div>
      </div>
      
      {/* Фильтры */}
      <div className="space-y-4">
        <Heading level={2}>Фильтры</Heading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Статус</label>
            <Select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
              <option value="all">Все</option>
              <option value="unread">Только непрочитанные</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Тип события</label>
            <Select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)}>
              <option value="">Все типы</option>
              <option value="CLEANING_ASSIGNED">Уборка назначена</option>
              <option value="CLEANING_COMPLETED">Уборка завершена</option>
              <option value="TASK_ASSIGNED">Задача назначена</option>
              <option value="BOOKING_CREATED">Бронирование создано</option>
              <option value="PAYMENT_RECEIVED">Платеж получен</option>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button 
              onClick={() => {
                setFilter('all')
                setEventTypeFilter('')
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-gray-300"
            >
              Сбросить фильтры
            </Button>
          </div>
        </div>
      </div>
      
      {/* Таблица уведомлений */}
      <div className="space-y-4">
        <Heading level={2}>Уведомления ({notifications.length})</Heading>
        
        {notifications.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
            <div className="text-6xl mb-4">📭</div>
            <Text className="text-gray-500 dark:text-gray-400">
              {filter === 'unread' ? 'Нет непрочитанных уведомлений' : 'Уведомлений не найдено'}
            </Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-full bg-white dark:bg-zinc-800">
              <TableHead>
                <TableRow className="bg-gray-50 dark:bg-zinc-900">
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Событие</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Сообщение</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Приоритет</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Дата</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Действия</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {notifications.map((notification: any) => (
                  <TableRow 
                    key={notification.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors ${
                      !notification.readAt ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {notification.readAt ? (
                        <Badge color="green">Прочитано</Badge>
                      ) : (
                        <Badge color="orange">Новое</Badge>
                      )}
                    </TableCell>
                    
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getEventIcon(notification.eventType)}</span>
                        <Text className="text-sm">{getEventLabel(notification.eventType)}</Text>
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-6 py-4">
                      <div className="max-w-md">
                        <Text className="font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </Text>
                        <Text className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {notification.message}
                        </Text>
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(notification.priority)}
                    </TableCell>
                    
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Text className="text-sm text-gray-900 dark:text-white">
                        {new Date(notification.createdAt).toLocaleString('ru')}
                      </Text>
                    </TableCell>
                    
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {!notification.readAt && (
                          <Button
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Прочитать
                          </Button>
                        )}
                        {notification.actionUrl && (
                          <Button
                            onClick={() => window.location.href = notification.actionUrl}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-gray-300"
                          >
                            {notification.actionText || 'Открыть →'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
