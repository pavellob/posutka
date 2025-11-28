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
  GET_MASTERS,
  SCHEDULE_REPAIR,
} from '@/lib/graphql-queries'

interface Unit {
  id: string
  name: string
}

interface ScheduleRepairDialogProps {
  isOpen: boolean
  onClose: () => void
  orgId: string
  units: Unit[]
}

export function ScheduleRepairDialog({
  isOpen,
  onClose,
  orgId,
  units
}: ScheduleRepairDialogProps) {
  const [selectedMaster, setSelectedMaster] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [notes, setNotes] = useState('')
  
  const queryClient = useQueryClient()

  // Получить мастеров
  const { data: mastersData, isLoading: mastersLoading } = useQuery<any>({
    queryKey: ['masters', orgId],
    queryFn: () => graphqlClient.request(GET_MASTERS, {
      orgId,
      first: 100
    }),
    enabled: isOpen && !!orgId
  })

  // Мутация для создания ремонта
  const scheduleRepairMutation = useMutation({
    mutationFn: (input: any) => graphqlClient.request(SCHEDULE_REPAIR, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] })
      handleClose()
    },
    onError: (error: any) => {
      alert(`Ошибка при создании ремонта: ${error.message || 'Неизвестная ошибка'}`)
    }
  })

  const handleClose = () => {
    setSelectedMaster('')
    setSelectedUnit('')
    setScheduledDate('')
    setScheduledTime('')
    setNotes('')
    onClose()
  }

  const handleSchedule = async () => {
    if (!selectedMaster) {
      alert('Выберите мастера')
      return
    }

    if (!selectedUnit) {
      alert('Выберите юнит')
      return
    }

    if (!scheduledDate || !scheduledTime) {
      alert('Укажите дату и время ремонта')
      return
    }

    // Комбинируем дату и время в ISO формат
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()

    const input = {
      orgId,
      masterId: selectedMaster,
      unitId: selectedUnit,
      scheduledAt,
      notes: notes || undefined,
    }

    scheduleRepairMutation.mutate(input)
  }

  const masters = mastersData?.masters?.edges?.map((edge: any) => edge.node) || []
  const activeMasters = masters.filter((m: any) => m.isActive)

  // Получаем сегодняшнюю дату для min атрибута
  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={isOpen} onClose={handleClose} size="2xl">
      <DialogTitle>Запланировать ремонт</DialogTitle>
      <DialogDescription>
        Создайте новый ремонт, выбрав мастера, юнит и время
      </DialogDescription>
      <DialogBody className="space-y-6">
        {/* Выбор юнита */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Юнит <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full"
          >
            <option value="">Выберите юнит</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </Select>
          {units.length === 0 && (
            <Text className="text-sm text-gray-500 mt-1">
              Нет доступных юнитов
            </Text>
          )}
        </div>

        {/* Выбор мастера */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Мастер <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedMaster}
            onChange={(e) => setSelectedMaster(e.target.value)}
            className="w-full"
            disabled={mastersLoading}
          >
            <option value="">
              {mastersLoading ? 'Загрузка...' : 'Выберите мастера'}
            </option>
            {activeMasters.map((master: any) => (
              <option key={master.id} value={master.id}>
                {master.firstName} {master.lastName}
                {master.rating ? ` ⭐ ${master.rating.toFixed(1)}` : ''}
              </option>
            ))}
          </Select>
          {!mastersLoading && activeMasters.length === 0 && (
            <Text className="text-sm text-gray-500 mt-1">
              Нет активных мастеров. Добавьте мастеров в системе.
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

        {/* Заметки */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Заметки
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Описание проблемы или дополнительные инструкции..."
            rows={3}
            className="w-full"
          />
        </div>

        {/* Информация о чеклисте */}
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <Heading level={4} className="text-orange-900 dark:text-orange-100 mb-2">
            ℹ️ Чеклист ремонта
          </Heading>
          <Text className="text-sm text-orange-800 dark:text-orange-200">
            Будет создан чеклист для осмотра и результата ремонта. Вы сможете отмечать выполнение 
            каждого пункта во время ремонта.
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
          disabled={scheduleRepairMutation.isPending}
          className="bg-black hover:bg-gray-800 text-white border-gray-600"
        >
          {scheduleRepairMutation.isPending ? 'Создание...' : 'Запланировать ремонт'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

