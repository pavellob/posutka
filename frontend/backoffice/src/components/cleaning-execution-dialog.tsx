'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from './dialog'
import { Button } from './button'
import { Input } from './input'
import { Textarea } from './textarea'
import { Heading } from './heading'
import { Text } from './text'
import { Badge } from './badge'
import { graphqlClient } from '@/lib/graphql-client'
import {
  GET_CLEANERS,
  SCHEDULE_CLEANING,
  START_CLEANING,
  COMPLETE_CLEANING,
  CREATE_PRE_CLEANING_DOCUMENT,
  CREATE_POST_CLEANING_DOCUMENT,
  UPDATE_CLEANING_CHECKLIST,
  GET_CLEANING_BY_TASK
} from '@/lib/graphql-queries'

interface Task {
  id: string
  type: string
  dueAt?: string
  note?: string
  unit?: {
    id: string
    name: string
    property?: {
      id: string
      title: string
    }
  }
  booking?: {
    id: string
  }
}

interface CleaningExecutionDialogProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  orgId: string
}

export function CleaningExecutionDialog({
  isOpen,
  onClose,
  task,
  orgId
}: CleaningExecutionDialogProps) {
  const [step, setStep] = useState<'create' | 'pre-checklist' | 'post-checklist' | 'completed'>('create')
  const [selectedCleaner, setSelectedCleaner] = useState('')
  const [requiresLinenChange, setRequiresLinenChange] = useState(false)
  const [notes, setNotes] = useState('')
  const [currentCleaningId, setCurrentCleaningId] = useState<string | null>(null)
  
  // Чеклисты
  const [preChecklistItems, setPreChecklistItems] = useState<Array<{ label: string; isChecked: boolean }>>([
    { label: 'Проверить состояние мебели', isChecked: false },
    { label: 'Проверить бытовую технику', isChecked: false },
    { label: 'Проверить сантехнику', isChecked: false },
    { label: 'Сфотографировать текущее состояние', isChecked: false }
  ])
  
  const [postChecklistItems, setPostChecklistItems] = useState<Array<{ id?: string; label: string; isChecked: boolean }>>([
    { label: 'Пропылесосить все комнаты', isChecked: false },
    { label: 'Помыть полы', isChecked: false },
    { label: 'Протереть пыль', isChecked: false },
    { label: 'Убрать в ванной', isChecked: false },
    { label: 'Убрать на кухне', isChecked: false },
    { label: 'Сменить постельное белье', isChecked: false },
    { label: 'Проверить все приборы', isChecked: false },
    { label: 'Вынести мусор', isChecked: false }
  ])
  
  // Фотографии
  const [preCleaningPhotos, setPreCleaningPhotos] = useState<Array<{ url: string; caption: string }>>([])
  const [postCleaningPhotos, setPostCleaningPhotos] = useState<Array<{ url: string; caption: string }>>([])
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoCaption, setPhotoCaption] = useState('')
  
  const queryClient = useQueryClient()

  // Получить уборщиков
  const { data: cleanersData } = useQuery<any>({
    queryKey: ['cleaners', orgId],
    queryFn: () => graphqlClient.request(GET_CLEANERS, {
      orgId,
      isActive: true,
      first: 100
    }),
    enabled: isOpen && !!orgId
  })

  // Проверить существующую уборку для этой задачи
  const { data: existingCleaningData } = useQuery<any>({
    queryKey: ['cleaning-by-task', task?.id],
    queryFn: () => graphqlClient.request(GET_CLEANING_BY_TASK, {
      taskId: task?.id
    }),
    enabled: isOpen && !!task?.id
  })

  useEffect(() => {
    if (existingCleaningData?.cleaningByTask) {
      const cleaning = existingCleaningData.cleaningByTask as any
      setCurrentCleaningId(cleaning.id)
      
      if (cleaning.status === 'SCHEDULED') {
        setStep('pre-checklist')
      } else if (cleaning.status === 'IN_PROGRESS') {
        setStep('post-checklist')
        if (cleaning.checklistItems) {
          setPostChecklistItems(cleaning.checklistItems.map((item: any) => ({
            id: item.id,
            label: item.label,
            isChecked: item.isChecked
          })))
        }
      } else if (cleaning.status === 'COMPLETED') {
        setStep('completed')
      }
    }
  }, [existingCleaningData])

  // Мутации
  const scheduleCleaningMutation = useMutation({
    mutationFn: (input: any) => {
      console.log('Создание уборки с данными:', input)
      return graphqlClient.request(SCHEDULE_CLEANING, { input })
    },
    onSuccess: (data: any) => {
      console.log('Уборка создана успешно:', data)
      setCurrentCleaningId(data.scheduleCleaning.id)
      setStep('pre-checklist')
      // Обновляем кэш задач
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error: any) => {
      console.error('Ошибка создания уборки:', error)
      alert(`Ошибка при создании уборки: ${error.message || JSON.stringify(error.response?.errors || error)}`)
    }
  })

  const startCleaningMutation = useMutation({
    mutationFn: (id: string) => graphqlClient.request(START_CLEANING, { id }),
    onSuccess: () => {
      setStep('post-checklist')
      // Обновляем кэш задач
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const completeCleaningMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => 
      graphqlClient.request(COMPLETE_CLEANING, { id, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanings'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['cleaning-by-task'] })
      setStep('completed')
    }
  })

  const createPreDocumentMutation = useMutation({
    mutationFn: ({ cleaningId, input }: { cleaningId: string; input: any }) =>
      graphqlClient.request(CREATE_PRE_CLEANING_DOCUMENT, { cleaningId, input })
  })

  const createPostDocumentMutation = useMutation({
    mutationFn: ({ cleaningId, input }: { cleaningId: string; input: any }) =>
      graphqlClient.request(CREATE_POST_CLEANING_DOCUMENT, { cleaningId, input })
  })

  const updateChecklistMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: any[] }) =>
      graphqlClient.request(UPDATE_CLEANING_CHECKLIST, { id, items })
  })

  const cleaners = cleanersData?.cleaners?.edges?.map((edge: any) => edge.node) || []
  
  // Отладка загрузки уборщиков
  useEffect(() => {
    if (isOpen) {
      console.log('Диалог открыт, cleanersData:', cleanersData)
      console.log('Количество уборщиков:', cleaners.length)
      console.log('Текущий выбранный уборщик:', selectedCleaner)
    }
  }, [isOpen, cleanersData, cleaners.length, selectedCleaner])

  const handleCreateCleaning = async () => {
    const unitId = task?.unit?.id
    console.log('handleCreateCleaning вызван', { selectedCleaner, unitId, task })
    
    if (!selectedCleaner) {
      alert('Выберите уборщика')
      console.log('Ошибка: уборщик не выбран')
      return
    }
    
    if (!unitId) {
      alert('Ошибка: не указан юнит в задаче')
      console.log('Ошибка: unit.id отсутствует в задаче', { task })
      return
    }

    await scheduleCleaningMutation.mutateAsync({
      orgId,
      cleanerId: selectedCleaner,
      unitId: unitId,
      bookingId: task.booking?.id,
      taskId: task.id,
      scheduledAt: task.dueAt || new Date().toISOString(),
      requiresLinenChange,
      notes,
      checklistItems: postChecklistItems.map((item, index) => ({
        label: item.label,
        isChecked: false,
        order: index
      }))
    })
  }

  const handleStartCleaning = async () => {
    if (!currentCleaningId) return

    // Создать документ приемки
    if (preCleaningPhotos.length > 0) {
      await createPreDocumentMutation.mutateAsync({
        cleaningId: currentCleaningId,
        input: {
          notes: 'Приемка юнита перед уборкой',
          photos: preCleaningPhotos.map((photo, index) => ({
            url: photo.url,
            caption: photo.caption,
            order: index
          }))
        }
      })
    }

    await startCleaningMutation.mutateAsync(currentCleaningId)
  }

  const handleCompleteCleaning = async () => {
    if (!currentCleaningId) return

    // Проверяем, что все чекбоксы отмечены
    const uncheckedItems = postChecklistItems.filter(item => !item.isChecked)
    if (uncheckedItems.length > 0) {
      alert(`⚠️ Невозможно завершить уборку!\n\nНе отмечены следующие пункты:\n${uncheckedItems.map(item => `• ${item.label}`).join('\n')}\n\nПожалуйста, выполните все пункты чеклиста.`)
      return
    }

    // Обновить чеклист
    await updateChecklistMutation.mutateAsync({
      id: currentCleaningId,
      items: postChecklistItems.map((item, index) => ({
        id: item.id,
        label: item.label,
        isChecked: item.isChecked,
        order: index
      }))
    })

    // Создать документ сдачи
    if (postCleaningPhotos.length > 0) {
      await createPostDocumentMutation.mutateAsync({
        cleaningId: currentCleaningId,
        input: {
          notes: 'Сдача убранного юнита',
          photos: postCleaningPhotos.map((photo, index) => ({
            url: photo.url,
            caption: photo.caption,
            order: index
          }))
        }
      })
    }

    await completeCleaningMutation.mutateAsync({
      id: currentCleaningId,
      input: {
        notes: 'Уборка завершена',
        checklistItems: postChecklistItems.map((item, index) => ({
          id: item.id,
          label: item.label,
          isChecked: item.isChecked,
          order: index
        }))
      }
    })
  }

  const handleAddPhoto = (type: 'pre' | 'post') => {
    if (!photoUrl) return
    
    const newPhoto = { url: photoUrl, caption: photoCaption }
    if (type === 'pre') {
      setPreCleaningPhotos([...preCleaningPhotos, newPhoto])
    } else {
      setPostCleaningPhotos([...postCleaningPhotos, newPhoto])
    }
    setPhotoUrl('')
    setPhotoCaption('')
  }

  const handleClose = () => {
    setStep('create')
    setSelectedCleaner('')
    setRequiresLinenChange(false)
    setNotes('')
    setCurrentCleaningId(null)
    setPreCleaningPhotos([])
    setPostCleaningPhotos([])
    onClose()
  }

  if (!task) return null

  return (
    <Dialog open={isOpen} onClose={handleClose} size="4xl">
      <DialogTitle>Выполнить уборку</DialogTitle>
      <DialogDescription>
        Задача: {task.unit?.property?.title} - {task.unit?.name}
      </DialogDescription>
      
      <DialogBody>
        {/* Шаг 1: Создание уборки */}
        {step === 'create' && (
          <div className="space-y-6">
            <Heading level={3}>Назначить уборщика</Heading>
            
            <div>
              <label className="block text-sm font-medium mb-2">Уборщик *</label>
              <select
                value={selectedCleaner}
                onChange={(e) => {
                  console.log('Выбран уборщик:', e.target.value)
                  setSelectedCleaner(e.target.value)
                }}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2"
              >
                <option value="">Выберите уборщика</option>
                {cleaners.map((cleaner: any) => (
                  <option key={cleaner.id} value={cleaner.id}>
                    {cleaner.firstName} {cleaner.lastName} {cleaner.rating ? `⭐ ${cleaner.rating.toFixed(1)}` : ''}
                  </option>
                ))}
              </select>
              {selectedCleaner && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Выбран: {cleaners.find((c: any) => c.id === selectedCleaner)?.firstName} {cleaners.find((c: any) => c.id === selectedCleaner)?.lastName}
                </p>
              )}
              {cleaners.length === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  ⚠️ Нет доступных уборщиков. Создайте уборщика на странице /cleaners
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={requiresLinenChange}
                  onChange={(e) => setRequiresLinenChange(e.target.checked)}
                  className="rounded"
                />
                <span>Требуется смена белья</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Заметки</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Дополнительные заметки..."
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Шаг 2: Чеклист приемки */}
        {step === 'pre-checklist' && (
          <div className="space-y-6">
            <div>
              <Heading level={3}>Приемка юнита</Heading>
              <Text className="text-sm text-gray-500">Проверьте состояние юнита перед уборкой</Text>
            </div>

            <div className="space-y-2">
              {preChecklistItems.map((item, index) => (
                <label key={index} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded">
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    onChange={(e) => {
                      const newItems = [...preChecklistItems]
                      newItems[index].isChecked = e.target.checked
                      setPreChecklistItems(newItems)
                    }}
                    className="rounded"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            <div>
              <Heading level={4}>Фотографии ДО уборки</Heading>
              <div className="space-y-2 mt-2">
                <Input
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="URL фотографии"
                />
                <Input
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Описание (опционально)"
                />
                <Button onClick={() => handleAddPhoto('pre')} type="button">
                  Добавить фото
                </Button>
              </div>
              
              {preCleaningPhotos.length > 0 && (
                <div className="mt-4 space-y-2">
                  {preCleaningPhotos.map((photo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-800 rounded">
                      <div>
                        <Text className="text-sm font-medium">{photo.caption || 'Фото ' + (index + 1)}</Text>
                        <Text className="text-xs text-gray-500 truncate max-w-xs">{photo.url}</Text>
                      </div>
                      <Button
                        onClick={() => setPreCleaningPhotos(preCleaningPhotos.filter((_, i) => i !== index))}
                        className="text-red-600"
                      >
                        Удалить
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Шаг 3: Чеклист уборки */}
        {step === 'post-checklist' && (
          <div className="space-y-6">
            <div>
              <Heading level={3}>Выполнение уборки</Heading>
              <Text className="text-sm text-gray-500">Отметьте выполненные задачи (все пункты обязательны)</Text>
              
              {/* Прогресс-бар */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Text className="text-sm font-medium">
                    Прогресс: {postChecklistItems.filter(item => item.isChecked).length} из {postChecklistItems.length}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {Math.round((postChecklistItems.filter(item => item.isChecked).length / postChecklistItems.length) * 100)}%
                  </Text>
                </div>
                <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      postChecklistItems.filter(item => item.isChecked).length === postChecklistItems.length 
                        ? 'bg-green-600' 
                        : 'bg-blue-600'
                    }`}
                    style={{ 
                      width: `${(postChecklistItems.filter(item => item.isChecked).length / postChecklistItems.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {postChecklistItems.map((item, index) => (
                <label key={index} className={`flex items-center space-x-2 p-3 rounded border transition-colors ${
                  item.isChecked 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800' 
                    : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    onChange={(e) => {
                      const newItems = [...postChecklistItems]
                      newItems[index].isChecked = e.target.checked
                      setPostChecklistItems(newItems)
                    }}
                    className="rounded text-green-600 focus:ring-green-500"
                  />
                  <span className={item.isChecked ? 'line-through text-gray-500' : ''}>{item.label}</span>
                  {item.isChecked && <span className="ml-auto text-green-600">✓</span>}
                </label>
              ))}
            </div>

            <div>
              <Heading level={4}>Фотографии ПОСЛЕ уборки</Heading>
              <div className="space-y-2 mt-2">
                <Input
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="URL фотографии"
                />
                <Input
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Описание (опционально)"
                />
                <Button onClick={() => handleAddPhoto('post')} type="button">
                  Добавить фото
                </Button>
              </div>
              
              {postCleaningPhotos.length > 0 && (
                <div className="mt-4 space-y-2">
                  {postCleaningPhotos.map((photo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-800 rounded">
                      <div>
                        <Text className="text-sm font-medium">{photo.caption || 'Фото ' + (index + 1)}</Text>
                        <Text className="text-xs text-gray-500 truncate max-w-xs">{photo.url}</Text>
                      </div>
                      <Button
                        onClick={() => setPostCleaningPhotos(postCleaningPhotos.filter((_, i) => i !== index))}
                        className="text-red-600"
                      >
                        Удалить
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Шаг 4: Завершено */}
        {step === 'completed' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <Heading level={2}>Уборка завершена!</Heading>
            <Text className="mt-2 text-gray-500">
              Документы приемки и сдачи созданы
            </Text>
          </div>
        )}
      </DialogBody>

      <DialogActions>
        <Button onClick={handleClose}>
          {step === 'completed' ? 'Закрыть' : 'Отмена'}
        </Button>
        
        {step === 'create' && (
          <Button 
            onClick={handleCreateCleaning} 
            disabled={!selectedCleaner || scheduleCleaningMutation.isPending}
            className="bg-black hover:bg-gray-800 text-white"
          >
            {scheduleCleaningMutation.isPending ? 'Создание...' : 'Создать уборку'}
          </Button>
        )}
        
        {step === 'pre-checklist' && (
          <Button onClick={handleStartCleaning}>
            Начать уборку
          </Button>
        )}
        
        {step === 'post-checklist' && (
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleCompleteCleaning}
              className={`flex-1 ${
                postChecklistItems.filter(item => item.isChecked).length === postChecklistItems.length
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
              disabled={postChecklistItems.filter(item => item.isChecked).length !== postChecklistItems.length}
            >
              {postChecklistItems.filter(item => item.isChecked).length === postChecklistItems.length
                ? '✓ Завершить уборку'
                : `Завершить уборку (${postChecklistItems.filter(item => item.isChecked).length}/${postChecklistItems.length})`}
            </Button>
          </div>
        )}
      </DialogActions>
    </Dialog>
  )
}

