'use client'

import { use, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Divider } from '@/components/divider'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/dialog'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Fieldset, Field, Label } from '@/components/fieldset'
import { UserActivityFeed } from '@/components/user-activity-feed'
import { NotificationSettings } from '@/components/notification-settings'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { graphqlClient } from '@/lib/graphql-client'
import { gql } from 'graphql-request'
import { useEffect } from 'react'
import { Switch, SwitchField } from '@/components/switch'
import {
  ArrowLeftIcon,
  UserCircleIcon,
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon,
  LockClosedIcon,
  BuildingOfficeIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

// GraphQL запросы
const GET_USER_BY_ID = gql`
  query GetUserById($id: UUID!) {
    user(id: $id) {
      id
      email
      name
      emailVerified
      status
      isLocked
      lastLoginAt
      createdAt
      updatedAt
      memberships {
        id
        role
        organization {
          id
          name
        }
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
      status
      isLocked
      updatedAt
    }
  }
`

const ADD_MEMBER = gql`
  mutation AddMember($input: AddMemberInput!) {
    addMember(input: $input) {
      id
      role
      user {
        id
      }
    }
  }
`

const UPDATE_MEMBER_ROLE = gql`
  mutation UpdateMemberRole($input: UpdateMemberRoleInput!) {
    updateMemberRole(input: $input) {
      id
      role
      user {
        id
      }
    }
  }
`

const REMOVE_MEMBER = gql`
  mutation RemoveMember($membershipId: UUID!) {
    removeMember(membershipId: $membershipId)
  }
`


type UserDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

const tabs = ['profile', 'activity', 'notifications'] as const
type Tab = typeof tabs[number]

export default function UserDetailsPage(props: UserDetailsPageProps) {
  const params = use(props.params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { currentOrgId, currentOrganization } = useCurrentOrganization()
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get('tab')
    return tabs.includes(tabParam as Tab) ? (tabParam as Tab) : 'profile'
  })
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false)
  const [lockReason, setLockReason] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    status: 'ACTIVE',
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<Array<'OWNER' | 'MANAGER' | 'STAFF' | 'CLEANER' | 'MASTER' | 'OPERATOR'>>([])

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
        status: userData.status || 'ACTIVE',
      })
    }
  }, [userData])

  // Инициализация ролей из текущей организации
  useEffect(() => {
    if (userData?.memberships && currentOrgId) {
      const currentOrgMemberships = userData.memberships.filter(
        (m: any) => m.organization?.id === currentOrgId
      )
      const roles = currentOrgMemberships.map((m: any) => m.role as 'OWNER' | 'MANAGER' | 'STAFF' | 'CLEANER' | 'MASTER' | 'OPERATOR')
      setSelectedRoles(roles)
    } else {
      setSelectedRoles([])
    }
  }, [userData, currentOrgId])

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && tabs.includes(tabParam as Tab) && tabParam !== activeTab) {
      setActiveTab(tabParam as Tab)
    }
  }, [searchParams, activeTab])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set('tab', tab)
    const queryString = newParams.toString()
    const targetUrl = queryString ? `/iam/${params.id}?${queryString}` : `/iam/${params.id}`
    router.replace(targetUrl, { scroll: false })
  }

  const updateUserMutation = useMutation({
    mutationFn: async (input: any) => {
      return await graphqlClient.request(UPDATE_USER, {
        id: params.id,
        input
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', params.id] })
    }
  })

  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, orgId, role }: { userId: string; orgId: string; role: 'OWNER' | 'MANAGER' | 'STAFF' | 'CLEANER' | 'MASTER' | 'OPERATOR' }) => {
      const response = await graphqlClient.request(ADD_MEMBER, {
        input: {
          userId,
          orgId,
          role,
        },
      }) as any
      return response.addMember
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', params.id] })
      if (currentOrgId) {
        queryClient.invalidateQueries({ queryKey: ['memberships-by-org', currentOrgId] })
      }
    },
  })

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: string; role: 'OWNER' | 'MANAGER' | 'STAFF' | 'CLEANER' | 'MASTER' | 'OPERATOR' }) => {
      const response = await graphqlClient.request(UPDATE_MEMBER_ROLE, {
        input: {
          membershipId,
          role,
        },
      }) as any
      return response.updateMemberRole
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', params.id] })
      if (currentOrgId) {
        queryClient.invalidateQueries({ queryKey: ['memberships-by-org', currentOrgId] })
      }
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const response = await graphqlClient.request(REMOVE_MEMBER, {
        membershipId,
      }) as any
      return response.removeMember
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', params.id] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      if (currentOrgId) {
        queryClient.invalidateQueries({ queryKey: ['memberships-by-org', currentOrgId] })
      }
    },
  })


  const handleSaveChanges = async () => {
    if (!currentOrgId) return

    try {
      // Сохраняем данные пользователя
      await updateUserMutation.mutateAsync({
        name: formData.name,
        status: formData.status,
      })

      // Сохраняем роли в текущей организации
      const currentOrgMemberships = userData?.memberships?.filter(
        (m: any) => m.organization?.id === currentOrgId
      ) || []
      const currentRoles = currentOrgMemberships.map((m: any) => m.role)
      
      // Роли для добавления
      const rolesToAdd = selectedRoles.filter(role => !currentRoles.includes(role))
      // Роли для удаления
      const rolesToRemove = currentRoles.filter((role: string) => !selectedRoles.includes(role as any))
      
      // Добавляем новые роли
      await Promise.all(
        rolesToAdd.map(role =>
          addMemberMutation.mutateAsync({
            userId: params.id,
            orgId: currentOrgId,
            role
          })
        )
      )

      // Удаляем ненужные роли
      await Promise.all(
        currentOrgMemberships
          .filter((m: any) => rolesToRemove.includes(m.role))
          .map((m: any) => removeMemberMutation.mutateAsync(m.id))
      )

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', params.id] }),
        queryClient.invalidateQueries({ queryKey: ['memberships-by-org', currentOrgId] }),
      ])

      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save user changes', error)
    }
  }

  const handleRoleToggle = (role: 'OWNER' | 'MANAGER' | 'STAFF' | 'CLEANER' | 'MASTER' | 'OPERATOR') => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role)
      } else {
        return [...prev, role]
      }
    })
    setHasChanges(true)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
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
            onClick={() => handleTabChange('profile')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Профиль
          </button>
          <button
            onClick={() => handleTabChange('activity')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Активность
          </button>
          <button
            onClick={() => handleTabChange('notifications')}
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
      {activeTab === 'profile' && userData && (
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
                </div>
              </Fieldset>
            </div>

          {/* Роли в текущей организации */}
          {currentOrgId && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <Subheading className="mb-4 flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5" />
                Роли в текущей организации
              </Subheading>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Выберите роли для пользователя в организации &quot;{currentOrganization?.name || currentOrgId}&quot;.
              </Text>
              <div className="space-y-2">
                {(['OWNER', 'MANAGER', 'STAFF', 'CLEANER', 'MASTER', 'OPERATOR'] as const).map((role) => {
                  const roleLabels: Record<string, string> = {
                    OWNER: 'Владелец',
                    MANAGER: 'Менеджер',
                    STAFF: 'Сотрудник',
                    CLEANER: 'Уборщик',
                    MASTER: 'Мастер',
                    OPERATOR: 'Оператор',
                  }
                  const roleDescriptions: Record<string, string> = {
                    OWNER: 'Полный доступ ко всем функциям организации',
                    MANAGER: 'Управление операциями и утверждение уборок',
                    STAFF: 'Базовый доступ к функциям',
                    CLEANER: 'Доступ к задачам уборки',
                    MASTER: 'Доступ к задачам ремонта',
                    OPERATOR: 'Мониторинг и поддержка',
                  }
                  const roleColors: Record<string, 'orange' | 'blue' | 'zinc' | 'lime' | 'amber'> = {
                    OWNER: 'orange',
                    MANAGER: 'blue',
                    STAFF: 'zinc',
                    CLEANER: 'lime',
                    MASTER: 'orange',
                    OPERATOR: 'amber',
                  }
                  const isSelected = selectedRoles.includes(role)

                  return (
                    <div
                      key={role}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                      onClick={() => handleRoleToggle(role)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRoleToggle(role)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Text className="font-medium">{roleLabels[role]}</Text>
                          {isSelected && (
                            <Badge color={roleColors[role]} className="text-xs">
                              {role}
                            </Badge>
                          )}
                        </div>
                        <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {roleDescriptions[role]}
                        </Text>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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

          </form>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex justify-end gap-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <Button 
                outline
                onClick={() => {
                  setFormData({
                    name: userData?.name || '',
                    status: userData?.status || 'ACTIVE',
                  })
                  // Сбрасываем роли к текущим значениям из организации
                  if (userData?.memberships && currentOrgId) {
                    const currentOrgMemberships = userData.memberships.filter(
                      (m: any) => m.organization?.id === currentOrgId
                    )
                    const roles = currentOrgMemberships.map((m: any) => m.role as 'OWNER' | 'MANAGER' | 'STAFF' | 'CLEANER' | 'MASTER' | 'OPERATOR')
                    setSelectedRoles(roles)
                  } else {
                    setSelectedRoles([])
                  }
                  setHasChanges(false)
                }}
              >
                Отменить
              </Button>
              <Button 
                onClick={handleSaveChanges}
                disabled={updateUserMutation.isPending || addMemberMutation.isPending || removeMemberMutation.isPending || !formData.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateUserMutation.isPending || addMemberMutation.isPending || removeMemberMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
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

