'use client'

import { useState } from 'react'
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { graphqlClient } from '@/lib/graphql-client'
import { GET_PROPERTIES_BY_ORG, GET_UNITS_BY_PROPERTY, GET_BOOKINGS, GET_MASTERS } from '@/lib/graphql-queries'
import { useQuery } from '@tanstack/react-query'

interface CreateTaskDialogWithAssigneeProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (taskId?: string) => void | Promise<void>
  orgId: string
  unitId?: string
  cleaner?: { id: string; firstName: string; lastName: string } | null
  assigneeType: 'cleaner' | 'master'
  onAssigneeTypeChange: (type: 'cleaner' | 'master') => void
  selectedMasterId: string
  onMasterSelect: (masterId: string) => void
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

export function CreateTaskDialogWithAssignee({ 
  isOpen, 
  onClose, 
  onSuccess, 
  orgId,
  unitId: initialUnitId,
  cleaner,
  assigneeType,
  onAssigneeTypeChange,
  selectedMasterId,
  onMasterSelect,
}: CreateTaskDialogWithAssigneeProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    type: '',
    unitId: initialUnitId || '',
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
  const { data: propertiesData, isLoading: propertiesLoading } = useQuery<any>({
    queryKey: ['properties', orgId],
    queryFn: () => graphqlClient.request(GET_PROPERTIES_BY_ORG, { orgId }),
    enabled: !!orgId
  })

  // Получаем единицы для выбранного объекта
  const { data: unitsData, isLoading: unitsLoading } = useQuery<any>({
    queryKey: ['units', selectedPropertyId],
    queryFn: () => graphqlClient.request(GET_UNITS_BY_PROPERTY, { propertyId: selectedPropertyId }),
    enabled: !!selectedPropertyId
  })

  // Получаем бронирования для выбранной единицы
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<any>({
    queryKey: ['bookings', formData.unitId],
    queryFn: () => graphqlClient.request(GET_BOOKINGS, { 
      orgId,
      unitId: formData.unitId,
      first: 50
    }),
    enabled: !!formData.unitId
  })

  // Получаем мастеров
  const { data: mastersData } = useQuery<any>({
    queryKey: ['masters', orgId],
    queryFn: () => graphqlClient.request(GET_MASTERS, {
      orgId: orgId!,
      isActive: true,
      first: 100
    }),
    enabled: !!orgId && assigneeType === 'master'
  })

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const addChecklistItem = () => {
    if (currentChecklistItem.trim()) {
      setFormData(prev => ({
        ...prev,
        checklist: [...prev.checklist, currentChecklistItem.trim()]
      }))
      setCurrentChecklistItem('')
    }
  }

  const removeChecklistItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.type) {
      setError('Пожалуйста, выберите тип задачи')
      return
    }

    if (assigneeType === 'master' && !selectedMasterId) {
      setError('Пожалуйста, выберите мастера')
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

      const result = await graphqlClient.request(mutation, { input }) as any
      const taskId = result.createTask?.id

      // Сброс формы
      setFormData({
        type: '',
        unitId: initialUnitId || '',
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
      setError('Ошибка при создании задачи. Попробуйте еще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const properties = propertiesData?.properties?.edges?.map((edge: any) => edge.node) || []
  const units = unitsData?.units?.edges?.map((edge: any) => edge.node) || []
  const bookings = bookingsData?.bookings?.edges?.map((edge: any) => edge.node) || []
  const masters = mastersData?.masters?.edges?.map((edge: any) => edge.node) || []

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>Создать задачу</DialogTitle>
      <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
            </div>
          )}

          {/* Выбор типа назначения */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Назначить на
            </label>
            <Select
              value={assigneeType}
              onChange={(e) => onAssigneeTypeChange(e.target.value as 'cleaner' | 'master')}
            >
              {cleaner && (
                <option value="cleaner">
                  Уборщик: {cleaner.firstName} {cleaner.lastName}
                </option>
              )}
              <option value="master">Мастер</option>
            </Select>
          </div>

          {/* Выбор мастера */}
          {assigneeType === 'master' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Мастер *
              </label>
              <Select
                value={selectedMasterId}
                onChange={(e) => onMasterSelect(e.target.value)}
                required
              >
                <option value="">Выберите мастера</option>
                {masters.map((master: any) => (
                  <option key={master.id} value={master.id}>
                    {master.firstName} {master.lastName} {master.type ? `(${master.type})` : ''}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Тип задачи */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Тип задачи *
            </label>
            <Select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              required
            >
              <option value="">Выберите тип</option>
              {TASK_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </Select>
          </div>

          {/* Объект недвижимости */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Объект недвижимости
            </label>
            <Select
              value={selectedPropertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value)
                handleInputChange('unitId', '')
              }}
              disabled={propertiesLoading}
            >
              <option value="">Выберите объект</option>
              {properties.map((property: any) => (
                <option key={property.id} value={property.id}>{property.title}</option>
              ))}
            </Select>
          </div>

          {/* Единица */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Квартира
            </label>
            <Select
              value={formData.unitId}
              onChange={(e) => handleInputChange('unitId', e.target.value)}
              disabled={!selectedPropertyId || unitsLoading}
            >
              <option value={initialUnitId || ''}>{initialUnitId ? 'Текущая квартира' : 'Выберите квартиру'}</option>
              {units.map((unit: any) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </Select>
          </div>

          {/* Бронирование */}
          {formData.unitId && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Бронирование
              </label>
              <Select
                value={formData.bookingId}
                onChange={(e) => handleInputChange('bookingId', e.target.value)}
                disabled={bookingsLoading}
              >
                <option value="">Не привязано</option>
                {bookings.map((booking: any) => (
                  <option key={booking.id} value={booking.id}>
                    {new Date(booking.checkIn).toLocaleDateString('ru-RU')} - {new Date(booking.checkOut).toLocaleDateString('ru-RU')}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Срок выполнения */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Срок выполнения
            </label>
            <Input
              type="datetime-local"
              value={formData.dueAt}
              onChange={(e) => handleInputChange('dueAt', e.target.value)}
            />
          </div>

          {/* Заметки */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Заметки
            </label>
            <Textarea
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

            {formData.checklist.length > 0 && (
              <div className="space-y-2">
                {formData.checklist.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-800 rounded">
                    <Text className="text-sm">{item}</Text>
                    <Button
                      type="button"
                      onClick={() => removeChecklistItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Удалить
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </DialogBody>
      <DialogActions>
        <Button outline onClick={onClose} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.type || (assigneeType === 'master' && !selectedMasterId)}
          color="blue"
        >
          {isSubmitting ? 'Создание...' : 'Создать задачу'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

