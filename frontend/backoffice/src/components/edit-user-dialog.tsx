'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Fieldset } from '@/components/fieldset'
import { useMutation } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'
import { gql } from 'graphql-request'
import { NotificationSettingsCompact } from '@/components/notification-settings-compact'
import { Divider } from '@/components/divider'

// GraphQL мутация для обновления пользователя
const UPDATE_USER = gql`
  mutation UpdateUser($id: UUID!, $input: UpdateIAMUserInput!) {
    updateIAMUser(id: $id, input: $input) {
      id
      email
      name
      status
      isLocked
      updatedAt
    }
  }
`

interface EditUserDialogProps {
  isOpen: boolean
  onClose: () => void
  user: any
  onSuccess: () => void
}

export function EditUserDialog({ isOpen, onClose, user, onSuccess }: EditUserDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    status: 'ACTIVE'
  })

  // Заполняем форму данными пользователя при открытии
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        status: user.status || 'ACTIVE'
      })
    }
  }, [user])

  const updateUserMutation = useMutation({
    mutationFn: async (input: any) => {
      return await graphqlClient.request(UPDATE_USER, {
        id: user.id,
        input: {
          name: input.name,
          status: input.status
        }
      })
    },
    onSuccess: () => {
      onSuccess()
    },
    onError: (error) => {
      console.error('Ошибка при обновлении пользователя:', error)
      alert('Ошибка при обновлении пользователя')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Введите имя пользователя')
      return
    }

    updateUserMutation.mutate(formData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Редактировать сотрудника</h2>
        
        {/* Информация о пользователе */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{user.name || 'Без имени'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{user.email}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Fieldset>
            <div className="space-y-4">
              {/* Имя */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Имя сотрудника
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Введите имя..."
                  required
                />
              </div>

              {/* Статус */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Статус аккаунта
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="ACTIVE">Активен</option>
                  <option value="INACTIVE">Неактивен</option>
                  <option value="SUSPENDED">Приостановлен</option>
                </Select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Роли теперь назначаются через членства в организациях. Здесь можно изменить только статус аккаунта.
                </p>
              </div>

              {/* Информация о датах */}
              <div className="pt-4 border-t border-gray-200 dark:border-zinc-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Дата создания</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Последний вход</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.lastLoginAt 
                        ? new Date(user.lastLoginAt).toLocaleDateString('ru-RU')
                        : 'Никогда'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Fieldset>

          <Divider className="my-6" soft />

          {/* Настройки уведомлений */}
          <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4">
            <NotificationSettingsCompact userId={user.id} showTitle={true} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-gray-300 dark:border-zinc-600"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              className="bg-black hover:bg-gray-800 text-white border-gray-600"
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}

