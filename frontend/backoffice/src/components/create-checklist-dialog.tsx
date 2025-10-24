'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Fieldset, Field, Label } from '@/components/fieldset'
import { Switch } from '@/components/switch'
import { graphqlClient } from '@/lib/graphql-client'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

const CREATE_CHECKLIST_TEMPLATE = `
  mutation CreateCleaningTemplate($input: CreateCleaningTemplateInput!) {
    createCleaningTemplate(input: $input) {
      id
      name
      description
      checklistItems {
        id
        label
        order
        isRequired
      }
    }
  }
`

const UPDATE_CHECKLIST_TEMPLATE = `
  mutation UpdateCleaningTemplate($id: UUID!, $input: UpdateCleaningTemplateInput!) {
    updateCleaningTemplate(id: $id, input: $input) {
      id
      name
      description
      checklistItems {
        id
        label
        order
        isRequired
      }
    }
  }
`

const GET_UNITS = `
  query GetUnitsByProperty($propertyId: UUID!) {
    unitsByProperty(propertyId: $propertyId) {
      id
      name
      unitType
    }
  }
`

type ChecklistItem = {
  id?: string
  label: string
  order: number
  isRequired: boolean
}

type CreateChecklistDialogProps = {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  propertyId?: string
  unitId?: string
  template?: any // Для редактирования существующего шаблона
}

export function CreateChecklistDialog({ 
  open, 
  onClose, 
  onSuccess, 
  propertyId, 
  unitId, 
  template 
}: CreateChecklistDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unitId: unitId || '',
  })

  const [items, setItems] = useState<ChecklistItem[]>([])

  const queryClient = useQueryClient()

  // Получаем список юнитов для выбора
  const { data: unitsData } = useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      if (!propertyId) return []
      const response = await graphqlClient.request(GET_UNITS, { propertyId }) as any
      return response.unitsByProperty
    },
    enabled: open && !!propertyId
  })

  const createTemplateMutation = useMutation({
    mutationFn: async (input: any) => {
      if (template) {
        return await graphqlClient.request(UPDATE_CHECKLIST_TEMPLATE, { 
          id: template.id, 
          input 
        })
      } else {
        return await graphqlClient.request(CREATE_CHECKLIST_TEMPLATE, { input })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaningTemplates'] })
      onSuccess?.()
      onClose()
      resetForm()
    },
    onError: (error: any) => {
      console.error('Failed to save template:', error)
      alert('Ошибка при сохранении шаблона: ' + (error.message || 'Неизвестная ошибка'))
    }
  })

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      unitId: unitId || '',
    })
    setItems([])
  }, [unitId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Проверяем, что выбран юнит
    if (!formData.unitId) {
      alert('Пожалуйста, выберите юнит для шаблона')
      return
    }
    
    // Подготавливаем данные для мутации
    const input = {
      name: formData.name,
      description: formData.description || null,
      unitId: formData.unitId, // Обязательное поле
      checklistItems: items.map((item, index) => ({
        label: item.label,
        order: index + 1,
        isRequired: item.isRequired
      }))
    }
    
    createTemplateMutation.mutate(input)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addItem = () => {
    setItems(prev => [...prev, {
      label: '',
      order: prev.length + 1,
      isRequired: false
    }])
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      order: i + 1
    })))
  }

  const updateItem = (index: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  // Инициализация формы при редактировании
  useEffect(() => {
    if (open && template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        unitId: template.unitId || unitId || '',
      })
      setItems(template.checklistItems?.map((item: any) => ({
        id: item.id,
        label: item.label,
        order: item.order,
        isRequired: item.isRequired
      })) || [])
    } else if (open) {
      resetForm()
    }
  }, [open, template, unitId, resetForm])

  return (
    <Dialog open={open} onClose={onClose} size="2xl">
      <DialogTitle>
        {template ? '✏️ Редактировать чеклист' : '📋 Создать чеклист'}
      </DialogTitle>
      <DialogDescription>
        {template 
          ? 'Измените информацию о шаблоне чеклиста'
          : 'Создайте новый шаблон чеклиста для конкретного юнита'
        }
      </DialogDescription>
      
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <Fieldset>
            <Field>
              <Label htmlFor="name">Название чеклиста *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Например: Стандартная уборка квартиры"
                required
              />
            </Field>

            <Field>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Описание чеклиста и его назначение"
                rows={2}
              />
            </Field>

            <Field>
              <Label htmlFor="unitId">Юнит *</Label>
              <Select
                id="unitId"
                value={formData.unitId}
                onChange={(e) => handleInputChange('unitId', e.target.value)}
                required
              >
                <option value="">Выберите юнит</option>
                {unitsData?.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.unitType})
                  </option>
                ))}
              </Select>
            </Field>

            {/* Список пунктов чеклиста */}
            <Field>
              <div className="flex items-center justify-between mb-4">
                <Label>Пункты чеклиста</Label>
                <Button
                  type="button"
                  onClick={addItem}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Добавить пункт
                </Button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <div className="flex-1">
                      <Input
                        value={item.label}
                        onChange={(e) => updateItem(index, 'label', e.target.value)}
                        placeholder="Описание пункта чеклиста"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.isRequired}
                        onChange={(checked) => updateItem(index, 'isRequired', checked)}
                      />
                      <Label className="text-sm">Обязательный</Label>
                    </div>
                    <Button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {items.length === 0 && (
                  <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                    <p>Пока нет пунктов в чеклисте</p>
                    <p className="text-sm">Нажмите &quot;Добавить пункт&quot; чтобы начать</p>
                  </div>
                )}
              </div>
            </Field>
          </Fieldset>
        </DialogBody>

        <DialogActions>
          <Button outline onClick={onClose} disabled={createTemplateMutation.isPending}>
            Отмена
          </Button>
          <Button 
            type="submit" 
            disabled={createTemplateMutation.isPending || !formData.name || !formData.unitId || items.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {createTemplateMutation.isPending 
              ? 'Сохраняем...' 
              : template ? '✏️ Сохранить изменения' : '📋 Создать чеклист'
            }
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
