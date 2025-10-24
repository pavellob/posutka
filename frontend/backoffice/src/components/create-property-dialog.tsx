'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Fieldset, Field, Label } from '@/components/fieldset'
import { Switch } from '@/components/switch'
import { graphqlClient } from '@/lib/graphql-client'

const CREATE_PROPERTY = `
  mutation CreateProperty($orgId: String!, $title: String!, $address: String!, $propertyType: String, $category: String, $isElite: Boolean) {
    createProperty(orgId: $orgId, title: $title, address: $address, propertyType: $propertyType, category: $category, isElite: $isElite) {
      id
      title
      address
      propertyType
      category
      isElite
    }
  }
`

type CreatePropertyDialogProps = {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  orgId: string
}

export function CreatePropertyDialog({ open, onClose, onSuccess, orgId }: CreatePropertyDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    propertyType: '',
    category: '',
    description: '',
    isElite: false,
  })

  const queryClient = useQueryClient()

  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating property with data:', {
        orgId,
        title: data.title,
        address: data.address,
        propertyType: data.propertyType || null,
        category: data.category || null,
        isElite: data.isElite
      })
      
      const variables: any = {
        orgId,
        title: data.title,
        address: data.address,
        isElite: data.isElite
      }
      
      // Добавляем опциональные поля только если они не пустые
      if (data.propertyType) {
        variables.propertyType = data.propertyType
      }
      if (data.category) {
        variables.category = data.category
      }
      
      return await graphqlClient.request(CREATE_PROPERTY, variables)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      onSuccess?.()
      onClose()
      setFormData({
        title: '',
        address: '',
        propertyType: '',
        category: '',
        description: '',
        isElite: false,
      })
    },
    onError: (error: any) => {
      console.error('Failed to create property:', error)
      alert('Ошибка при создании объекта: ' + (error.message || 'Неизвестная ошибка'))
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orgId) {
      alert('Ошибка: не выбрана организация')
      return
    }
    
    createPropertyMutation.mutate(formData)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>🏢 Создать объект недвижимости</DialogTitle>
      <DialogDescription>
        Заполните информацию о новом объекте недвижимости
      </DialogDescription>
      
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <Fieldset>
            <Field>
              <Label htmlFor="title">Название объекта *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Например: ЖК 'Солнечный'"
                required
              />
            </Field>

            <Field>
              <Label htmlFor="address">Адрес *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Например: ул. Ленина, 123"
                required
              />
            </Field>

            <Field>
              <Label htmlFor="propertyType">Тип объекта</Label>
              <Select
                id="propertyType"
                value={formData.propertyType}
                onChange={(e) => handleInputChange('propertyType', e.target.value)}
              >
                <option value="">Выберите тип</option>
                <option value="APARTMENT">Квартира</option>
                <option value="HOUSE">Дом</option>
                <option value="COMMERCIAL">Коммерческая недвижимость</option>
                <option value="HOTEL">Отель</option>
                <option value="HOSTEL">Хостел</option>
              </Select>
            </Field>

            <Field>
              <Label htmlFor="category">Категория</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Например: Элитное жилье"
              />
            </Field>

            <Field>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Дополнительная информация об объекте"
                rows={3}
              />
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <Label htmlFor="isElite">Элитный объект</Label>
                <Switch
                  id="isElite"
                  checked={formData.isElite}
                  onChange={(checked) => handleInputChange('isElite', checked)}
                />
              </div>
            </Field>
          </Fieldset>
        </DialogBody>

        <DialogActions>
          <Button outline onClick={onClose} disabled={createPropertyMutation.isPending}>
            Отмена
          </Button>
          <Button 
            type="submit" 
            disabled={createPropertyMutation.isPending || !formData.title || !formData.address}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createPropertyMutation.isPending ? 'Создаем...' : '🏢 Создать объект'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}