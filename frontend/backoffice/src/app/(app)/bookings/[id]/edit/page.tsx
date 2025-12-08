'use client'

import { useState, use, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Fieldset, Field, Label } from '@/components/fieldset'
import { 
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import { graphqlClient } from '@/lib/graphql-client'
import { GET_BOOKING_BY_ID, UPDATE_BOOKING } from '@/lib/graphql-queries'
import type { GetBookingByIdQuery, UpdateBookingMutation } from '@/lib/generated/graphql'

type Booking = NonNullable<GetBookingByIdQuery['booking']>

export default function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { id } = use(params)

  // Запрос бронирования по ID
  const { data: bookingData, isLoading: bookingLoading, error: bookingError } = useQuery<GetBookingByIdQuery>({
    queryKey: ['booking', id],
    queryFn: () => graphqlClient.request(GET_BOOKING_BY_ID, { id }),
    enabled: !!id
  })

  const booking = bookingData?.booking

  // Состояние формы
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: '',
    checkOut: '',
    arrivalTime: '',
    departureTime: '',
    guestsCount: 1,
    status: 'CONFIRMED',
    notes: ''
  })

  // Инициализация формы данными бронирования
  useEffect(() => {
    if (booking) {
      const checkInDate = new Date(booking.checkIn).toISOString().split('T')[0]
      const checkOutDate = new Date(booking.checkOut).toISOString().split('T')[0]
      const arrivalTime = (booking as any).arrivalTime || ''
      const departureTime = (booking as any).departureTime || ''
      
      setFormData({
        guestName: booking.guest.name || '',
        guestEmail: booking.guest.email || '',
        guestPhone: booking.guest.phone || '',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        arrivalTime,
        departureTime,
        guestsCount: booking.guestsCount || 1,
        status: booking.status || 'CONFIRMED',
        notes: booking.notes || ''
      })
    }
  }, [booking])

  // Мутация обновления бронирования
  const updateBookingMutation = useMutation<UpdateBookingMutation, Error, any>({
    mutationFn: (input: any) => graphqlClient.request(UPDATE_BOOKING, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      router.push(`/bookings/${id}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const input: any = {
      id: id,
    }

    // Добавляем только измененные поля
    if (formData.guestName || formData.guestEmail || formData.guestPhone) {
      input.guest = {}
      if (formData.guestName) input.guest.name = formData.guestName
      if (formData.guestEmail) input.guest.email = formData.guestEmail
      if (formData.guestPhone) input.guest.phone = formData.guestPhone
    }

    if (formData.checkIn) {
      input.checkIn = new Date(formData.checkIn).toISOString()
    }

    if (formData.checkOut) {
      input.checkOut = new Date(formData.checkOut).toISOString()
    }

    if (formData.arrivalTime) {
      input.arrivalTime = formData.arrivalTime
    }

    if (formData.departureTime) {
      input.departureTime = formData.departureTime
    }

    if (formData.guestsCount) {
      input.guestsCount = formData.guestsCount
    }

    if (formData.status) {
      input.status = formData.status
    }

    if (formData.notes !== undefined) {
      input.notes = formData.notes
    }

    updateBookingMutation.mutate(input)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            color="zinc"
            onClick={() => router.push(`/bookings/${id}`)}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <div>
            <Heading>Редактирование бронирования #{booking.id.slice(-8)}</Heading>
            <Text className="text-sm text-gray-500 mt-1">
              Создано: {new Date(booking.createdAt).toLocaleDateString('ru-RU')}
            </Text>
          </div>
        </div>
      </div>

      {/* Форма редактирования */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Информация о госте */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4 flex items-center">
              <UserIcon className="w-5 h-5 mr-2" />
              Информация о госте
            </Subheading>
            <Fieldset>
              <Field>
                <Label>Имя гостя</Label>
                <Input
                  type="text"
                  value={formData.guestName}
                  onChange={(e) => handleChange('guestName', e.target.value)}
                  placeholder="Введите имя гостя"
                  required
                />
              </Field>
              <Field>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.guestEmail}
                  onChange={(e) => handleChange('guestEmail', e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </Field>
              <Field>
                <Label>Телефон</Label>
                <Input
                  type="tel"
                  value={formData.guestPhone}
                  onChange={(e) => handleChange('guestPhone', e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                />
              </Field>
            </Fieldset>
          </div>

          {/* Даты бронирования */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4 flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2" />
              Даты бронирования
            </Subheading>
            <Fieldset>
              <Field>
                <Label>Дата заезда</Label>
                <Input
                  type="date"
                  value={formData.checkIn}
                  onChange={(e) => handleChange('checkIn', e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Label>Дата выезда</Label>
                <Input
                  type="date"
                  value={formData.checkOut}
                  onChange={(e) => handleChange('checkOut', e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Label>Время прибытия</Label>
                <Input
                  type="time"
                  value={formData.arrivalTime}
                  onChange={(e) => handleChange('arrivalTime', e.target.value)}
                  placeholder="14:00"
                />
              </Field>
              <Field>
                <Label>Время выезда</Label>
                <Input
                  type="time"
                  value={formData.departureTime}
                  onChange={(e) => handleChange('departureTime', e.target.value)}
                  placeholder="12:00"
                />
              </Field>
              <Field>
                <Label>Количество гостей</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.guestsCount}
                  onChange={(e) => handleChange('guestsCount', parseInt(e.target.value) || 1)}
                  required
                />
              </Field>
            </Fieldset>
          </div>
        </div>

        {/* Статус и заметки */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4">Статус бронирования</Subheading>
            <Fieldset>
              <Field>
                <Label>Статус</Label>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="PENDING">Ожидает</option>
                  <option value="CONFIRMED">Подтверждено</option>
                  <option value="CANCELLED">Отменено</option>
                  <option value="COMPLETED">Завершено</option>
                  <option value="NO_SHOW">Не явился</option>
                </Select>
              </Field>
            </Fieldset>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4">Информация об объекте</Subheading>
            <div className="space-y-2">
              <Text className="font-medium text-gray-900 dark:text-white">
                {booking.unit.name}
              </Text>
              {booking.unit.property && (
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {booking.unit.property.title}
                </Text>
              )}
            </div>
          </div>
        </div>

        {/* Заметки */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <Subheading className="mb-4">Дополнительная информация</Subheading>
          <Fieldset>
            <Field>
              <Label>Заметки</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Дополнительная информация о бронировании..."
                rows={4}
              />
            </Field>
          </Fieldset>
        </div>

        {/* Кнопки действий */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            color="zinc"
            onClick={() => router.push(`/bookings/${id}`)}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={updateBookingMutation.isPending}
          >
            {updateBookingMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Сохранение...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Сохранить изменения
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

