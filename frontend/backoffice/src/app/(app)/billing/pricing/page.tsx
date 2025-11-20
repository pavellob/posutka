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
  CALCULATE_CLEANING_COST
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

  // Загрузка правил ценообразования
  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['pricingRules', currentOrgId],
    queryFn: () => graphqlClient.request(GET_CLEANING_PRICING_RULES, {
      orgId: currentOrgId!,
    }),
    enabled: !!currentOrgId,
  })

  const rules = rulesData?.cleaningPricingRules || []

  // Мутация для создания/обновления правила
  const upsertMutation = useMutation({
    mutationFn: (inputData: any) => {
      return graphqlClient.request(UPSERT_CLEANING_PRICING_RULE, { 
        input: inputData 
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] })
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

  // Мутация для удаления правила
  const deleteMutation = useMutation({
    mutationFn: (id: string) => graphqlClient.request(DELETE_CLEANING_PRICING_RULE, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] })
    },
  })

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
    setFormData({
      unitId: rule.unitId || '',
      mode: rule.mode,
      baseAmount: (rule.baseCleaningPrice.amount / 100).toString(),
      baseCurrency: rule.baseCleaningPrice.currency,
      gradeStep: rule.gradeStep.toString(),
      difficultyStep: rule.difficultyStep.toString(),
      increasedDifficultyDelta: rule.increasedDifficultyDelta.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!currentOrgId) return

    const input = {
      orgId: currentOrgId,
      unitId: formData.unitId || null,
      mode: formData.mode,
      baseCleaningPrice: {
        amount: Math.round(parseFloat(formData.baseAmount) * 100), // конвертируем в копейки
        currency: formData.baseCurrency,
      },
      gradeStep: parseFloat(formData.gradeStep),
      difficultyStep: parseFloat(formData.difficultyStep),
      increasedDifficultyDelta: parseFloat(formData.increasedDifficultyDelta),
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
          <Heading>Ценообразование уборок</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Настройка правил расчёта стоимости уборок на основе градации и сложности
          </Text>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Создать правило
        </Button>
      </div>

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
                    {formatMoney(rule.baseCleaningPrice.amount, rule.baseCleaningPrice.currency)}
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

      {/* Диалог создания/редактирования */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <div className="p-6 space-y-6">
          <Heading level={3}>
            {editingRule ? 'Редактировать правило' : 'Создать правило'}
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
                Шаг градации (gradeStep)
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.gradeStep}
                onChange={(e) => setFormData({ ...formData, gradeStep: e.target.value })}
                placeholder="0.1"
              />
              <Text className="text-xs text-zinc-500 mt-1">
                Коэффициент = 1 + gradeStep × grade (0→1.0 … 10→2.0 при step=0.1)
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
                Дополнительная надбавка к коэффициенту сложности в режиме INCREASED
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
    </div>
  )
}

