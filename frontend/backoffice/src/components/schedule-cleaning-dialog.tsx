'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from './dialog'
import { Button } from './button'
import { Input } from './input'
import { Textarea } from './textarea'
import { Heading } from './heading'
import { Text } from './text'
import { Select } from './select'
import { graphqlClient } from '@/lib/graphql-client'
import {
  GET_CLEANERS,
  SCHEDULE_CLEANING,
} from '@/lib/graphql-queries'

interface Unit {
  id: string
  name: string
}

interface ScheduleCleaningDialogProps {
  isOpen: boolean
  onClose: () => void
  orgId: string
  units: Unit[]
}

export function ScheduleCleaningDialog({
  isOpen,
  onClose,
  orgId,
  units
}: ScheduleCleaningDialogProps) {
  const [selectedCleaner, setSelectedCleaner] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [requiresLinenChange, setRequiresLinenChange] = useState(false)
  const [notes, setNotes] = useState('')
  
  const queryClient = useQueryClient()

  // Получить уборщиков
  const { data: cleanersData, isLoading: cleanersLoading } = useQuery<any>({
    queryKey: ['cleaners', orgId],
    queryFn: () => graphqlClient.request(GET_CLEANERS, {
      orgId,
      isActive: true,
      first: 100
    }),
    enabled: isOpen && !!orgId
  })

  // Мутация для создания уборки
  const scheduleCleaningMutation = useMutation({
    mutationFn: (input: any) => graphqlClient.request(SCHEDULE_CLEANING, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanings'] })
      handleClose()
    },
    onError: (error: any) => {
      alert(`Ошибка при создании уборки: ${error.message || 'Неизвестная ошибка'}`)
    }
  })

  const handleClose = () => {
    setSelectedCleaner('')
    setSelectedUnit('')
    setScheduledDate('')
    setScheduledTime('')
    setRequiresLinenChange(false)
    setNotes('')
    onClose()
  }

  const handleSchedule = async () => {
    if (!selectedCleaner) {
      alert('Выберите уборщика')
      return
    }

    if (!selectedUnit) {
      alert('Выберите квартиру')
      return
    }

    if (!scheduledDate || !scheduledTime) {
      alert('Укажите дату и время уборки')
      return
    }

    // Комбинируем дату и время в ISO формат
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()

    const input = {
      orgId,
      cleanerId: selectedCleaner,
      unitId: selectedUnit,
      scheduledAt,
      requiresLinenChange,
      notes: notes || undefined,
      // Чеклист загрузится автоматически из темплейта unit на бэкенде
    }

    scheduleCleaningMutation.mutate(input)
  }

  const cleaners = cleanersData?.cleaners?.edges?.map((edge: any) => edge.node) || []

  // Получаем сегодняшнюю дату для min атрибута
  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={isOpen} onClose={handleClose} size="2xl">
      <DialogTitle>Запланировать уборку</DialogTitle>
      <DialogDescription>
        Создайте новую уборку, выбрав уборщика, квартиру и время
      </DialogDescription>
      <DialogBody className="space-y-6">
        {/* Выбор квартиры */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Квартира <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full"
          >
            <option value="">Выберите квартиру</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </Select>
          {units.length === 0 && (
            <Text className="text-sm text-gray-500 mt-1">
              Нет доступных квартир
            </Text>
          )}
        </div>

        {/* Выбор уборщика */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Уборщик <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedCleaner}
            onChange={(e) => setSelectedCleaner(e.target.value)}
            className="w-full"
            disabled={cleanersLoading}
          >
            <option value="">
              {cleanersLoading ? 'Загрузка...' : 'Выберите уборщика'}
            </option>
            {cleaners.map((cleaner: any) => (
              <option key={cleaner.id} value={cleaner.id}>
                {cleaner.firstName} {cleaner.lastName}
                {cleaner.rating ? ` ⭐ ${cleaner.rating.toFixed(1)}` : ''}
              </option>
            ))}
          </Select>
          {!cleanersLoading && cleaners.length === 0 && (
            <Text className="text-sm text-gray-500 mt-1">
              Нет активных уборщиков. Добавьте уборщиков в системе.
            </Text>
          )}
        </div>

        {/* Дата и время */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Дата <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={today}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Время <span className="text-red-500">*</span>
            </label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Смена белья */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="requiresLinenChange"
            checked={requiresLinenChange}
            onChange={(e) => setRequiresLinenChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="requiresLinenChange" className="text-sm font-medium cursor-pointer">
            Требуется смена постельного белья
          </label>
        </div>

        {/* Заметки */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Заметки
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Дополнительные инструкции или комментарии..."
            rows={3}
            className="w-full"
          />
        </div>

        {/* Информация о чеклисте */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <Heading level={4} className="text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Чеклист уборки
          </Heading>
          <Text className="text-sm text-blue-800 dark:text-blue-200">
            Будет создан стандартный чеклист из 8 пунктов. Вы сможете отмечать выполнение 
            каждого пункта во время уборки.
          </Text>
        </div>
      </DialogBody>
      <DialogActions>
        <Button 
          onClick={handleClose}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-gray-300 dark:border-zinc-600"
        >
          Отмена
        </Button>
        <Button 
          onClick={handleSchedule}
          disabled={scheduleCleaningMutation.isPending}
          className="bg-black hover:bg-gray-800 text-white border-gray-600"
        >
          {scheduleCleaningMutation.isPending ? 'Создание...' : 'Запланировать уборку'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

