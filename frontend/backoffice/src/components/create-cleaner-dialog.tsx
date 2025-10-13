'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from './dialog'
import { Button } from './button'
import { Input } from './input'
import { Heading } from './heading'
import { Text } from './text'
import { Select } from './select'
import { graphqlClient } from '@/lib/graphql-client'
import { CREATE_CLEANER, GET_USERS } from '@/lib/graphql-queries'

interface CreateCleanerDialogProps {
  isOpen: boolean
  onClose: () => void
  orgId: string
}

export function CreateCleanerDialog({
  isOpen,
  onClose,
  orgId
}: CreateCleanerDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  
  const queryClient = useQueryClient()

  // Получить пользователей организации
  const { data: usersData, isLoading: usersLoading } = useQuery<any>({
    queryKey: ['users'],
    queryFn: () => graphqlClient.request(GET_USERS, {
      first: 100
    }),
    enabled: isOpen
  })

  // Мутация для создания уборщика
  const createCleanerMutation = useMutation({
    mutationFn: (input: any) => graphqlClient.request(CREATE_CLEANER, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaners'] })
      handleClose()
    },
    onError: (error: any) => {
      alert(`Ошибка при создании уборщика: ${error.message || 'Неизвестная ошибка'}`)
    }
  })

  const handleClose = () => {
    setSelectedUserId('')
    setFirstName('')
    setLastName('')
    setPhone('')
    setEmail('')
    onClose()
  }

  const handleCreate = async () => {
    if (!selectedUserId) {
      alert('Выберите пользователя из системы')
      return
    }

    if (!firstName.trim()) {
      alert('Введите имя')
      return
    }

    if (!lastName.trim()) {
      alert('Введите фамилию')
      return
    }

    const input = {
      userId: selectedUserId,
      orgId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined
    }

    createCleanerMutation.mutate(input)
  }

  const users = usersData?.users?.edges?.map((edge: any) => edge.node) || []

  return (
    <Dialog open={isOpen} onClose={handleClose} size="2xl">
      <DialogTitle>Создать уборщика</DialogTitle>
      <DialogDescription>
        Добавьте нового уборщика в систему. Уборщик должен быть связан с существующим пользователем.
      </DialogDescription>
      <DialogBody className="space-y-6">
        {/* Информационный блок */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <Heading level={4} className="text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Как это работает
          </Heading>
          <Text className="text-sm text-blue-800 dark:text-blue-200">
            Уборщик - это профиль, который связывается с пользователем системы. 
            Сначала нужно создать пользователя через страницу IAM, 
            затем создать для него профиль уборщика здесь.
          </Text>
        </div>

        {/* Выбор пользователя */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Пользователь <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full"
            disabled={usersLoading}
          >
            <option value="">
              {usersLoading ? 'Загрузка пользователей...' : 'Выберите пользователя'}
            </option>
            {users.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.email || user.username || user.id}
              </option>
            ))}
          </Select>
          {!usersLoading && users.length === 0 && (
            <Text className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
              ⚠️ Нет пользователей. Сначала создайте пользователя на странице IAM (/iam)
            </Text>
          )}
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

        {/* Примечание */}
        <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg">
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Примечание:</strong> После создания уборщик будет активен (isActive: true) 
            и сможет получать назначения на уборки. Рейтинг уборщика рассчитывается 
            автоматически на основе завершенных уборок.
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
          onClick={handleCreate}
          disabled={createCleanerMutation.isPending}
          className="bg-black hover:bg-gray-800 text-white border-gray-600"
        >
          {createCleanerMutation.isPending ? 'Создание...' : 'Создать уборщика'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

