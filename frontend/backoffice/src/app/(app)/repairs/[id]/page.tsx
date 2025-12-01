'use client'

import { use, useCallback, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Dialog, DialogBody, DialogTitle, DialogActions, DialogDescription } from '@/components/dialog'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { Select } from '@/components/select'
import { Input } from '@/components/input'
import { ChecklistInstanceDialog } from '@/components/checklist-instance-dialog'
import { CreateTaskFromChecklistItem } from '@/components/create-task-from-checklist-item'
import { CreateTasksFromChecklist } from '@/components/create-tasks-from-checklist'
import {
  GET_REPAIR,
  GET_CHECKLIST_BY_CLEANING_AND_STAGE,
  GET_CHECKLIST_BY_REPAIR_AND_STAGE,
  GET_CHECKLIST_TEMPLATE,
  CREATE_CHECKLIST_INSTANCE,
  START_REPAIR,
  COMPLETE_REPAIR,
  CANCEL_REPAIR,
  ASSESS_REPAIR,
  CREATE_REPAIR_SHOPPING_ITEM,
  UPDATE_REPAIR_SHOPPING_ITEM,
  DELETE_REPAIR_SHOPPING_ITEM,
  ADD_PHOTO_TO_REPAIR_SHOPPING_ITEM,
  DELETE_PHOTO_FROM_REPAIR_SHOPPING_ITEM,
  CALCULATE_REPAIR_COST,
  GET_TASKS_BY_CLEANING,
} from '@/lib/graphql-queries'
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  HomeIcon,
  UserIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

// Компонент для расчета стоимости ремонта
function RepairCostCalculation({ unitId, repairId, size, difficulty, shoppingItems }: { 
  unitId: string
  repairId: string
  size: number
  difficulty: number
  shoppingItems?: any[]
}) {
  // Конвертируем числовые значения в enum для GraphQL
  const sizeEnum = `SIZE_${size}` as any
  const difficultyEnum = `D${difficulty}` as any

  const { data: costData, isLoading: isCostLoading } = useQuery({
    queryKey: ['repair-cost', unitId, repairId, size, difficulty],
    queryFn: async () => {
      const response = await graphqlClient.request(CALCULATE_REPAIR_COST, {
        unitId,
        repairId,
        size: sizeEnum,
        difficulty: difficultyEnum,
      }) as any
      return response.calculateRepairCost
    },
    enabled: !!unitId && !!repairId && size !== null && difficulty !== null,
  })

  const formatMoney = (amount: number, currency: string): string => {
    const value = amount / 100 // конвертируем из копеек
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  }

  if (isCostLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <Subheading>Расчет стоимости</Subheading>
        <Text className="text-zinc-500">Загрузка...</Text>
      </div>
    )
  }

  if (!costData) {
    return null
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
        <Subheading>Расчет стоимости</Subheading>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Базовая цена</Text>
            <Text className="text-xl font-bold">
              {formatMoney(costData.base.amount, costData.base.currency)}
            </Text>
          </div>
          
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Расходники</Text>
            <Text className="text-xl font-bold">
              {formatMoney(costData.materialsCost.amount, costData.materialsCost.currency)}
            </Text>
            {shoppingItems && shoppingItems.length > 0 && (
              <Text className="text-xs text-zinc-500 mt-1">
                {shoppingItems.length} {shoppingItems.length === 1 ? 'позиция' : shoppingItems.length < 5 ? 'позиции' : 'позиций'}
              </Text>
            )}
          </div>
        </div>

        {/* Детализация расходников */}
        {shoppingItems && shoppingItems.length > 0 && costData.materialsCost.amount > 0 && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <Text className="text-sm font-medium text-zinc-900 dark:text-white mb-3">
              Детализация расходников:
            </Text>
            <div className="space-y-2">
              {shoppingItems
                .filter((item: any) => item.currency === costData.base.currency)
                .map((item: any) => {
                  const itemTotal = item.amount * item.quantity
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <Text className="font-medium">{item.name}</Text>
                        {item.quantity > 1 && (
                          <Text className="text-xs text-zinc-500">
                            {formatMoney(item.amount, item.currency)} × {item.quantity}
                          </Text>
                        )}
                      </div>
                      <Text className="font-semibold">
                        {formatMoney(itemTotal, item.currency)}
                      </Text>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              Коэффициент размера
            </Text>
            <Text className="text-lg font-semibold">
              {costData.sizeCoefficient.toFixed(2)}x
            </Text>
            <Text className="text-xs text-zinc-500 mt-1">
              Размер: {size} / 10
            </Text>
          </div>
          
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              Коэффициент сложности
            </Text>
            <Text className="text-lg font-semibold">
              {costData.difficultyCoefficient.toFixed(2)}x
            </Text>
            <Text className="text-xs text-zinc-500 mt-1">
              Сложность: {difficulty} / 5
            </Text>
          </div>
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <Text className="text-lg font-semibold text-green-900 dark:text-green-100">
              Итого
            </Text>
            <Text className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatMoney(costData.total.amount, costData.total.currency)}
            </Text>
          </div>
          <Text className="text-xs text-zinc-500 mt-2">
            Базовая цена × {costData.sizeCoefficient.toFixed(2)} × {costData.difficultyCoefficient.toFixed(2)} + Расходники
          </Text>
        </div>
      </div>
    </div>
  )
}

type RepairDetailsPageProps = {
  params: Promise<{ id: string }>
}

export default function RepairDetailsPage(props: RepairDetailsPageProps) {
  const params = use(props.params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { currentUserId } = useCurrentUser()
  const { currentOrgId } = useCurrentOrganization()
  const [dialogStage, setDialogStage] = useState<'REPAIR_INSPECTION' | 'REPAIR_RESULT' | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false)
  const [selectedItemForTask, setSelectedItemForTask] = useState<{ id: string; title: string } | null>(null)
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false)
  const [shoppingItemDialogOpen, setShoppingItemDialogOpen] = useState(false)
  const [editingShoppingItem, setEditingShoppingItem] = useState<any>(null)
  const [assessmentForm, setAssessmentForm] = useState({ difficulty: 0, size: 0 })
  const [shoppingItemForm, setShoppingItemForm] = useState({ name: '', quantity: 1, amount: '', currency: 'RUB', notes: '' })
  const [expandedStages, setExpandedStages] = useState<Record<'REPAIR_INSPECTION' | 'REPAIR_RESULT', boolean>>({
    REPAIR_INSPECTION: true,
    REPAIR_RESULT: true,
  })
  const [photoPreview, setPhotoPreview] = useState<Array<{ url: string; caption?: string }>>([])
  const [photoPreviewIndex, setPhotoPreviewIndex] = useState(0)

  const { data, isLoading, error } = useQuery({
    queryKey: ['repair', params.id],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_REPAIR, { id: params.id }) as any
      return response.repair
    },
  })

  const unitId = data?.unit?.id
  const repairId = data?.id

  const {
    data: templateData,
    isLoading: isTemplateLoading,
  } = useQuery({
    queryKey: ['checklist-template', unitId],
    queryFn: async () => {
      if (!unitId) return null
      const response = await graphqlClient.request(GET_CHECKLIST_TEMPLATE, { unitId }) as any
      return response.checklistTemplate ?? null
    },
    enabled: !!unitId,
  })

  const { data: inspectionData } = useQuery({
    queryKey: ['checklist-instance', repairId, 'REPAIR_INSPECTION'],
    queryFn: async () => {
      if (!repairId) return null
      const response = await graphqlClient.request(GET_CHECKLIST_BY_REPAIR_AND_STAGE, { 
        repairId, 
        stage: 'REPAIR_INSPECTION' 
      }) as any
      return response.checklistByRepair ?? null
    },
    enabled: !!repairId,
  })

  const { data: resultData, isLoading: resultDataLoading, error: resultDataError } = useQuery({
    queryKey: ['checklist-instance', repairId, 'REPAIR_RESULT'],
    queryFn: async () => {
      if (!repairId) {
        console.log('[RepairDetails] No repairId, skipping checklist query')
        return null
      }
      console.log('[RepairDetails] Fetching checklist for repair:', repairId, 'stage: REPAIR_RESULT')
      try {
        const response = await graphqlClient.request(GET_CHECKLIST_BY_REPAIR_AND_STAGE, { 
          repairId, 
          stage: 'REPAIR_RESULT' 
        }) as any
        console.log('[RepairDetails] Checklist response:', response)
        const checklist = response.checklistByRepair ?? null
        console.log('[RepairDetails] Checklist data:', checklist)
        return checklist
      } catch (error) {
        console.error('[RepairDetails] Error fetching checklist:', error)
        throw error
      }
    },
    enabled: !!repairId,
  })

  // Получаем задачи, связанные с этим ремонтом
  const { data: tasksData } = useQuery({
    queryKey: ['repair-tasks', repairId, currentOrgId],
    queryFn: async () => {
      if (!repairId || !currentOrgId) return null
      const response = await graphqlClient.request(GET_TASKS_BY_CLEANING, { 
        orgId: currentOrgId
      }) as any
      // Фильтруем задачи, которые связаны с этим ремонтом через source
      const allTasks = response.tasks?.edges?.map((edge: any) => edge.node) || []
      return allTasks.filter((task: any) => 
        task.source?.type === 'REPAIR' && task.source?.entityId === repairId
      )
    },
    enabled: !!repairId && !!currentOrgId,
  })

  const createChecklistMutation = useMutation({
    mutationFn: async ({ stage }: { stage: 'REPAIR_INSPECTION' | 'REPAIR_RESULT' }) => {
      if (!unitId || !repairId) throw new Error('Missing unitId or repairId')
      return graphqlClient.request(CREATE_CHECKLIST_INSTANCE, {
        unitId,
        stage,
        repairId
      }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', repairId] })
    },
  })

  const startRepairMutation = useMutation({
    mutationFn: async () => {
      return graphqlClient.request(START_REPAIR, { id: params.id }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair', params.id] })
    },
  })

  const completeRepairMutation = useMutation({
    mutationFn: async () => {
      return graphqlClient.request(COMPLETE_REPAIR, { id: params.id }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair', params.id] })
    },
  })

  const cancelRepairMutation = useMutation({
    mutationFn: async (reason?: string) => {
      return graphqlClient.request(CANCEL_REPAIR, { id: params.id, reason }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair', params.id] })
    },
  })

  const assessRepairMutation = useMutation({
    mutationFn: async (input: { difficulty: number; size: number }) => {
      return graphqlClient.request(ASSESS_REPAIR, { id: params.id, input }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair', params.id] })
      queryClient.invalidateQueries({ queryKey: ['repair-cost'] })
      setAssessmentDialogOpen(false)
    },
  })

  const createShoppingItemMutation = useMutation({
    mutationFn: async (input: any) => {
      return graphqlClient.request(CREATE_REPAIR_SHOPPING_ITEM, { repairId: params.id, input }) as any
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['repair', params.id] })
      queryClient.invalidateQueries({ queryKey: ['repair-cost'] })
      // После создания расходника открываем диалог редактирования для загрузки фото
      const newItem = data.createRepairShoppingItem
      if (newItem) {
        setEditingShoppingItem(newItem)
        setShoppingItemForm({ 
          name: newItem.name, 
          quantity: newItem.quantity, 
          amount: (newItem.amount / 100).toString(), 
          currency: newItem.currency, 
          notes: newItem.notes || '' 
        })
        // Диалог остается открытым для загрузки фото
      } else {
        setShoppingItemDialogOpen(false)
        setShoppingItemForm({ name: '', quantity: 1, amount: '', currency: 'RUB', notes: '' })
      }
    },
  })

  const updateShoppingItemMutation = useMutation({
    mutationFn: async ({ itemId, input }: { itemId: string; input: any }) => {
      return graphqlClient.request(UPDATE_REPAIR_SHOPPING_ITEM, { itemId, input }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair', params.id] })
      queryClient.invalidateQueries({ queryKey: ['repair-cost'] })
      setShoppingItemDialogOpen(false)
      setEditingShoppingItem(null)
      setShoppingItemForm({ name: '', quantity: 1, amount: '', currency: 'RUB', notes: '' })
    },
  })

  const deleteShoppingItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return graphqlClient.request(DELETE_REPAIR_SHOPPING_ITEM, { itemId }) as any
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair', params.id] })
      queryClient.invalidateQueries({ queryKey: ['repair-cost'] })
    },
  })

  const addPhotoMutation = useMutation({
    mutationFn: async ({ itemId, url, caption }: { itemId: string; url: string; caption?: string }) => {
      return graphqlClient.request(ADD_PHOTO_TO_REPAIR_SHOPPING_ITEM, { itemId, url, caption }) as any
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['repair', params.id] })
      // Обновляем editingShoppingItem, чтобы отобразить новые фото
      if (editingShoppingItem && data.addPhotoToRepairShoppingItem) {
        setEditingShoppingItem(data.addPhotoToRepairShoppingItem)
      }
    },
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      // Проверяем, что это изображение
      if (!file.type.startsWith('image/')) {
        alert(`Файл ${file.name} не является изображением`)
        continue
      }

      // Читаем файл как data URL
      const reader = new FileReader()
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string
        if (dataUrl) {
          // Загружаем фото автоматически
          addPhotoMutation.mutate({ 
            itemId, 
            url: dataUrl,
            caption: file.name 
          })
        }
      }
      reader.readAsDataURL(file)
    }

    // Очищаем input, чтобы можно было выбрать тот же файл снова
    e.target.value = ''
  }

  const handleOpenDialog = useCallback((stage: 'REPAIR_INSPECTION' | 'REPAIR_RESULT') => {
    setDialogStage(stage)
    setDialogOpen(true)
  }, [])

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false)
    setDialogStage(null)
  }, [])

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

  const toggleStageExpansion = useCallback((stage: 'REPAIR_INSPECTION' | 'REPAIR_RESULT') => {
    setExpandedStages((prev) => ({
      ...prev,
      [stage]: !prev[stage],
    }))
  }, [])

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

  const statusColor =
    data?.status === 'COMPLETED'
      ? 'green'
      : data?.status === 'IN_PROGRESS'
        ? 'blue'
        : data?.status === 'CANCELLED'
          ? 'red'
          : 'orange'

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 flex justify-center">
        <Text className="text-zinc-500">Загрузка ремонта...</Text>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <Text className="text-red-600 dark:text-red-400">
          {error ? 'Ошибка загрузки ремонта' : 'Ремонт не найден'}
        </Text>
        <Button onClick={() => router.push('/repairs')} outline>
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          К списку ремонтов
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-4 sm:px-0 space-y-6 sm:space-y-8">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <button 
          onClick={() => router.push('/repairs')}
          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Назад
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <Heading level={3}>
              Ремонт #{data.id.slice(0, 8)}
            </Heading>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              {data.unit && (
                <span className="inline-flex items-center gap-1">
                  <HomeIcon className="w-4 h-4" /> {data.unit.property?.title} · {data.unit.name}
                </span>
              )}
              {data.master ? (
                <span className="inline-flex items-center gap-1">
                  <UserIcon className="w-4 h-4" /> {data.master.firstName} {data.master.lastName}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <UserIcon className="w-4 h-4" /> Мастер не назначен
                </span>
              )}
              {data.scheduledAt && (
                <span className="inline-flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />{new Date(data.scheduledAt).toLocaleString('ru-RU')}
                </span>
              )}
              {data.startedAt && (
                <span className="inline-flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />Старт: {new Date(data.startedAt).toLocaleString('ru-RU')}
                </span>
              )}
              {data.completedAt && (
                <span className="inline-flex items-center gap-1">
                  <CheckCircleIcon className="w-4 h-4" />Завершено: {new Date(data.completedAt).toLocaleString('ru-RU')}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Badge color={statusColor as any}>
              {data.status === 'PLANNED' && 'Запланирован'}
              {data.status === 'IN_PROGRESS' && 'В процессе'}
              {data.status === 'COMPLETED' && 'Завершён'}
              {data.status === 'CANCELLED' && 'Отменён'}
            </Badge>
            {data.status === 'PLANNED' && (
              <Button
                onClick={() => startRepairMutation.mutate()}
                color="blue"
                disabled={startRepairMutation.isPending}
              >
                Начать ремонт
              </Button>
            )}
            {data.status === 'IN_PROGRESS' && (
              <Button
                onClick={() => completeRepairMutation.mutate()}
                color="green"
                disabled={completeRepairMutation.isPending}
              >
                Завершить ремонт
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
        <Subheading>Чек-листы ремонта</Subheading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Чек-лист осмотра */}
          <div className="p-4 sm:p-6 rounded-2xl border-2 border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
            <div className="space-y-3">
              <div>
                <Heading level={5} className="mb-1">
                  Осмотр
                </Heading>
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                  Первичный осмотр перед ремонтом
                </Text>
              </div>
              {inspectionData ? (
                <div className="space-y-3">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Обновлён: {new Date(inspectionData.updatedAt).toLocaleString('ru-RU')}
                  </div>
                  <Button
                    plain
                    className="px-0 justify-start text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                    onClick={() => toggleStageExpansion('REPAIR_INSPECTION')}
                  >
                    {expandedStages.REPAIR_INSPECTION ? 'Скрыть детали' : 'Показать детали'}
                  </Button>
                  {expandedStages.REPAIR_INSPECTION && (
                    <div className="space-y-3">
                      {(() => {
                        const answers = new Map(
                          (inspectionData.answers ?? []).map((answer: any) => [
                            answer.itemKey ?? answer.itemId ?? answer.id,
                            answer,
                          ])
                        )
                        const attachmentsMap = new Map<string, any[]>();
                        (inspectionData.attachments ?? []).forEach((attachment: any) => {
                          const itemKey = attachment.itemKey
                          if (!itemKey) return
                          if (!attachmentsMap.has(itemKey)) {
                            attachmentsMap.set(itemKey, [])
                          }
                          attachmentsMap.get(itemKey)!.push(attachment)
                        })
                        if (!inspectionData.items?.length) {
                          return (
                            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 p-4 text-sm text-zinc-500">
                              Пункты чек-листа отсутствуют
                            </div>
                          )
                        }
                        return inspectionData.items.map((item: any, index: number) => {
                          const key = item.key ?? item.id ?? `REPAIR_INSPECTION-${index}`
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
                      <Button
                        color="blue"
                        onClick={() => handleOpenDialog('REPAIR_INSPECTION')}
                      >
                        Открыть
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Button 
                  className="w-full"
                  color="blue"
                  onClick={() => {
                    createChecklistMutation.mutate({ stage: 'REPAIR_INSPECTION' })
                  }}
                  disabled={createChecklistMutation.isPending}
                >
                  {createChecklistMutation.isPending ? 'Создание...' : 'Создать чек-лист'}
                </Button>
              )}
            </div>
          </div>

          {/* Чек-лист результата */}
          <div className="p-4 sm:p-6 rounded-2xl border-2 border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
            <div className="space-y-3">
              <div>
                <Heading level={5} className="mb-1">
                  Результат
                </Heading>
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                  Финальный чек-лист после ремонта
                </Text>
              </div>
              {resultData ? (
                <div className="space-y-3">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Обновлён: {new Date(resultData.updatedAt).toLocaleString('ru-RU')}
                  </div>
                  <Button
                    plain
                    className="px-0 justify-start text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
                    onClick={() => toggleStageExpansion('REPAIR_RESULT')}
                  >
                    {expandedStages.REPAIR_RESULT ? 'Скрыть детали' : 'Показать детали'}
                  </Button>
                  {expandedStages.REPAIR_RESULT && (
                    <div className="space-y-3">
                      {(() => {
                        const answers = new Map(
                          (resultData.answers ?? []).map((answer: any) => [
                            answer.itemKey ?? answer.itemId ?? answer.id,
                            answer,
                          ])
                        )
                        const attachmentsMap = new Map<string, any[]>();
                        (resultData.attachments ?? []).forEach((attachment: any) => {
                          const itemKey = attachment.itemKey
                          if (!itemKey) return
                          if (!attachmentsMap.has(itemKey)) {
                            attachmentsMap.set(itemKey, [])
                          }
                          attachmentsMap.get(itemKey)!.push(attachment)
                        })
                        if (!resultData.items?.length) {
                          return (
                            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 p-4 text-sm text-zinc-500">
                              Пункты чек-листа отсутствуют
                            </div>
                          )
                        }
                        return resultData.items.map((item: any, index: number) => {
                          const key = item.key ?? item.id ?? `REPAIR_RESULT-${index}`
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
                      <Button
                        color="green"
                        onClick={() => handleOpenDialog('REPAIR_RESULT')}
                      >
                        Открыть
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Button 
                  className="w-full"
                  color="green"
                  onClick={() => {
                    createChecklistMutation.mutate({ stage: 'REPAIR_RESULT' })
                  }}
                  disabled={createChecklistMutation.isPending}
                >
                  {createChecklistMutation.isPending ? 'Создание...' : 'Создать чек-лист'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Оценка ремонта */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <Subheading>Оценка ремонта</Subheading>
          {data.status === 'IN_PROGRESS' && (
            <Button onClick={() => {
              setAssessmentForm({ difficulty: data.assessedDifficulty ?? 0, size: data.assessedSize ?? 0 })
              setAssessmentDialogOpen(true)
            }} outline className="w-full sm:w-auto">
              {data.assessedDifficulty !== null ? 'Изменить оценку' : 'Оценить ремонт'}
            </Button>
          )}
        </div>
        {data.assessedDifficulty !== null && data.assessedSize !== null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Коэффициент сложности</Text>
              <Text className="text-2xl font-bold">{data.assessedDifficulty} / 5</Text>
            </div>
            <div>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Размер (часы)</Text>
              <Text className="text-2xl font-bold">{data.assessedSize} / 10</Text>
            </div>
            {data.assessedAt && (
              <div className="col-span-2">
                <Text className="text-xs text-zinc-500">Оценено: {new Date(data.assessedAt).toLocaleString('ru-RU')}</Text>
              </div>
            )}
          </div>
        ) : (
          <Text className="text-zinc-500">Ремонт еще не оценен</Text>
        )}
      </div>

      {/* Расчет стоимости */}
      {data.assessedDifficulty !== null && data.assessedSize !== null && unitId && repairId && (
        <RepairCostCalculation 
          unitId={unitId} 
          repairId={repairId}
          size={data.assessedSize}
          difficulty={data.assessedDifficulty}
          shoppingItems={data.shoppingItems}
        />
      )}

      {/* Список покупок */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <Subheading>Список покупок</Subheading>
          {data.status === 'IN_PROGRESS' && (
            <Button onClick={() => {
              setEditingShoppingItem(null)
              setShoppingItemForm({ name: '', quantity: 1, amount: '', currency: 'RUB', notes: '' })
              setShoppingItemDialogOpen(true)
            }} className="w-full sm:w-auto">
              Добавить товар
            </Button>
          )}
        </div>
        {data.shoppingItems && data.shoppingItems.length > 0 ? (
          <div className="space-y-3">
            {data.shoppingItems.map((item: any) => (
              <div key={item.id} className="p-3 sm:p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Text className="font-medium break-words">{item.name}</Text>
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                      {item.quantity} шт. × {(item.amount / 100).toFixed(2)} {item.currency} = {((item.amount * item.quantity) / 100).toFixed(2)} {item.currency}
                    </Text>
                    {item.notes && (
                      <Text className="text-sm text-zinc-500 mt-1 break-words">{item.notes}</Text>
                    )}
                    {item.photos && item.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.photos.map((photo: any) => (
                          <img key={photo.id} src={photo.url} alt={photo.caption || item.name} className="w-16 h-16 object-cover rounded" />
                        ))}
                      </div>
                    )}
                  </div>
                  {data.status === 'IN_PROGRESS' && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        outline
                        onClick={() => {
                          setEditingShoppingItem(item)
                          setShoppingItemForm({
                            name: item.name,
                            quantity: item.quantity,
                            amount: (item.amount / 100).toString(),
                            currency: item.currency,
                            notes: item.notes || '',
                          })
                          setShoppingItemDialogOpen(true)
                        }}
                      >
                        Редактировать
                      </Button>
                      <Button
                        outline
                        onClick={() => {
                          if (confirm('Удалить товар из списка?')) {
                            deleteShoppingItemMutation.mutate(item.id)
                          }
                        }}
                      >
                        Удалить
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Text className="text-zinc-500">Список покупок пуст</Text>
        )}
      </div>

      {dialogStage && (dialogStage === 'REPAIR_INSPECTION' ? inspectionData : resultData) && (
        <ChecklistInstanceDialog
          isOpen={dialogOpen}
          onClose={handleCloseDialog}
          unitId={unitId!}
          repairId={repairId}
          stage={dialogStage}
          instanceId={(dialogStage === 'REPAIR_INSPECTION' ? inspectionData : resultData)?.id}
          canEdit={true}
          orgId={currentOrgId || undefined}
        />
      )}

      {currentOrgId && selectedItemForTask && unitId && (
        <CreateTaskFromChecklistItem
          isOpen={createTaskDialogOpen}
          onClose={() => {
            setCreateTaskDialogOpen(false)
            setSelectedItemForTask(null)
          }}
          checklistItemInstanceId={selectedItemForTask.id}
          checklistItemTitle={selectedItemForTask.title}
          unitId={unitId}
          orgId={currentOrgId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['repair', params.id] })
          }}
        />
      )}

      {/* Диалог оценки ремонта */}
      <Dialog open={assessmentDialogOpen} onClose={() => setAssessmentDialogOpen(false)}>
        <DialogTitle>Оценить ремонт</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                Коэффициент сложности (0-5)
              </label>
              <Input
                type="number"
                min="0"
                max="5"
                value={assessmentForm.difficulty}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, difficulty: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                Размер в часах (0-10)
              </label>
              <Input
                type="number"
                min="0"
                max="10"
                value={assessmentForm.size}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, size: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button outline onClick={() => setAssessmentDialogOpen(false)}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              assessRepairMutation.mutate(assessmentForm)
            }}
            disabled={assessRepairMutation.isPending}
          >
            {assessRepairMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Компонент для создания задач из неуспешных пунктов чек-листа - когда ремонт в процессе или завершен, и есть чек-лист результата, и еще нет созданных задач */}
      {data && (data.status === 'IN_PROGRESS' || data.status === 'COMPLETED') && currentOrgId && (!tasksData || tasksData.length === 0) && (
        <div className="pt-6">
          {resultDataLoading ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6">
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка чек-листа...</Text>
            </div>
          ) : resultDataError ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6">
              <Text className="text-sm text-red-600 dark:text-red-400">Ошибка загрузки чек-листа: {String(resultDataError)}</Text>
            </div>
          ) : resultData ? (
            <CreateTasksFromChecklist
              repairId={data.id}
              checklistInstance={resultData}
              orgId={currentOrgId}
              unitId={unitId}
              master={data.master ? { id: data.master.id, firstName: data.master.firstName, lastName: data.master.lastName } : null}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['repair', params.id] })
                queryClient.invalidateQueries({ queryKey: ['repair-tasks', repairId, currentOrgId] })
                queryClient.invalidateQueries({ queryKey: ['tasks'] })
              }}
            />
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6">
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">Чек-лист результата еще не создан. Создайте его, чтобы иметь возможность создавать задачи из неуспешных пунктов.</Text>
            </div>
          )}
        </div>
      )}

      {/* Отображение задач, связанных с ремонтом */}
      {tasksData && tasksData.length > 0 && (
        <div className="pt-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6">
            <Heading level={4} className="mb-4">Задачи</Heading>
            <div className="space-y-3">
              {tasksData.map((task: any) => (
                <div
                  key={task.id}
                  onClick={() => router.push(`/tasks/${task.id}`)}
                  className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge color={task.status === 'DONE' ? 'green' : task.status === 'IN_PROGRESS' ? 'blue' : 'zinc'}>
                          {task.status === 'TODO' ? 'К выполнению' : task.status === 'IN_PROGRESS' ? 'В работе' : task.status === 'DONE' ? 'Выполнено' : 'Отменено'}
                        </Badge>
                        <Badge color="zinc">
                          {task.type === 'CLEANING' ? 'Уборка' : task.type === 'MAINTENANCE' ? 'Обслуживание' : task.type === 'INVENTORY' ? 'Инвентаризация' : task.type}
                        </Badge>
                      </div>
                      {task.note && (
                        <Text className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
                          {task.note}
                        </Text>
                      )}
                      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                        {task.assignedMaster && (
                          <span>
                            Мастер: {task.assignedMaster.firstName} {task.assignedMaster.lastName}
                          </span>
                        )}
                        {task.assignedCleaner && (
                          <span>
                            Уборщик: {task.assignedCleaner.firstName} {task.assignedCleaner.lastName}
                          </span>
                        )}
                        {task.assignedTo && (
                          <span>Поставщик: {task.assignedTo.name}</span>
                        )}
                        {task.dueAt && (
                          <span>
                            Срок: {new Date(task.dueAt).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Диалог товара в списке покупок */}
      <Dialog open={shoppingItemDialogOpen} onClose={() => {
        setShoppingItemDialogOpen(false)
        setEditingShoppingItem(null)
        setShoppingItemForm({ name: '', quantity: 1, amount: '', currency: 'RUB', notes: '' })
      }}>
        <DialogTitle>{editingShoppingItem ? 'Редактировать товар' : 'Добавить товар'}</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                Наименование
              </label>
              <Input
                value={shoppingItemForm.name}
                onChange={(e) => setShoppingItemForm({ ...shoppingItemForm, name: e.target.value })}
                placeholder="Введите наименование"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  Количество
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={shoppingItemForm.quantity}
                  onChange={(e) => setShoppingItemForm({ ...shoppingItemForm, quantity: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  Сумма
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shoppingItemForm.amount}
                  onChange={(e) => setShoppingItemForm({ ...shoppingItemForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                Валюта
              </label>
              <Select
                value={shoppingItemForm.currency}
                onChange={(e) => setShoppingItemForm({ ...shoppingItemForm, currency: e.target.value })}
              >
                <option value="RUB">RUB</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                Заметки
              </label>
              <Input
                value={shoppingItemForm.notes}
                onChange={(e) => setShoppingItemForm({ ...shoppingItemForm, notes: e.target.value })}
                placeholder="Дополнительная информация"
              />
            </div>
            {editingShoppingItem && (
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  Фотографии
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileSelect(e, editingShoppingItem.id)}
                  className="block w-full text-sm text-zinc-500 dark:text-zinc-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-zinc-100 file:text-zinc-700
                    hover:file:bg-zinc-200
                    dark:file:bg-zinc-700 dark:file:text-zinc-300
                    dark:hover:file:bg-zinc-600
                    cursor-pointer"
                />
                <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Выберите файлы - они загрузятся автоматически
                </Text>
                {editingShoppingItem.photos && editingShoppingItem.photos.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {editingShoppingItem.photos.map((photo: any) => (
                      <div key={photo.id} className="relative">
                        <img 
                          src={photo.url} 
                          alt={photo.caption || 'Фото'} 
                          className="w-16 h-16 object-cover rounded"
                        />
                        <button
                          onClick={async () => {
                            if (confirm('Удалить фото?')) {
                              await graphqlClient.request(DELETE_PHOTO_FROM_REPAIR_SHOPPING_ITEM, { photoId: photo.id })
                              queryClient.invalidateQueries({ queryKey: ['repair', params.id] })
                              // Обновляем editingShoppingItem, убирая удаленное фото
                              if (editingShoppingItem) {
                                setEditingShoppingItem({
                                  ...editingShoppingItem,
                                  photos: editingShoppingItem.photos?.filter((p: any) => p.id !== photo.id) || []
                                })
                              }
                            }
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button outline onClick={() => {
            setShoppingItemDialogOpen(false)
            setEditingShoppingItem(null)
            setShoppingItemForm({ name: '', quantity: 1, amount: '', currency: 'RUB', notes: '' })
          }}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              const input = {
                name: shoppingItemForm.name,
                quantity: shoppingItemForm.quantity,
                amount: Math.round(parseFloat(shoppingItemForm.amount) * 100), // конвертируем в копейки
                currency: shoppingItemForm.currency,
                notes: shoppingItemForm.notes || undefined,
              }
              if (editingShoppingItem) {
                updateShoppingItemMutation.mutate({ itemId: editingShoppingItem.id, input })
              } else {
                createShoppingItemMutation.mutate(input)
              }
            }}
            disabled={createShoppingItemMutation.isPending || updateShoppingItemMutation.isPending || !shoppingItemForm.name || !shoppingItemForm.amount}
          >
            {createShoppingItemMutation.isPending || updateShoppingItemMutation.isPending ? 'Сохранение...' : editingShoppingItem ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

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
    </div>
  )
}

