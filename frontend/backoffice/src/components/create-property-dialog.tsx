'use client'

import { useState } from 'react'
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Text } from '@/components/text'
import { Heading } from '@/components/heading'
import { graphqlClient } from '@/lib/graphql-client'
import { useGetAllOrganizationsQuery } from '@/lib/generated/graphql'

interface CreatePropertyDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface PropertyFormData {
  orgId: string
  title: string
  address: string
  amenities: string[]
}

export function CreatePropertyDialog({ isOpen, onClose, onSuccess }: CreatePropertyDialogProps) {
  const [formData, setFormData] = useState<PropertyFormData>({
    orgId: '',
    title: '',
    address: '',
    amenities: []
  })
  const [currentAmenity, setCurrentAmenity] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Получаем список организаций
  const { data: organizationsData, isLoading: organizationsLoading } = useGetAllOrganizationsQuery(
    { 
      endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
      fetchParams: {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    },
    {}
  )

  const handleInputChange = (field: keyof PropertyFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const addAmenity = () => {
    if (currentAmenity.trim() && !formData.amenities.includes(currentAmenity.trim())) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, currentAmenity.trim()]
      }))
      setCurrentAmenity('')
    }
  }

  const removeAmenity = (amenityToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(amenity => amenity !== amenityToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.orgId || !formData.title || !formData.address) {
      setError('Пожалуйста, заполните все обязательные поля')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const mutation = `
        mutation CreateProperty($orgId: UUID!, $title: String!, $address: String!, $amenities: [String!]) {
          createProperty(orgId: $orgId, title: $title, address: $address, amenities: $amenities) {
            id
            title
            address
            amenities
            org {
              id
              name
            }
          }
        }
      `

      await graphqlClient.request(mutation, {
        orgId: formData.orgId,
        title: formData.title,
        address: formData.address,
        amenities: formData.amenities
      })

      // Сброс формы
      setFormData({
        orgId: '',
        title: '',
        address: '',
        amenities: []
      })
      setCurrentAmenity('')
      
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error creating property:', err)
      setError('Ошибка при создании объекта недвижимости. Попробуйте еще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      orgId: '',
      title: '',
      address: '',
      amenities: []
    })
    setCurrentAmenity('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      <DialogTitle>Создать новый объект недвижимости</DialogTitle>
      <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Выбор организации */}
          <div>
            <label htmlFor="orgId" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Организация *
            </label>
            {organizationsLoading ? (
              <Text className="text-zinc-500">Загрузка организаций...</Text>
            ) : (
              <select
                id="orgId"
                value={formData.orgId}
                onChange={(e) => handleInputChange('orgId', e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Выберите организацию</option>
                {organizationsData?.organizations?.edges?.map((orgEdge) => (
                  <option key={orgEdge.node.id} value={orgEdge.node.id}>
                    {orgEdge.node.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Название объекта */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Название объекта *
            </label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Например: Гостиница 'Восход'"
              required
            />
          </div>

          {/* Адрес */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Адрес *
            </label>
            <Input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Например: ул. Пушкина, д. 10, г. Москва"
              required
            />
          </div>

          {/* Удобства */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Удобства объекта
            </label>
            
            {/* Добавление нового удобства */}
            <div className="flex gap-2 mb-3">
              <Input
                type="text"
                value={currentAmenity}
                onChange={(e) => setCurrentAmenity(e.target.value)}
                placeholder="Например: WiFi, Парковка, Бассейн"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addAmenity()
                  }
                }}
              />
              <Button
                type="button"
                onClick={addAmenity}
                disabled={!currentAmenity.trim()}
                color="blue"
              >
                Добавить
              </Button>
            </div>

            {/* Список добавленных удобств */}
            {formData.amenities.length > 0 && (
              <div className="space-y-2">
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                  Добавленные удобства:
                </Text>
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                    >
                      <span>{amenity}</span>
                      <button
                        type="button"
                        onClick={() => removeAmenity(amenity)}
                        className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <Text className="text-red-800 dark:text-red-200">{error}</Text>
            </div>
          )}

          {/* Кнопки действий */}
          <DialogActions>
            <Button
              type="button"
              onClick={handleClose}
              outline
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              color="blue"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Создание...' : 'Создать объект'}
            </Button>
          </DialogActions>
        </form>
      </DialogBody>
    </Dialog>
  )
}
