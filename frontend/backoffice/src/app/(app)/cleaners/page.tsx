'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { CreateCleanerDialog } from '@/components/create-cleaner-dialog'
import { 
  GET_CLEANERS,
  UPDATE_CLEANER,
  DEACTIVATE_CLEANER
} from '@/lib/graphql-queries'

export default function CleanersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const router = useRouter()
  
  const queryClient = useQueryClient()
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const orgId = currentOrgId

  // Запрос уборщиков
  const { data: cleanersData, isLoading: cleanersLoading } = useQuery<any>({
    queryKey: ['cleaners', orgId],
    queryFn: () => graphqlClient.request(GET_CLEANERS, {
      orgId: orgId!,
      first: 100
    }),
    enabled: !!orgId
  })

  // Мутация деактивации
  const deactivateCleanerMutation = useMutation({
    mutationFn: (id: string) => graphqlClient.request(DEACTIVATE_CLEANER, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaners'] })
    },
    onError: (error: any) => {
      alert(`Ошибка: ${error.message || 'Не удалось деактивировать уборщика'}`)
    }
  })

  // Обработчик клика для перехода на карточку уборщика
  const handleCleanerClick = (cleanerId: string) => {
    router.push(`/cleaners/${cleanerId}`)
  }

  if (orgLoading || !orgId) {
    return (
      <div className="space-y-6">
        <div>
          <Heading level={1}>Уборщики</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Загрузка организации...
          </Text>
        </div>
      </div>
    )
  }

  if (cleanersLoading) {
    return (
      <div className="space-y-6">
        <Heading level={1}>Уборщики</Heading>
        <Text>Загрузка...</Text>
      </div>
    )
  }

  const cleaners = cleanersData?.cleaners?.edges?.map((edge: any) => edge.node) || []
  const activeCleaners = cleaners.filter((c: any) => c.isActive)
  const inactiveCleaners = cleaners.filter((c: any) => !c.isActive)

  const handleDeactivate = (cleanerId: string, cleanerName: string) => {
    if (confirm(`Вы уверены, что хотите деактивировать уборщика ${cleanerName}?`)) {
      deactivateCleanerMutation.mutate(cleanerId)
    }
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <Heading level={1}>Уборщики</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Управление уборщиками организации
          </Text>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)} 
          className="bg-black hover:bg-gray-800 text-white border-gray-600"
        >
          + Добавить уборщика
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Heading level={3} className="mb-2">Всего уборщиков</Heading>
          <Text className="text-3xl font-bold text-blue-600">{cleaners.length}</Text>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Heading level={3} className="mb-2">Активных</Heading>
          <Text className="text-3xl font-bold text-green-600">{activeCleaners.length}</Text>
          <Text className="text-sm text-zinc-500">
            {cleaners.length > 0 ? `${Math.round((activeCleaners.length / cleaners.length) * 100)}%` : '0%'}
          </Text>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Heading level={3} className="mb-2">Неактивных</Heading>
          <Text className="text-3xl font-bold text-red-600">{inactiveCleaners.length}</Text>
          <Text className="text-sm text-zinc-500">
            {cleaners.length > 0 ? `${Math.round((inactiveCleaners.length / cleaners.length) * 100)}%` : '0%'}
          </Text>
        </div>
      </div>

      {/* Информационный блок */}
      {cleaners.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <Heading level={3} className="text-blue-900 dark:text-blue-100 mb-2">
            👋 Добро пожаловать!
          </Heading>
          <Text className="text-blue-800 dark:text-blue-200 mb-4">
            У вас пока нет уборщиков. Чтобы начать планировать уборки, добавьте первого уборщика.
          </Text>
          <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <p><strong>Шаг 1:</strong> Убедитесь, что у вас есть пользователь в системе (страница IAM)</p>
            <p><strong>Шаг 2:</strong> Нажмите кнопку &ldquo;Добавить уборщика&rdquo;</p>
            <p><strong>Шаг 3:</strong> Выберите пользователя и заполните данные</p>
          </div>
        </div>
      )}

      {/* Таблица уборщиков */}
      {cleaners.length > 0 && (
        <div className="space-y-4">
          <Heading level={2}>Список уборщиков ({cleaners.length})</Heading>
          
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
                {cleaners.map((cleaner: any) => (
                  <TableRow 
                    key={cleaner.id} 
                    className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150 cursor-pointer"
                    onClick={() => handleCleanerClick(cleaner.id)}
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {cleaner.isActive ? (
                        <Badge color="green">Активен</Badge>
                      ) : (
                        <Badge color="red">Неактивен</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Text className="font-medium text-gray-900 dark:text-white">
                          {cleaner.firstName} {cleaner.lastName}
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {cleaner.id.substring(0, 8)}...
                        </Text>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="space-y-1">
                        {cleaner.phone && (
                          <Text className="text-sm text-gray-900 dark:text-white">
                            📞 {cleaner.phone}
                          </Text>
                        )}
                        {cleaner.email && (
                          <Text className="text-sm text-gray-900 dark:text-white">
                            ✉️ {cleaner.email}
                          </Text>
                        )}
                        {!cleaner.phone && !cleaner.email && (
                          <Text className="text-sm text-gray-500 dark:text-gray-400">
                            Нет контактов
                          </Text>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {cleaner.rating ? (
                        <div>
                          <Text className="text-lg font-bold text-yellow-600">
                            ⭐ {cleaner.rating.toFixed(1)}
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
                        {new Date(cleaner.createdAt).toLocaleDateString()}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(cleaner.createdAt).toLocaleTimeString()}
                      </Text>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Диалог создания уборщика */}
      <CreateCleanerDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        orgId={orgId}
      />
    </div>
  )
}

