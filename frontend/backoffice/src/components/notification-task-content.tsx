'use client'

import { PencilIcon, UserIcon } from '@heroicons/react/24/outline'
import { Text } from '@/components/text'
import { TaskTemplateNameDisplay } from '@/components/task-template-name-display'
import { useQuery } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'
import { GET_BOOKINGS, GET_CLEANING } from '@/lib/graphql-queries'
import { findAdjacentBookings, formatCheckInOutInfo } from '@/lib/booking-utils'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import type { GetTaskByIdQuery } from '@/lib/generated/graphql'

type Task = NonNullable<GetTaskByIdQuery['task']>

interface NotificationTaskContentProps {
  item: any
  task: Task
  isCleaning: boolean
}

export function NotificationTaskContent({ item, task, isCleaning }: NotificationTaskContentProps) {
  const executorName = item.executorName
  const hasCleaningContent = isCleaning && (item.notes || item.difficulty !== undefined || item.templateId)
  const hasContent = executorName || hasCleaningContent

  const scheduledAt = item.scheduledAt
  
  // Получаем orgId из task или из useCurrentOrganization
  const { currentOrgId } = useCurrentOrganization()
  const orgId = task.org?.id || currentOrgId || null
  
  // Получаем cleaningId для запроса уборки, если нужно получить unitId
  const cleaningId = item.cleaningId || null
  
  // Получаем unitId из разных возможных мест в item
  const initialUnitId = item.unitId || item.unit?.id || task.unit?.id || null
  
  // Если unitId не найден, но есть cleaningId, запрашиваем cleaning для получения unitId
  const { data: cleaningData } = useQuery({
    queryKey: ['cleaning', cleaningId, 'for-unitId'],
    queryFn: async () => {
      if (!cleaningId || !isCleaning) return null
      console.log('[NotificationTaskContent] 🔄 Fetching cleaning for unitId', { cleaningId })
      try {
        const response = await graphqlClient.request(GET_CLEANING, {
          id: cleaningId,
        }) as any
        console.log('[NotificationTaskContent] ✅ Cleaning fetched', {
          cleaningId,
          unitId: response.cleaning?.unit?.id,
        })
        return response.cleaning
      } catch (error) {
        console.error('[NotificationTaskContent] ❌ Error fetching cleaning:', error)
        return null
      }
    },
    enabled: !initialUnitId && !!cleaningId && isCleaning,
  })
  
  // Используем unitId из разных источников: сначала из item/task, потом из cleaning
  const unitId = initialUnitId || cleaningData?.unit?.id || null
  
  // КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ ДЛЯ ДИАГНОСТИКИ
  console.log('[NotificationTaskContent] 🔍 COMPONENT RENDERED', {
    isCleaning,
    cleaningId,
    'item.unitId': item.unitId,
    'item.unit?.id': item.unit?.id,
    'task.unit?.id': task.unit?.id,
    'cleaningData?.unit?.id': cleaningData?.unit?.id,
    'initialUnitId': initialUnitId,
    'resolved unitId': unitId,
    scheduledAt,
    orgId,
    itemKeys: Object.keys(item),
    'typeof item.unitId': typeof item.unitId,
    'typeof scheduledAt': typeof scheduledAt,
    'unitId truthy': !!unitId,
    'scheduledAt truthy': !!scheduledAt,
  })
  
  // ВРЕМЕННО: ВСЕГДА выполняем запрос для уборок, если есть unitId и scheduledAt
  // Используем resolved unitId
  const shouldFetchBookings = !!unitId && !!scheduledAt
  
  // Получаем бронирования для уборки (если это уборка и есть unitId и scheduledAt)
  const { data: bookingsData, isLoading: isLoadingBookings, error: bookingsError } = useQuery({
    queryKey: ['bookings', orgId, unitId, scheduledAt, 'notification-task'],
    queryFn: async () => {
      console.log('[NotificationTaskContent] 🚀 FETCHING BOOKINGS - queryFn called!', {
        orgId,
        unitId,
        scheduledAt,
        isCleaning,
      })
      
      if (!unitId || !scheduledAt) {
        console.log('[NotificationTaskContent] Query skipped - missing conditions', {
          hasUnitId: !!unitId,
          hasScheduledAt: !!scheduledAt,
          unitId,
        })
        return []
      }
      
      // Запрашиваем все бронирования для unitId без фильтрации по датам
      // Это необходимо, так как параметр 'from' фильтрует по checkIn, а нам нужны также выезды из ранних бронирований
      try {
        const response = await graphqlClient.request(GET_BOOKINGS, {
          orgId: orgId || undefined, // Добавляем orgId если есть
          unitId: unitId,
          first: 200, // Достаточно большой лимит
        }) as any
        
        console.log('[NotificationTaskContent] Bookings response:', response)
        
        const allBookings = response.bookings?.edges?.map((edge: any) => edge.node) || []
        console.log('[NotificationTaskContent] All bookings count:', allBookings.length)
        
        // Фильтруем на клиенте: берем бронирования, которые пересекаются с диапазоном ±30 дней от даты уборки
        const scheduledDate = new Date(scheduledAt)
        const fromDate = new Date(scheduledDate)
        fromDate.setDate(fromDate.getDate() - 30) // 30 дней назад для поиска выездов
        fromDate.setHours(0, 0, 0, 0)
        const toDate = new Date(scheduledDate)
        toDate.setDate(toDate.getDate() + 7) // 7 дней вперед для поиска заездов
        toDate.setHours(23, 59, 59, 999)

        // Включаем бронирования где checkIn или checkOut попадают в диапазон
        const filtered = allBookings.filter((booking: any) => {
          const checkIn = new Date(booking.checkIn)
          const checkOut = new Date(booking.checkOut)
          // Бронирование релевантно если его checkIn или checkOut попадают в диапазон
          return (checkIn >= fromDate && checkIn <= toDate) || 
                 (checkOut >= fromDate && checkOut <= toDate) ||
                 (checkIn <= fromDate && checkOut >= toDate) // Бронирование которое покрывает весь диапазон
        })
        
        console.log('[NotificationTaskContent] Filtered bookings count:', filtered.length)
        return filtered
      } catch (error) {
        console.error('[NotificationTaskContent] ❌ Error fetching bookings:', error)
        throw error
      }
    },
    enabled: shouldFetchBookings, // ВРЕМЕННО: используем shouldFetchBookings вместо queryEnabled
    retry: 1, // Для отладки - меньше повторов
    staleTime: 0, // Не использовать кеш для отладки
    gcTime: 0, // Не использовать кеш для отладки
  })
  
  // Логируем состояние запроса
  console.log('[NotificationTaskContent] 📊 useQuery state:', {
    shouldFetchBookings,
    'enabled value': shouldFetchBookings,
    isLoadingBookings,
    hasBookingsData: !!bookingsData,
    bookingsDataLength: bookingsData?.length ?? 0,
    bookingsError,
    'queryKey': ['bookings', orgId, unitId, scheduledAt, 'notification-task'],
    'resolved unitId': unitId,
  })

  // Находим ближайшие бронирования для уборки
  // Используем данные из item (приоритет), иначе вычисляем из bookingsData
  let checkoutBooking: any = item.checkoutBooking ?? null
  let checkinBooking: any = item.checkinBooking ?? null
  
  // Если данных в item нет (undefined или null), вычисляем из bookingsData
  // Важно: используем bookingsData даже если он еще загружается или только загрузился
  if ((!checkoutBooking && !checkinBooking) && scheduledAt && isCleaning) {
    if (Array.isArray(bookingsData) && bookingsData.length > 0) {
      const adjacent = findAdjacentBookings(bookingsData, scheduledAt)
      checkoutBooking = adjacent.checkoutBooking
      checkinBooking = adjacent.checkinBooking
    }
  }
  
  const { checkoutText, checkinText } = formatCheckInOutInfo(checkoutBooking, checkinBooking)
  
  // Отладка (временно, для диагностики)
  if (isCleaning) {
    console.log('[NotificationTaskContent] Booking debug:', {
      itemId: item.cleaningId || item.repairId,
      'item.unitId': item.unitId,
      'resolved unitId': unitId,
      scheduledAt,
      shouldFetchBookings,
      isLoadingBookings,
      bookingsError,
      hasCheckoutInItem: !!item.checkoutBooking,
      hasCheckinInItem: !!item.checkinBooking,
      checkoutBookingFromItem: item.checkoutBooking,
      checkinBookingFromItem: item.checkinBooking,
      bookingsDataLength: bookingsData?.length ?? 0,
      checkoutBooking,
      checkinBooking,
      checkoutText,
      checkinText,
    })
  }
  
  // Показываем компонент, если есть любой контент или информация о бронированиях
  if (!hasContent && !(checkoutText || checkinText)) {
    return null
  }

  return (
    <div className="space-y-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60">
      {executorName && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/30">
          <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 shadow-sm">
            <UserIcon className="w-5 h-5 text-blue-700 dark:text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <Text className="text-xs font-medium text-blue-900/70 dark:text-blue-200/70 mb-1 uppercase tracking-wider">
              Исполнитель
            </Text>
            <Text className="text-sm font-medium text-blue-900 dark:text-blue-100 leading-tight">
              {executorName}
            </Text>
          </div>
        </div>
      )}
      {isCleaning && item.notes && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/30">
          <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/50 shadow-sm">
            <PencilIcon className="w-5 h-5 text-purple-700 dark:text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Заметки
            </Text>
            <Text className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
              {item.notes}
            </Text>
          </div>
        </div>
      )}
      {isCleaning && item.difficulty !== undefined && item.difficulty !== null && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/30">
          <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/50 shadow-sm">
            <Text className="text-sm font-bold text-amber-800 dark:text-amber-200">
              D{item.difficulty}
            </Text>
          </div>
          <div className="flex-1 min-w-0">
            <Text className="text-xs font-medium text-amber-900/70 dark:text-amber-200/70 mb-1 uppercase tracking-wider">
              Сложность
            </Text>
            <Text className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {item.difficulty === 0 ? 'Очень легко' : 
               item.difficulty === 1 ? 'Легко' : 
               item.difficulty === 2 ? 'Средне' : 
               item.difficulty === 3 ? 'Сложно' : 
               item.difficulty === 4 ? 'Очень сложно' : 
               'Экстремально'}
            </Text>
          </div>
        </div>
      )}
      {isCleaning && item.templateId && (
        <TaskTemplateNameDisplay 
          templateId={item.templateId} 
          unitId={unitId}
          cleaningId={item.cleaningId || null}
        />
      )}
      {/* Информация о бронированиях для уборок */}
      {isCleaning && (checkoutText || checkinText) && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200/50 dark:border-green-900/30">
          <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/50 shadow-sm">
            <Text className="text-base">📅</Text>
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <Text className="text-xs font-medium text-green-900/70 dark:text-green-200/70 uppercase tracking-wider">
              Бронирования
            </Text>
            {checkoutText && (
              <Text className="text-sm font-medium text-green-900 dark:text-green-100 leading-tight">
                {checkoutText}
              </Text>
            )}
            {checkinText && (
              <Text className="text-sm font-medium text-green-900 dark:text-green-100 leading-tight">
                {checkinText}
              </Text>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

