'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'
import { CREATE_TASK_FOR_NEXT_CHECKLIST, GET_CLEANERS } from '@/lib/graphql-queries'
import { Dialog, DialogTitle, DialogBody, DialogActions, DialogDescription } from '@/components/dialog'
import { Button } from '@/components/button'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Input } from '@/components/input'

interface CreateTaskForNextCleaningProps {
  isOpen: boolean
  onClose: () => void
  unitId: string
  orgId: string
  sourceCleaningId?: string
  onSuccess?: () => void
}

export function CreateTaskForNextCleaning({
  isOpen,
  onClose,
  unitId,
  orgId,
  sourceCleaningId,
  onSuccess,
}: CreateTaskForNextCleaningProps) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загружаем уборщиков
  const { data: cleanersData } = useQuery({
    queryKey: ['cleaners', orgId],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_CLEANERS, {
        orgId,
        isActive: true,
        first: 100,
      }) as any
      return response.cleaners?.edges?.map((edge: any) => edge.node) || []
    },
    enabled: isOpen && !!orgId,
  })

  const createTaskMutation = useMutation({
    mutationFn: async (input: any) => {
      return graphqlClient.request(CREATE_TASK_FOR_NEXT_CHECKLIST, { input }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onSuccess?.()
      handleClose()
    },
    onError: (error: any) => {
      setError(error?.message || 'Не удалось создать задачу')
      setIsSubmitting(false)
    },
  })

  const handleClose = () => {
    setNote('')
    setDueAt('')
    setError(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!note.trim()) {
      setError('Укажите описание задачи')
      return
    }

    setIsSubmitting(true)

    const input: any = {
      orgId,
      type: 'CLEANING',
      unitId,
      plannedForNextChecklist: true,
      note: note.trim(),
      dueAt: dueAt || undefined,
    }

    if (sourceCleaningId) {
      input.sourceCleaningId = sourceCleaningId
    }

    try {
      await createTaskMutation.mutateAsync(input)
    } catch (err) {
      // Ошибка уже обработана в onError
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      <DialogTitle>Создать задачу для следующей уборки</DialogTitle>
      <DialogDescription>
        Задача будет автоматически добавлена в чек-лист при создании следующей уборки для этого юнита.
      </DialogDescription>
      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
              <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Описание задачи *
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Что нужно сделать в следующей уборке?"
              rows={4}
              className="w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Срок выполнения (опционально)
            </label>
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
            <Text className="text-sm text-blue-800 dark:text-blue-200">
              💡 Задача будет автоматически добавлена в чек-лист при создании следующей уборки для этого юнита.
            </Text>
          </div>
        </DialogBody>
        <DialogActions>
          <Button type="button" outline onClick={handleClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting || !note.trim()}>
            {isSubmitting ? 'Создаём...' : 'Создать задачу'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

