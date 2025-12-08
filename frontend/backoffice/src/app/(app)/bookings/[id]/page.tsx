'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Dialog } from '@/components/dialog'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown'
import { 
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  SparklesIcon,
  CreditCardIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { GET_BOOKING_BY_ID, CANCEL_BOOKING } from '@/lib/graphql-queries'
import type { GetBookingByIdQuery } from '@/lib/generated/graphql'

type Booking = NonNullable<GetBookingByIdQuery['booking']>

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  // Разворачиваем params с помощью React.use()
  const { id } = use(params)

  // Запрос бронирования по ID
  const { data: bookingData, isLoading: bookingLoading, error: bookingError } = useQuery<GetBookingByIdQuery>({
    queryKey: ['booking', id],
    queryFn: () => graphqlClient.request(GET_BOOKING_BY_ID, { id }),
    enabled: !!id
  })

  // Мутация отмены бронирования
  const cancelBookingMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => 
      graphqlClient.request(CANCEL_BOOKING, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setShowCancelDialog(false)
    }
  })

  const booking = bookingData?.booking

  if (bookingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (bookingError || !booking) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <Heading className="mt-4">Бронирование не найдено</Heading>
          <Text className="mt-2 text-gray-600">
            Бронирование с ID {id} не существует или было удалено.
          </Text>
          <Button 
            className="mt-4"
            onClick={() => router.push('/bookings')}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Вернуться к бронированиям
          </Button>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'CONFIRMED': { color: 'green' as const, text: 'Подтверждено' },
      'PENDING': { color: 'yellow' as const, text: 'Ожидает' },
      'CANCELLED': { color: 'red' as const, text: 'Отменено' },
      'COMPLETED': { color: 'blue' as const, text: 'Завершено' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'zinc' as const, text: status }
    return <Badge color={statusInfo.color}>{statusInfo.text}</Badge>
  }

  const formatMoney = (amount: number, currency: string | undefined | null): string => {
    const value = amount / 100
    
    // Проверяем, является ли currency валидным кодом валюты
    const validCurrencies = ['RUB', 'USD', 'EUR', 'GBP', 'CNY', 'JPY']
    const currencyCode = currency && validCurrencies.includes(currency.toUpperCase()) ? currency.toUpperCase() : 'RUB'
    
    try {
      const formatter = new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
      return formatter.format(value)
    } catch (error) {
      // Fallback: если валюта не поддерживается, форматируем как число
      return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value) + ' ' + currencyCode
    }
  }

  const formatDateTime = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(value)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleCancelBooking = () => {
    if (booking.id) {
      cancelBookingMutation.mutate({ id: booking.id })
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            color="zinc"
            onClick={() => router.push('/bookings')}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <div>
            <Heading>Бронирование #{booking.id.slice(-8)}</Heading>
            <div className="flex items-center space-x-2 mt-2">
              {getStatusBadge(booking.status)}
              <Text className="text-sm text-gray-500">
                Создано: {new Date(booking.createdAt).toLocaleDateString('ru-RU')}
              </Text>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => router.push(`/bookings/${id}/edit`)}
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Редактировать
          </Button>
          <Dropdown>
            <DropdownButton>
              <EllipsisVerticalIcon className="w-5 h-5" />
            </DropdownButton>
            <DropdownMenu>
              <DropdownItem onClick={() => setShowCancelDialog(true)}>
                <XCircleIcon className="w-4 h-4 mr-2" />
                Отменить бронирование
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Информация о госте */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <Subheading className="mb-4 flex items-center">
            <UserIcon className="w-5 h-5 mr-2" />
            Информация о госте
          </Subheading>
          <div className="space-y-4">
            <div>
              <Text className="font-medium text-gray-900 dark:text-white text-lg">
                {booking.guest.name}
              </Text>
              <div className="mt-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <EnvelopeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    {booking.guest.email}
                  </Text>
                </div>
                {booking.guest.phone ? (
                  <div className="flex items-center space-x-2">
                    <PhoneIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <a 
                      href={`tel:${booking.guest.phone}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                    >
                      {booking.guest.phone}
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <PhoneIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    <Text className="text-sm text-gray-400 dark:text-gray-500 italic">
                      Телефон не указан
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Даты бронирования */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <Subheading className="mb-4 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Даты бронирования
          </Subheading>
          <div className="space-y-4">
            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Заезд</Text>
              <Text className="font-medium text-gray-900 dark:text-white">
                {formatDateTime(booking.checkIn)}
              </Text>
            </div>
            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Время прибытия</Text>
              <Text className="font-medium text-gray-900 dark:text-white">
                {booking.arrivalTime || 'Не указано'}
              </Text>
            </div>
            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Выезд</Text>
              <Text className="font-medium text-gray-900 dark:text-white">
                {formatDateTime(booking.checkOut)}
              </Text>
            </div>
            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Время выезда</Text>
              <Text className="font-medium text-gray-900 dark:text-white">
                {booking.departureTime || 'Не указано'}
              </Text>
            </div>
            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Количество гостей</Text>
              <Text className="font-medium text-gray-900 dark:text-white">
                {booking.guestsCount} {booking.guestsCount === 1 ? 'гость' : 'гостей'}
              </Text>
            </div>
          </div>
        </div>

        {/* Информация об объекте */}
        {booking.unit && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4 flex items-center">
              <HomeIcon className="w-5 h-5 mr-2" />
              Объект недвижимости
            </Subheading>
            <div className="space-y-4">
              <div 
                className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                onClick={() => router.push(`/inventory/units/${booking.unit.id}`)}
              >
                <HomeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <Text className="font-medium text-gray-900 dark:text-white">
                    {booking.unit.name}
                  </Text>
                  {booking.unit.property && (
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {booking.unit.property.title}
                    </Text>
                  )}
                  <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    🔗 Нажмите для перехода к объекту
                  </Text>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Финансовая информация */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <Subheading className="mb-4 flex items-center">
            <CreditCardIcon className="w-5 h-5 mr-2" />
            Финансовая информация
          </Subheading>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <Text className="text-gray-500 dark:text-gray-400">Базовая цена</Text>
              <Text className="font-medium text-gray-900 dark:text-white">
                {formatMoney(booking.priceBreakdown.basePrice.amount, booking.priceBreakdown.basePrice.currency)}
              </Text>
            </div>
            {booking.priceBreakdown.cleaningFee && booking.priceBreakdown.cleaningFee.amount !== undefined && (
              <div className="flex justify-between">
                <Text className="text-gray-500 dark:text-gray-400">Уборка</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {formatMoney(booking.priceBreakdown.cleaningFee.amount, booking.priceBreakdown.cleaningFee.currency)}
                </Text>
              </div>
            )}
            {booking.priceBreakdown.pricePerDay && (
              <div className="flex justify-between">
                <Text className="text-gray-500 dark:text-gray-400">Цена за сутки</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {formatMoney(booking.priceBreakdown.pricePerDay.amount, booking.priceBreakdown.pricePerDay.currency)}
                </Text>
              </div>
            )}
            {booking.priceBreakdown.serviceFee && booking.priceBreakdown.serviceFee.amount !== undefined && (
              <div className="flex justify-between">
                <Text className="text-gray-500 dark:text-gray-400">Сервисный сбор</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {formatMoney(booking.priceBreakdown.serviceFee.amount, booking.priceBreakdown.serviceFee.currency)}
                </Text>
              </div>
            )}
            {booking.priceBreakdown.taxes && booking.priceBreakdown.taxes.amount !== undefined && (
              <div className="flex justify-between">
                <Text className="text-gray-500 dark:text-gray-400">Налоги / комиссии</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {formatMoney(booking.priceBreakdown.taxes.amount, booking.priceBreakdown.taxes.currency)}
                </Text>
              </div>
            )}
            {booking.priceBreakdown.platformTax && (
              <div className="flex justify-between">
                <Text className="text-gray-500 dark:text-gray-400">Комиссия платформы</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {formatMoney(booking.priceBreakdown.platformTax.amount, booking.priceBreakdown.platformTax.currency)}
                </Text>
              </div>
            )}
            {booking.priceBreakdown.prepayment && (
              <div className="flex justify-between">
                <Text className="text-gray-500 dark:text-gray-400">Предоплата</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {formatMoney(booking.priceBreakdown.prepayment.amount, booking.priceBreakdown.prepayment.currency)}
                </Text>
              </div>
            )}
            {booking.priceBreakdown.amount && (
              <div className="flex justify-between">
                <Text className="text-gray-500 dark:text-gray-400">Сумма (внешняя)</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {formatMoney(booking.priceBreakdown.amount.amount, booking.priceBreakdown.amount.currency)}
                </Text>
              </div>
            )}
            {booking.priceBreakdown.total && (
              <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2">
                <Text className="text-gray-700 dark:text-gray-200 font-semibold">Итого</Text>
                <Text className="font-semibold text-gray-900 dark:text-white">
                  {formatMoney(booking.priceBreakdown.total.amount, booking.priceBreakdown.total.currency)}
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Дополнительная информация */}
      {booking.notes && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <Subheading className="mb-4">Дополнительная информация</Subheading>
          <Text className="text-gray-700 dark:text-gray-300">
            {booking.notes}
          </Text>
        </div>
      )}

      {/* Связанные задачи - пока не доступны в API */}
      {/* TODO: Добавить поле tasks в GraphQL запрос GET_BOOKING_BY_ID */}

      {/* Диалог отмены бронирования */}
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <div className="p-6">
          <Heading className="mb-4">Отменить бронирование</Heading>
          <Text className="mb-6">
            Вы уверены, что хотите отменить это бронирование? Это действие нельзя отменить.
          </Text>
          <div className="flex space-x-3">
            <Button
              color="zinc"
              onClick={() => setShowCancelDialog(false)}
            >
              Отмена
            </Button>
            <Button
              color="red"
              onClick={handleCancelBooking}
              disabled={cancelBookingMutation.isPending}
            >
              {cancelBookingMutation.isPending ? 'Отмена...' : 'Отменить бронирование'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
