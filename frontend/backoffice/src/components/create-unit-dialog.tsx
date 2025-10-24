'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Fieldset, Field, Label } from '@/components/fieldset'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { GET_PROPERTIES_BY_ORG } from '@/lib/graphql-queries'

const CREATE_UNIT = `
  mutation CreateUnit($propertyId: UUID!, $name: String!, $capacity: Int!, $beds: Int!, $bathrooms: Int!, $amenities: [String!]) {
    createUnit(propertyId: $propertyId, name: $name, capacity: $capacity, beds: $beds, bathrooms: $bathrooms, amenities: $amenities) {
      id
      name
      capacity
      beds
      bathrooms
      amenities
      property {
        id
        title
      }
    }
  }
`



type CreateUnitDialogProps = {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  propertyId?: string
}

export function CreateUnitDialog({ open, onClose, onSuccess, propertyId }: CreateUnitDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    beds: '',
    bathrooms: '',
    amenities: [] as string[],
    propertyId: propertyId || '',
  })

  const queryClient = useQueryClient()
  const { currentOrgId } = useCurrentOrganization()

  // Получаем список объектов для выбора (только если propertyId не передан)
  const { data: propertiesData, isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return []
      const response = await graphqlClient.request(GET_PROPERTIES_BY_ORG, { orgId: currentOrgId }) as any
      return response.propertiesByOrgId || []
    },
    enabled: open && !propertyId && !!currentOrgId
  })


  const createUnitMutation = useMutation({
    mutationFn: async (input: any) => {
      return await graphqlClient.request(CREATE_UNIT, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      onSuccess?.()
      onClose()
      setFormData({
        name: '',
        capacity: '',
        beds: '',
        bathrooms: '',
        amenities: [],
        propertyId: propertyId || '',
      })
    },
    onError: (error: any) => {
      console.error('Failed to create unit:', error)
      alert('Ошибка при создании юнита: ' + (error.message || 'Неизвестная ошибка'))
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createUnitMutation.mutate({
      propertyId: formData.propertyId,
      name: formData.name,
      capacity: parseInt(formData.capacity),
      beds: parseInt(formData.beds),
      bathrooms: parseInt(formData.bathrooms),
      amenities: formData.amenities,
    })
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Устанавливаем propertyId при открытии диалога
  useEffect(() => {
    if (open && propertyId) {
      setFormData(prev => ({
        ...prev,
        propertyId
      }))
    }
  }, [open, propertyId])

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>🏠 Создать юнит</DialogTitle>
      <DialogDescription>
        Заполните информацию о новом юните (квартире, комнате и т.д.)
      </DialogDescription>
      
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <Fieldset>
            <Field>
              <Label htmlFor="name">Название юнита *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Например: Квартира 1, Комната 101"
                required
              />
            </Field>

            {!propertyId && (
              <Field>
                <Label htmlFor="propertyId">Объект недвижимости *</Label>
                <Select
                  id="propertyId"
                  value={formData.propertyId}
                  onChange={(e) => handleInputChange('propertyId', e.target.value)}
                  required
                  disabled={propertiesLoading}
                >
                  <option value="">
                    {propertiesLoading ? 'Загрузка объектов...' : 
                     (!propertiesData || propertiesData.length === 0) ? 'Нет объектов недвижимости' : 
                     'Выберите объект'}
                  </option>
                  {Array.isArray(propertiesData) && propertiesData.length > 0 && propertiesData.map((property: any) => (
                    <option key={property.id} value={property.id}>
                      {property.title} - {property.address}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <div className="grid grid-cols-3 gap-4">
              <Field>
                <Label htmlFor="capacity">Вместимость *</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', e.target.value)}
                  placeholder="2"
                  min="1"
                  required
                />
              </Field>

              <Field>
                <Label htmlFor="beds">Кровати *</Label>
                <Input
                  id="beds"
                  type="number"
                  value={formData.beds}
                  onChange={(e) => handleInputChange('beds', e.target.value)}
                  placeholder="1"
                  min="0"
                  required
                />
              </Field>

              <Field>
                <Label htmlFor="bathrooms">Ванные комнаты *</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                  placeholder="1"
                  min="0"
                  required
                />
              </Field>
            </div>
          </Fieldset>
        </DialogBody>

        <DialogActions>
          <Button outline onClick={onClose} disabled={createUnitMutation.isPending}>
            Отмена
          </Button>
          <Button 
            type="submit" 
            disabled={createUnitMutation.isPending || propertiesLoading || !formData.name || !formData.capacity || !formData.beds || !formData.bathrooms || !formData.propertyId}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {createUnitMutation.isPending ? 'Создаем...' : '🏠 Создать юнит'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}