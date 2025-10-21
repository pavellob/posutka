'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Dialog } from '@/components/dialog'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Input } from '@/components/input'
import { graphqlClient } from '@/lib/graphql-client'
import { 
  GET_UNIT_PREFERRED_CLEANERS, 
  ADD_PREFERRED_CLEANER, 
  REMOVE_PREFERRED_CLEANER 
} from '@/lib/graphql-queries'

type Cleaner = {
  id: string
  firstName: string
  lastName: string
  telegramUsername: string | null
  rating: number | null
  isActive: boolean
}

type CleanerPreference = {
  id: string
  cleaner: Cleaner
  createdAt: string
}

type ManageUnitCleanersDialogProps = {
  isOpen: boolean
  onClose: () => void
  unitId: string
  unitName: string
  orgId: string
  availableCleaners: Cleaner[]
}

export function ManageUnitCleanersDialog({
  isOpen,
  onClose,
  unitId,
  unitName,
  orgId,
  availableCleaners
}: ManageUnitCleanersDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Получить привязанных уборщиков для квартиры
  const { data: preferredData, refetch } = useQuery({
    queryKey: ['unitPreferredCleaners', unitId],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_UNIT_PREFERRED_CLEANERS, { 
        unitId 
      }) as { unitPreferredCleaners: CleanerPreference[] }
      return response
    },
    enabled: isOpen && !!unitId
  })

  // Мутация добавления уборщика
  const addCleanerMutation = useMutation({
    mutationFn: async (cleanerId: string) => {
      return await graphqlClient.request(ADD_PREFERRED_CLEANER, {
        unitId,
        cleanerId
      })
    },
    onSuccess: () => {
      refetch()
    }
  })

  // Мутация удаления уборщика
  const removeCleanerMutation = useMutation({
    mutationFn: async (cleanerId: string) => {
      return await graphqlClient.request(REMOVE_PREFERRED_CLEANER, {
        unitId,
        cleanerId
      })
    },
    onSuccess: () => {
      refetch()
    }
  })

  const handleAddCleaner = async (cleanerId: string) => {
    try {
      await addCleanerMutation.mutateAsync(cleanerId)
    } catch (error) {
      console.error('Error adding cleaner:', error)
      alert('Ошибка при добавлении уборщика')
    }
  }

  const handleRemoveCleaner = async (cleanerId: string) => {
    try {
      await removeCleanerMutation.mutateAsync(cleanerId)
    } catch (error) {
      console.error('Error removing cleaner:', error)
      alert('Ошибка при удалении уборщика')
    }
  }

  const preferredCleanerIds = new Set(
    preferredData?.unitPreferredCleaners?.map(p => p.cleaner.id) || []
  )

  // Фильтрация уборщиков по поиску
  const filteredCleaners = availableCleaners.filter(cleaner => {
    const fullName = `${cleaner.firstName} ${cleaner.lastName}`.toLowerCase()
    const telegram = cleaner.telegramUsername?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()
    
    return fullName.includes(query) || telegram.includes(query)
  })

  // Сортировка: сначала привязанные, потом по имени
  const sortedCleaners = [...filteredCleaners].sort((a, b) => {
    const aIsPreferred = preferredCleanerIds.has(a.id)
    const bIsPreferred = preferredCleanerIds.has(b.id)
    
    if (aIsPreferred && !bIsPreferred) return -1
    if (!aIsPreferred && bIsPreferred) return 1
    
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  })

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <Heading level={2}>Управление уборщиками</Heading>
            <Text className="text-zinc-600 dark:text-zinc-400 mt-1">
              Квартира: {unitName}
            </Text>
          </div>
          <Button onClick={onClose} color="zinc">
            ✕
          </Button>
        </div>

        {/* Информация */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <Text className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Как это работает?
              </Text>
              <Text className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Привязанные уборщики будут получать уведомления в Telegram о новых уборках в этой квартире.
                Они смогут самостоятельно назначить себя на уборку через Telegram Mini App.
              </Text>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <Text className="text-sm text-zinc-600 dark:text-zinc-400">Привязано уборщиков</Text>
            <Text className="text-2xl font-bold text-blue-600 mt-1">
              {preferredCleanerIds.size}
            </Text>
          </div>
          <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <Text className="text-sm text-zinc-600 dark:text-zinc-400">Всего уборщиков</Text>
            <Text className="text-2xl font-bold text-green-600 mt-1">
              {availableCleaners.length}
            </Text>
          </div>
        </div>

        {/* Поиск */}
        <div>
          <Input
            type="search"
            placeholder="Поиск по имени или Telegram..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Список уборщиков */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedCleaners.length === 0 && (
            <div className="text-center py-8">
              <Text className="text-zinc-500">
                {searchQuery ? 'Уборщики не найдены' : 'Нет доступных уборщиков'}
              </Text>
            </div>
          )}

          {sortedCleaners.map((cleaner) => {
            const isPreferred = preferredCleanerIds.has(cleaner.id)
            const isLoading = 
              addCleanerMutation.isPending || 
              removeCleanerMutation.isPending

            return (
              <div
                key={cleaner.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  isPreferred
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center space-x-4">
                  {/* Аватар */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                    isPreferred ? 'bg-green-500' : 'bg-zinc-400'
                  }`}>
                    {cleaner.firstName[0]}{cleaner.lastName[0]}
                  </div>

                  {/* Информация */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <Text className="font-medium text-gray-900 dark:text-white">
                        {cleaner.firstName} {cleaner.lastName}
                      </Text>
                      {isPreferred && (
                        <Badge color="green" className="text-xs">
                          ✓ Привязан
                        </Badge>
                      )}
                      {!cleaner.isActive && (
                        <Badge color="red" className="text-xs">
                          Неактивен
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 mt-1">
                      {cleaner.telegramUsername && (
                        <Text className="text-sm text-zinc-500">
                          @{cleaner.telegramUsername}
                        </Text>
                      )}
                      {cleaner.rating && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                            {cleaner.rating.toFixed(1)}
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Кнопка действия */}
                <Button
                  onClick={() => 
                    isPreferred 
                      ? handleRemoveCleaner(cleaner.id) 
                      : handleAddCleaner(cleaner.id)
                  }
                  color={isPreferred ? 'red' : 'green'}
                  disabled={isLoading || !cleaner.isActive}
                  className="min-w-[120px]"
                >
                  {isPreferred ? '❌ Отвязать' : '✅ Привязать'}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Кнопка закрытия */}
        <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Button onClick={onClose} color="blue">
            Готово
          </Button>
        </div>
      </div>
    </Dialog>
  )
}


