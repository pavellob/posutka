'use client'

import { use } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { graphqlClient } from '@/lib/graphql-client'
import { useRouter } from 'next/navigation'
import { ClockIcon, HomeIcon } from '@heroicons/react/24/outline'

const GET_CLEANING = `
  query GetCleaning($id: ID!) {
    cleaning(id: $id) {
      id
      status
      scheduledAt
      requiresLinenChange
      unit {
        id
        name
        property {
          id
          title
        }
      }
      cleaner {
        id
        firstName
        lastName
      }
    }
  }
`

const START_CLEANING = `
  mutation StartCleaning($id: ID!) {
    startCleaning(id: $id) {
      id
      status
    }
  }
`

type StartCleaningPageProps = {
  params: Promise<{
    id: string
  }>
}

export default function StartCleaningPage(props: StartCleaningPageProps) {
  const params = use(props.params)
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['cleaning', params.id],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_CLEANING, {
        id: params.id
      }) as any
      return response.cleaning
    }
  })

  const startMutation = useMutation({
    mutationFn: async () => {
      return await graphqlClient.request(START_CLEANING, {
        id: params.id
      })
    },
    onSuccess: () => {
      // Редиректим на страницу деталей уборки
      router.push(`/cleanings/${params.id}`)
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <Text>Загрузка...</Text>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <Heading>Уборка не найдена</Heading>
        <Button onClick={() => router.push('/cleanings')} className="mt-4">
          К списку уборок
        </Button>
      </div>
    )
  }

  const cleaning = data
  const scheduledDate = new Date(cleaning.scheduledAt)
  const formattedDate = scheduledDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const formattedTime = scheduledDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const canStart = cleaning.status === 'SCHEDULED'

  // Если уборка уже начата - редиректим на страницу деталей
  if (!canStart) {
    router.push(`/cleanings/${params.id}`)
    return null
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Heading>Начать уборку</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Подтвердите начало выполнения уборки
        </Text>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <HomeIcon className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">
                {cleaning.unit.property?.title}
              </h2>
              <p className="text-blue-100">{cleaning.unit.name}</p>
            </div>
          </div>
        </div>

        {/* Детали */}
        <div className="p-6 space-y-6">
          {/* Дата и время */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <ClockIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Запланировано</Text>
              <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
                {formattedDate} в {formattedTime}
              </Text>
            </div>
          </div>

          {/* Смена белья */}
          {cleaning.requiresLinenChange && (
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <Badge color="amber">Важно</Badge>
                <Text className="font-medium text-amber-900 dark:text-amber-100">
                  Требуется смена постельного белья
                </Text>
              </div>
            </div>
          )}

          {/* Информация */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <Text className="text-sm text-blue-900 dark:text-blue-100">
              💡 После начала уборки вы сможете заполнить чеклист на странице деталей
            </Text>
          </div>

          {/* Кнопки */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              color="blue"
              className="flex-1"
            >
              {startMutation.isPending ? 'Начинаем...' : '▶️ Начать уборку'}
            </Button>
            <Button
              onClick={() => router.push('/cleanings')}
              outline
            >
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
