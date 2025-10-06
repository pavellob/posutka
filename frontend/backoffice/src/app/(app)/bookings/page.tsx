'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Dialog } from '@/components/dialog'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Textarea } from '@/components/textarea'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Fieldset, Field, Label } from '@/components/fieldset'
import { Combobox, ComboboxOption, ComboboxLabel } from '@/components/combobox'
import { GET_BOOKINGS, CREATE_BOOKING, CANCEL_BOOKING, GET_PROPERTIES_BY_ORG, GET_UNITS_BY_PROPERTY } from '@/lib/graphql-queries'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { useSelectedOrganization } from '@/hooks/useSelectedOrganization'
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
  
  // Фильтры для бронирований
  const [filters, setFilters] = useState({
    status: '',
    property: '',
    guest: ''
  })

  
  // Ключ для принудительного обновления компонента
  const [componentKey, setComponentKey] = useState(0)
  
  const queryClient = useQueryClient()

  // Получаем текущую организацию пользователя
  const { currentOrganization, currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const { getSelectedOrgId, selectedOrg } = useSelectedOrganization()
  
  // Используем выбранную организацию из селектора, если есть, иначе текущую
  const selectedOrgId = getSelectedOrgId()
  const orgId = selectedOrgId || currentOrgId
  
  // Принудительно обновляем данные при изменении selectedOrgId
  const [prevSelectedOrgId, setPrevSelectedOrgId] = useState<string | null>(null)
  
  // Отладочная информация
  console.log('🔍 BookingsPage Debug:', {
    selectedOrgId,
    currentOrgId,
    orgId,
    selectedOrg: selectedOrg?.name,
    componentKey,
    prevSelectedOrgId,
    hasSelectedOrgChanged: selectedOrgId !== prevSelectedOrgId
  })

  // Запросы данных
  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useQuery<GetBookingsQuery>({
    queryKey: ['bookings', orgId],
    queryFn: () => {
      console.log('🔄 Fetching bookings for orgId:', orgId)
      return graphqlClient.request(GET_BOOKINGS, { orgId })
    },
    enabled: !!orgId,
    refetchOnWindowFocus: false
  })

  const { data: propertiesData, refetch: refetchProperties } = useQuery<GetPropertiesByOrgQuery>({
    queryKey: ['properties', orgId],
    queryFn: () => {
      console.log('🔄 Fetching properties for orgId:', orgId)
      return graphqlClient.request(GET_PROPERTIES_BY_ORG, { orgId })
    },
    enabled: !!orgId,
    refetchOnWindowFocus: false
  })

  // Принудительно обновляем данные при смене организации
  useEffect(() => {
    if (orgId) {
      console.log('🔄 OrgId changed, invalidating queries:', orgId)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      // Сбрасываем выбранные фильтры при смене организации
      setSelectedProperty('')
      setSelectedUnit('')
    }
  }, [orgId, queryClient])


  // Слушаем изменения организации через события
  useEffect(() => {
    const handleOrganizationChange = (event: any) => {
      console.log('🔄 Organization changed event:', event.detail)
      // Принудительно обновляем все запросы
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      // Принудительно обновляем компонент
      setComponentKey(prev => prev + 1)
    }

    window.addEventListener('organizationChanged', handleOrganizationChange)
    return () => window.removeEventListener('organizationChanged', handleOrganizationChange)
  }, [queryClient])

  // Отслеживаем изменения selectedOrgId и принудительно обновляем данные
  useEffect(() => {
    if (selectedOrgId && selectedOrgId !== prevSelectedOrgId) {
      console.log('🔄 SelectedOrgId changed from', prevSelectedOrgId, 'to', selectedOrgId)
      setPrevSelectedOrgId(selectedOrgId)
      
      // Принудительно обновляем все запросы
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      
      // Сбрасываем фильтры
      setSelectedProperty('')
      setSelectedUnit('')
      
      // Принудительно обновляем компонент
      setComponentKey(prev => prev + 1)
    }
  }, [selectedOrgId, prevSelectedOrgId, queryClient])

  // Отладочная информация при рендере (без принудительного обновления)
  useEffect(() => {
    console.log('🔄 Component rendered, orgId:', orgId, 'selectedOrgId:', selectedOrgId)
    
    // Проверяем localStorage напрямую
    const savedOrgId = localStorage.getItem('selectedOrganizationId')
    console.log('🔍 Direct localStorage check:', { savedOrgId, selectedOrgId, orgId })
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
      queryClient.invalidateQueries({ queryKey: ['bookings', orgId] })
      queryClient.invalidateQueries({ queryKey: ['properties', orgId] })
      setShowCreateDialog(false)
      resetCreateForm()
    }
  })

  const cancelBookingMutation = useMutation<CancelBookingMutation, Error, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      graphqlClient.request(CANCEL_BOOKING, { id, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', orgId] })
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

  const allBookings = bookingsData?.bookings?.edges?.map(edge => edge.node) || []
  const properties = propertiesData?.propertiesByOrgId || []
  const units = (unitsData as any)?.unitsByPropertyId || []


  // Показываем все бронирования без фильтрации по периоду
  const bookingsInPeriod = allBookings

  // Фильтрация бронирований по дополнительным фильтрам
  const filteredBookings = bookingsInPeriod.filter(booking => {
    if (filters.status && booking.status !== filters.status) return false
    if (filters.property && booking.unit.property.id !== filters.property) return false
    if (filters.guest && !booking.guest.name.toLowerCase().includes(filters.guest.toLowerCase()) && 
        !booking.guest.email.toLowerCase().includes(filters.guest.toLowerCase())) return false
    return true
  })

  const bookings = filteredBookings

  // Отладочная информация
  console.log('🔍 Bookings Page Debug:', {
    orgId,
    selectedProperty,
    propertiesCount: properties.length,
    unitsCount: units.length,
    properties,
    units,
    unitsLoading,
    allBookingsCount: allBookings.length,
    filteredBookingsCount: filteredBookings.length
  })

  // Подсчет статистики
  const totalBookings = bookings.length
  const activeBookings = bookings.filter(b => b.status === 'CONFIRMED').length
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length
  const futureBookings = bookings.filter(b => {
    const checkIn = new Date(b.checkIn)
    const now = new Date()
    return checkIn > now && b.status === 'CONFIRMED'
  }).length
  const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED').length

  // Подсчет сумм
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.priceBreakdown.total.amount, 0)
  const activeRevenue = bookings.filter(b => b.status === 'CONFIRMED').reduce((sum, booking) => sum + booking.priceBreakdown.total.amount, 0)
  const completedRevenue = bookings.filter(b => b.status === 'COMPLETED').reduce((sum, booking) => sum + booking.priceBreakdown.total.amount, 0)
  const futureRevenue = bookings.filter(b => {
    const checkIn = new Date(b.checkIn)
    const now = new Date()
    return checkIn > now && b.status === 'CONFIRMED'
  }).reduce((sum, booking) => sum + booking.priceBreakdown.total.amount, 0)

  // Подсчет гостей
  const totalGuests = bookings.reduce((sum, booking) => sum + booking.guestsCount, 0)
  const activeGuests = bookings.filter(b => b.status === 'CONFIRMED').reduce((sum, booking) => sum + booking.guestsCount, 0)
  const completedGuests = bookings.filter(b => b.status === 'COMPLETED').reduce((sum, booking) => sum + booking.guestsCount, 0)
  const futureGuests = bookings.filter(b => {
    const checkIn = new Date(b.checkIn)
    const now = new Date()
    return checkIn > now && b.status === 'CONFIRMED'
  }).reduce((sum, booking) => sum + booking.guestsCount, 0)

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
          <Heading level={1}>Управление бронированиями</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Загрузка организации...
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div key={componentKey} className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Heading level={1}>Управление бронированиями</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Статистика и управление бронированиями, заказами и резервациями
          </Text>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          Создать бронирование
        </Button>
      </div>


      {/* Статистика бронирований */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Общее количество бронирований */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Всего бронирований</Text>
              <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                {totalBookings.toLocaleString()}
              </Text>
              <Text className="text-xs text-zinc-500 mt-1">
                Сумма: {formatMoney(totalRevenue, 'RUB')}
              </Text>
              <Text className="text-xs text-zinc-500">
                Гостей: {totalGuests}
              </Text>
            </div>
          </div>
        </div>

        {/* Активные бронирования */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Активные</Text>
              <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                {activeBookings.toLocaleString()}
              </Text>
              <Text className="text-xs text-zinc-500 mt-1">
                Сумма: {formatMoney(activeRevenue, 'RUB')}
              </Text>
              <Text className="text-xs text-zinc-500">
                Гостей: {activeGuests}
              </Text>
            </div>
          </div>
        </div>

        {/* Завершенные бронирования */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Завершенные</Text>
              <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                {completedBookings.toLocaleString()}
              </Text>
              <Text className="text-xs text-zinc-500 mt-1">
                Сумма: {formatMoney(completedRevenue, 'RUB')}
              </Text>
              <Text className="text-xs text-zinc-500">
                Гостей: {completedGuests}
              </Text>
            </div>
          </div>
        </div>

        {/* Будущие бронирования */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Будущие</Text>
              <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                {futureBookings.toLocaleString()}
              </Text>
              <Text className="text-xs text-zinc-500 mt-1">
                Сумма: {formatMoney(futureRevenue, 'RUB')}
              </Text>
              <Text className="text-xs text-zinc-500">
                Гостей: {futureGuests}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <Heading level={2} className="mb-4">Фильтры</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field>
            <Label>Статус</Label>
            <Combobox
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
              options={['', 'CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED', 'NO_SHOW']}
              displayValue={(value) => {
                if (!value) return 'Все статусы'
                switch (value) {
                  case 'CONFIRMED': return 'Подтверждено'
                  case 'PENDING': return 'Ожидает'
                  case 'CANCELLED': return 'Отменено'
                  case 'COMPLETED': return 'Завершено'
                  case 'NO_SHOW': return 'Не явился'
                  default: return value
                }
              }}
            >
              {(option) => (
                <ComboboxOption value={option}>
                  <ComboboxLabel>
                    {option === '' ? 'Все статусы' : 
                     option === 'CONFIRMED' ? 'Подтверждено' :
                     option === 'PENDING' ? 'Ожидает' :
                     option === 'CANCELLED' ? 'Отменено' :
                     option === 'COMPLETED' ? 'Завершено' :
                     option === 'NO_SHOW' ? 'Не явился' : option}
                  </ComboboxLabel>
                </ComboboxOption>
              )}
            </Combobox>
          </Field>

          <Field>
            <Label>Объект</Label>
            <Combobox
              value={filters.property}
              onChange={(value) => setFilters(prev => ({ ...prev, property: value || '' }))}
              options={['', ...properties.map(p => p?.id || '').filter(Boolean)]}
              displayValue={(value) => {
                if (!value) return 'Все объекты'
                const property = properties.find(p => p?.id === value)
                return property?.title || 'Неизвестный объект'
              }}
            >
              {(option) => (
                <ComboboxOption value={option}>
                  <ComboboxLabel>
                    {option === '' ? 'Все объекты' : 
                     properties.find(p => p?.id === option)?.title || 'Неизвестный объект'}
                  </ComboboxLabel>
                </ComboboxOption>
              )}
            </Combobox>
          </Field>

          <Field>
            <Label>Гость</Label>
            <Input
              type="text"
              placeholder="Поиск по имени или email"
              value={filters.guest}
              onChange={(e) => setFilters(prev => ({ ...prev, guest: e.target.value }))}
            />
          </Field>
        </div>
      </div>

      {/* Таблица бронирований */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <Heading level={2}>Список бронирований</Heading>
          <Text className="text-sm text-zinc-500 mt-1">
            Показано {bookings.length} бронирований
          </Text>
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
          <Table striped>
            <TableHead>
              <tr>
                <TableHeader>Гость</TableHeader>
                <TableHeader>Объект</TableHeader>
                <TableHeader>Даты</TableHeader>
                <TableHeader>Гости</TableHeader>
                <TableHeader>Статус</TableHeader>
                <TableHeader>Сумма</TableHeader>
                <TableHeader>Действия</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div>
                      <Text className="font-medium">{booking.guest.name}</Text>
                      <Text className="text-sm text-zinc-500">{booking.guest.email}</Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <Text className="font-medium">{booking.unit.name}</Text>
                      <Text className="text-sm text-zinc-500">{booking.unit.property.title}</Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Text className="text-sm font-medium">
                          {new Date(booking.checkIn).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </Text>
                        <Text className="text-xs text-zinc-400">заезд</Text>
                      </div>
                      <div className="flex items-center gap-2">
                        <Text className="text-sm font-medium">
                          {new Date(booking.checkOut).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </Text>
                        <Text className="text-xs text-zinc-400">выезд</Text>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Text>{booking.guestsCount}</Text>
                  </TableCell>
                  <TableCell>
                    <Badge color={getStatusColor(booking.status) as any}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Text className="font-medium">
                      {formatMoney(booking.priceBreakdown.total.amount, booking.priceBreakdown.total.currency)}
                    </Text>
                  </TableCell>
                  <TableCell>
                    {booking.status === 'PENDING' && (
                      <Button
                        onClick={() => cancelBookingMutation.mutate({ id: booking.id, reason: 'Отменено пользователем' })}
                      >
                        Отменить
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Диалог создания бронирования */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} size="2xl">
        <div className="space-y-6">
          <Heading level={2}>Создать новое бронирование</Heading>
          
          <form onSubmit={handleCreateBooking} className="space-y-6">
            <Fieldset>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <Label>Объект недвижимости</Label>
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
                </Field>

                <Field>
                  <Label>Единица недвижимости</Label>
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
                </Field>
              </div>
            </Fieldset>

            <Fieldset>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <Label>Имя гостя</Label>
                  <Input
                    value={createFormData.guestName}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, guestName: e.target.value }))}
                    required
                  />
                </Field>

                <Field>
                  <Label>Email гостя</Label>
                  <Input
                    type="email"
                    value={createFormData.guestEmail}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, guestEmail: e.target.value }))}
                    required
                  />
                </Field>
              </div>

              <Field>
                <Label>Телефон гостя</Label>
                <Input
                  type="tel"
                  value={createFormData.guestPhone}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, guestPhone: e.target.value }))}
                />
              </Field>
            </Fieldset>

            <Fieldset>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field>
                  <Label>Дата заезда</Label>
                  <Input
                    type="date"
                    value={createFormData.checkIn}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                    required
                  />
                </Field>

                <Field>
                  <Label>Дата выезда</Label>
                  <Input
                    type="date"
                    value={createFormData.checkOut}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, checkOut: e.target.value }))}
                    required
                  />
                </Field>

                <Field>
                  <Label>Количество гостей</Label>
                  <Input
                    type="number"
                    min="1"
                    value={createFormData.guestsCount}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, guestsCount: parseInt(e.target.value) || 1 }))}
                    required
                  />
                </Field>
              </div>
            </Fieldset>

            <Fieldset>
              <Field>
                <Label>Базовая стоимость (руб.)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={createFormData.basePrice}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </Field>

              <Field>
                <Label>Заметки</Label>
                <Textarea
                  value={createFormData.notes}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </Field>
            </Fieldset>

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
