'use client'

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Dialog, DialogBody, DialogTitle, DialogActions, DialogDescription } from '@/components/dialog'
import { Textarea } from '@/components/textarea'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ChecklistInstanceDialog } from '@/components/checklist-instance-dialog'
import {
  GET_CLEANING,
  GET_CHECKLIST_BY_CLEANING_AND_STAGE,
  GET_CHECKLIST_TEMPLATE,
  CREATE_CHECKLIST_INSTANCE,
  ASSIGN_CLEANING_TO_ME,
  APPROVE_CLEANING,
  COMPLETE_CLEANING,
  START_CLEANING,
} from '@/lib/graphql-queries'
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  HomeIcon,
  UserIcon,
} from '@heroicons/react/24/outline'

type Stage = 'PRE_CLEANING' | 'CLEANING' | 'FINAL_REPORT'

const STAGE_CONFIG: Record<Stage, { label: string; description: string; color: 'blue' | 'green' | 'purple' }> = {
  PRE_CLEANING: {
    label: 'Приёмка',
    description: 'Подготовка квартиры перед уборкой',
    color: 'blue',
  },
  CLEANING: {
    label: 'Уборка',
    description: 'Основной чек-лист уборщика',
    color: 'green',
  },
  FINAL_REPORT: {
    label: 'Финальный отчёт',
    description: 'Завершение уборки и отчёт для менеджера',
    color: 'purple',
  },
}

type CleaningDetailsPageProps = {
  params: Promise<{ id: string }>
}

export default function CleaningDetailsPage(props: CleaningDetailsPageProps) {
  const params = use(props.params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { currentUserId } = useCurrentUser()
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignDialogStage, setAssignDialogStage] = useState<Stage | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['cleaning', params.id],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_CLEANING, { id: params.id }) as any
      return response.cleaning
    },
  })

  const unitId = data?.unit?.id
  const cleaningId = data?.id

  const {
    data: templateData,
    isLoading: isTemplateLoading,
    error: templateError,
  } = useQuery({
    queryKey: ['checklist-template', unitId],
    queryFn: async () => {
      if (!unitId) return null
      const response = await graphqlClient.request(GET_CHECKLIST_TEMPLATE, { unitId }) as any
      return response.checklistTemplate ?? null
    },
    enabled: !!unitId,
  })
  const hasTemplate = !!templateData
  const templateMissing = !isTemplateLoading && !templateData && !templateError

  const { data: preCleaningData } = useQuery({
    queryKey: ['checklist-instance', cleaningId, 'PRE_CLEANING'],
    queryFn: async () => {
      if (!cleaningId) return null
      const response = await graphqlClient.request(GET_CHECKLIST_BY_CLEANING_AND_STAGE, { cleaningId, stage: 'PRE_CLEANING' }) as any
      return response.checklistByCleaning ?? null
    },
    enabled: !!cleaningId,
  })

  const { data: cleaningData } = useQuery({
    queryKey: ['checklist-instance', cleaningId, 'CLEANING'],
    queryFn: async () => {
      if (!cleaningId) return null
      const response = await graphqlClient.request(GET_CHECKLIST_BY_CLEANING_AND_STAGE, { cleaningId, stage: 'CLEANING' }) as any
      return response.checklistByCleaning ?? null
    },
    enabled: !!cleaningId,
  })

  const { data: finalReportData } = useQuery({
    queryKey: ['checklist-instance', cleaningId, 'FINAL_REPORT'],
    queryFn: async () => {
      if (!cleaningId) return null
      const response = await graphqlClient.request(GET_CHECKLIST_BY_CLEANING_AND_STAGE, { cleaningId, stage: 'FINAL_REPORT' }) as any
      return response.checklistByCleaning ?? null
    },
    enabled: !!cleaningId,
  })

  const instances: Record<Stage, any> = {
    PRE_CLEANING: preCleaningData,
    CLEANING: cleaningData,
    FINAL_REPORT: finalReportData,
  }

  const assignmentRequestedRef = useRef(false)
  const completionRequestedRef = useRef(false)
  const startRequestedRef = useRef(false)
  const statusColor =
    data?.status === 'APPROVED'
      ? 'green'
      : data?.status === 'COMPLETED'
        ? 'green'
        : data?.status === 'IN_PROGRESS'
          ? 'blue'
          : 'zinc'
  const assignedCleanerUserId = data?.cleaner?.user?.id
  const canEditChecklists = !data?.cleaner || assignedCleanerUserId === currentUserId
  const workerStages: Stage[] = ['PRE_CLEANING', 'CLEANING']
  const finalInstance = instances.FINAL_REPORT
  const isSubmitted = (status?: string | null) => status === 'SUBMITTED' || status === 'LOCKED'
  const preSubmitted = isSubmitted(preCleaningData?.status)
  const cleaningSubmitted = isSubmitted(cleaningData?.status)
  const stageActive = useMemo<Record<Stage, boolean>>(
    () => ({
      PRE_CLEANING: canEditChecklists && !preSubmitted,
      CLEANING: canEditChecklists && preSubmitted && !cleaningSubmitted,
      FINAL_REPORT: cleaningSubmitted && data?.status !== 'APPROVED',
    }),
    [canEditChecklists, preSubmitted, cleaningSubmitted, data?.status]
  )

  const autoCreatedRef = useRef<Record<Stage, boolean>>({
    PRE_CLEANING: false,
    CLEANING: false,
    FINAL_REPORT: false,
  })
  const [creationError, setCreationError] = useState<string | null>(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [expandedStages, setExpandedStages] = useState<Record<Stage, boolean>>({
    PRE_CLEANING: true,
    CLEANING: true,
    FINAL_REPORT: true,
  })
  const [photoPreview, setPhotoPreview] = useState<Array<{ url: string; caption?: string }>>(
    []
  )
  const [photoPreviewIndex, setPhotoPreviewIndex] = useState(0)

  const createInstanceMutation = useMutation({
    mutationFn: async (stage: Stage) => {
      return graphqlClient.request(CREATE_CHECKLIST_INSTANCE, {
        unitId,
        stage,
        cleaningId,
      })
    },
    onSuccess: (_, stage) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', cleaningId, stage] })
      queryClient.invalidateQueries({ queryKey: ['checklists', unitId] })
      setCreationError(null)
    },
    onError: (error: unknown, stage) => {
      const message = error instanceof Error ? error.message : 'Не удалось создать чек-лист'
      console.error('[CleaningDetailsPage] createChecklistInstance failed', { error, stage, unitId })
      setCreationError(message)
      if (stage) {
        autoCreatedRef.current[stage as Stage] = false
      }
    },
  })

  const { mutate: createChecklistInstance, isPending: isCreatingInstance } = createInstanceMutation

  const {
    mutateAsync: assignCleaningToMe,
    isPending: isAssigningCleaning,
  } = useMutation({
    mutationFn: async (cleaningId: string) => {
      return graphqlClient.request(ASSIGN_CLEANING_TO_ME, { id: cleaningId }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', params.id] })
      setCreationError(null)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Не удалось взять уборку в работу'
      setCreationError(message)
      console.error('[CleaningDetailsPage] assignCleaningToMe failed', { error, cleaningId: params.id })
    },
  })

  const {
    mutateAsync: approveCleaningMutation,
    isPending: isApprovingCleaning,
  } = useMutation({
    mutationFn: async (comment?: string) => {
      if (!currentUserId) {
        throw new Error('Не удалось определить текущего пользователя')
      }
      return graphqlClient.request(APPROVE_CLEANING, {
        id: params.id,
        managerId: currentUserId,
        comment,
      }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', params.id] })
      setApprovalError(null)
      setApprovalComment('')
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Не удалось подтвердить уборку'
      setApprovalError(message)
      console.error('[CleaningDetailsPage] approveCleaning failed', { error, cleaningId: params.id })
    },
  })

  const {
    mutateAsync: startCleaningMutation,
    isPending: isStartingCleaning,
  } = useMutation({
    mutationFn: async () => {
      return graphqlClient.request(START_CLEANING, { id: params.id }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', params.id] })
    },
    onError: () => {
      startRequestedRef.current = false
    },
  })

  const {
    mutateAsync: completeCleaningMutation,
    isPending: isCompletingCleaning,
  } = useMutation({
    mutationFn: async () => {
      return graphqlClient.request(COMPLETE_CLEANING, { id: params.id, input: {} }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', params.id] })
    },
    onError: () => {
      completionRequestedRef.current = false
    },
  })

  useEffect(() => {
    if (data?.startedAt || data?.status === 'IN_PROGRESS' || data?.status === 'COMPLETED' || data?.status === 'APPROVED') {
      startRequestedRef.current = true
    }
  }, [data?.startedAt, data?.status])

  const handleStartCleaning = useCallback(() => {
    if (startRequestedRef.current || isStartingCleaning) return
    startRequestedRef.current = true
    startCleaningMutation().catch(() => {
      startRequestedRef.current = false
    })
  }, [isStartingCleaning, startCleaningMutation])

  const ensureAssignment = useCallback(async () => {
    if (!data) return false
    if (!currentUserId) {
      setCreationError('Не удалось определить текущего пользователя.')
      return false
    }
    const assignedUserId = data.cleaner?.user?.id
    if (assignedUserId === currentUserId) {
      assignmentRequestedRef.current = false
    }
    if (assignedUserId && assignedUserId !== currentUserId) {
      setCreationError('Уборка уже в работе у другого исполнителя.')
      return false
    }
    if (!data.cleaner) {
      if (assignmentRequestedRef.current) {
        return true
      }
      try {
        assignmentRequestedRef.current = true
        await assignCleaningToMe(data.id)
        await queryClient.refetchQueries({ queryKey: ['cleaning', params.id] })
        assignmentRequestedRef.current = false
      } catch {
        assignmentRequestedRef.current = false
        return false
      }
    }

    return true
  }, [assignCleaningToMe, currentUserId, data, params.id, queryClient])

  const openPhotoPreview = useCallback((attachments: Array<{ url: string; caption?: string }>, index = 0) => {
    if (!attachments.length) return
    setPhotoPreview(attachments)
    setPhotoPreviewIndex(Math.min(index, attachments.length - 1))
  }, [])

  const closePhotoPreview = useCallback(() => {
    setPhotoPreview([])
    setPhotoPreviewIndex(0)
  }, [])

  const showPrevPhoto = useCallback(() => {
    setPhotoPreviewIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

  const showNextPhoto = useCallback(() => {
    setPhotoPreviewIndex((prev) => (photoPreview && prev < photoPreview.length - 1 ? prev + 1 : prev))
  }, [photoPreview])

  const isPhotoPreviewOpen = photoPreview.length > 0

  const [dialogStage, setDialogStage] = useState<Stage | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleOpenDialog = useCallback((stage: Stage) => {
    setDialogStage(stage)
    setDialogOpen(true)
  }, [])

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false)
    setDialogStage(null)
  }, [])

  const orderedReviews = useMemo(() => {
    if (!data?.reviews) return []
    return [...data.reviews].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [data?.reviews])
  const latestReview = orderedReviews[0]

  useEffect(() => {
    if (!unitId) return
    if (isCreatingInstance) return
    if (isTemplateLoading) return
    if (!hasTemplate) return

    const stageDataMap: Record<Stage, typeof preCleaningData> = {
      PRE_CLEANING: preCleaningData,
      CLEANING: cleaningData,
      FINAL_REPORT: finalReportData,
    }

    for (const stage of Object.keys(stageDataMap) as Stage[]) {
      if (typeof stageDataMap[stage] === 'undefined') {
        return
      }
    }

    for (const stage of Object.keys(stageDataMap) as Stage[]) {
      if (!stageDataMap[stage] && !autoCreatedRef.current[stage] && stageActive[stage]) {
        autoCreatedRef.current[stage] = true
        createChecklistInstance(stage)
        break
      }
    }
  }, [
    unitId,
    preCleaningData,
    cleaningData,
    finalReportData,
    isCreatingInstance,
    createChecklistInstance,
    hasTemplate,
    isTemplateLoading,
    stageActive,
  ])

  const action = searchParams.get('action')
  const stageParam = searchParams.get('stage')
  const assignStage: Stage =
    stageParam === 'PRE_CLEANING' || stageParam === 'CLEANING' || stageParam === 'FINAL_REPORT'
      ? stageParam
      : 'PRE_CLEANING'
  const isAssignStageDataUndefined =
    assignStage === 'PRE_CLEANING'
      ? typeof preCleaningData === 'undefined'
      : assignStage === 'CLEANING'
        ? typeof cleaningData === 'undefined'
        : typeof finalReportData === 'undefined'

  useEffect(() => {
    if (action !== 'assign') {
      setAssignDialogOpen(false)
      setAssignDialogStage(null)
      return
    }
    
    // Если данных еще нет, ждем их загрузки
    if (!data) return
    
    // Просто открываем диалог назначения, проверки выполним в диалоге
    if (!assignDialogOpen || assignDialogStage !== assignStage) {
      setAssignDialogStage(assignStage)
      setAssignDialogOpen(true)
    }
  }, [
    action,
    assignStage,
    assignDialogOpen,
    assignDialogStage,
    data,
    params.id,
  ])

  const handleConfirmAssign = useCallback(async () => {
    const ok = await ensureAssignment()
    if (!ok) return
    if (assignDialogStage) {
      setExpandedStages((prev) => ({
        ...prev,
        [assignDialogStage]: true,
      }))
    }
    setAssignDialogOpen(false)
    setAssignDialogStage(null)
    router.replace(`/cleanings/${params.id}`, { scroll: false })
  }, [assignDialogStage, ensureAssignment, params.id, router])

  const handleCancelAssign = useCallback(() => {
    setAssignDialogOpen(false)
    setAssignDialogStage(null)
    router.replace(`/cleanings/${params.id}`, { scroll: false })
  }, [params.id, router])

  useEffect(() => {
    if (!data) return
    if (data.status === 'COMPLETED' || data.status === 'APPROVED') {
      completionRequestedRef.current = true
      return
    }
    if (completionRequestedRef.current) return
    if (isCompletingCleaning) return
    if (!cleaningSubmitted) return
    if (data.status !== 'IN_PROGRESS') return

    completionRequestedRef.current = true
    completeCleaningMutation().catch(() => {
      completionRequestedRef.current = false
    })
  }, [cleaningSubmitted, completeCleaningMutation, data, isCompletingCleaning])

  const formatManagerId = (id?: string | null) => (id ? id.slice(0, 8) : '—')
  const renderChecklistCell = useCallback(
    (cell: { item: any; answer?: any; attachments: any[] } | undefined, emptyText: string) => {
      if (!cell) {
        return (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 p-4 text-sm text-zinc-500">
            {emptyText}
          </div>
        )
      }

      const { item, answer, attachments } = cell
      const title = item?.title ?? item?.label ?? 'Без названия'
      const description = item?.description
      const requiresPhoto = item?.requiresPhoto
      const photosCount = attachments?.length ?? 0
      const hasAnswerValue = answer?.value !== undefined && answer?.value !== null
      const isBool = item?.type === 'BOOL'
      const isNegative = isBool && answer?.value === false
      const displayedAnswer = (() => {
        if (hasAnswerValue) {
          if (isBool) {
            return answer?.value ? 'Да' : 'Нет'
          }
          if (typeof answer?.value === 'string') {
            return answer.value
          }
          if (typeof answer?.value === 'number') {
            return answer.value.toString()
          }
          if (typeof answer?.value === 'object') {
            try {
              return JSON.stringify(answer?.value)
            } catch (error) {
              return String(answer?.value)
            }
          }
          return String(answer?.value)
        }

        if (answer?.note) {
          return answer.note
        }

        if (requiresPhoto && photosCount > 0) {
          return `${photosCount} фото`
        }

        return null
      })()
      const previewItems = (attachments ?? []).map((attachment: any) => ({
        url: attachment.url,
        caption: attachment.caption,
      }))

      return (
        <div
          className={`rounded-xl border p-4 space-y-2 transition-colors ${
            isNegative
              ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20'
              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <Heading level={6} className="mb-0">
              {title}
            </Heading>
            {item?.required && <Badge color="red">Обязательно</Badge>}
          </div>
          {description && (
            <Text className="text-sm text-zinc-600 dark:text-zinc-400">{description}</Text>
          )}
          <div className="text-sm text-zinc-700 dark:text-zinc-200 space-y-1">
            {displayedAnswer ? (
              <p className="whitespace-pre-wrap break-words">{displayedAnswer}</p>
            ) : (
              <p className="text-zinc-500 dark:text-zinc-400">
                {requiresPhoto ? 'Фото не загружены' : 'Ответ не заполнен'}
              </p>
            )}
            {photosCount > 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Фото: {photosCount}
              </p>
            )}
          </div>
          {answer?.note && hasAnswerValue && (
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
              Комментарий: {answer.note}
            </div>
          )}
          {photosCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {previewItems.map((attachment, idx) => (
                <button
                  key={attachment.url}
                  type="button"
                  onClick={() => openPhotoPreview(previewItems, idx)}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                >
                  <img
                    src={attachment.url}
                    alt={attachment.caption || 'Фото'}
                    className="w-20 h-20 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )
    },
    [openPhotoPreview]
  )

  const toggleStageExpansion = useCallback((stage: Stage) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stage]: !prev[stage],
    }))
  }, [])

  const handleCreateChecklist = useCallback(
    async (stage: Stage) => {
      if (!unitId) return
      if (!hasTemplate) {
        setCreationError('Для этого юнита не настроен шаблон чек-листа. Создайте его, чтобы открыть чек-лист уборки.')
        return
      }

      if (!stageActive[stage]) {
        setCreationError('Эта стадия пока недоступна. Завершите предыдущий этап.')
        return
      }

      if (stage !== 'FINAL_REPORT') {
        const ok = await ensureAssignment()
        if (!ok) return
      }

      if (autoCreatedRef.current[stage]) return
      autoCreatedRef.current[stage] = true
      createChecklistInstance(stage, {
        onSuccess: () => {
          setExpandedStages((prev) => ({
            ...prev,
            [stage]: true,
          }))
        },
        onError: () => {
          autoCreatedRef.current[stage] = false
        },
      })
    },
    [createChecklistInstance, ensureAssignment, hasTemplate, stageActive, unitId]
  )

  const handleApproveCleaning = async () => {
    try {
      await approveCleaningMutation(approvalComment ? approvalComment.trim() : undefined)
    } catch (error) {
      // Ошибка уже обработана в onError мутации
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 flex justify-center">
        <Text className="text-zinc-500">Загрузка уборки...</Text>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <Text className="text-red-600 dark:text-red-400">
          {error ? 'Ошибка загрузки уборки' : 'Уборка не найдена'}
        </Text>
        <Button onClick={() => router.push('/cleanings')} outline>
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          К списку уборок
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <button 
          onClick={() => router.push('/cleanings')}
          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
            <ArrowLeftIcon className="w-4 h-4" />
            Назад
          </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <Heading level={3}>
              Уборка #{data.id.slice(0, 8)}
            </Heading>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              {data.unit && (
                <span className="inline-flex items-center gap-1"><HomeIcon className="w-4 h-4" /> {data.unit.property?.title} · {data.unit.name}</span>
              )}
              {data.cleaner ? (
                <span className="inline-flex items-center gap-1"><UserIcon className="w-4 h-4" /> {data.cleaner.firstName} {data.cleaner.lastName}</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><UserIcon className="w-4 h-4" /> Уборщик не назначен</span>
              )}
              {data.scheduledAt && (
                <span className="inline-flex items-center gap-1"><CalendarIcon className="w-4 h-4" />{new Date(data.scheduledAt).toLocaleString('ru-RU')}</span>
              )}
              {data.startedAt && (
                <span className="inline-flex items-center gap-1"><ClockIcon className="w-4 h-4" />Старт: {new Date(data.startedAt).toLocaleString('ru-RU')}</span>
              )}
              {data.completedAt && (
                <span className="inline-flex items-center gap-1"><CheckCircleIcon className="w-4 h-4" />Завершено: {new Date(data.completedAt).toLocaleString('ru-RU')}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge color={statusColor as any} className="self-start">
              {data.status === 'SCHEDULED' && 'Запланирована'}
              {data.status === 'IN_PROGRESS' && 'В работе'}
              {data.status === 'COMPLETED' && 'Завершена'}
              {data.status === 'APPROVED' && 'Проверена'}
            </Badge>
            {!data.cleaner && data.status === 'SCHEDULED' && (
              <Button
                onClick={() => {
                  router.push(`/cleanings/${params.id}?action=assign`)
                }}
                color="green"
              >
                Взять в работу
              </Button>
            )}
          </div>
        </div>
                
        {data.notes && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-800 dark:text-blue-200">
            {data.notes}
          </div>
        )}
      </div>
                
                  <div className="space-y-4">
        <Subheading>Чек-листы уборки</Subheading>
        {templateError && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
            Не удалось загрузить шаблон чек-листа. Обновите страницу или попробуйте позже.
          </div>
        )}
        {templateMissing && unitId && (
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-sm text-amber-800 space-y-3 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            <div>Для этого юнита ещё не настроен шаблон чек-листа. Создайте шаблон, чтобы уборщики могли работать без ручных действий.</div>
            <Button
              outline
              onClick={() => router.push(`/inventory/units/${unitId}?tab=checklist`)}
            >
              Открыть редактор шаблона
            </Button>
          </div>
        )}
        {creationError && !templateMissing && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
            {creationError}
          </div>
        )}
        {!canEditChecklists && (
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            Уборка уже назначена исполнителю {data.cleaner?.firstName} {data.cleaner?.lastName}. Только он может редактировать чек-листы.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workerStages.map((stage) => {
            const config = STAGE_CONFIG[stage]
            const instance = instances[stage]
            const isCompleted = instance?.status === 'SUBMITTED'
            const isLocked = instance?.status === 'LOCKED'
            const isStagePreparing = autoCreatedRef.current[stage] && !instance
            const isActive = stageActive[stage]
                      
                      return (
              <div
                key={stage}
                className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                  instance
                    ? isCompleted
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-700'
                      : isLocked
                      ? 'bg-zinc-100 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-700'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-700'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <div className="space-y-3">
              <div>
                    <Heading level={5} className="mb-1 flex items-center gap-2">
                      {config.label}
                      {isCompleted && <Badge color="green">Готово</Badge>}
                      {isLocked && <Badge color="zinc">Закрыт</Badge>}
                      {!isCompleted && isActive && <Badge color="blue">Активно</Badge>}
                      {!isCompleted && !isActive && <Badge color="zinc">Ожидает</Badge>}
                    </Heading>
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                      {config.description}
                </Text>
            </div>

                  {instance && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Обновлён: {new Date(instance.updatedAt).toLocaleString('ru-RU')}
              </div>
            )}

              {instance ? (
                <div className="space-y-3">
                  <Button
                    plain
                    className="px-0 justify-start text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                    onClick={() => toggleStageExpansion(stage)}
                  >
                    {expandedStages[stage] ? 'Скрыть детали' : 'Показать детали'}
                  </Button>
                  {expandedStages[stage] && (
                    <div className="space-y-3">
                      {(() => {
                        const answers = new Map(
                          (instance.answers ?? []).map((answer: any) => [
                            answer.itemKey ?? answer.itemId ?? answer.id,
                            answer,
                          ])
                        )
                        const attachmentsMap = new Map<string, any[]>();
                        (instance.attachments ?? []).forEach((attachment: any) => {
                          const itemKey = attachment.itemKey
                          if (!itemKey) return
                          if (!attachmentsMap.has(itemKey)) {
                            attachmentsMap.set(itemKey, [])
                          }
                          attachmentsMap.get(itemKey)!.push(attachment)
                        })
                        if (!instance.items?.length) {
                          return (
                            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 p-4 text-sm text-zinc-500">
                              Пункты чек-листа отсутствуют
                            </div>
                          )
                        }
                        return instance.items.map((item: any, index: number) => {
                          const key = item.key ?? item.id ?? `${stage}-${index}`
                          const cell = {
                            item,
                            answer: answers.get(item.key ?? item.id),
                            attachments: attachmentsMap.get(item.key ?? item.id) ?? [],
                          }
                          return (
                            <div key={key}>
                              {renderChecklistCell(cell, 'Пункт ещё не заполнен')}
                            </div>
                          )
                        })
                      })()}
                      {isActive && canEditChecklists && (
                        <Button
                          color={config.color}
                          onClick={() => handleOpenDialog(stage)}
                        >
                          Открыть для редактирования
                        </Button>
                      )}
                      {!isActive && !isCompleted && (
                        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                          Завершите предыдущий этап, чтобы редактировать этот чек-лист.
                        </Text>
                      )}
                    </div>
                  )}
                </div>
              ) : (
              <Button 
                    className="w-full"
                    color={config.color}
                  onClick={() => handleCreateChecklist(stage)}
                  disabled={
                    !unitId ||
                    isStagePreparing ||
                    isCreatingInstance ||
                    isAssigningCleaning ||
                    !canEditChecklists ||
                    !isActive
                  }
                >
                  {isStagePreparing || isCreatingInstance || isAssigningCleaning
                    ? 'Готовим чек-лист…'
                    : canEditChecklists
                      ? 'Создать чек-лист'
                      : 'Недоступно'}
              </Button>
              )}
              </div>
                  </div>
            )
          })}
                        </div>
        <div className="space-y-4 pt-6">
          <Subheading>Проверка менеджера</Subheading>
          <Text className="text-sm text-zinc-600 dark:text-zinc-400">
            После проверки итогов уборки подтвердите её выполнение. После подтверждения статус сменится на «Проверена».
          </Text>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 space-y-4">
            {orderedReviews.length > 0 && (
              <div className="space-y-2">
                <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-200">История проверок</Text>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {orderedReviews.map((review: any) => (
                    <li
                      key={review.id}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-900/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">
                          Менеджер: {formatManagerId(review.managerId)}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(review.createdAt).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                          {review.comment}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.status === 'APPROVED' && latestReview && (
              <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-100">
                Уборка подтверждена менеджером {formatManagerId(latestReview.managerId)}{' '}
                {new Date(latestReview.createdAt).toLocaleString('ru-RU')}.
                {latestReview.comment && (
                  <>
                    <br />
                    Комментарий: {latestReview.comment}
                  </>
                )}
              </div>
            )}
            {data.status !== 'APPROVED' && (
              <div className="space-y-3">
                <Textarea
                  value={approvalComment}
                  onChange={(event) => setApprovalComment(event.target.value)}
                  placeholder="Комментарий менеджера (необязательно)"
                  className="w-full"
                  resizable
                  rows={3}
                />
                {approvalError && (
                  <div className="text-sm text-red-600 dark:text-red-400">{approvalError}</div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    color="green"
                    onClick={handleApproveCleaning}
                    disabled={isApprovingCleaning || !stageActive.FINAL_REPORT}
                  >
                    {isApprovingCleaning ? 'Подтверждаем…' : 'Одобрить уборку'}
                  </Button>
                </div>
                {!stageActive.FINAL_REPORT && (
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    Завершите стадию «Уборка», чтобы отправить на проверку менеджеру.
                  </Text>
                )}
              </div>
            )}
          </div>
                        </div>
                      </div>

      {isPhotoPreviewOpen && photoPreview[photoPreviewIndex] && (
        <Dialog open onClose={closePhotoPreview} size="4xl">
          <DialogTitle>Просмотр фото</DialogTitle>
          <DialogBody className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <img
                src={photoPreview[photoPreviewIndex].url}
                alt={photoPreview[photoPreviewIndex].caption || 'Фото чек-листа'}
                className="max-h-[70vh] w-auto rounded-xl border border-zinc-200 dark:border-zinc-700 object-contain"
              />
              {photoPreview[photoPreviewIndex].caption && (
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                  {photoPreview[photoPreviewIndex].caption}
                </Text>
              )}
            </div>
            {photoPreview.length > 1 && (
              <div className="flex items-center justify-between gap-3">
                <Button onClick={showPrevPhoto} disabled={photoPreviewIndex === 0} plain>
                  ← Предыдущее
                </Button>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  {photoPreviewIndex + 1} из {photoPreview.length}
                </Text>
                <Button
                  onClick={showNextPhoto}
                  disabled={photoPreviewIndex === photoPreview.length - 1}
                  plain
                >
                  Следующее →
                </Button>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={closePhotoPreview} plain>
                Закрыть
              </Button>
            </div>
          </DialogBody>
        </Dialog>
      )}

      {dialogStage && instances[dialogStage] && (
        <ChecklistInstanceDialog
          isOpen={dialogOpen}
          onClose={handleCloseDialog}
          unitId={unitId!}
          cleaningId={cleaningId}
          stage={dialogStage}
          instanceId={instances[dialogStage]?.id}
          canEdit={stageActive[dialogStage]}
          onStartCleaning={dialogStage === 'PRE_CLEANING' ? handleStartCleaning : undefined}
        />
      )}

      {assignDialogOpen && assignDialogStage && (
        <Dialog open onClose={handleCancelAssign}>
          <DialogTitle>Взять уборку в работу</DialogTitle>
          <DialogDescription>
            Подтвердите, что вы начинаете этап «{STAGE_CONFIG[assignDialogStage].label}» для этой уборки.
          </DialogDescription>
          <DialogBody className="space-y-3">
            <Text>
              Уборка будет назначена на вас, и этап «{STAGE_CONFIG[assignDialogStage].label}» станет доступен для редактирования.
            </Text>
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              Убедитесь, что вы готовы приступить к работе. Уведомление об этом получат менеджеры.
            </Text>
          </DialogBody>
          <DialogActions>
            <Button outline onClick={handleCancelAssign}>
              Отменить
            </Button>
            <Button onClick={handleConfirmAssign} color="blue" disabled={isAssigningCleaning || assignmentRequestedRef.current}>
              {isAssigningCleaning || assignmentRequestedRef.current ? 'Назначаем…' : 'Взять в работу'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
 
    </div>
  )
}

