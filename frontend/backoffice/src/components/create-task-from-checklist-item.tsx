'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'
import { CREATE_TASK_FROM_CHECKLIST_ITEM, GET_SERVICE_PROVIDERS, GET_CLEANERS, GET_MASTERS } from '@/lib/graphql-queries'
import { Dialog, DialogTitle, DialogBody, DialogActions, DialogDescription } from '@/components/dialog'
import { Button } from '@/components/button'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Input } from '@/components/input'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'

interface CreateTaskFromChecklistItemProps {
  isOpen: boolean
  onClose: () => void
  checklistItemInstanceId: string
  checklistItemTitle: string
  unitId: string
  orgId: string
  onSuccess?: () => void
}

export function CreateTaskFromChecklistItem({
  isOpen,
  onClose,
  checklistItemInstanceId,
  checklistItemTitle,
  unitId,
  orgId,
  onSuccess,
}: CreateTaskFromChecklistItemProps) {
  const queryClient = useQueryClient()
  const [taskType, setTaskType] = useState<'CLEANING' | 'MAINTENANCE' | 'INVENTORY'>('MAINTENANCE')
  const [assigneeType, setAssigneeType] = useState<'PROVIDER' | 'CLEANER' | 'MASTER'>('MASTER')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загружаем поставщиков услуг
  const { data: providersData } = useQuery({
    queryKey: ['service-providers', orgId],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_SERVICE_PROVIDERS, {
        serviceTypes: ['MAINTENANCE', 'INVENTORY'],
      }) as any
      return response.serviceProviders || []
    },
    enabled: isOpen && !!orgId,
  })

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

  // Загружаем мастеров
  const { data: mastersData } = useQuery({
    queryKey: ['masters', orgId],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_MASTERS, {
        orgId,
        isActive: true,
        first: 100,
      }) as any
      return response.masters?.edges?.map((edge: any) => edge.node) || []
    },
    enabled: isOpen && !!orgId,
  })

  const createTaskMutation = useMutation({
    mutationFn: async (input: any) => {
      return graphqlClient.request(CREATE_TASK_FROM_CHECKLIST_ITEM, { input }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['checklist-instance'] })
      onSuccess?.()
      handleClose()
    },
    onError: (error: any) => {
      setError(error?.message || 'Не удалось создать задачу')
      setIsSubmitting(false)
    },
  })

  const handleClose = () => {
    setTaskType('MAINTENANCE')
    setAssigneeType('MASTER')
    setAssigneeId('')
    setDueAt('')
    setNote('')
    setError(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!assigneeId) {
      setError('Выберите исполнителя')
      return
    }

    setIsSubmitting(true)

    const input: any = {
      orgId,
      type: taskType,
      unitId,
      checklistItemInstanceId,
      note: note || checklistItemTitle,
      dueAt: dueAt || undefined,
    }

    if (taskType === 'CLEANING') {
      input.assignedCleanerId = assigneeId
    } else if (assigneeType === 'MASTER') {
      input.assignedMasterId = assigneeId
    } else if (assigneeType === 'PROVIDER') {
      input.assignedProviderId = assigneeId
    }

    try {
      await createTaskMutation.mutateAsync(input)
    } catch (err) {
      // Ошибка уже обработана в onError
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      <DialogTitle>Создать задачу из пункта чек-листа</DialogTitle>
      <DialogDescription>
        Создать задачу для пункта: <strong>{checklistItemTitle}</strong>
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
              Тип задачи *
            </label>
            <Select
              value={taskType}
              onChange={(e) => {
                setTaskType(e.target.value as any)
                setAssigneeId('') // Сбрасываем при смене типа
              }}
              className="w-full"
            >
              <option value="MAINTENANCE">Обслуживание</option>
              <option value="CLEANING">Уборка</option>
              <option value="INVENTORY">Инвентаризация</option>
            </Select>
          </div>

          {taskType !== 'CLEANING' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Тип исполнителя
              </label>
              <Select
                value={assigneeType}
                onChange={(e) => {
                  setAssigneeType(e.target.value as 'PROVIDER' | 'MASTER')
                  setAssigneeId('') // Сбрасываем при смене типа
                }}
                className="w-full"
              >
                <option value="MASTER">Мастер</option>
                <option value="PROVIDER">Поставщик услуг</option>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Исполнитель *
            </label>
            <Select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full"
              required
            >
              <option value="">Выберите исполнителя</option>
              {taskType === 'CLEANING'
                ? cleanersData?.map((cleaner: any) => (
                    <option key={cleaner.id} value={cleaner.id}>
                      {cleaner.firstName} {cleaner.lastName}
                      {cleaner.phone && ` - ${cleaner.phone}`}
                    </option>
                  ))
                : assigneeType === 'MASTER'
                  ? mastersData?.map((master: any) => (
                      <option key={master.id} value={master.id}>
                        {master.firstName} {master.lastName}
                        {master.type && ` (${master.type})`}
                        {master.phone && ` - ${master.phone}`}
                      </option>
                    ))
                  : providersData?.map((provider: any) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                        {provider.contact && ` - ${provider.contact}`}
                      </option>
                    ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Описание задачи
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={checklistItemTitle}
              rows={3}
              className="w-full"
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
        </DialogBody>
        <DialogActions>
          <Button type="button" outline onClick={handleClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting || !assigneeId}>
            {isSubmitting ? 'Создаём...' : 'Создать задачу'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

