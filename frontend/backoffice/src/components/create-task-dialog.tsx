'use client'

import { useState } from 'react'
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import { graphqlClient } from '@/lib/graphql-client'
import { GET_PROPERTIES_BY_ORG, GET_UNITS_BY_PROPERTY, GET_BOOKINGS } from '@/lib/graphql-queries'
import { useQuery } from '@tanstack/react-query'

interface CreateTaskDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (taskId?: string) => void | Promise<void>
  orgId: string
}

interface TaskFormData {
  type: string
  unitId: string
  bookingId: string
  dueAt: string
  note: string
  checklist: string[]
}

const TASK_TYPES = [
  { value: 'CLEANING', label: 'Уборка' },
  { value: 'CHECKIN', label: 'Заселение гостя' },
  { value: 'CHECKOUT', label: 'Выселение гостя' },
  { value: 'MAINTENANCE', label: 'Техническое обслуживание' },
  { value: 'INVENTORY', label: 'Инвентаризация' }
]

export function CreateTaskDialog({ isOpen, onClose, onSuccess, orgId }: CreateTaskDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    type: '',
    unitId: '',
    bookingId: '',
    dueAt: '',
    note: '',
    checklist: []
  })
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [currentChecklistItem, setCurrentChecklistItem] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Получаем объекты недвижимости
  const { data: propertiesData, isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', orgId],
    queryFn: () => graphqlClient.request(GET_PROPERTIES_BY_ORG, { orgId }),
    enabled: !!orgId
  })

  // Получаем единицы для выбранного объекта
  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['units', selectedPropertyId],
    queryFn: () => graphqlClient.request(GET_UNITS_BY_PROPERTY, { propertyId: selectedPropertyId }),
    enabled: !!selectedPropertyId
  })

  // Получаем бронирования для выбранной единицы
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', formData.unitId],
    queryFn: () => graphqlClient.request(GET_BOOKINGS, { 
      orgId,
      unitId: formData.unitId,
      first: 50
    }),
    enabled: !!formData.unitId
  })

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)

    // Сбрасываем зависимые поля при изменении
    if (field === 'unitId') {
      setFormData(prev => ({
        ...prev,
        unitId: value,
        bookingId: '' // Сбрасываем выбор бронирования
      }))
    }
  }

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId)
    setFormData(prev => ({
      ...prev,
      unitId: '', // Сбрасываем выбор единицы
      bookingId: '' // Сбрасываем выбор бронирования
    }))
    setError(null)
  }

  const addChecklistItem = () => {
    if (currentChecklistItem.trim() && !formData.checklist.includes(currentChecklistItem.trim())) {
      setFormData(prev => ({
        ...prev,
        checklist: [...prev.checklist, currentChecklistItem.trim()]
      }))
      setCurrentChecklistItem('')
    }
  }

  const removeChecklistItem = (itemToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter(item => item !== itemToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.type) {
      setError('Пожалуйста, выберите тип задачи')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const mutation = `
        mutation CreateTask($input: CreateTaskInput!) {
          createTask(input: $input) {
            id
            type
            status
            dueAt
            note
            createdAt
            org {
              id
              name
            }
            unit {
              id
              name
              property {
                id
                title
              }
            }
            checklist
          }
        }
      `

      const input = {
        orgId,
        type: formData.type,
        unitId: formData.unitId || undefined,
        bookingId: formData.bookingId || undefined,
        dueAt: formData.dueAt || undefined,
        checklist: formData.checklist.length > 0 ? formData.checklist : undefined,
        note: formData.note || undefined
      }

      console.log('🚀 Creating task with input:', input)
      console.log('📋 Form data:', formData)
      console.log('🏢 Org ID:', orgId)

      const result = await graphqlClient.request(mutation, { input }) as any
      console.log('✅ Task created successfully:', result)
      const taskId = result.createTask?.id

      // Сброс формы
      setFormData({
        type: '',
        unitId: '',
        bookingId: '',
        dueAt: '',
        note: '',
        checklist: []
      })
      setSelectedPropertyId('')
      setCurrentChecklistItem('')
      
      await onSuccess(taskId)
      onClose()
    } catch (err) {
      console.error('❌ Error creating task:', err)
      console.error('❌ Error details:', JSON.stringify(err, null, 2))
      
      // Более детальное сообщение об ошибке
      let errorMessage = 'Ошибка при создании задачи. Попробуйте еще раз.'
      
      if (err && typeof err === 'object' && 'message' in err) {
        const errorMsg = (err as any).message
        if (errorMsg.includes('orgId')) {
          errorMessage = 'Ошибка с организацией. Проверьте настройки.'
        } else if (errorMsg.includes('unitId')) {
          errorMessage = 'Ошибка с единицей недвижимости. Проверьте выбор.'
        } else if (errorMsg.includes('type')) {
          errorMessage = 'Ошибка с типом задачи. Проверьте выбор.'
        } else {
          errorMessage = `Ошибка: ${errorMsg}`
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      type: '',
      unitId: '',
      bookingId: '',
      dueAt: '',
      note: '',
      checklist: []
    })
    setSelectedPropertyId('')
    setCurrentChecklistItem('')
    setError(null)
    onClose()
  }

  const properties = (propertiesData as any)?.propertiesByOrgId || []
  const units = (unitsData as any)?.unitsByPropertyId || []
  const bookings = (bookingsData as any)?.bookings?.edges?.map((edge: any) => edge.node) || []

  return (
    <Dialog open={isOpen} onClose={handleClose} size="xl">
      <DialogTitle>Создать новую задачу</DialogTitle>
      <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Тип задачи */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Тип задачи *
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Выберите тип задачи</option>
              {TASK_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Объект недвижимости */}
          <div>
            <label htmlFor="property" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Объект недвижимости
            </label>
            {propertiesLoading ? (
              <Text className="text-zinc-500">Загрузка объектов...</Text>
            ) : (
              <select
                id="property"
                value={selectedPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Выберите объект (опционально)</option>
                {properties.map((property: any) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Единица недвижимости */}
          {selectedPropertyId && (
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Единица недвижимости
              </label>
              {unitsLoading ? (
                <Text className="text-zinc-500">Загрузка единиц...</Text>
              ) : (
                <select
                  id="unit"
                  value={formData.unitId}
                  onChange={(e) => handleInputChange('unitId', e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Выберите единицу</option>
                  {units.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} (вместимость: {unit.capacity})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Бронирование */}
          {formData.unitId && (
            <div>
              <label htmlFor="booking" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Связанное бронирование
              </label>
              {bookingsLoading ? (
                <Text className="text-zinc-500">Загрузка бронирований...</Text>
              ) : bookings.length > 0 ? (
                <select
                  id="booking"
                  value={formData.bookingId}
                  onChange={(e) => handleInputChange('bookingId', e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Выберите бронирование (опционально)</option>
                  {bookings.map((booking: any) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.guest.name} - {new Date(booking.checkIn).toLocaleDateString()} до {new Date(booking.checkOut).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              ) : (
                <Text className="text-zinc-500">Нет активных бронирований для выбранной единицы</Text>
              )}
            </div>
          )}

          {/* Срок выполнения */}
          <div>
            <label htmlFor="dueAt" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Срок выполнения
            </label>
            <Input
              id="dueAt"
              type="datetime-local"
              value={formData.dueAt}
              onChange={(e) => handleInputChange('dueAt', e.target.value)}
            />
          </div>

          {/* Заметки */}
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Заметки
            </label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              rows={3}
              placeholder="Дополнительная информация о задаче..."
            />
          </div>

          {/* Чек-лист */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Чек-лист для выполнения задачи
            </label>
            
            {/* Добавление нового пункта */}
            <div className="flex gap-2 mb-3">
              <Input
                type="text"
                value={currentChecklistItem}
                onChange={(e) => setCurrentChecklistItem(e.target.value)}
                placeholder="Например: Проверить чистоту ванной комнаты"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addChecklistItem()
                  }
                }}
              />
              <Button
                type="button"
                onClick={addChecklistItem}
                disabled={!currentChecklistItem.trim()}
                color="blue"
              >
                Добавить
              </Button>
            </div>

            {/* Список добавленных пунктов */}
            {formData.checklist.length > 0 && (
              <div className="space-y-2">
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                  Пункты чек-листа:
                </Text>
                <div className="space-y-2">
                  {formData.checklist.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg"
                    >
                      <span className="text-sm text-blue-800 dark:text-blue-200 flex-1">
                        {index + 1}. {item}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(item)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <Text className="text-red-800 dark:text-red-200">{error}</Text>
            </div>
          )}

          {/* Кнопки действий */}
          <DialogActions>
            <Button
              type="button"
              onClick={handleClose}
              outline
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              color="blue"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Создание...' : 'Создать задачу'}
            </Button>
          </DialogActions>
        </form>
      </DialogBody>
    </Dialog>
  )
}
