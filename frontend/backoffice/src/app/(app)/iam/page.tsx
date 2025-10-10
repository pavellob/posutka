'use client'

import { useState, useEffect } from 'react'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableHeader, 
  TableCell 
} from '@/components/table'
import { EditUserDialog } from '@/components/edit-user-dialog'
import { CreateUserDialog } from '@/components/create-user-dialog'
import { graphqlRequest } from '@/lib/graphql-wrapper'
import { gql } from 'graphql-request'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'

// GraphQL запросы
const GET_USER_STATS = gql`
  query GetUserStats {
    userStats {
      totalUsers
      activeUsers
      lockedUsers
      onlineUsers
      newUsers
      usersByRole {
        role
        count
      }
    }
  }
`

const GET_USERS = gql`
  query GetUsers($orgId: UUID!, $first: Int, $after: String) {
    usersAdvanced(orgId: $orgId, first: $first, after: $after) {
      edges {
        node {
          id
          email
          name
          createdAt
          status
          systemRoles
          lastLoginAt
          isLocked
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`

export default function IAMPage() {
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  
  // Получаем текущую организацию
  const { currentOrgId } = useCurrentOrganization()

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!currentOrgId) {
        setError('Организация не выбрана')
        setLoading(false)
        return
      }

      // Получаем статистику
      const statsResult = await graphqlRequest(GET_USER_STATS)
      setStats(statsResult.userStats)

      // Получаем пользователей организации
      const usersResult = await graphqlRequest(GET_USERS, { 
        orgId: currentOrgId, 
        first: 20 
      })
      setUsers(usersResult.usersAdvanced.edges.map((edge: any) => edge.node))

    } catch (err: any) {
      console.error('Failed to fetch IAM data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentOrgId) {
      fetchData()
    }
  }, [currentOrgId])

  const handleEditUser = (user: any) => {
    setSelectedUser(user)
    setShowEditDialog(true)
  }

  const handleEditSuccess = () => {
    setShowEditDialog(false)
    setSelectedUser(null)
    // Перезагружаем данные
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка данных IAM...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Ошибка: {error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Повторить
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <Heading level={1}>Сотрудники</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Управление учетными записями сотрудников
          </Text>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-black hover:bg-gray-800 text-white border-gray-600"
        >
          Добавить сотрудника
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6">
          <Heading level={3} className="mb-4">Всего сотрудников</Heading>
          <Text className="text-2xl font-bold text-blue-600">
            {stats?.totalUsers || 0}
          </Text>
          <Text className="text-sm text-zinc-500">Зарегистрировано</Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">Активные</Heading>
          <Text className="text-2xl font-bold text-green-600">
            {stats?.activeUsers || 0}
          </Text>
          <Text className="text-sm text-zinc-500">
            {stats?.totalUsers > 0 ? `${Math.round((stats?.activeUsers / stats?.totalUsers) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">Администраторы</Heading>
          <Text className="text-2xl font-bold text-orange-600">
            {stats?.usersByRole?.find((r: any) => r.role === 'ADMIN')?.count || 0}
          </Text>
          <Text className="text-sm text-zinc-500">С полным доступом</Text>
        </div>

        <div className="p-6">
          <Heading level={3} className="mb-4">Заблокированные</Heading>
          <Text className="text-2xl font-bold text-red-600">
            {stats?.lockedUsers || 0}
          </Text>
          <Text className="text-sm text-zinc-500">Требуют внимания</Text>
        </div>
      </div>

      {/* Таблица сотрудников */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Heading level={2}>Список сотрудников</Heading>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Показано: {users.length}
          </Text>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHead>
              <TableRow className="bg-gray-50 dark:bg-zinc-900">
                <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Сотрудник
                </TableHeader>
                <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </TableHeader>
                <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Роли
                </TableHeader>
                <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Статус
                </TableHeader>
                <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Последний вход
                </TableHeader>
                <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Дата создания
                </TableHeader>
                <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Действия
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150">
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <Text className="font-medium text-gray-900 dark:text-white">
                          {user.name || 'Без имени'}
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {user.id.slice(0, 8)}
                        </Text>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Text className="text-sm font-mono text-gray-900 dark:text-white">
                      {user.email}
                    </Text>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.systemRoles && user.systemRoles.length > 0 ? (
                        user.systemRoles.map((role: string) => (
                          <Badge key={role} color={role === 'ADMIN' ? 'orange' : role === 'MANAGER' ? 'blue' : 'zinc'} className="text-xs">
                            {role === 'ADMIN' ? 'Админ' : 
                             role === 'MANAGER' ? 'Менеджер' : 
                             role === 'USER' ? 'Пользователь' : role}
                          </Badge>
                        ))
                      ) : (
                        <Badge color="zinc" className="text-xs">Пользователь</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      color={user.isLocked ? 'red' : user.status === 'ACTIVE' ? 'green' : 'zinc'}
                    >
                      {user.isLocked ? 'Заблокирован' : 
                       user.status === 'ACTIVE' ? 'Активен' : 
                       user.status === 'INACTIVE' ? 'Неактивен' : 
                       'Активен'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Text className="text-sm text-gray-900 dark:text-white">
                      {user.lastLoginAt 
                        ? new Date(user.lastLoginAt).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        : '-'
                      }
                    </Text>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </Text>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleEditUser(user)}
                        className="bg-blue-500 hover:bg-blue-600 text-white border-blue-600 text-sm px-3 py-1"
                      >
                        Редактировать
                      </Button>
                      {user.isLocked ? (
                        <Button 
                          className="bg-green-500 hover:bg-green-600 text-white border-green-600 text-sm px-3 py-1"
                        >
                          Разблокировать
                        </Button>
                      ) : (
                        <Button 
                          className="bg-red-500 hover:bg-red-600 text-white border-red-600 text-sm px-3 py-1"
                        >
                          Заблокировать
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Диалог создания пользователя */}
      <CreateUserDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        orgId={currentOrgId || undefined}
        onSuccess={() => {
          setShowCreateDialog(false)
          fetchData()
        }}
      />

      {/* Диалог редактирования пользователя */}
      <EditUserDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
