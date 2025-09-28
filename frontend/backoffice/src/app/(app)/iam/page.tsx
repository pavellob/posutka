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
import { graphqlRequest } from '@/lib/graphql-wrapper'
import { gql } from 'graphql-request'

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
  query GetUsers($first: Int, $after: String) {
    usersAdvanced(first: $first, after: $after) {
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

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Получаем статистику
        const statsResult = await graphqlRequest(GET_USER_STATS)
        setStats(statsResult.userStats)

        // Получаем пользователей
        const usersResult = await graphqlRequest(GET_USERS, { first: 20 })
        setUsers(usersResult.usersAdvanced.edges.map((edge: any) => edge.node))

      } catch (err: any) {
        console.error('Failed to fetch IAM data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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
      <div>
        <Heading level={1}>Управление пользователями и доступом</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление пользователями, ролями и доступом к системе
        </Text>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">👥</span>
            </div>
            <Heading level={3}>Всего пользователей</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">
            {stats?.totalUsers || 0}
          </Text>
          <Text className="text-sm text-zinc-500">Активных аккаунтов</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🔑</span>
            </div>
            <Heading level={3}>Активные сессии</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">
            {stats?.onlineUsers || 0}
          </Text>
          <Text className="text-sm text-zinc-500">Сейчас онлайн</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🛡️</span>
            </div>
            <Heading level={3}>Администраторы</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">
            {stats?.usersByRole?.find((r: any) => r.role === 'ADMIN')?.count || 0}
          </Text>
          <Text className="text-sm text-zinc-500">С расширенными правами</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⚠️</span>
            </div>
            <Heading level={3}>Заблокированные</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">
            {stats?.lockedUsers || 0}
          </Text>
          <Text className="text-sm text-zinc-500">Требуют внимания</Text>
        </div>
      </div>

      {/* Таблица пользователей */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <Heading level={2}>Управление пользователями</Heading>
          <Text className="text-sm text-zinc-500">
            Управление аккаунтами пользователей, ролями и разрешениями
          </Text>
        </div>
        
        <Table striped>
          <TableHead>
            <TableRow>
              <TableHeader>Пользователь</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Статус</TableHeader>
              <TableHeader>Роли</TableHeader>
              <TableHeader>Последний вход</TableHeader>
              <TableHeader>Действия</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <Text className="font-medium">{user.name || 'No name'}</Text>
                      <Text className="text-sm text-zinc-500">
                        ID: {user.id.slice(0, 8)}...
                      </Text>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Text className="font-mono text-sm">{user.email}</Text>
                </TableCell>
                <TableCell>
                  <Badge 
                    color={user.isLocked ? 'red' : user.status === 'ACTIVE' ? 'green' : 'yellow'}
                  >
                    {user.isLocked ? 'Заблокирован' : user.status === 'ACTIVE' ? 'Активен' : user.status || 'Активен'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {user.systemRoles?.map((role: string) => (
                      <Badge key={role} color="blue" className="text-xs">
                        {role}
                      </Badge>
                    )) || <Text className="text-sm text-zinc-500">Нет ролей</Text>}
                  </div>
                </TableCell>
                <TableCell>
                  <Text className="text-sm text-zinc-500">
                    {user.lastLoginAt 
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : 'Никогда'
                    }
                  </Text>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button color="blue">
                      Редактировать
                    </Button>
                    <Button color="red">
                      Заблокировать
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Роли и разрешения */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Роли и разрешения пользователей</Heading>
          <div className="space-y-3">
            {stats?.usersByRole?.map((roleStat: any) => (
              <div key={roleStat.role} className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {roleStat.role === 'ADMIN' ? '👑' : 
                       roleStat.role === 'MANAGER' ? '⚡' : 
                       roleStat.role === 'USER' ? '👤' : '👥'}
                    </span>
                  </div>
                  <div>
                    <Text className="font-medium">{roleStat.role}</Text>
                    <Text className="text-sm text-zinc-500">
                      {roleStat.role === 'ADMIN' ? 'Полный доступ к системе' :
                       roleStat.role === 'MANAGER' ? 'Доступ к управлению' :
                       roleStat.role === 'USER' ? 'Базовый доступ' : 'Ограниченный доступ'}
                    </Text>
                  </div>
                </div>
                <Badge color="blue">{roleStat.count} пользователей</Badge>
              </div>
            )) || (
              <Text className="text-zinc-500">Данные о ролях недоступны</Text>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Быстрые действия</Heading>
          <div className="space-y-3">
            <Button className="w-full justify-start" color="blue">
              ➕ Создать пользователя
            </Button>
            <Button className="w-full justify-start" color="green">
              📊 Экспорт данных
            </Button>
            <Button className="w-full justify-start" color="orange">
              🔄 Массовые операции
            </Button>
            <Button className="w-full justify-start" color="red">
              🛡️ Аудит безопасности
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
