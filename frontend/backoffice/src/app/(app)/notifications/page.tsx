'use client'

import { useState } from 'react'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Fieldset, Field, Label } from '@/components/fieldset'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Textarea } from '@/components/textarea'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Dialog } from '@/components/dialog'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'

// Моковые данные для уведомлений
const mockNotifications = [
  {
    id: '1',
    title: 'Новое бронирование',
    message: 'Создано новое бронирование для объекта "Апартаменты в центре"',
    type: 'booking',
    status: 'unread',
    createdAt: new Date('2024-01-15T10:30:00'),
    priority: 'high'
  },
  {
    id: '2',
    title: 'Платеж получен',
    message: 'Платеж в размере 15,000 руб. успешно обработан',
    type: 'payment',
    status: 'read',
    createdAt: new Date('2024-01-15T09:15:00'),
    priority: 'medium'
  },
  {
    id: '3',
    title: 'Объект забронирован',
    message: 'Объект "Студия у моря" забронирован на 20-25 января',
    type: 'booking',
    status: 'read',
    createdAt: new Date('2024-01-14T16:45:00'),
    priority: 'low'
  },
  {
    id: '4',
    title: 'Системное уведомление',
    message: 'Запланированное техническое обслуживание завтра с 02:00 до 04:00',
    type: 'system',
    status: 'unread',
    createdAt: new Date('2024-01-14T14:20:00'),
    priority: 'high'
  }
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    priority: ''
  })
  const [createFormData, setCreateFormData] = useState({
    title: '',
    message: '',
    type: 'general',
    priority: 'medium'
  })

  const { currentOrganization, currentOrgId, isLoading: orgLoading } = useCurrentOrganization()

  // Фильтрация уведомлений
  const filteredNotifications = notifications.filter(notification => {
    if (filters.type && notification.type !== filters.type) return false
    if (filters.status && notification.status !== filters.status) return false
    if (filters.priority && notification.priority !== filters.priority) return false
    return true
  })

  const unreadCount = notifications.filter(n => n.status === 'unread').length
  const highPriorityCount = notifications.filter(n => n.priority === 'high').length

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'booking': return 'blue'
      case 'payment': return 'green'
      case 'system': return 'orange'
      default: return 'gray'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'booking': return 'Бронирование'
      case 'payment': return 'Платеж'
      case 'system': return 'Система'
      default: return 'Общее'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red'
      case 'medium': return 'orange'
      case 'low': return 'green'
      default: return 'gray'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Высокий'
      case 'medium': return 'Средний'
      case 'low': return 'Низкий'
      default: return 'Не указан'
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, status: 'read' as const }
          : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, status: 'read' as const }))
    )
  }

  const handleCreateNotification = (e: React.FormEvent) => {
    e.preventDefault()
    const newNotification = {
      id: Date.now().toString(),
      title: createFormData.title,
      message: createFormData.message,
      type: createFormData.type,
      status: 'unread' as const,
      createdAt: new Date(),
      priority: createFormData.priority
    }
    setNotifications(prev => [newNotification, ...prev])
    setShowCreateDialog(false)
    setCreateFormData({ title: '', message: '', type: 'general', priority: 'medium' })
  }

  if (orgLoading || !currentOrgId) {
    return (
      <div className="space-y-6">
        <div>
          <Heading level={1}>Уведомления</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Загрузка организации...
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Heading level={1}>Уведомления</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Управление уведомлениями и оповещениями
          </Text>
          {currentOrganization && (
            <Text className="mt-1 text-sm text-zinc-500">
              Организация: {currentOrganization.name}
            </Text>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={markAllAsRead} disabled={unreadCount === 0}>
            Отметить все как прочитанные
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            Создать уведомление
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Всего уведомлений</Text>
              <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                {notifications.length}
              </Text>
              <div className="flex items-center mt-1">
                <span className="text-sm text-green-600 font-medium">+5.2%</span>
                <span className="text-sm text-zinc-500 ml-1">за неделю</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Непрочитанные</Text>
              <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                {unreadCount}
              </Text>
              <div className="flex items-center mt-1">
                <span className="text-sm text-orange-600 font-medium">-12.3%</span>
                <span className="text-sm text-zinc-500 ml-1">за неделю</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Высокий приоритет</Text>
              <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                {highPriorityCount}
              </Text>
              <div className="flex items-center mt-1">
                <span className="text-sm text-red-600 font-medium">+2.1%</span>
                <span className="text-sm text-zinc-500 ml-1">за неделю</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <Heading level={2} className="mb-4">Фильтры</Heading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field>
            <Label>Тип</Label>
            <Select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="">Все типы</option>
              <option value="booking">Бронирование</option>
              <option value="payment">Платеж</option>
              <option value="system">Система</option>
              <option value="general">Общее</option>
            </Select>
          </Field>

          <Field>
            <Label>Статус</Label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Все статусы</option>
              <option value="unread">Непрочитанные</option>
              <option value="read">Прочитанные</option>
            </Select>
          </Field>

          <Field>
            <Label>Приоритет</Label>
            <Select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="">Все приоритеты</option>
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
            </Select>
          </Field>
        </div>
      </div>

      {/* Таблица уведомлений */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <Heading level={2}>Список уведомлений</Heading>
          <Text className="text-sm text-zinc-500 mt-1">
            Показано {filteredNotifications.length} из {notifications.length} уведомлений
          </Text>
        </div>
        
        {filteredNotifications.length === 0 ? (
          <div className="p-6 text-center">
            <Text className="text-zinc-500">Нет уведомлений</Text>
          </div>
        ) : (
          <Table striped>
            <TableHead>
              <tr>
                <TableHeader>Статус</TableHeader>
                <TableHeader>Заголовок</TableHeader>
                <TableHeader>Тип</TableHeader>
                <TableHeader>Приоритет</TableHeader>
                <TableHeader>Дата</TableHeader>
                <TableHeader>Действия</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {filteredNotifications.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell>
                    <Badge color={notification.status === 'unread' ? 'red' : 'green'}>
                      {notification.status === 'unread' ? 'Новое' : 'Прочитано'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <Text className="font-medium">{notification.title}</Text>
                      <Text className="text-sm text-zinc-500">{notification.message}</Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={getTypeColor(notification.type) as any}>
                      {getTypeLabel(notification.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color={getPriorityColor(notification.priority) as any}>
                      {getPriorityLabel(notification.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Text className="text-sm">
                      {notification.createdAt.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </TableCell>
                  <TableCell>
                    {notification.status === 'unread' && (
                      <Button
                        onClick={() => markAsRead(notification.id)}
                      >
                        Отметить как прочитанное
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Диалог создания уведомления */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} size="lg">
        <div className="space-y-6">
          <Heading level={2}>Создать уведомление</Heading>
          
          <form onSubmit={handleCreateNotification} className="space-y-4">
            <Field>
              <Label>Заголовок</Label>
              <Input
                value={createFormData.title}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </Field>

            <Field>
              <Label>Сообщение</Label>
              <Textarea
                value={createFormData.message}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>Тип</Label>
                <Select
                  value={createFormData.type}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="general">Общее</option>
                  <option value="booking">Бронирование</option>
                  <option value="payment">Платеж</option>
                  <option value="system">Система</option>
                </Select>
              </Field>

              <Field>
                <Label>Приоритет</Label>
                <Select
                  value={createFormData.priority}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </Select>
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setShowCreateDialog(false)}
              >
                Отмена
              </Button>
              <Button type="submit">
                Создать уведомление
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  )
}
