'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from './dialog'
import { Button } from './button'
import { Input } from './input'
import { Heading } from './heading'
import { Text } from './text'
import { Badge } from './badge'
import { PlusIcon, MinusIcon, BuildingOfficeIcon, HomeModernIcon } from '@heroicons/react/24/outline'
import { graphqlClient } from '@/lib/graphql-client'
import { 
  UPDATE_CLEANER, 
  GET_CLEANER,
  GET_PROPERTIES_BY_ORG,
  GET_UNITS_BY_PROPERTY,
  GET_UNIT_PREFERRED_CLEANERS,
  ADD_PREFERRED_CLEANER,
  REMOVE_PREFERRED_CLEANER
} from '@/lib/graphql-queries'

interface EditCleanerDialogProps {
  isOpen: boolean
  onClose: () => void
  cleanerId: string | null
  orgId: string
}

export function EditCleanerDialog({
  isOpen,
  onClose,
  cleanerId,
  orgId
}: EditCleanerDialogProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [rating, setRating] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  
  const queryClient = useQueryClient()

  // Получить данные уборщика
  const { data: cleanerData, isLoading } = useQuery<any>({
    queryKey: ['cleaner', cleanerId],
    queryFn: () => graphqlClient.request(GET_CLEANER, { id: cleanerId }),
    enabled: isOpen && !!cleanerId
  })

  // Загрузить данные в форму
  useEffect(() => {
    if (cleanerData?.cleaner) {
      const cleaner = cleanerData.cleaner
      setFirstName(cleaner.firstName || '')
      setLastName(cleaner.lastName || '')
      setPhone(cleaner.phone || '')
      setEmail(cleaner.email || '')
      setRating(cleaner.rating ? cleaner.rating.toString() : '')
    }
  }, [cleanerData])

  // Мутация для обновления уборщика
  const updateCleanerMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => 
      graphqlClient.request(UPDATE_CLEANER, { id, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaners'] })
      queryClient.invalidateQueries({ queryKey: ['cleaner', cleanerId] })
      handleClose()
    },
    onError: (error: any) => {
      alert(`Ошибка при обновлении уборщика: ${error.message || 'Неизвестная ошибка'}`)
    }
  })

  // Получаем список объектов организации
  const { data: propertiesData, isLoading: propertiesLoading } = useQuery<any>({
    queryKey: ['properties', orgId],
    queryFn: () => graphqlClient.request(GET_PROPERTIES_BY_ORG, { orgId }),
    enabled: isOpen && !!orgId
  })

  const properties = propertiesData?.propertiesByOrgId || []

  // Получаем все юниты для организации (агрегируем по объектам)
  const { data: unitsData, isLoading: unitsLoading } = useQuery<any>({
    queryKey: ['all-units-by-org', orgId, properties.map((p: any) => p.id).join(',')],
    queryFn: async () => {
      if (properties.length === 0) return []

      const results = await Promise.all(
        properties.map((property: any) =>
          graphqlClient.request(GET_UNITS_BY_PROPERTY, { propertyId: property.id })
        )
      )

      return results.flatMap((res: any) => res.unitsByPropertyId || [])
    },
    enabled: isOpen && !!orgId && properties.length > 0
  })

  const allUnits = unitsData || []

  // Получаем список квартир, к которым уже привязан уборщик
  const { data: preferredUnitIds = [], isLoading: preferredUnitsLoading, refetch: refetchPreferredUnits } = useQuery<string[]>({
    queryKey: ['preferred-units-by-cleaner', cleanerId, allUnits.map((u: any) => u.id).join(',')],
    queryFn: async () => {
      if (!cleanerId) return []
      if (allUnits.length === 0) return []

      const results = await Promise.all(
        allUnits.map(async (unit: any) => {
          const res = await graphqlClient.request(GET_UNIT_PREFERRED_CLEANERS, { unitId: unit.id }) as any
          const hasCleaner = (res.unitPreferredCleaners || []).some(
            (pref: any) => pref.cleaner.id === cleanerId
          )
          return hasCleaner ? unit.id : null
        })
      )

      return results.filter(Boolean) as string[]
    },
    enabled: isOpen && !!cleanerId && allUnits.length > 0
  })

  const togglePreferredCleaner = useMutation({
    mutationFn: async ({ unitId, shouldAdd }: { unitId: string; shouldAdd: boolean }) => {
      if (!cleanerId) return null
      if (shouldAdd) {
        return await graphqlClient.request(ADD_PREFERRED_CLEANER, { unitId, cleanerId })
      }
      return await graphqlClient.request(REMOVE_PREFERRED_CLEANER, { unitId, cleanerId })
    },
    onSuccess: () => {
      refetchPreferredUnits()
      queryClient.invalidateQueries({ queryKey: ['unitPreferredCleaners'] })
    },
    onError: (error: any) => {
      alert(`Не удалось изменить привязку: ${error.message || 'Неизвестная ошибка'}`)
    }
  })

  const handleToggleUnit = (unitId: string) => {
    const isPreferred = preferredUnitIds.includes(unitId)
    togglePreferredCleaner.mutate({ unitId, shouldAdd: !isPreferred })
  }

  const handleClose = () => {
    setFirstName('')
    setLastName('')
    setPhone('')
    setEmail('')
    setRating('')
    setSearchQuery('')
    setSelectedPropertyId('')
    onClose()
  }

  const handleUpdate = async () => {
    if (!cleanerId) return

    if (!firstName.trim()) {
      alert('Введите имя')
      return
    }

    if (!lastName.trim()) {
      alert('Введите фамилию')
      return
    }

    // Валидация рейтинга
    let ratingValue: number | undefined = undefined
    if (rating.trim()) {
      const parsedRating = parseFloat(rating)
      if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
        alert('Рейтинг должен быть числом от 0 до 5')
        return
      }
      ratingValue = parsedRating
    }

    const input: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    }

    // Добавляем опциональные поля только если они заполнены
    if (phone.trim()) input.phone = phone.trim()
    if (email.trim()) input.email = email.trim()
    if (ratingValue !== undefined) input.rating = ratingValue

    updateCleanerMutation.mutate({ id: cleanerId, input })
  }

  const filteredUnits = useMemo(() => {
    const query = searchQuery.toLowerCase()

    return allUnits.filter((unit: any) => {
      const matchesSearch = `${unit.name} ${unit.property?.title || ''}`.toLowerCase().includes(query)
      const matchesProperty = selectedPropertyId ? unit.property?.id === selectedPropertyId : true
      return matchesSearch && matchesProperty
    })
  }, [allUnits, searchQuery, selectedPropertyId])

  if (isLoading) {
    return (
      <Dialog open={isOpen} onClose={handleClose} size="2xl">
        <DialogTitle>Загрузка...</DialogTitle>
        <DialogBody>
          <Text>Загрузка данных уборщика...</Text>
        </DialogBody>
      </Dialog>
    )
  }

  const cleaner = cleanerData?.cleaner

  return (
    <Dialog open={isOpen} onClose={handleClose} size="5xl">
      <DialogTitle>Редактировать уборщика</DialogTitle>
      <DialogDescription>
        Обновите данные и выберите квартиры, за которые отвечает уборщик
      </DialogDescription>
      <DialogBody className="space-y-8">
        {/* Карточка профиля / быстрые факты */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-black rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {cleaner?.firstName?.charAt(0)}{cleaner?.lastName?.charAt(0)}
              </div>
              <div>
                <Heading level={3} className="text-xl mb-1">
                  {cleaner?.firstName} {cleaner?.lastName}
                </Heading>
                <div className="flex items-center gap-2">
                  <Badge color="zinc">
                    {cleaner?.isActive ? 'Активен' : 'Неактивен'}
                  </Badge>
                  {cleaner?.rating && (
                    <Badge color="zinc">⭐ {cleaner.rating.toFixed(1)}</Badge>
                  )}
                  <Badge color="zinc">ID: {cleanerId?.substring(0, 8)}...</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="zinc">
                {preferredUnitIds.length} квартир прикреплено
              </Badge>
              <Badge color="zinc">
                Всего доступно: {allUnits.length || 0}
              </Badge>
            </div>
          </div>
        </div>

        {/* Форма основных данных */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Имя <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Иван"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Фамилия <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Петров"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Телефон
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cleaner@example.com"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Рейтинг (0.0 - 5.0)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="4.5"
                className="w-full"
              />
              <Text className="text-xs text-gray-500 mt-1">
                Можно изменить вручную или оставить пустым для автоматического расчета
              </Text>
            </div>
          </div>

          {/* Блок о пользователе */}
          <div className="space-y-4">
            <div className="bg-gray-100 dark:bg-zinc-900 p-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                <strong>⚠️</strong> Изменение рейтинга вручную переопределит авторасчёт. Оставьте пустым, чтобы сохранить текущий.
              </Text>
            </div>

            {cleaner?.userId ? (
              <div className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  📱 Связан с пользователем
                </Text>
                <Text className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Настройки уведомлений управляются в профиле пользователя.
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-mono">
                  User ID: {cleaner.userId}
                </Text>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <Text className="text-sm text-gray-700 dark:text-gray-200">
                  <strong>ℹ️ Внешний подрядчик:</strong> уведомления будут отправляться по ID уборщика.
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* Привязка квартир */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Heading level={4} className="mb-1">Квартиры уборщика</Heading>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Добавьте или уберите квартиры. Мультиселект применяется сразу.
              </Text>
            </div>
            <div className="flex items-center gap-2 flex-1 md:flex-none">
              <Input
                type="search"
                placeholder="Поиск по адресу или названию"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64"
              />
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 min-w-[160px]"
              >
                <option value="">Все объекты</option>
                {properties.map((property: any) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto">
            {propertiesLoading || unitsLoading || preferredUnitsLoading ? (
              <div className="col-span-2 text-center py-8">
                <Text className="text-gray-500">Загружаем список квартир...</Text>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="col-span-2 text-center py-8 border border-dashed border-gray-200 dark:border-zinc-700 rounded-lg">
                <Text className="text-gray-500 dark:text-gray-400">
                  Нет квартир по выбранным фильтрам
                </Text>
              </div>
            ) : (
              filteredUnits.map((unit: any) => {
                const isPreferred = preferredUnitIds.includes(unit.id)
                const isLoading = togglePreferredCleaner.isPending

                return (
                  <div
                    key={unit.id}
                    className={`group p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                      isPreferred
                        ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Text className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                            <HomeModernIcon className="w-5 h-5 text-gray-400" />
                            {unit.name}
                          </Text>
                          {isPreferred && <Badge color="zinc">✓ Добавлена</Badge>}
                        </div>
                        <Text className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                          {unit.property?.title || 'Без объекта'}
                        </Text>
                        {unit.property?.address && (
                          <Text className="text-xs text-gray-500 dark:text-gray-500">
                            {unit.property.address}
                          </Text>
                        )}
                      </div>
                      <Button
                        onClick={() => handleToggleUnit(unit.id)}
                        disabled={isLoading}
                        title={isPreferred ? 'Убрать квартиру' : 'Добавить квартиру'}
                        className="group/button h-10 w-10 min-w-[40px] rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 transition-all"
                      >
                        {isPreferred ? (
                          <MinusIcon className="w-4 h-4 opacity-70 group-hover/button:opacity-100" />
                        ) : (
                          <PlusIcon className="w-4 h-4 opacity-70 group-hover/button:opacity-100" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
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
          onClick={handleUpdate}
          disabled={updateCleanerMutation.isPending}
          className="bg-black hover:bg-gray-800 text-white border-gray-600"
        >
          {updateCleanerMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

