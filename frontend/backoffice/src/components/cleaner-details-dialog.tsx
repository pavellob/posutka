'use client'

import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from './dialog'
import { Button } from './button'
import { Heading } from './heading'
import { Text } from './text'
import { Badge } from './badge'
import { graphqlClient } from '@/lib/graphql-client'
import { GET_CLEANER, GET_CLEANINGS } from '@/lib/graphql-queries'

interface CleanerDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  cleanerId: string | null
  orgId: string
}

export function CleanerDetailsDialog({
  isOpen,
  onClose,
  cleanerId,
  orgId
}: CleanerDetailsDialogProps) {
  // Запрос деталей уборщика
  const { data: cleanerData, isLoading: cleanerLoading } = useQuery<any>({
    queryKey: ['cleaner', cleanerId],
    queryFn: () => graphqlClient.request(GET_CLEANER, { id: cleanerId }),
    enabled: isOpen && !!cleanerId
  })

  // Запрос уборок этого уборщика
  const { data: cleaningsData, isLoading: cleaningsLoading } = useQuery<any>({
    queryKey: ['cleaner-cleanings', cleanerId, orgId],
    queryFn: () => graphqlClient.request(GET_CLEANINGS, {
      orgId,
      cleanerId,
      first: 100
    }),
    enabled: isOpen && !!cleanerId && !!orgId
  })

  const cleaner = cleanerData?.cleaner
  const cleanings = cleaningsData?.cleanings?.edges?.map((edge: any) => edge.node) || []

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'SCHEDULED': { color: 'orange' as const, text: 'Запланирована' },
      'IN_PROGRESS': { color: 'blue' as const, text: 'В процессе' },
      'COMPLETED': { color: 'green' as const, text: 'Завершена' },
      'CANCELLED': { color: 'red' as const, text: 'Отменена' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'zinc' as const, text: status }
    return <Badge color={statusInfo.color}>{statusInfo.text}</Badge>
  }

  if (cleanerLoading) {
    return (
      <Dialog open={isOpen} onClose={onClose} size="4xl">
        <DialogTitle>Загрузка...</DialogTitle>
        <DialogBody>
          <Text>Загрузка информации об уборщике...</Text>
        </DialogBody>
      </Dialog>
    )
  }

  if (!cleaner) {
    return (
      <Dialog open={isOpen} onClose={onClose} size="4xl">
        <DialogTitle>Ошибка</DialogTitle>
        <DialogBody>
          <Text>Уборщик не найден</Text>
        </DialogBody>
        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    )
  }

  // Статистика
  const totalCleanings = cleanings.length
  const completedCleanings = cleanings.filter((c: any) => c.status === 'COMPLETED').length
  const inProgressCleanings = cleanings.filter((c: any) => c.status === 'IN_PROGRESS').length
  const scheduledCleanings = cleanings.filter((c: any) => c.status === 'SCHEDULED').length
  const cancelledCleanings = cleanings.filter((c: any) => c.status === 'CANCELLED').length

  return (
    <Dialog open={isOpen} onClose={onClose} size="5xl">
      <DialogTitle>Профиль уборщика</DialogTitle>
      <DialogDescription>
        Полная информация и статистика
      </DialogDescription>
      
      <DialogBody className="space-y-6">
        {/* Карточка профиля */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {/* Аватар */}
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {cleaner.firstName.charAt(0)}{cleaner.lastName.charAt(0)}
              </div>
              
              {/* Основная информация */}
              <div>
                <Heading level={2} className="text-2xl mb-1">
                  {cleaner.firstName} {cleaner.lastName}
                </Heading>
                <div className="flex items-center space-x-2 mb-2">
                  {cleaner.isActive ? (
                    <Badge color="green">✓ Активен</Badge>
                  ) : (
                    <Badge color="red">✗ Неактивен</Badge>
                  )}
                  {cleaner.rating && (
                    <Badge color="yellow" className="text-lg">
                      ⭐ {cleaner.rating.toFixed(1)}
                    </Badge>
                  )}
                </div>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  ID: {cleaner.id}
                </Text>
              </div>
            </div>

            {/* Быстрые действия */}
            <div className="space-x-2">
              <Button 
                onClick={() => alert('Редактирование в разработке')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
              {cleaner.phone ? (
                <div className="flex items-center space-x-2">
                  <Text className="text-2xl">📞</Text>
                  <div>
                    <Text className="font-medium">{cleaner.phone}</Text>
                    <Text className="text-xs text-gray-500">Телефон</Text>
                  </div>
                </div>
              ) : (
                <Text className="text-gray-500">Телефон не указан</Text>
              )}
              
              {cleaner.email ? (
                <div className="flex items-center space-x-2">
                  <Text className="text-2xl">✉️</Text>
                  <div>
                    <Text className="font-medium">{cleaner.email}</Text>
                    <Text className="text-xs text-gray-500">Email</Text>
                  </div>
                </div>
              ) : (
                <Text className="text-gray-500">Email не указан</Text>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700">
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">Дата регистрации</Text>
            <Text className="text-lg font-medium">
              {new Date(cleaner.createdAt).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {new Date(cleaner.createdAt).toLocaleTimeString('ru-RU')}
            </Text>
          </div>
        </div>

        {/* Статистика */}
        <div>
          <Heading level={3} className="mb-4">📊 Статистика работы</Heading>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 text-center">
              <Text className="text-3xl font-bold text-blue-600">{totalCleanings}</Text>
              <Text className="text-sm text-gray-500 mt-1">Всего уборок</Text>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 text-center">
              <Text className="text-3xl font-bold text-green-600">{completedCleanings}</Text>
              <Text className="text-sm text-gray-500 mt-1">Завершено</Text>
              {totalCleanings > 0 && (
                <Text className="text-xs text-gray-400">
                  {Math.round((completedCleanings / totalCleanings) * 100)}%
                </Text>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 text-center">
              <Text className="text-3xl font-bold text-blue-600">{inProgressCleanings}</Text>
              <Text className="text-sm text-gray-500 mt-1">В процессе</Text>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 text-center">
              <Text className="text-3xl font-bold text-orange-600">{scheduledCleanings}</Text>
              <Text className="text-sm text-gray-500 mt-1">Запланировано</Text>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 text-center">
              <Text className="text-3xl font-bold text-red-600">{cancelledCleanings}</Text>
              <Text className="text-sm text-gray-500 mt-1">Отменено</Text>
            </div>
          </div>
        </div>

        {/* История уборок */}
        <div>
          <Heading level={3} className="mb-4">📋 История уборок ({totalCleanings})</Heading>
          
          {cleaningsLoading ? (
            <Text>Загрузка уборок...</Text>
          ) : cleanings.length === 0 ? (
            <div className="bg-gray-50 dark:bg-zinc-800 p-8 rounded-lg text-center">
              <Text className="text-gray-500 dark:text-gray-400">
                У этого уборщика пока нет выполненных уборок
              </Text>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {cleanings.map((cleaning: any) => (
                <div 
                  key={cleaning.id}
                  className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusBadge(cleaning.status)}
                        {cleaning.requiresLinenChange && (
                          <Badge color="blue">Смена белья</Badge>
                        )}
                        {cleaning.taskId && (
                          <Badge color="purple">Связана с задачей</Badge>
                        )}
                      </div>
                      
                      <Text className="font-medium text-lg mb-1">
                        {cleaning.unit?.name || 'Квартира не указана'}
                      </Text>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <Text className="text-xs text-gray-500">Запланирована:</Text>
                          <Text>{new Date(cleaning.scheduledAt).toLocaleString('ru-RU')}</Text>
                        </div>
                        
                        {cleaning.completedAt && (
                          <div>
                            <Text className="text-xs text-gray-500">Завершена:</Text>
                            <Text className="text-green-600">
                              {new Date(cleaning.completedAt).toLocaleString('ru-RU')}
                            </Text>
                          </div>
                        )}
                      </div>

                      {cleaning.notes && (
                        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          💬 {cleaning.notes}
                        </Text>
                      )}

                      {cleaning.checklistItems && cleaning.checklistItems.length > 0 && (
                        <div className="mt-2">
                          <Text className="text-xs text-gray-500">
                            Чеклист: {cleaning.checklistItems.filter((i: any) => i.isChecked).length} / {cleaning.checklistItems.length} выполнено
                          </Text>
                          <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-green-600 h-1.5 rounded-full"
                              style={{ 
                                width: `${(cleaning.checklistItems.filter((i: any) => i.isChecked).length / cleaning.checklistItems.length) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      {cleaning.documents && cleaning.documents.length > 0 && (
                        <Badge color="blue">
                          {cleaning.documents.reduce((sum: number, doc: any) => sum + (doc.photos?.length || 0), 0)} 📷
                        </Badge>
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
              <Text>{new Date(cleaner.createdAt).toLocaleString('ru-RU')}</Text>
            </div>
            <div>
              <Text className="text-xs">Последнее обновление:</Text>
              <Text>{new Date(cleaner.updatedAt).toLocaleString('ru-RU')}</Text>
            </div>
          </div>
        </div>
      </DialogBody>

      <DialogActions>
        <Button onClick={onClose} className="bg-black hover:bg-gray-800 text-white">
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  )
}

