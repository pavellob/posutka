'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Dialog } from '@/components/dialog'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Textarea } from '@/components/textarea'
import { Table } from '@/components/table'
import { Alert } from '@/components/alert'
import { GET_BOOKINGS, CREATE_BOOKING, CANCEL_BOOKING, GET_PROPERTIES_BY_ORG, GET_UNITS_BY_PROPERTY } from '@/lib/graphql-queries'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import type { 
  GetBookingsQuery, 
  GetPropertiesByOrgQuery, 
  GetUnitsByPropertyQuery,
  CreateBookingMutation,
  CancelBookingMutation
} from '@/lib/generated/graphql'
// Утилита для форматирования денег
function formatMoney(amount: number, currency: string): string {
  const value = amount / 100 // конвертируем из копеек в рубли/доллары
  
  const formatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  
  return formatter.format(value)
}

// Используем сгенерированные типы
type Booking = NonNullable<GetBookingsQuery['bookings']['edges'][0]>['node']
type Property = NonNullable<GetPropertiesByOrgQuery['propertiesByOrgId'][0]>
type Unit = NonNullable<GetUnitsByPropertyQuery['unitsByPropertyId'][0]>

export default function BookingsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [createFormData, setCreateFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: '',
    checkOut: '',
    guestsCount: 1,
    basePrice: 0,
    notes: ''
  })
  
  const queryClient = useQueryClient()

  // Получаем текущую организацию пользователя
  const { currentOrganization, currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const orgId = currentOrgId

  // Запросы данных
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<GetBookingsQuery>({
    queryKey: ['bookings', orgId],
    queryFn: () => graphqlClient.request(GET_BOOKINGS, { orgId }),
    enabled: !!orgId
  })

  const { data: propertiesData } = useQuery<GetPropertiesByOrgQuery>({
    queryKey: ['properties', orgId],
    queryFn: () => graphqlClient.request(GET_PROPERTIES_BY_ORG, { orgId }),
    enabled: !!orgId
  })

  const { data: unitsData, isLoading: unitsLoading, error: unitsError } = useQuery<GetUnitsByPropertyQuery>({
    queryKey: ['units', selectedProperty],
    queryFn: () => {
      console.log('🔄 Fetching units for property:', selectedProperty)
      return graphqlClient.request(GET_UNITS_BY_PROPERTY, { propertyId: selectedProperty })
    },
    enabled: !!selectedProperty,
    retry: 1
  })

  // Мутации
  const createBookingMutation = useMutation<CreateBookingMutation, Error, any>({
    mutationFn: (input: any) => graphqlClient.request(CREATE_BOOKING, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setShowCreateDialog(false)
      resetCreateForm()
    }
  })

  const cancelBookingMutation = useMutation<CancelBookingMutation, Error, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      graphqlClient.request(CANCEL_BOOKING, { id, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    }
  })

  const resetCreateForm = () => {
    setCreateFormData({
      guestName: '',
      guestEmail: '',
      guestPhone: '',
      checkIn: '',
      checkOut: '',
      guestsCount: 1,
      basePrice: 0,
      notes: ''
    })
    setSelectedProperty('')
    setSelectedUnit('')
  }

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUnit || !createFormData.guestName || !createFormData.guestEmail || !createFormData.checkIn || !createFormData.checkOut) {
      return
    }

    const input = {
      orgId,
      unitId: selectedUnit,
      guest: {
        name: createFormData.guestName,
        email: createFormData.guestEmail,
        phone: createFormData.guestPhone || undefined,
      },
      checkIn: createFormData.checkIn,
      checkOut: createFormData.checkOut,
      guestsCount: createFormData.guestsCount,
      priceBreakdown: {
        basePrice: {
          amount: createFormData.basePrice * 100, // конвертируем в копейки
          currency: 'RUB'
        },
        total: {
          amount: createFormData.basePrice * 100,
          currency: 'RUB'
        }
      },
      notes: createFormData.notes || undefined,
      source: 'DIRECT'
    }

    createBookingMutation.mutate(input)
  }

  const bookings = bookingsData?.bookings?.edges?.map(edge => edge.node) || []
  const properties = propertiesData?.propertiesByOrgId || []
  const units = (unitsData as any)?.unitsByPropertyId || []

  // Отладочная информация
  console.log('🔍 Bookings Page Debug:', {
    orgId,
    selectedProperty,
    propertiesCount: properties.length,
    unitsCount: units.length,
    properties,
    units,
    unitsLoading
  })

  // Подсчет статистики
  const totalBookings = bookings.length
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length
  const pendingBookings = bookings.filter(b => b.status === 'PENDING').length
  const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'green'
      case 'PENDING': return 'orange'
      case 'CANCELLED': return 'red'
      case 'COMPLETED': return 'blue'
      case 'NO_SHOW': return 'gray'
      default: return 'gray'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Подтверждено'
      case 'PENDING': return 'Ожидает'
      case 'CANCELLED': return 'Отменено'
      case 'COMPLETED': return 'Завершено'
      case 'NO_SHOW': return 'Не явился'
      default: return status
    }
  }

  // Показываем загрузку если организация еще не загружена
  if (orgLoading || !orgId) {
    return (
      <div className="space-y-6">
        <div>
          <Heading level={1}>Bookings Management</Heading>
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
          <Heading level={1}>Bookings Management</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Управление бронированиями, заказами и резервациями
          </Text>
          {currentOrganization && (
            <Text className="mt-1 text-sm text-zinc-500">
              Организация: {currentOrganization.name}
            </Text>
          )}
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          Создать бронирование
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">📅</span>
            </div>
            <Heading level={3}>Total Bookings</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">{totalBookings}</Text>
          <Text className="text-sm text-zinc-500">Всего бронирований</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">✅</span>
            </div>
            <Heading level={3}>Confirmed</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">{confirmedBookings}</Text>
          <Text className="text-sm text-zinc-500">
            {totalBookings > 0 ? `${Math.round((confirmedBookings / totalBookings) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⏳</span>
            </div>
            <Heading level={3}>Pending</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">{pendingBookings}</Text>
          <Text className="text-sm text-zinc-500">
            {totalBookings > 0 ? `${Math.round((pendingBookings / totalBookings) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">❌</span>
            </div>
            <Heading level={3}>Cancelled</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">{cancelledBookings}</Text>
          <Text className="text-sm text-zinc-500">
            {totalBookings > 0 ? `${Math.round((cancelledBookings / totalBookings) * 100)}%` : '0%'}
          </Text>
        </div>
      </div>

      {/* Таблица бронирований */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <Heading level={2}>Список бронирований</Heading>
        </div>
        
        {bookingsLoading ? (
          <div className="p-6 text-center">
            <Text>Загрузка бронирований...</Text>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-6 text-center">
            <Text className="text-zinc-500">Нет бронирований</Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Гость
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Объект
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Даты
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Гости
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Text className="font-medium">{booking.guest.name}</Text>
                        <Text className="text-sm text-zinc-500">{booking.guest.email}</Text>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Text className="font-medium">{booking.unit.name}</Text>
                        <Text className="text-sm text-zinc-500">{booking.unit.property.title}</Text>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Text className="text-sm">
                          {new Date(booking.checkIn).toLocaleDateString('ru-RU')}
                        </Text>
                        <Text className="text-sm text-zinc-500">
                          {new Date(booking.checkOut).toLocaleDateString('ru-RU')}
                        </Text>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Text>{booking.guestsCount}</Text>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={getStatusColor(booking.status) as any}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Text className="font-medium">
                        {formatMoney(booking.priceBreakdown.total.amount, booking.priceBreakdown.total.currency)}
                      </Text>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {booking.status === 'PENDING' && (
                        <Button
                          onClick={() => cancelBookingMutation.mutate({ id: booking.id, reason: 'Отменено пользователем' })}
                        >
                          Отменить
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Диалог создания бронирования */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} size="2xl">
        <div className="space-y-6">
          <Heading level={2}>Создать новое бронирование</Heading>
          
          <form onSubmit={handleCreateBooking} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Объект недвижимости
                </label>
                <Select
                  value={selectedProperty}
                  onChange={(e) => {
                    setSelectedProperty(e.target.value)
                    setSelectedUnit('')
                  }}
                  required
                >
                  <option value="">Выберите объект</option>
                  {properties.map((property) => (
                    <option key={property?.id} value={property?.id}>
                      {property?.title}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Единица недвижимости
                </label>
                <Select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  required
                  disabled={!selectedProperty || unitsLoading}
                >
                  <option value="">
                    {!selectedProperty 
                      ? "Сначала выберите объект" 
                      : unitsLoading 
                        ? "Загрузка единиц..." 
                        : "Выберите единицу"
                    }
                  </option>
                  {units.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} (вместимость: {unit.capacity})
                    </option>
                  ))}
                </Select>
                {selectedProperty && !unitsLoading && units.length === 0 && (
                  <Text className="text-sm text-orange-600 mt-1">
                    В выбранном объекте нет единиц недвижимости
                  </Text>
                )}
                {unitsError && (
                  <Text className="text-sm text-red-600 mt-1">
                    Ошибка загрузки единиц: {unitsError.message}
                  </Text>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Имя гостя
                </label>
                <Input
                  value={createFormData.guestName}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, guestName: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Email гостя
                </label>
                <Input
                  type="email"
                  value={createFormData.guestEmail}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, guestEmail: e.target.value }))}
                  required
                />
              </div>
            </div>

              <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Телефон гостя
              </label>
              <Input
                type="tel"
                value={createFormData.guestPhone}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, guestPhone: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Дата заезда
                </label>
                <Input
                  type="date"
                  value={createFormData.checkIn}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Дата выезда
                </label>
                <Input
                  type="date"
                  value={createFormData.checkOut}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, checkOut: e.target.value }))}
                  required
                />
        </div>

                <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Количество гостей
                </label>
                <Input
                  type="number"
                  min="1"
                  value={createFormData.guestsCount}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, guestsCount: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>
            </div>

                <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Базовая стоимость (руб.)
              </label>
              <Input
                type="number"
                min="0"
                step="100"
                value={createFormData.basePrice}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

                <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Заметки
              </label>
              <Textarea
                value={createFormData.notes}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {createBookingMutation.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <Text className="text-red-800">
                  Ошибка при создании бронирования: {createBookingMutation.error?.message}
                </Text>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setShowCreateDialog(false)}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createBookingMutation.isPending}
              >
                {createBookingMutation.isPending ? 'Создание...' : 'Создать бронирование'}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  )
}
