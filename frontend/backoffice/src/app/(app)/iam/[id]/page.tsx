'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Divider } from '@/components/divider'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/dialog'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Fieldset, Field, Label } from '@/components/fieldset'
import { UserActivityFeed } from '@/components/user-activity-feed'
import { NotificationSettings } from '@/components/notification-settings'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { graphqlClient } from '@/lib/graphql-client'
import { gql } from 'graphql-request'
import { useEffect } from 'react'
import {
  ArrowLeftIcon,
  UserCircleIcon,
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

// GraphQL запросы
const GET_USER_BY_ID = gql`
  query GetUserById($id: UUID!) {
    user(id: $id) {
      id
      email
      name
      phoneNumber
      emailVerified
      status
      systemRoles
      isLocked
      lastLoginAt
      createdAt
      updatedAt
      organizations {
        id
        name
      }
    }
  }
`

const LOCK_USER = gql`
  mutation LockUser($userId: UUID!, $reason: String!) {
    lockUser(userId: $userId, reason: $reason)
  }
`

const UNLOCK_USER = gql`
  mutation UnlockUser($userId: UUID!) {
    unlockUser(userId: $userId)
  }
`

const UPDATE_USER = gql`
  mutation UpdateUser($id: UUID!, $input: UpdateIAMUserInput!) {
    updateIAMUser(id: $id, input: $input) {
      id
      email
      name
      phoneNumber
      status
      systemRoles
      isLocked
      updatedAt
    }
  }
`


type UserDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

export default function UserDetailsPage(props: UserDetailsPageProps) {
  const params = use(props.params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { currentOrgId } = useCurrentOrganization()
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'notifications'>('profile')
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false)
  const [lockReason, setLockReason] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    status: 'ACTIVE',
    systemRoles: [] as string[]
  })
  const [hasChanges, setHasChanges] = useState(false)

  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['user', params.id],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_USER_BY_ID, { 
        id: params.id 
      }) as any
      return response.user
    },
    enabled: !!params.id
  })

  // Инициализация формы при загрузке данных
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        phoneNumber: userData.phoneNumber || '',
        status: userData.status || 'ACTIVE',
        systemRoles: userData.systemRoles || ['USER']
      })
    }
  }, [userData])

  const updateUserMutation = useMutation({
    mutationFn: async (input: any) => {
      return await graphqlClient.request(UPDATE_USER, {
        id: params.id,
        input
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', params.id] })
      setHasChanges(false)
    }
  })

  const handleSaveChanges = () => {
    updateUserMutation.mutate({
      name: formData.name,
      phoneNumber: formData.phoneNumber || null,
      status: formData.status,
      systemRoles: formData.systemRoles
    })
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const toggleRole = (role: string) => {
    setFormData(prev => {
      const hasRole = prev.systemRoles.includes(role)
      const newRoles = hasRole
        ? prev.systemRoles.filter(r => r !== role)
        : [...prev.systemRoles, role]
      
      setHasChanges(true)
      return {
        ...prev,
        systemRoles: newRoles.length > 0 ? newRoles : ['USER']
      }
    })
  }

  const lockMutation = useMutation({
    mutationFn: async (reason: string) => {
      return await graphqlClient.request(LOCK_USER, { 
        userId: params.id,
        reason 
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', params.id] })
      setIsLockDialogOpen(false)
      setLockReason('')
    }
  })

  const unlockMutation = useMutation({
    mutationFn: async () => {
      return await graphqlClient.request(UNLOCK_USER, { userId: params.id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', params.id] })
    }
  })

  const handleLockSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!lockReason.trim()) return
    lockMutation.mutate(lockReason)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <Text>Загрузка данных пользователя...</Text>
        </div>
      </div>
    )
  }

  if (error || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <Heading level={2} className="mb-2">Пользователь не найден</Heading>
          <Text className="text-zinc-600 dark:text-zinc-400 mb-6">
            Пользователь с ID {params.id} не существует
          </Text>
          <Button onClick={() => router.push('/iam')}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Вернуться к списку
          </Button>
        </div>
      </div>
    )
  }


  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин назад`
    if (diffHours < 24) return `${diffHours} ч назад`
    if (diffDays < 7) return `${diffDays} дн назад`
    return formatDate(dateString)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'lime'
      case 'INACTIVE': return 'zinc'
      case 'PENDING': return 'amber'
      default: return 'zinc'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Активен'
      case 'INACTIVE': return 'Неактивен'
      case 'PENDING': return 'Ожидает'
      default: return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button outline onClick={() => router.push('/iam')}>
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <Heading level={1}>Профиль сотрудника</Heading>
          <Text className="text-zinc-600 dark:text-zinc-400">
            Детальная информация о пользователе
          </Text>
        </div>
      </div>

      {/* User Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-8 border border-blue-100 dark:border-blue-800">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-white">
              {userData.name?.charAt(0).toUpperCase() || userData.email.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Heading level={2} className="text-2xl">
                {userData.name || 'Без имени'}
              </Heading>
              <Badge color={getStatusColor(userData.status)}>
                {getStatusText(userData.status)}
              </Badge>
              {userData.isLocked && (
                <Badge color="red">
                  <LockClosedIcon className="w-4 h-4 mr-1" />
                  Заблокирован
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4" />
                {userData.email}
              </div>
              {userData.phoneNumber && (
                <div className="flex items-center gap-2">
                  📱 {userData.phoneNumber}
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Создан {formatRelativeTime(userData.createdAt)}
              </div>
              {userData.lastLoginAt && (
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  Последний вход {formatRelativeTime(userData.lastLoginAt)}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full md:w-auto">
            {userData.isLocked ? (
              <Button 
                outline
                className="w-full md:w-auto text-green-600 border-green-300 hover:bg-green-50"
                onClick={() => unlockMutation.mutate()}
                disabled={unlockMutation.isPending}
              >
                <KeyIcon className="w-4 h-4 mr-2" />
                {unlockMutation.isPending ? 'Разблокировка...' : 'Разблокировать'}
              </Button>
            ) : (
              <Button 
                outline
                className="w-full md:w-auto text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setIsLockDialogOpen(true)}
              >
                <LockClosedIcon className="w-4 h-4 mr-2" />
                Заблокировать
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Профиль
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Активность
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Уведомления
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <form className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info - Editable */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <Subheading className="mb-4">Основная информация</Subheading>
              <Fieldset>
                <div className="space-y-4">
                  <Field>
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="email"
                        value={userData?.email || ''}
                        disabled
                        className="bg-zinc-50 dark:bg-zinc-800"
                      />
                      {userData?.emailVerified && (
                        <Badge color="lime" className="text-xs">✓</Badge>
                      )}
                    </div>
                  </Field>
                  <Field>
                    <Label htmlFor="name">Имя *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Введите имя..."
                      required
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="phoneNumber">Телефон</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      placeholder="+7 999 123-45-67"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="status">Статус</Label>
                    <Select
                      id="status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                    >
                      <option value="ACTIVE">Активен</option>
                      <option value="INACTIVE">Неактивен</option>
                      <option value="SUSPENDED">Заблокирован</option>
                      <option value="DELETED">Удален</option>
                    </Select>
                  </Field>
                </div>
              </Fieldset>
            </div>

          {/* Organizations */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4 flex items-center gap-2">
              <BuildingOfficeIcon className="w-5 h-5" />
              Организации
            </Subheading>
            <div className="space-y-3">
              {userData.organizations && userData.organizations.length > 0 ? (
                userData.organizations.map((org: any) => (
                  <div
                    key={org.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
                  >
                    <Text className="font-medium">{org.name}</Text>
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400">{org.id}</Text>
                  </div>
                ))
              ) : (
                <Text className="text-zinc-500 dark:text-zinc-400">Не состоит в организациях</Text>
              )}
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4">Системная информация</Subheading>
            <div className="space-y-4">
              <div>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">ID пользователя</Text>
                <Text className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded break-all">
                  {userData.id}
                </Text>
              </div>
              <div>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Дата создания</Text>
                <Text className="font-medium">{formatDate(userData.createdAt)}</Text>
              </div>
              <div>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Последнее обновление</Text>
                <Text className="font-medium">{formatDate(userData.updatedAt)}</Text>
              </div>
              {userData.lastLoginAt && (
                <div>
                  <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Последний вход</Text>
                  <Text className="font-medium">{formatDate(userData.lastLoginAt)}</Text>
                </div>
              )}
            </div>
          </div>

          {/* Roles - Editable */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading className="mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5" />
              Системные роли
            </Subheading>
            <div className="space-y-2">
              {['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'CLEANER', 'USER', 'GUEST'].map((role) => {
                const isSelected = formData.systemRoles.includes(role)
                const roleLabels: Record<string, string> = {
                  'SUPER_ADMIN': 'Супер-администратор',
                  'ADMIN': 'Администратор',
                  'MANAGER': 'Менеджер',
                  'OPERATOR': 'Оператор',
                  'CLEANER': 'Уборщик',
                  'USER': 'Пользователь',
                  'GUEST': 'Гость'
                }
                return (
                  <div 
                    key={role} 
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                    onClick={() => toggleRole(role)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRole(role)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <Text className="font-medium">{roleLabels[role]}</Text>
                    </div>
                    {isSelected && (
                      <Badge color="blue" className="text-xs">✓</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          </form>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex justify-end gap-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <Button 
                outline
                onClick={() => {
                  setFormData({
                    name: userData?.name || '',
                    phoneNumber: userData?.phoneNumber || '',
                    status: userData?.status || 'ACTIVE',
                    systemRoles: userData?.systemRoles || ['USER']
                  })
                  setHasChanges(false)
                }}
              >
                Отменить
              </Button>
              <Button 
                onClick={handleSaveChanges}
                disabled={updateUserMutation.isPending || !formData.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateUserMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <Subheading className="mb-6">История активности и связанные сущности</Subheading>
          <UserActivityFeed userId={params.id} orgId={currentOrgId || 'petroga'} />
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <NotificationSettings userId={params.id} />
        </div>
      )}

      {/* Lock User Dialog */}
      <Dialog open={isLockDialogOpen} onClose={() => setIsLockDialogOpen(false)}>
        <DialogTitle>Заблокировать пользователя</DialogTitle>
        <DialogDescription>
          Укажите причину блокировки пользователя {userData?.name || userData?.email}
        </DialogDescription>
        
        <form onSubmit={handleLockSubmit}>
          <DialogBody>
            <Fieldset>
              <Field>
                <Label htmlFor="lockReason">Причина блокировки *</Label>
                <Textarea
                  id="lockReason"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="Укажите причину блокировки..."
                  rows={3}
                  required
                />
              </Field>
            </Fieldset>
          </DialogBody>

          <DialogActions>
            <Button 
              outline 
              onClick={() => setIsLockDialogOpen(false)}
              disabled={lockMutation.isPending}
            >
              Отмена
            </Button>
            <Button 
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={lockMutation.isPending || !lockReason.trim()}
            >
              {lockMutation.isPending ? 'Блокировка...' : 'Заблокировать'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

    </div>
  )
}

