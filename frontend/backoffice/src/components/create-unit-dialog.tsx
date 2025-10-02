'use client'

import { useState } from 'react'
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Text } from '@/components/text'
import { graphqlClient } from '@/lib/graphql-client'

interface CreateUnitDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  propertyId: string
  propertyTitle: string
}

interface UnitFormData {
  name: string
  capacity: number
  beds: number
  bathrooms: number
  amenities: string[]
}

export function CreateUnitDialog({ isOpen, onClose, onSuccess, propertyId, propertyTitle }: CreateUnitDialogProps) {
  const [formData, setFormData] = useState<UnitFormData>({
    name: '',
    capacity: 1,
    beds: 1,
    bathrooms: 1,
    amenities: []
  })
  const [currentAmenity, setCurrentAmenity] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: keyof UnitFormData, value: string | number) => {
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
    
    if (!formData.name || formData.capacity < 1 || formData.beds < 1 || formData.bathrooms < 1) {
      setError('Пожалуйста, заполните все обязательные поля корректно')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const mutation = `
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

      await graphqlClient.request(mutation, {
        propertyId,
        name: formData.name,
        capacity: formData.capacity,
        beds: formData.beds,
        bathrooms: formData.bathrooms,
        amenities: formData.amenities
      })

      // Сброс формы
      setFormData({
        name: '',
        capacity: 1,
        beds: 1,
        bathrooms: 1,
        amenities: []
      })
      setCurrentAmenity('')
      
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error creating unit:', err)
      setError('Ошибка при создании единицы недвижимости. Попробуйте еще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      capacity: 1,
      beds: 1,
      bathrooms: 1,
      amenities: []
    })
    setCurrentAmenity('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      <DialogTitle>Создать новую единицу недвижимости</DialogTitle>
      <DialogBody>
        <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Объект: <strong>{propertyTitle}</strong>
        </Text>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Название единицы */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Название единицы *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Например: Номер 101, Квартира 2А, Дом 1"
              required
            />
          </div>

          {/* Вместимость */}
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Максимальная вместимость (гостей) *
            </label>
            <Input
              id="capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 1)}
              placeholder="2"
              required
            />
          </div>

          {/* Количество кроватей */}
          <div>
            <label htmlFor="beds" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Количество кроватей *
            </label>
            <Input
              id="beds"
              type="number"
              min="1"
              value={formData.beds}
              onChange={(e) => handleInputChange('beds', parseInt(e.target.value) || 1)}
              placeholder="2"
              required
            />
          </div>

          {/* Количество ванных комнат */}
          <div>
            <label htmlFor="bathrooms" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Количество ванных комнат *
            </label>
            <Input
              id="bathrooms"
              type="number"
              min="1"
              value={formData.bathrooms}
              onChange={(e) => handleInputChange('bathrooms', parseInt(e.target.value) || 1)}
              placeholder="1"
              required
            />
          </div>

          {/* Удобства */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Удобства единицы
            </label>
            
            {/* Добавление нового удобства */}
            <div className="flex gap-2 mb-3">
              <Input
                type="text"
                value={currentAmenity}
                onChange={(e) => setCurrentAmenity(e.target.value)}
                placeholder="Например: Кондиционер, Кухня, Балкон"
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
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm"
                    >
                      <span>{amenity}</span>
                      <button
                        type="button"
                        onClick={() => removeAmenity(amenity)}
                        className="ml-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
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
              color="green"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Создание...' : 'Создать единицу'}
            </Button>
          </DialogActions>
        </form>
      </DialogBody>
    </Dialog>
  )
}
