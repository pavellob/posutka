'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { GET_MASTER, GET_REPAIRS } from '@/lib/graphql-queries'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function MasterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { currentOrgId } = useCurrentOrganization()
  const orgId = currentOrgId

  // Запрос деталей мастера
  const { data: masterData, isLoading: masterLoading } = useQuery<any>({
    queryKey: ['master', resolvedParams.id],
    queryFn: () => graphqlClient.request(GET_MASTER, { id: resolvedParams.id }),
    enabled: !!resolvedParams.id
  })

  // Запрос ремонтов этого мастера
  const { data: repairsData, isLoading: repairsLoading } = useQuery<any>({
    queryKey: ['master-repairs', resolvedParams.id, orgId],
    queryFn: () => graphqlClient.request(GET_REPAIRS, {
      orgId: orgId!,
      masterId: resolvedParams.id,
      first: 100
    }),
    enabled: !!resolvedParams.id && !!orgId
  })

  const master = masterData?.master
  const repairs = repairsData?.repairs?.edges?.map((edge: any) => edge.node) || []

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'PLANNED': { color: 'orange' as const, text: 'Запланирован' },
      'IN_PROGRESS': { color: 'blue' as const, text: 'В процессе' },
      'COMPLETED': { color: 'green' as const, text: 'Завершён' },
      'CANCELLED': { color: 'red' as const, text: 'Отменён' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'zinc' as const, text: status }
    return <Badge color={statusInfo.color}>{statusInfo.text}</Badge>
  }

  if (masterLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Text>Загрузка информации о мастере...</Text>
      </div>
    )
  }

  if (!master) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Heading level={1} className="mb-4">Мастер не найден</Heading>
          <Button onClick={() => router.push('/repairs/masters')}>
            Вернуться к списку мастеров
          </Button>
        </div>
      </div>
    )
  }

  // Статистика
  const totalRepairs = repairs.length
  const completedRepairs = repairs.filter((r: any) => r.status === 'COMPLETED').length
  const inProgressRepairs = repairs.filter((r: any) => r.status === 'IN_PROGRESS').length
  const plannedRepairs = repairs.filter((r: any) => r.status === 'PLANNED').length
  const cancelledRepairs = repairs.filter((r: any) => r.status === 'CANCELLED').length

  return (
    <div className="space-y-6">
      {/* Кнопка назад */}
      <Button
        onClick={() => router.push('/repairs/masters')}
        className="mb-4"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Назад к списку мастеров
      </Button>

      {/* Карточка профиля */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {/* Аватар */}
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {master.firstName?.charAt(0) || 'M'}{master.lastName?.charAt(0) || 'S'}
            </div>
            
            {/* Основная информация */}
            <div>
              <Heading level={1} className="text-2xl mb-1">
                {master.firstName} {master.lastName}
              </Heading>
              <div className="flex items-center space-x-2 mb-2">
                {master.isActive ? (
                  <Badge color="green">✓ Активен</Badge>
                ) : (
                  <Badge color="red">✗ Неактивен</Badge>
                )}
                {master.rating && (
                  <Badge color="yellow" className="text-lg">
                    ⭐ {master.rating.toFixed(1)}
                  </Badge>
                )}
                {master.type && (
                  <Badge color="blue">
                    {master.type === 'INTERNAL' ? 'Сотрудник' : 'Внешний'}
                  </Badge>
                )}
              </div>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                ID: {master.id}
              </Text>
            </div>
          </div>

          {/* Быстрые действия */}
          <div className="space-x-2">
            <Button 
              onClick={() => alert('Редактирование в разработке')}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Редактировать
            </Button>
          </div>
        </div>
      </div>

      {/* Контактная информация */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">Контакты</Text>
          <div className="space-y-2">
            {master.phone ? (
              <div className="flex items-center space-x-2">
                <Text className="text-2xl">📞</Text>
                <div>
                  <Text className="font-medium">{master.phone}</Text>
                  <Text className="text-xs text-gray-500">Телефон</Text>
                </div>
              </div>
            ) : (
              <Text className="text-gray-500">Телефон не указан</Text>
            )}
            
            {master.email ? (
              <div className="flex items-center space-x-2">
                <Text className="text-2xl">✉️</Text>
                <div>
                  <Text className="font-medium">{master.email}</Text>
                  <Text className="text-xs text-gray-500">Email</Text>
                </div>
              </div>
            ) : (
              <Text className="text-gray-500">Email не указан</Text>
            )}

            {master.telegramUsername && (
              <div className="flex items-center space-x-2">
                <Text className="text-2xl">💬</Text>
                <div>
                  <Text className="font-medium">@{master.telegramUsername}</Text>
                  <Text className="text-xs text-gray-500">Telegram</Text>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">Дата регистрации</Text>
          <Text className="text-lg font-medium">
            {new Date(master.createdAt).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date(master.createdAt).toLocaleTimeString('ru-RU')}
          </Text>
        </div>
      </div>

      {/* Статистика */}
      <div>
        <Heading level={2} className="mb-4">📊 Статистика работы</Heading>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 text-center">
            <Text className="text-3xl font-bold text-orange-600">{totalRepairs}</Text>
            <Text className="text-sm text-gray-500 mt-1">Всего ремонтов</Text>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 text-center">
            <Text className="text-3xl font-bold text-green-600">{completedRepairs}</Text>
            <Text className="text-sm text-gray-500 mt-1">Завершено</Text>
            {totalRepairs > 0 && (
              <Text className="text-xs text-gray-400">
                {Math.round((completedRepairs / totalRepairs) * 100)}%
              </Text>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 text-center">
            <Text className="text-3xl font-bold text-blue-600">{inProgressRepairs}</Text>
            <Text className="text-sm text-gray-500 mt-1">В процессе</Text>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 text-center">
            <Text className="text-3xl font-bold text-orange-600">{plannedRepairs}</Text>
            <Text className="text-sm text-gray-500 mt-1">Запланировано</Text>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 text-center">
            <Text className="text-3xl font-bold text-red-600">{cancelledRepairs}</Text>
            <Text className="text-sm text-gray-500 mt-1">Отменено</Text>
          </div>
        </div>
      </div>

      {/* История ремонтов */}
      <div>
        <Heading level={2} className="mb-4">🔧 История ремонтов ({totalRepairs})</Heading>
        
        {repairsLoading ? (
          <Text>Загрузка ремонтов...</Text>
        ) : repairs.length === 0 ? (
          <div className="bg-gray-50 dark:bg-zinc-800 p-8 rounded-lg text-center">
            <Text className="text-gray-500 dark:text-gray-400">
              У этого мастера пока нет выполненных ремонтов
            </Text>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {repairs.map((repair: any) => (
              <div 
                key={repair.id}
                className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-700 transition-colors cursor-pointer"
                onClick={() => router.push(`/repairs/${repair.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusBadge(repair.status)}
                      {repair.taskId && (
                        <Badge color="purple">Связан с задачей</Badge>
                      )}
                    </div>
                    
                    <Text className="font-medium text-lg mb-1">
                      {repair.unit?.name || 'Квартира не указана'}
                    </Text>
                    {repair.unit?.property?.title && (
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {repair.unit.property.title}
                      </Text>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <Text className="text-xs text-gray-500">Запланирован:</Text>
                        <Text>{new Date(repair.scheduledAt).toLocaleString('ru-RU')}</Text>
                      </div>
                      
                      {repair.completedAt && (
                        <div>
                          <Text className="text-xs text-gray-500">Завершён:</Text>
                          <Text className="text-green-600">
                            {new Date(repair.completedAt).toLocaleString('ru-RU')}
                          </Text>
                        </div>
                      )}
                    </div>

                    {repair.notes && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        💬 {repair.notes}
                      </Text>
                    )}

                    {repair.booking && (
                      <div className="mt-2">
                        <Badge color="blue">
                          Бронирование: {repair.booking.guest?.name || 'Гость'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Метаинформация */}
      <div className="border-t border-gray-200 dark:border-zinc-700 pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div>
            <Text className="text-xs">Добавлен в систему:</Text>
            <Text>{new Date(master.createdAt).toLocaleString('ru-RU')}</Text>
          </div>
          <div>
            <Text className="text-xs">Последнее обновление:</Text>
            <Text>{new Date(master.updatedAt).toLocaleString('ru-RU')}</Text>
          </div>
        </div>
      </div>
    </div>
  )
}

