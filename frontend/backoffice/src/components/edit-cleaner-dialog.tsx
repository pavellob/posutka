'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from './dialog'
import { Button } from './button'
import { Input } from './input'
import { Heading } from './heading'
import { Text } from './text'
import { graphqlClient } from '@/lib/graphql-client'
import { UPDATE_CLEANER, GET_CLEANER } from '@/lib/graphql-queries'

interface EditCleanerDialogProps {
  isOpen: boolean
  onClose: () => void
  cleanerId: string | null
}

export function EditCleanerDialog({
  isOpen,
  onClose,
  cleanerId
}: EditCleanerDialogProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [rating, setRating] = useState('')
  
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

  const handleClose = () => {
    setFirstName('')
    setLastName('')
    setPhone('')
    setEmail('')
    setRating('')
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
    <Dialog open={isOpen} onClose={handleClose} size="2xl">
      <DialogTitle>Редактировать уборщика</DialogTitle>
      <DialogDescription>
        Обновите информацию об уборщике
      </DialogDescription>
      <DialogBody className="space-y-6">
        {/* Информационный блок */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
              {cleaner?.firstName?.charAt(0)}{cleaner?.lastName?.charAt(0)}
            </div>
            <div>
              <Heading level={4} className="text-blue-900 dark:text-blue-100">
                {cleaner?.firstName} {cleaner?.lastName}
              </Heading>
              <Text className="text-sm text-blue-800 dark:text-blue-200">
                ID: {cleanerId?.substring(0, 8)}...
              </Text>
            </div>
          </div>
        </div>

        {/* Имя */}
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

        {/* Фамилия */}
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

        {/* Телефон */}
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

        {/* Email */}
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

        {/* Рейтинг */}
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

        {/* Примечание */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <Text className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Внимание:</strong> Изменение рейтинга вручную переопределит автоматический расчет. 
            Оставьте поле пустым, чтобы сохранить текущий рейтинг.
          </Text>
        </div>

        {/* Информация о связанном пользователе */}
        {cleaner?.userId && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <Text className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  📱 Настройки уведомлений
                </Text>
                <Text className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                  Этот уборщик связан с пользователем системы.<br />
                  Настройки уведомлений управляются в профиле пользователя.
                </Text>
                <Text className="text-xs text-blue-700 dark:text-blue-300 mt-2 font-mono">
                  User ID: {cleaner.userId}
                </Text>
              </div>
            </div>
          </div>
        )}

        {!cleaner?.userId && (
          <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-lg">
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              <strong>ℹ️ Внешний подрядчик:</strong> Этот уборщик не связан с пользователем системы. 
              Настройки уведомлений будут использовать ID уборщика как userId.
            </Text>
          </div>
        )}
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

