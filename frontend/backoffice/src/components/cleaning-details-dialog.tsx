'use client'

import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from './dialog'
import { Button } from './button'
import { Heading } from './heading'
import { Text } from './text'
import { Badge } from './badge'
import { graphqlClient } from '@/lib/graphql-client'
import { GET_CLEANING } from '@/lib/graphql-queries'

interface CleaningDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  cleaningId: string | null
}

export function CleaningDetailsDialog({
  isOpen,
  onClose,
  cleaningId
}: CleaningDetailsDialogProps) {
  // Запрос деталей уборки
  const { data: cleaningData, isLoading } = useQuery<any>({
    queryKey: ['cleaning', cleaningId],
    queryFn: () => graphqlClient.request(GET_CLEANING, { id: cleaningId }),
    enabled: isOpen && !!cleaningId
  })

  const cleaning = cleaningData?.cleaning

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

  const getDocumentTypeBadge = (type: string) => {
    if (type === 'PRE_CLEANING_ACCEPTANCE') {
      return <Badge color="orange">📸 Приемка ДО уборки</Badge>
    }
    return <Badge color="green">📸 Сдача ПОСЛЕ уборки</Badge>
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onClose={onClose} size="4xl">
        <DialogTitle>Загрузка...</DialogTitle>
        <DialogBody>
          <Text>Загрузка информации об уборке...</Text>
        </DialogBody>
      </Dialog>
    )
  }

  if (!cleaning) {
    return (
      <Dialog open={isOpen} onClose={onClose} size="4xl">
        <DialogTitle>Ошибка</DialogTitle>
        <DialogBody>
          <Text>Уборка не найдена</Text>
        </DialogBody>
        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onClose={onClose} size="4xl">
      <DialogTitle>Подробности уборки</DialogTitle>
      <DialogDescription>
        Полная информация об уборке #{cleaning.id.substring(0, 8)}
      </DialogDescription>
      
      <DialogBody className="space-y-6">
        {/* Статус и основная информация */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Статус</Text>
              <div className="mt-1">{getStatusBadge(cleaning.status)}</div>
            </div>

            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Квартира</Text>
              <Text className="font-medium text-lg">{cleaning.unit?.name || 'N/A'}</Text>
            </div>

            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Уборщик</Text>
              <div className="flex items-center space-x-2">
                <Text className="font-medium">
                  {cleaning.cleaner?.firstName} {cleaning.cleaner?.lastName}
                </Text>
                {cleaning.cleaner?.rating && (
                  <Badge color="yellow">⭐ {cleaning.cleaner.rating.toFixed(1)}</Badge>
                )}
              </div>
              {cleaning.cleaner?.phone && (
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  📞 {cleaning.cleaner.phone}
                </Text>
              )}
              {cleaning.cleaner?.email && (
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  ✉️ {cleaning.cleaner.email}
                </Text>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Запланирована</Text>
              <Text className="font-medium">
                {new Date(cleaning.scheduledAt).toLocaleString('ru-RU')}
              </Text>
            </div>

            {cleaning.startedAt && (
              <div>
                <Text className="text-sm text-gray-500 dark:text-gray-400">Начата</Text>
                <Text className="font-medium text-blue-600">
                  {new Date(cleaning.startedAt).toLocaleString('ru-RU')}
                </Text>
              </div>
            )}

            {cleaning.completedAt && (
              <div>
                <Text className="text-sm text-gray-500 dark:text-gray-400">Завершена</Text>
                <Text className="font-medium text-green-600">
                  {new Date(cleaning.completedAt).toLocaleString('ru-RU')}
                </Text>
              </div>
            )}

            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Смена белья</Text>
              {cleaning.requiresLinenChange ? (
                <Badge color="blue">Да</Badge>
              ) : (
                <Badge color="zinc">Нет</Badge>
              )}
            </div>

            {cleaning.booking && (
              <div>
                <Text className="text-sm text-gray-500 dark:text-gray-400">Связь</Text>
                <Badge color="purple">С бронированием</Badge>
              </div>
            )}

            {cleaning.taskId && (
              <div>
                <Text className="text-sm text-gray-500 dark:text-gray-400">Задача</Text>
                <Badge color="purple">Связана с задачей</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Заметки */}
        {cleaning.notes && (
          <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg">
            <Heading level={4} className="mb-2">📝 Заметки</Heading>
            <Text>{cleaning.notes}</Text>
          </div>
        )}

        {/* Чеклист */}
        {cleaning.checklistItems && cleaning.checklistItems.length > 0 && (
          <div>
            <Heading level={3} className="mb-4">✅ Чеклист уборки</Heading>
            <div className="space-y-2">
              {cleaning.checklistItems.map((item: any) => (
                <div 
                  key={item.id} 
                  className="flex items-center space-x-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    disabled
                    className="w-5 h-5 rounded"
                  />
                  <Text className={item.isChecked ? 'line-through text-gray-500' : ''}>
                    {item.label}
                  </Text>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Text className="text-sm text-gray-500">
                Выполнено: {cleaning.checklistItems.filter((i: any) => i.isChecked).length} / {cleaning.checklistItems.length}
              </Text>
              <div className="w-48 bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full"
                  style={{ 
                    width: `${(cleaning.checklistItems.filter((i: any) => i.isChecked).length / cleaning.checklistItems.length) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Документы с фотографиями */}
        {cleaning.documents && cleaning.documents.length > 0 && (
          <div>
            <Heading level={3} className="mb-4">📂 Документы и фотографии</Heading>
            <div className="space-y-6">
              {cleaning.documents.map((doc: any) => (
                <div key={doc.id} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    {getDocumentTypeBadge(doc.type)}
                    <Text className="text-xs text-gray-500">
                      {new Date(doc.createdAt).toLocaleString('ru-RU')}
                    </Text>
                  </div>

                  {doc.notes && (
                    <div className="mb-3">
                      <Text className="text-sm text-gray-700 dark:text-gray-300">{doc.notes}</Text>
                    </div>
                  )}

                  {doc.photos && doc.photos.length > 0 && (
                    <div>
                      <Text className="text-sm font-medium mb-2">
                        Фотографии ({doc.photos.length})
                      </Text>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {doc.photos.map((photo: any) => (
                          <div key={photo.id} className="space-y-2">
                            <div className="aspect-video bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                              <img
                                src={photo.url}
                                alt={photo.caption || 'Фото'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="14" fill="%236b7280"%3EНе загружено%3C/text%3E%3C/svg%3E'
                                }}
                              />
                            </div>
                            {photo.caption && (
                              <Text className="text-xs text-gray-600 dark:text-gray-400">
                                {photo.caption}
                              </Text>
                            )}
                            <a
                              href={photo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 block truncate"
                            >
                              Открыть оригинал →
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Метаинформация */}
        <div className="border-t border-gray-200 dark:border-zinc-700 pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div>
              <Text>Создана: {new Date(cleaning.createdAt).toLocaleString('ru-RU')}</Text>
            </div>
            <div>
              <Text>Обновлена: {new Date(cleaning.updatedAt).toLocaleString('ru-RU')}</Text>
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

