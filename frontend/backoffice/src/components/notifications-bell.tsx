'use client'

import { useState, useEffect } from 'react'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from './dropdown'
import { Badge } from './badge'
import { Text } from './text'
import { Heading } from './heading'
import { Button } from './button'
import { useNotifications } from '@/hooks/useNotifications'
import { useCurrentUser } from '@/hooks/useCurrentUser'

/**
 * Компонент колокольчика уведомлений с badge и dropdown.
 */
export function NotificationsBell() {
  const { currentUserId } = useCurrentUser()
  const { notifications, unreadCount, connected, markAsRead, markAllAsRead } = useNotifications({
    userId: currentUserId || '',
    enableWebSocket: true,
  })
  
  const [isOpen, setIsOpen] = useState(false)
  const [showDot, setShowDot] = useState(false)
  
  // Анимация при новом уведомлении
  useEffect(() => {
    if (unreadCount > 0) {
      setShowDot(true)
      const timer = setTimeout(() => setShowDot(false), 300)
      return () => clearTimeout(timer)
    }
  }, [unreadCount])
  
  if (!currentUserId) return null
  
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
      'INVOICE_OVERDUE': '⚠️',
      'SYSTEM_ALERT': '🔔',
    }
    return iconMap[eventType] || '📬'
  }
  
  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      'URGENT': 'text-red-600',
      'HIGH': 'text-orange-600',
      'NORMAL': 'text-blue-600',
      'LOW': 'text-gray-600',
    }
    return colorMap[priority] || 'text-gray-600'
  }
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин назад`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} ч назад`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} дн назад`
  }
  
  return (
    <div className="relative">
      <Dropdown>
        <DropdownButton 
          className="relative p-2 bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-transparent text-gray-700 dark:text-gray-300"
          aria-label="Уведомления"
        >
          <div className="relative">
            {/* Иконка колокольчика */}
            <svg 
              className={`w-6 h-6 transition-transform ${showDot ? 'animate-bounce' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
              />
            </svg>
            
            {/* Badge с количеством */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            
            {/* Индикатор WebSocket подключения */}
            <span 
              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-gray-400'
              }`}
              title={connected ? 'WebSocket подключен' : 'WebSocket отключен'}
            />
          </div>
        </DropdownButton>
        
        <DropdownMenu className="w-96 max-h-[600px] overflow-y-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl">
          {/* Заголовок */}
          <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 p-4 z-10">
            <div className="flex items-center justify-between">
              <Heading level={3} className="text-lg">
                Уведомления {unreadCount > 0 && `(${unreadCount})`}
              </Heading>
              {unreadCount > 0 && (
                <Button 
                  onClick={markAllAsRead}
                  className="text-xs bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-transparent text-blue-600"
                >
                  Прочитать все
                </Button>
              )}
            </div>
            
            {/* Статус WebSocket */}
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <Text className="text-xs text-gray-500">
                {connected ? 'Real-time активен' : 'Real-time отключен'}
              </Text>
            </div>
          </div>
          
          {/* Список уведомлений */}
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📭</div>
              <Text className="text-gray-500 dark:text-gray-400">
                Нет уведомлений
              </Text>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {notifications.slice(0, 20).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer ${
                    !notification.readAt ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => {
                    if (!notification.readAt) {
                      markAsRead(notification.id)
                    }
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Иконка события */}
                    <div className="text-2xl flex-shrink-0">
                      {getEventIcon(notification.eventType)}
                    </div>
                    
                    {/* Содержимое */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Heading level={4} className="text-sm font-medium">
                          {notification.title}
                        </Heading>
                        {!notification.readAt && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {notification.message}
                      </Text>
                      
                      {/* Метаинформация */}
                      <div className="flex items-center gap-2 mt-2">
                        <Text className={`text-xs ${getPriorityColor(notification.priority)}`}>
                          {notification.priority === 'URGENT' ? '🔴 Срочно' : 
                           notification.priority === 'HIGH' ? '🟠 Важно' : 
                           notification.priority === 'NORMAL' ? '🔵 Обычное' : 
                           '⚪ Низкий'}
                        </Text>
                        <Text className="text-xs text-gray-500">•</Text>
                        <Text className="text-xs text-gray-500">
                          {formatTime(notification.createdAt)}
                        </Text>
                      </div>
                      
                      {/* Кнопка действия */}
                      {notification.actionUrl && notification.actionText && (
                        <Button 
                          className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = notification.actionUrl!
                          }}
                        >
                          {notification.actionText}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Футер */}
          {notifications.length > 0 && (
            <div className="sticky bottom-0 bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 p-3">
              <Button 
                className="w-full text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300"
                onClick={() => window.location.href = '/notifications'}
              >
                Посмотреть все →
              </Button>
            </div>
          )}
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

