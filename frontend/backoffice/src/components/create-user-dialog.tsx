'use client'

import { useState } from 'react'
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { useMutation } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'
import { gql } from 'graphql-request'

// GraphQL мутация для создания пользователя
const CREATE_USER = gql`
  mutation CreateUser($input: CreateIAMUserInput!) {
    createIAMUser(input: $input) {
      id
      email
      name
      systemRoles
      status
      createdAt
    }
  }
`

interface CreateUserDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  orgId?: string
}

const AVAILABLE_ROLES = [
  { value: 'USER', label: 'Пользователь', description: 'Базовый доступ к системе' },
  { value: 'MANAGER', label: 'Менеджер', description: 'Доступ к управлению' },
  { value: 'ADMIN', label: 'Администратор', description: 'Полный доступ к системе' },
  { value: 'SUPER_ADMIN', label: 'Супер-админ', description: 'Неограниченный доступ' }
]

export function CreateUserDialog({ isOpen, onClose, onSuccess, orgId }: CreateUserDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    selectedRoles: ['USER'] as string[]
  })
  const [error, setError] = useState<string | null>(null)

  const createUserMutation = useMutation({
    mutationFn: async (input: any) => {
      return await graphqlClient.request(CREATE_USER, {
        input: {
          email: input.email,
          name: input.name,
          password: input.password,
          systemRoles: input.selectedRoles,
          orgId: orgId // Передаем ID организации
        }
      })
    },
    onSuccess: () => {
      // Сброс формы
      setFormData({
        email: '',
        name: '',
        password: '',
        confirmPassword: '',
        selectedRoles: ['USER']
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

    if (formData.selectedRoles.length === 0) {
      setError('Выберите хотя бы одну роль')
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

  const toggleRole = (role: string) => {
    setFormData(prev => {
      const hasRole = prev.selectedRoles.includes(role)
      const newRoles = hasRole
        ? prev.selectedRoles.filter(r => r !== role)
        : [...prev.selectedRoles, role]
      
      // Всегда оставляем хотя бы одну роль
      return {
        ...prev,
        selectedRoles: newRoles.length > 0 ? newRoles : ['USER']
      }
    })
    setError(null)
  }

  const handleClose = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
      selectedRoles: ['USER']
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

          {/* Роли */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Роли пользователя *
            </label>
            <div className="space-y-2">
              {AVAILABLE_ROLES.map((role) => {
                const isSelected = formData.selectedRoles.includes(role.value)
                return (
                  <div 
                    key={role.value} 
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' 
                        : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                    onClick={() => toggleRole(role.value)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRole(role.value)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{role.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{role.description}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <Badge 
                        color={role.value === 'ADMIN' || role.value === 'SUPER_ADMIN' ? 'orange' : 'blue'}
                      >
                        Выбрано
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Можно выбрать несколько ролей
            </Text>
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

