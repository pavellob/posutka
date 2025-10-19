'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from './dialog'
import { Button } from './button'
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
    onClose()
  }

  const handleCreate = async () => {
    if (!selectedUserId) {
      alert('Выберите пользователя из системы')
      return
    }

    const input = {
      userId: selectedUserId,
      orgId,
    }

    createCleanerMutation.mutate(input)
  }

  const users = usersData?.users?.edges?.map((edge: any) => edge.node) || []
  const selectedUser = users.find((u: any) => u.id === selectedUserId)

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
            ℹ️ Создание уборщика
          </Heading>
          <Text className="text-sm text-blue-800 dark:text-blue-200">
            Просто выберите пользователя из системы. Все данные (имя, email) будут взяты 
            из профиля пользователя автоматически, и ему будет добавлена роль <strong>CLEANER</strong>.
          </Text>
        </div>

        {/* Выбор пользователя */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Выберите пользователя <span className="text-red-500">*</span>
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
                {user.name || user.email || user.id}
              </option>
            ))}
          </Select>
          {!usersLoading && users.length === 0 && (
            <Text className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
              ⚠️ Нет пользователей. Сначала создайте пользователя на странице IAM (/iam)
            </Text>
          )}
        </div>

        {/* Предпросмотр выбранного пользователя */}
        {selectedUser && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
            <Heading level={4} className="text-green-900 dark:text-green-100 mb-3">
              ✅ Выбранный пользователь
            </Heading>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">Имя:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedUser.name || '(не указано)'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">Email:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedUser.email}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">Роли:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedUser.systemRoles?.join(', ') || 'USER'}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
              <Text className="text-xs text-green-700 dark:text-green-300">
                После создания пользователю будет добавлена роль <strong>CLEANER</strong>
              </Text>
            </div>
          </div>
        )}

        {/* Примечание */}
        <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg">
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            <strong>📝 Что происходит:</strong>
          </Text>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>• Создается запись Cleaner с типом INTERNAL</li>
            <li>• Имя и email берутся из профиля User</li>
            <li>• Пользователю добавляется роль CLEANER</li>
            <li>• Настройки уведомлений берутся из UserNotificationSettings</li>
          </ul>
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

