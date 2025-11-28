'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Dialog } from '@/components/dialog'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Badge } from '@/components/badge'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import {
  GET_CLEANING_PRICING_RULES,
  UPSERT_CLEANING_PRICING_RULE,
  DELETE_CLEANING_PRICING_RULE,
  CALCULATE_CLEANING_COST,
  GET_REPAIR_PRICING_RULES,
  UPSERT_REPAIR_PRICING_RULE,
  DELETE_REPAIR_PRICING_RULE,
  CALCULATE_REPAIR_COST
} from '@/lib/graphql-queries'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

// Форматирование денег
function formatMoney(amount: number, currency: string): string {
  const value = amount / 100 // конвертируем из копеек
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function PricingPage() {
  const { currentOrgId } = useCurrentOrganization()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'cleanings' | 'repairs'>('cleanings')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<any>(null)
  const [formData, setFormData] = useState({
    unitId: '',
    mode: 'BASIC',
    baseAmount: '',
    baseCurrency: 'RUB',
    gradeStep: '0.1',
    difficultyStep: '0.2',
    increasedDifficultyDelta: '0.1',
  })

  // Загрузка правил ценообразования для уборок
  const { data: cleaningRulesData, isLoading: isLoadingCleanings } = useQuery<{ cleaningPricingRules: any[] }>({
    queryKey: ['cleaningPricingRules', currentOrgId],
    queryFn: () => graphqlClient.request(GET_CLEANING_PRICING_RULES, {
      orgId: currentOrgId!,
    }) as Promise<{ cleaningPricingRules: any[] }>,
    enabled: !!currentOrgId && activeTab === 'cleanings',
  })

  // Загрузка правил ценообразования для ремонтов
  const { data: repairRulesData, isLoading: isLoadingRepairs } = useQuery<{ repairPricingRules: any[] }>({
    queryKey: ['repairPricingRules', currentOrgId],
    queryFn: () => graphqlClient.request(GET_REPAIR_PRICING_RULES, {
      orgId: currentOrgId!,
    }) as Promise<{ repairPricingRules: any[] }>,
    enabled: !!currentOrgId && activeTab === 'repairs',
  })

  const cleaningRules = cleaningRulesData?.cleaningPricingRules || []
  const repairRules = repairRulesData?.repairPricingRules || []
  const rules = activeTab === 'cleanings' ? cleaningRules : repairRules
  const isLoading = activeTab === 'cleanings' ? isLoadingCleanings : isLoadingRepairs

  // Мутация для создания/обновления правила уборок
  const upsertCleaningMutation = useMutation({
    mutationFn: (inputData: any) => {
      return graphqlClient.request(UPSERT_CLEANING_PRICING_RULE, { 
        input: inputData 
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaningPricingRules'] })
      setIsDialogOpen(false)
      setEditingRule(null)
      setFormData({
        unitId: '',
        mode: 'BASIC',
        baseAmount: '',
        baseCurrency: 'RUB',
        gradeStep: '0.1',
        difficultyStep: '0.2',
        increasedDifficultyDelta: '0.1',
      })
    },
  })

  // Мутация для создания/обновления правила ремонтов
  const upsertRepairMutation = useMutation({
    mutationFn: (inputData: any) => {
      return graphqlClient.request(UPSERT_REPAIR_PRICING_RULE, { 
        input: inputData 
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairPricingRules'] })
      setIsDialogOpen(false)
      setEditingRule(null)
      setFormData({
        unitId: '',
        mode: 'BASIC',
        baseAmount: '',
        baseCurrency: 'RUB',
        gradeStep: '0.1',
        difficultyStep: '0.2',
        increasedDifficultyDelta: '0.1',
      })
    },
  })

  const upsertMutation = activeTab === 'cleanings' ? upsertCleaningMutation : upsertRepairMutation

  // Мутация для удаления правила уборок
  const deleteCleaningMutation = useMutation({
    mutationFn: (id: string) => graphqlClient.request(DELETE_CLEANING_PRICING_RULE, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaningPricingRules'] })
    },
  })

  // Мутация для удаления правила ремонтов
  const deleteRepairMutation = useMutation({
    mutationFn: (id: string) => graphqlClient.request(DELETE_REPAIR_PRICING_RULE, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairPricingRules'] })
    },
  })

  const deleteMutation = activeTab === 'cleanings' ? deleteCleaningMutation : deleteRepairMutation

  const handleCreate = () => {
    setEditingRule(null)
    setFormData({
      unitId: '',
      mode: 'BASIC',
      baseAmount: '',
      baseCurrency: 'RUB',
      gradeStep: '0.1',
      difficultyStep: '0.2',
      increasedDifficultyDelta: '0.1',
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (rule: any) => {
    setEditingRule(rule)
    const basePrice = activeTab === 'cleanings' ? rule.baseCleaningPrice : rule.baseRepairPrice
    setFormData({
      unitId: rule.unitId || '',
      mode: rule.mode,
      baseAmount: (basePrice.amount / 100).toString(),
      baseCurrency: basePrice.currency,
      gradeStep: rule.gradeStep.toString(),
      difficultyStep: rule.difficultyStep.toString(),
      increasedDifficultyDelta: rule.increasedDifficultyDelta.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!currentOrgId) return

    // Валидация базовой цены
    if (!formData.baseAmount || isNaN(parseFloat(formData.baseAmount)) || parseFloat(formData.baseAmount) <= 0) {
      alert('Пожалуйста, укажите корректную базовую цену')
      return
    }

    const basePrice = {
      amount: Math.round(parseFloat(formData.baseAmount) * 100), // конвертируем в копейки
      currency: formData.baseCurrency,
    }

    const input = activeTab === 'cleanings' 
      ? {
          orgId: currentOrgId,
          unitId: formData.unitId || null,
          mode: formData.mode,
          baseCleaningPrice: basePrice,
          gradeStep: formData.gradeStep ? parseFloat(formData.gradeStep) : undefined,
          difficultyStep: formData.difficultyStep ? parseFloat(formData.difficultyStep) : undefined,
          increasedDifficultyDelta: formData.increasedDifficultyDelta ? parseFloat(formData.increasedDifficultyDelta) : undefined,
        }
      : {
          orgId: currentOrgId,
          unitId: formData.unitId || null,
          mode: formData.mode,
          baseRepairPrice: basePrice,
          gradeStep: formData.gradeStep ? parseFloat(formData.gradeStep) : undefined,
          difficultyStep: formData.difficultyStep ? parseFloat(formData.difficultyStep) : undefined,
          increasedDifficultyDelta: formData.increasedDifficultyDelta ? parseFloat(formData.increasedDifficultyDelta) : undefined,
        }

    upsertMutation.mutate(input)
  }

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить это правило ценообразования?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading>Ценообразование</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Настройка правил расчёта стоимости уборок и ремонтов на основе градации и сложности
          </Text>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Создать правило
        </Button>
      </div>

      {/* Табы */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('cleanings')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'cleanings'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Уборки
          </button>
          <button
            onClick={() => setActiveTab('repairs')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'repairs'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Ремонты
          </button>
        </div>
      </div>

      {activeTab === 'cleanings' && (
        <>

      {/* Таблица правил */}
      {isLoading ? (
        <Text>Загрузка...</Text>
      ) : rules.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-12 text-center">
          <Text className="text-zinc-500 mb-4">Нет правил ценообразования</Text>
          <Button onClick={handleCreate}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Создать первое правило
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Тип</TableHeader>
                <TableHeader>Базовая цена</TableHeader>
                <TableHeader>Шаг градации</TableHeader>
                <TableHeader>Шаг сложности</TableHeader>
                <TableHeader>Режим</TableHeader>
                <TableHeader>Действия</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((rule: any) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    {rule.unitId ? (
                      <Badge color="blue">Для юнита</Badge>
                    ) : (
                      <Badge color="green">Для организации</Badge>
                    )}
                  </TableCell>
                <TableCell>
                  {formatMoney(
                    activeTab === 'cleanings' ? rule.baseCleaningPrice.amount : rule.baseRepairPrice.amount,
                    activeTab === 'cleanings' ? rule.baseCleaningPrice.currency : rule.baseRepairPrice.currency
                  )}
                </TableCell>
                  <TableCell>{rule.gradeStep}</TableCell>
                  <TableCell>{rule.difficultyStep}</TableCell>
                  <TableCell>
                    <Badge color={rule.mode === 'BASIC' ? 'zinc' : 'orange'}>
                      {rule.mode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        outline
                        onClick={() => handleEdit(rule)}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        outline
                        onClick={() => handleDelete(rule.id)}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      </>
      )}

      {/* Диалог создания/редактирования - общий для обеих вкладок */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <div className="p-6 space-y-6">
          <Heading level={3}>
            {editingRule ? 'Редактировать правило' : 'Создать правило'} {activeTab === 'repairs' ? 'для ремонтов' : 'для уборок'}
          </Heading>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                ID юнита (оставьте пустым для правила организации)
              </label>
              <Input
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                placeholder="Оставьте пустым для всех юнитов"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                Режим коэффициентов
              </label>
              <Select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
              >
                <option value="BASIC">BASIC</option>
                <option value="INCREASED">INCREASED</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  Базовая цена
                </label>
                <Input
                  type="number"
                  value={formData.baseAmount}
                  onChange={(e) => setFormData({ ...formData, baseAmount: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  Валюта
                </label>
                <Select
                  value={formData.baseCurrency}
                  onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
                >
                  <option value="RUB">RUB</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                {activeTab === 'cleanings' ? 'Шаг градации (gradeStep)' : 'Шаг размера (gradeStep)'}
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.gradeStep}
                onChange={(e) => setFormData({ ...formData, gradeStep: e.target.value })}
                placeholder="0.1"
              />
              <Text className="text-xs text-zinc-500 mt-1">
                {activeTab === 'cleanings' 
                  ? 'Коэффициент = 1 + gradeStep × grade (0→1.0 … 10→2.0 при step=0.1)'
                  : 'Коэффициент = gradeStep × size (0→0.0 … 10→2.0 при step=0.2)'}
              </Text>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                Шаг сложности (difficultyStep)
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.difficultyStep}
                onChange={(e) => setFormData({ ...formData, difficultyStep: e.target.value })}
                placeholder="0.2"
              />
              <Text className="text-xs text-zinc-500 mt-1">
                Коэффициент = 1 + difficultyStep × difficulty (0→1.0 … 5→2.0 при step=0.2)
              </Text>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                Дельта для INCREASED режима
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.increasedDifficultyDelta}
                onChange={(e) => setFormData({ ...formData, increasedDifficultyDelta: e.target.value })}
                placeholder="0.1"
              />
              <Text className="text-xs text-zinc-500 mt-1">
                В режиме INCREASED: коэффициент сложности умножается на (1 + дельта). Например, при дельта=0.2: базовый_коэф × 1.2
              </Text>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button outline onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Сохранение...' : editingRule ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Dialog>

      {activeTab === 'repairs' && (
        <>
          {isLoading ? (
            <Text>Загрузка...</Text>
          ) : repairRules.length === 0 ? (
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-12 text-center">
              <Text className="text-zinc-500 mb-4">Нет правил ценообразования для ремонтов</Text>
              <Button onClick={handleCreate}>
                <PlusIcon className="w-5 h-5 mr-2" />
                Создать первое правило
              </Button>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Тип</TableHeader>
                    <TableHeader>Базовая цена</TableHeader>
                    <TableHeader>Шаг размера</TableHeader>
                    <TableHeader>Шаг сложности</TableHeader>
                    <TableHeader>Режим</TableHeader>
                    <TableHeader>Действия</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {repairRules.map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        {rule.unitId ? (
                          <Badge color="blue">Для юнита</Badge>
                        ) : (
                          <Badge color="green">Для организации</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatMoney(rule.baseRepairPrice.amount, rule.baseRepairPrice.currency)}
                      </TableCell>
                      <TableCell>{rule.gradeStep}</TableCell>
                      <TableCell>{rule.difficultyStep}</TableCell>
                      <TableCell>
                        <Badge color={rule.mode === 'BASIC' ? 'zinc' : 'orange'}>
                          {rule.mode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            outline
                            onClick={() => handleEdit(rule)}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            outline
                            onClick={() => handleDelete(rule.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

