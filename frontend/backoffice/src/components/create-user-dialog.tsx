'use client'

import { useState } from 'react'
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Text } from '@/components/text'
import { useMutation } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'
import { gql } from 'graphql-request'

// GraphQL мутации
const CREATE_USER = gql`
  mutation CreateUser($input: CreateIAMUserInput!) {
    createIAMUser(input: $input) {
      id
      email
      name
      status
      createdAt
    }
  }
`

const ADD_MEMBER = gql`
  mutation AddMember($input: AddMemberInput!) {
    addMember(input: $input) {
      id
      role
      createdAt
      organization {
        id
        name
      }
    }
  }
`

interface CreateUserDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  orgId?: string
}

export function CreateUserDialog({ isOpen, onClose, onSuccess, orgId }: CreateUserDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    assignToOrg: false,
    role: 'STAFF' as 'OWNER' | 'MANAGER' | 'STAFF' | 'CLEANER' | 'OPERATOR'
  })
  const [error, setError] = useState<string | null>(null)

  const createUserMutation = useMutation({
    mutationFn: async (input: typeof formData) => {
      const response = await graphqlClient.request(CREATE_USER, {
        input: {
          email: input.email,
          name: input.name,
          password: input.password,
        },
      }) as any

      const user = response.createIAMUser

      if (input.assignToOrg) {
        if (!orgId) {
          throw new Error('Текущая организация не выбрана, невозможно назначить роль')
        }

        await graphqlClient.request(ADD_MEMBER, {
          input: {
            userId: user.id,
            orgId,
            role: input.role,
          },
        })
      }

      return user
    },
    onSuccess: () => {
      // Сброс формы
      setFormData({
        email: '',
        name: '',
        password: '',
        confirmPassword: '',
        assignToOrg: false,
        role: 'STAFF'
      })
      setError(null)
      onSuccess()
      onClose()
    },
    onError: (error: any) => {
      console.error('Ошибка при создании пользователя:', error)
      const errorMessage = error?.response?.errors?.[0]?.message || error?.message || 'Не удалось создать пользователя'
      setError(errorMessage)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Валидация
    if (!formData.email.trim()) {
      setError('Введите email адрес')
      return
    }

    if (!formData.email.includes('@')) {
      setError('Введите корректный email адрес')
      return
    }

    if (!formData.name.trim()) {
      setError('Введите имя сотрудника')
      return
    }

    if (!formData.password) {
      setError('Введите пароль')
      return
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    createUserMutation.mutate(formData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const handleClose = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
      assignToOrg: false,
      role: 'STAFF'
    })
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      <DialogTitle>Добавить нового сотрудника</DialogTitle>
      <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email адрес *
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="example@company.com"
              required
              autoComplete="email"
            />
            <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Используется для входа в систему
            </Text>
          </div>

          {/* Имя */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Имя сотрудника *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Иван Иванов"
              required
              autoComplete="name"
            />
          </div>

          {/* Пароль */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Пароль *
            </label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Минимум 6 символов"
              required
              autoComplete="new-password"
            />
          </div>

          {/* Подтверждение пароля */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Подтвердите пароль *
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="Повторите пароль"
              required
              autoComplete="new-password"
            />
          </div>

          {/* Добавление в организацию */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Назначение в текущую организацию
            </label>
            <div className="flex items-center gap-3">
              <input
                id="assignToOrg"
                type="checkbox"
                checked={formData.assignToOrg}
                onChange={(e) => handleChange('assignToOrg', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={!orgId}
              />
              <label htmlFor="assignToOrg" className="text-sm text-gray-700 dark:text-gray-300">
                Добавить пользователя в текущую организацию
              </label>
            </div>
            {!orgId && (
              <Text className="text-xs text-yellow-600 dark:text-yellow-400">
                Выберите организацию, чтобы назначать пользователей на неё.
              </Text>
            )}
            {formData.assignToOrg && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Роль в организации
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    handleChange('role', e.target.value as typeof formData.role)
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring"
                >
                  <option value="OWNER">Владелец</option>
                  <option value="MANAGER">Менеджер</option>
                  <option value="STAFF">Сотрудник</option>
                  <option value="CLEANER">Уборщик</option>
                  <option value="OPERATOR">Оператор</option>
                </select>
                <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Роль определяет доступ пользователя внутри организации.
                </Text>
              </div>
            )}
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <Text className="text-red-800 dark:text-red-200 text-sm">{error}</Text>
            </div>
          )}

          {/* Кнопки действий */}
          <DialogActions>
            <Button
              type="button"
              onClick={handleClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-gray-300 dark:border-zinc-600"
              disabled={createUserMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="bg-black hover:bg-gray-800 text-white border-gray-600"
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? 'Создание...' : 'Создать сотрудника'}
            </Button>
          </DialogActions>
        </form>
      </DialogBody>
    </Dialog>
  )
}

