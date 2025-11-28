'use client'

import { useState, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Link } from '@/components/link'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { CreateMasterDialog } from '@/components/create-master-dialog'
import { GET_MASTERS, UPDATE_MASTER } from '@/lib/graphql-queries'

function MastersPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const [isCreateMasterDialogOpen, setIsCreateMasterDialogOpen] = useState(false)
  
  const queryClient = useQueryClient()
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const orgId = currentOrgId

  // Запрос мастеров (все - и активные, и деактивированные)
  const { data: mastersData, isLoading: mastersLoading } = useQuery<any>({
    queryKey: ['masters', orgId],
    queryFn: () => graphqlClient.request(GET_MASTERS, {
      orgId: orgId!,
      // Не передаем isActive, чтобы получить всех мастеров
      first: 100
    }),
    enabled: !!orgId
  })

  const deactivateMasterMutation = useMutation({
    mutationFn: (id: string) => graphqlClient.request(UPDATE_MASTER, { 
      id, 
      input: { isActive: false } 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masters'] })
    },
    onError: (error: any) => {
      alert(`Ошибка: ${error.message || 'Не удалось деактивировать мастера'}`)
    }
  })

  const handleMasterClick = (masterId: string) => {
    router.push(`/masters/${masterId}`)
  }

  const handleDeactivate = (masterId: string, masterName: string) => {
    if (confirm(`Вы уверены, что хотите деактивировать мастера ${masterName}?`)) {
      deactivateMasterMutation.mutate(masterId)
    }
  }

  if (orgLoading || !orgId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Text>Загрузка организации...</Text>
      </div>
    )
  }

  if (mastersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Text>Загрузка мастеров...</Text>
      </div>
    )
  }

  const masters = mastersData?.masters?.edges?.map((edge: any) => edge.node) || []
  const activeMasters = masters.filter((m: any) => m.isActive)
  const inactiveMasters = masters.filter((m: any) => !m.isActive)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Ремонтники</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Управление мастерами организации
          </Text>
        </div>
        <Button 
          onClick={() => setIsCreateMasterDialogOpen(true)} 
          className="bg-black hover:bg-gray-800 text-white border-gray-600"
        >
          + Добавить мастера
        </Button>
      </div>

      {/* Вкладки */}
      <div className="border-b border-gray-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8">
          <Link
            href="/repairs"
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${pathname === '/repairs'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            🔧 Ремонты
          </Link>
          <Link
            href="/repairs/masters"
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${pathname === '/repairs/masters'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            👷 Ремонтники ({masters.length})
          </Link>
        </nav>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Heading level={3} className="mb-2">Всего мастеров</Heading>
          <Text className="text-3xl font-bold text-blue-600">{masters.length}</Text>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Heading level={3} className="mb-2">Активных</Heading>
          <Text className="text-3xl font-bold text-green-600">{activeMasters.length}</Text>
          <Text className="text-sm text-zinc-500">
            {masters.length > 0 ? `${Math.round((activeMasters.length / masters.length) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Heading level={3} className="mb-2">Неактивных</Heading>
          <Text className="text-3xl font-bold text-red-600">{inactiveMasters.length}</Text>
          <Text className="text-sm text-zinc-500">
            {masters.length > 0 ? `${Math.round((inactiveMasters.length / masters.length) * 100)}%` : '0%'}
          </Text>
        </div>
      </div>

      {/* Информационный блок */}
      {masters.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <Heading level={3} className="text-blue-900 dark:text-blue-100 mb-2">
            👋 Добро пожаловать!
          </Heading>
          <Text className="text-blue-800 dark:text-blue-200 mb-4">
            У вас пока нет мастеров. Чтобы начать планировать ремонты, добавьте первого мастера.
          </Text>
          <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <p><strong>Шаг 1:</strong> Убедитесь, что у вас есть пользователь в системе (страница IAM)</p>
            <p><strong>Шаг 2:</strong> Нажмите кнопку &ldquo;Добавить мастера&rdquo;</p>
            <p><strong>Шаг 3:</strong> Выберите пользователя и заполните данные</p>
          </div>
        </div>
      )}

      {/* Таблица мастеров */}
      {masters.length > 0 && (
        <div className="space-y-4">
          <Heading level={2}>Список мастеров ({masters.length})</Heading>
          
          <div className="overflow-x-auto">
            <Table className="min-w-full bg-white dark:bg-zinc-800">
              <TableHead>
                <TableRow className="bg-gray-50 dark:bg-zinc-900">
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ФИО</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Контакты</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Рейтинг</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Дата создания</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {masters.map((master: any) => (
                  <TableRow 
                    key={master.id} 
                    className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150 cursor-pointer"
                    onClick={() => handleMasterClick(master.id)}
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {master.isActive ? (
                        <Badge color="green">Активен</Badge>
                      ) : (
                        <Badge color="red">Неактивен</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Text className="font-medium text-gray-900 dark:text-white">
                          {master.firstName} {master.lastName}
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {master.id.substring(0, 8)}...
                        </Text>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="space-y-1">
                        {master.phone && (
                          <Text className="text-sm text-gray-900 dark:text-white">
                            📞 {master.phone}
                          </Text>
                        )}
                        {master.email && (
                          <Text className="text-sm text-gray-900 dark:text-white">
                            ✉️ {master.email}
                          </Text>
                        )}
                        {!master.phone && !master.email && (
                          <Text className="text-sm text-gray-500 dark:text-gray-400">
                            Нет контактов
                          </Text>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {master.rating ? (
                        <div>
                          <Text className="text-lg font-bold text-yellow-600">
                            ⭐ {master.rating.toFixed(1)}
                          </Text>
                        </div>
                      ) : (
                        <Text className="text-gray-500 dark:text-gray-400">
                          Нет рейтинга
                        </Text>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Text className="text-sm text-gray-900 dark:text-white">
                        {new Date(master.createdAt).toLocaleDateString()}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(master.createdAt).toLocaleTimeString()}
                      </Text>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Диалог создания мастера */}
      <CreateMasterDialog
        isOpen={isCreateMasterDialogOpen}
        onClose={() => setIsCreateMasterDialogOpen(false)}
        orgId={orgId!}
      />
    </div>
  )
}

export default function MastersPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <MastersPageContent />
    </Suspense>
  )
}

