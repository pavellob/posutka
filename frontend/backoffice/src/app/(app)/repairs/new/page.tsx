'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { GET_MASTERS, GET_PROPERTIES_BY_ORG, GET_UNITS_BY_PROPERTY, GET_REPAIR_TEMPLATES, SCHEDULE_REPAIR } from '@/lib/graphql-queries'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

function NewRepairPageContent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const orgId = currentOrgId

  const [selectedProperty, setSelectedProperty] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [selectedMaster, setSelectedMaster] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [notes, setNotes] = useState('')
  const [isPlannedInspection, setIsPlannedInspection] = useState(false)

  // Запрос свойств
  const { data: propertiesData } = useQuery<any>({
    queryKey: ['properties', orgId],
    queryFn: () => graphqlClient.request(GET_PROPERTIES_BY_ORG, { orgId: orgId! }),
    enabled: !!orgId
  })

  // Запрос юнитов выбранного свойства
  const { data: unitsData } = useQuery<any>({
    queryKey: ['units', selectedProperty],
    queryFn: () => graphqlClient.request(GET_UNITS_BY_PROPERTY, { propertyId: selectedProperty }),
    enabled: !!selectedProperty
  })

  // Запрос мастеров
  const { data: mastersData } = useQuery<any>({
    queryKey: ['masters', orgId],
    queryFn: () => graphqlClient.request(GET_MASTERS, {
      orgId: orgId!,
      first: 100
    }),
    enabled: !!orgId
  })

  // Запрос шаблонов планового осмотра для выбранного юнита
  const { data: repairTemplatesData } = useQuery<any>({
    queryKey: ['repairTemplates', selectedUnit],
    queryFn: () => graphqlClient.request(GET_REPAIR_TEMPLATES, { unitId: selectedUnit }),
    enabled: !!selectedUnit && isPlannedInspection
  })

  // Мутация для создания ремонта
  const scheduleRepairMutation = useMutation({
    mutationFn: (input: any) => graphqlClient.request(SCHEDULE_REPAIR, { input }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] })
      const repairId = data?.scheduleRepair?.id
      if (repairId) {
        router.push(`/repairs/${repairId}`)
      } else {
        router.push('/repairs')
      }
    },
    onError: (error: any) => {
      alert(`Ошибка при создании ремонта: ${error.message || 'Неизвестная ошибка'}`)
    }
  })

  const properties = propertiesData?.propertiesByOrgId || []
  const units = unitsData?.unitsByPropertyId || []
  const masters = mastersData?.masters?.edges?.map((edge: any) => edge.node) || []
  const activeMasters = masters.filter((m: any) => m.isActive)

  // Получаем сегодняшнюю дату для min атрибута
  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
      orgId: orgId!,
      masterId: selectedMaster,
      unitId: selectedUnit,
      isPlannedInspection,
      scheduledAt,
      notes: notes || undefined,
    }

    scheduleRepairMutation.mutate(input)
  }

  if (orgLoading || !orgId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Text>Загрузка организации...</Text>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Кнопка назад */}
      <Button
        onClick={() => router.push('/repairs')}
        className="mb-4"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Назад к списку ремонтов
      </Button>

      <Heading level={1}>Создать новый ремонт</Heading>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Выбор свойства */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Объект <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedProperty}
            onChange={(e) => {
              setSelectedProperty(e.target.value)
              setSelectedUnit('') // Сбрасываем выбор юнита при смене свойства
            }}
            className="w-full"
          >
            <option value="">Выберите объект</option>
            {properties.map((property: any) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </Select>
        </div>

        {/* Выбор юнита */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Юнит <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full"
            disabled={!selectedProperty}
          >
            <option value="">
              {!selectedProperty ? 'Сначала выберите объект' : 'Выберите юнит'}
            </option>
            {units.map((unit: any) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </Select>
          {selectedProperty && units.length === 0 && (
            <Text className="text-sm text-gray-500 mt-1">
              Нет доступных юнитов в этом объекте
            </Text>
          )}
        </div>

        {/* Выбор типа ремонта */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Тип ремонта <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="repairType"
                checked={isPlannedInspection}
                onChange={() => setIsPlannedInspection(true)}
                className="w-4 h-4"
              />
              <span>Плановый осмотр (использует шаблон)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="repairType"
                checked={!isPlannedInspection}
                onChange={() => setIsPlannedInspection(false)}
                className="w-4 h-4"
              />
              <span>Кастомный ремонт (пустой чеклист)</span>
            </label>
          </div>
          {isPlannedInspection && selectedUnit && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              {repairTemplatesData?.repairTemplates?.length > 0 ? (
                <div>
                  <Text className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    📋 Найден шаблон планового осмотра
                  </Text>
                  <Text className="text-sm text-blue-800 dark:text-blue-200">
                    {repairTemplatesData.repairTemplates[0].name}
                    {repairTemplatesData.repairTemplates[0].checklistItems?.length > 0 && (
                      <span> ({repairTemplatesData.repairTemplates[0].checklistItems.length} пунктов)</span>
                    )}
                  </Text>
                </div>
              ) : (
                <Text className="text-sm text-blue-800 dark:text-blue-200">
                  ⚠️ Шаблон планового осмотра для этого юнита не найден. Будет создан ремонт с пустым чеклистом.
                </Text>
              )}
            </div>
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
          >
            <option value="">Выберите мастера</option>
            {activeMasters.map((master: any) => (
              <option key={master.id} value={master.id}>
                {master.firstName} {master.lastName}
                {master.rating ? ` ⭐ ${master.rating.toFixed(1)}` : ''}
              </option>
            ))}
          </Select>
          {activeMasters.length === 0 && (
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
              required
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
              required
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
            rows={4}
            className="w-full"
          />
        </div>

        {/* Информация о чеклисте */}
        {!isPlannedInspection && (
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <Heading level={4} className="text-orange-900 dark:text-orange-100 mb-2">
              ℹ️ Чеклист ремонта
            </Heading>
            <Text className="text-sm text-orange-800 dark:text-orange-200">
              Будет создан пустой чеклист для осмотра и результата ремонта. Вы сможете добавлять пункты 
              и отмечать выполнение каждого пункта во время ремонта.
            </Text>
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
          <Button
            type="button"
            onClick={() => router.push('/repairs')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-gray-300 dark:border-zinc-600"
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={scheduleRepairMutation.isPending}
            className="bg-black hover:bg-gray-800 text-white border-gray-600"
          >
            {scheduleRepairMutation.isPending ? 'Создание...' : 'Создать ремонт'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewRepairPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <NewRepairPageContent />
    </Suspense>
  )
}

