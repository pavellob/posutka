'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from './dialog'
import { Button } from './button'
import { Heading } from './heading'
import { Text } from './text'
import { Badge } from './badge'
import { graphqlClient } from '@/lib/graphql-client'
import { GET_CLEANING, UPDATE_CLEANING_SCHEDULED_AT } from '@/lib/graphql-queries'

interface CleaningDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  cleaningId: string | null
  onTake?: (cleaningId: string) => void
  onCreateChecklist?: (cleaningId: string) => void
}

export function CleaningDetailsDialog({
  isOpen,
  onClose,
  cleaningId,
  onTake,
  onCreateChecklist
}: CleaningDetailsDialogProps) {
  const queryClient = useQueryClient()
  const [scheduledAtLocal, setScheduledAtLocal] = useState('')
  const [isEditingTime, setIsEditingTime] = useState(false)
  // Запрос деталей уборки
  const { data: cleaningData, isLoading } = useQuery<any>({
    queryKey: ['cleaning', cleaningId],
    queryFn: () => graphqlClient.request(GET_CLEANING, { id: cleaningId }),
    enabled: isOpen && !!cleaningId
  })

  useEffect(() => {
    const iso = cleaningData?.cleaning?.scheduledAt
    if (iso) {
      const dt = new Date(iso)
      const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      setScheduledAtLocal(local.toISOString().slice(0, 16)) // YYYY-MM-DDTHH:mm
    }
  }, [cleaningData])

  const updateTimeMutation = useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      graphqlClient.request(UPDATE_CLEANING_SCHEDULED_AT, { id, scheduledAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', cleaningId] })
      setIsEditingTime(false)
    },
    onError: (err: any) => {
      alert(`Не удалось обновить время: ${err.message || 'Ошибка'}`)
    }
  })

  const cleaning = cleaningData?.cleaning

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'SCHEDULED': { text: 'Запланирована' },
      'IN_PROGRESS': { text: 'В процессе' },
      'COMPLETED': { text: 'Завершена' },
      'CANCELLED': { text: 'Отменена' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { text: status }
    return <Badge color="zinc">{statusInfo.text}</Badge>
  }

  const getDocumentTypeBadge = (type: string) => {
    if (type === 'PRE_CLEANING_ACCEPTANCE') {
      return <Badge color="zinc">📸 Приемка ДО уборки</Badge>
    }
    return <Badge color="zinc">📸 Сдача ПОСЛЕ уборки</Badge>
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
      <DialogTitle className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            Подробности уборки
            <DialogDescription>
              Полная информация об уборке #{cleaning.id.substring(0, 8)}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => cleaning.id && onCreateChecklist?.(cleaning.id)}
              disabled={!onCreateChecklist}
              className="h-9 px-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              Создать чеклист
            </Button>
            <Button
              onClick={() => cleaning.id && onTake?.(cleaning.id)}
              disabled={!onTake}
              className="h-9 px-3 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-600 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
            >
              Взять в работу
            </Button>
          </div>
        </div>
      </DialogTitle>
      
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
              <Text className="font-medium text-lg text-gray-900 dark:text-white">
                {cleaning.unit?.name || 'N/A'}
              </Text>
            </div>

            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Уборщик</Text>
              <div className="flex items-center space-x-2">
                <Text className="font-medium text-gray-900 dark:text-white">
                  {cleaning.cleaner?.firstName} {cleaning.cleaner?.lastName}
                </Text>
                {cleaning.cleaner?.rating && (
                  <Badge color="zinc">⭐ {cleaning.cleaner.rating.toFixed(1)}</Badge>
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
              <div className="flex items-center gap-2">
                {!isEditingTime && (
                  <>
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {new Date(cleaning.scheduledAt).toLocaleString('ru-RU')}
                    </Text>
                    <Button
                      onClick={() => setIsEditingTime(true)}
                      className="h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      Редактировать
                    </Button>
                  </>
                )}
                {isEditingTime && (
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={scheduledAtLocal}
                      onChange={(e) => setScheduledAtLocal(e.target.value)}
                      className="border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                    />
                    <Button
                        onClick={() => scheduledAtLocal && cleaning.id && updateTimeMutation.mutate({ id: cleaning.id, scheduledAt: new Date(scheduledAtLocal).toISOString() })}
                      disabled={updateTimeMutation.isPending}
                      className="h-8 px-3 bg-black text-white hover:bg-gray-800"
                    >
                      {updateTimeMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                    <Button
                      onClick={() => setIsEditingTime(false)}
                      className="h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      Отмена
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {cleaning.startedAt && (
              <div>
                <Text className="text-sm text-gray-500 dark:text-gray-400">Начата</Text>
                <Text className="font-medium text-gray-800 dark:text-gray-200">
                  {new Date(cleaning.startedAt).toLocaleString('ru-RU')}
                </Text>
              </div>
            )}

            {cleaning.completedAt && (
              <div>
                <Text className="text-sm text-gray-500 dark:text-gray-400">Завершена</Text>
                <Text className="font-medium text-gray-800 dark:text-gray-200">
                  {new Date(cleaning.completedAt).toLocaleString('ru-RU')}
                </Text>
              </div>
            )}

            <div>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Смена белья</Text>
              <Badge color="zinc">{cleaning.requiresLinenChange ? 'Да' : 'Нет'}</Badge>
            </div>

            {cleaning.booking && (
              <div>
                <Text className="text-sm text-gray-500 dark:text-gray-400">Связь</Text>
                <Badge color="zinc">С бронированием</Badge>
              </div>
            )}

            {cleaning.taskId && (
              <div>
                <Text className="text-sm text-gray-500 dark:text-gray-400">Задача</Text>
                <Badge color="zinc">Связана с задачей</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Заметки */}
        {cleaning.notes && (
          <div className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Heading level={4} className="mb-2">📝 Заметки</Heading>
            <Text className="text-gray-800 dark:text-gray-200">{cleaning.notes}</Text>
          </div>
        )}

        {/* Чеклист */}
        {cleaning.checklistItems && cleaning.checklistItems.length > 0 && (
          <div>
            <Heading level={3} className="mb-4 text-gray-900 dark:text-white">✅ Чеклист уборки</Heading>
            <div className="space-y-2">
              {cleaning.checklistItems.map((item: any) => (
                <div 
                  key={item.id} 
                  className="flex items-center space-x-3 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
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
              <div className="w-48 bg-gray-200 dark:bg-zinc-800 rounded-full h-2">
                <div 
                  className="bg-gray-700 dark:bg-gray-200 h-2 rounded-full"
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
            <Heading level={3} className="mb-4 text-gray-900 dark:text-white">📂 Документы и фотографии</Heading>
            <div className="space-y-6">
              {cleaning.documents.map((doc: any) => (
                <div key={doc.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-white dark:bg-zinc-900">
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
                      <Text className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
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
                              className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block truncate"
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

