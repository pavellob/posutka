'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Dialog } from '@/components/dialog'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Textarea } from '@/components/textarea'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Fieldset, Field, Label } from '@/components/fieldset'
import { Combobox, ComboboxOption, ComboboxLabel } from '@/components/combobox'
import { useGetPropertiesByOrgQuery, useGetUnitsByPropertyQuery, useGetAllOrganizationsQuery, useUpdatePropertyMutation, UpdatePropertyDocument } from '@/lib/generated/graphql'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { useSelectedOrganization } from '@/hooks/useSelectedOrganization'
import { Squares2X2Icon, TableCellsIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'

// Компонент карточки объекта недвижимости
function PropertyCard({ property, onEdit, onView }: { property: Property; onEdit: (property: Property) => void; onView: (property: Property) => void }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer"
      onClick={() => onView(property)}>
      {/* Заголовок карточки */}
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Heading level={3} className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {property.title}
            </Heading>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {property.address}
            </Text>
            <div className="flex flex-wrap gap-2">
              <Badge color="blue">{property.propertyType || 'Не указано'}</Badge>
              {property.category && (
                <Badge color="green">{property.category}</Badge>
              )}
              {property.isElite && (
                <Badge color="orange">Элитная</Badge>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onView(property)
              }}
              color="green"
            >
              Открыть
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(property)
              }}
              color="blue"
            >
              Редактировать
            </Button>
          </div>
        </div>
      </div>

      {/* Основная информация */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">Площадь</Text>
            <Text className="text-lg font-semibold text-blue-600">
              {property.totalArea ? `${property.totalArea} м²` : 'Не указано'}
            </Text>
            {property.livingArea && (
              <Text className="text-xs text-gray-500">Жилая: {property.livingArea} м²</Text>
            )}
          </div>
          <div>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">Комнаты</Text>
            <Text className="text-lg font-semibold text-green-600">
              {property.rooms || 'Не указано'}
            </Text>
          </div>
          <div>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">Этаж</Text>
            <Text className="text-lg font-semibold text-purple-600">
              {property.floor || 'Не указано'}
              {property.floorsTotal && ` из ${property.floorsTotal}`}
            </Text>
          </div>
          <div>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">Год постройки</Text>
            <Text className="text-lg font-semibold text-orange-600">
              {property.buildingYear || 'Не указано'}
            </Text>
          </div>
        </div>

        {/* Метро */}
        {property.metroName && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <Text className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {property.metroName}
              </Text>
              {property.metroTimeOnFoot && (
                <Text className="text-xs text-blue-600 dark:text-blue-300">
                  {property.metroTimeOnFoot} мин пешком
                </Text>
              )}
            </div>
          </div>
        )}

        {/* Удобства */}
        <div className="mb-4">
          <Text className="text-sm font-medium text-gray-900 dark:text-white mb-2">Удобства</Text>
          <div className="flex flex-wrap gap-1">
            {property.elevator && <Badge color="green" className="text-xs">Лифт</Badge>}
            {property.parking && <Badge color="green" className="text-xs">Парковка</Badge>}
            {property.security && <Badge color="green" className="text-xs">Охрана</Badge>}
            {property.balcony && <Badge color="blue" className="text-xs">Балкон</Badge>}
            {property.airConditioning && <Badge color="blue" className="text-xs">Кондиционер</Badge>}
            {property.internet && <Badge color="blue" className="text-xs">Интернет</Badge>}
            {property.tv && <Badge color="blue" className="text-xs">ТВ</Badge>}
            {property.renovation && (
              <Badge color="orange" className="text-xs">{property.renovation}</Badge>
            )}
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            <Text className="font-medium">Тип здания:</Text>
            <Text>{property.buildingType || 'Не указано'}</Text>
          </div>
          <div>
            <Text className="font-medium">Ремонт:</Text>
            <Text>{property.renovation || 'Не указано'}</Text>
          </div>
        </div>
      </div>
    </div>
  )
}

// Компонент для редактирования объекта недвижимости
function EditPropertyDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  property 
}: { 
  isOpen: boolean
  onClose: () => void
  onSave: (property: Property) => void
  property: Property
}) {
  const [formData, setFormData] = useState<Partial<Property>>({
    title: property.title,
    address: property.address,
    propertyType: property.propertyType,
    category: property.category,
    dealStatus: property.dealStatus,
    country: property.country,
    region: property.region,
    district: property.district,
    localityName: property.localityName,
    apartment: property.apartment,
    metroName: property.metroName,
    metroTimeOnFoot: property.metroTimeOnFoot,
    metroTimeOnTransport: property.metroTimeOnTransport,
    latitude: property.latitude,
    longitude: property.longitude,
    totalArea: property.totalArea,
    livingArea: property.livingArea,
    kitchenArea: property.kitchenArea,
    rooms: property.rooms,
    roomsOffered: property.roomsOffered,
    floor: property.floor,
    floorsTotal: property.floorsTotal,
    buildingType: property.buildingType,
    buildingYear: property.buildingYear,
    buildingSeries: property.buildingSeries,
    elevator: property.elevator,
    parking: property.parking,
    security: property.security,
    concierge: property.concierge,
    playground: property.playground,
    gym: property.gym,
    balcony: property.balcony,
    loggia: property.loggia,
    airConditioning: property.airConditioning,
    internet: property.internet,
    washingMachine: property.washingMachine,
    dishwasher: property.dishwasher,
    tv: property.tv,
    renovation: property.renovation,
    furniture: property.furniture,
    isElite: property.isElite,
    yandexBuildingId: property.yandexBuildingId,
    yandexHouseId: property.yandexHouseId
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ ...property, ...formData })
  }

  return (
    <Dialog open={isOpen} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between mb-6">
          <Heading level={2}>Редактировать объект недвижимости</Heading>
          <Button type="button" onClick={onClose} color="zinc">
            ✕
          </Button>
        </div>

        <div className="space-y-6">
          {/* Основная информация */}
          <Fieldset>
            <legend className="text-lg font-medium mb-4">Основная информация</legend>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label>Название</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Название объекта"
                  required
                />
              </Field>

              <Field>
                <Label>Адрес</Label>
                <Input
                  value={formData.address || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Адрес объекта"
                  required
                />
              </Field>

              <Field>
                <Label>Тип недвижимости</Label>
                <Select
                  value={formData.propertyType || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, propertyType: e.target.value }))}
                >
                  <option value="">Выберите тип</option>
                  <option value="жилая">Жилая</option>
                  <option value="коммерческая">Коммерческая</option>
                </Select>
              </Field>

              <Field>
                <Label>Категория</Label>
                <Select
                  value={formData.category || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Выберите категорию</option>
                  <option value="квартира">Квартира</option>
                  <option value="комната">Комната</option>
                  <option value="дом">Дом</option>
                  <option value="гараж">Гараж</option>
                </Select>
              </Field>

              <Field>
                <Label>Статус сделки</Label>
                <Select
                  value={formData.dealStatus || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, dealStatus: e.target.value }))}
                >
                  <option value="">Выберите статус</option>
                  <option value="первичная продажа">Первичная продажа</option>
                  <option value="вторичка">Вторичка</option>
                  <option value="аренда">Аренда</option>
                </Select>
              </Field>

              <Field>
                <Label>Элитная недвижимость</Label>
                <Select
                  value={formData.isElite?.toString() || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, isElite: e.target.value === 'true' }))}
                >
                  <option value="">Выберите</option>
                  <option value="false">Обычная</option>
                  <option value="true">Элитная</option>
                </Select>
              </Field>
            </div>
          </Fieldset>

          {/* Локация */}
          <Fieldset>
            <legend className="text-lg font-medium mb-4">Локация</legend>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field>
                <Label>Страна</Label>
                <Input
                  value={formData.country || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Россия"
                />
              </Field>

              <Field>
                <Label>Регион</Label>
                <Input
                  value={formData.region || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                  placeholder="Санкт-Петербург"
                />
              </Field>

              <Field>
                <Label>Район</Label>
                <Input
                  value={formData.district || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="Петроградский"
                />
              </Field>

              <Field>
                <Label>Город</Label>
                <Input
                  value={formData.localityName || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, localityName: e.target.value }))}
                  placeholder="Санкт-Петербург"
                />
              </Field>

              <Field>
                <Label>Квартира</Label>
                <Input
                  value={formData.apartment || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, apartment: e.target.value }))}
                  placeholder="48"
                />
              </Field>

              <Field>
                <Label>Метро</Label>
                <Input
                  value={formData.metroName || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, metroName: e.target.value }))}
                  placeholder="Чкаловская"
                />
              </Field>

              <Field>
                <Label>Время до метро пешком (мин)</Label>
                <Input
                  type="number"
                  value={formData.metroTimeOnFoot || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, metroTimeOnFoot: parseInt(e.target.value) || undefined }))}
                  placeholder="5"
                />
              </Field>

              <Field>
                <Label>Широта</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formData.latitude || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || undefined }))}
                  placeholder="59.9586"
                />
              </Field>

              <Field>
                <Label>Долгота</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formData.longitude || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || undefined }))}
                  placeholder="30.3171"
                />
              </Field>
            </div>
          </Fieldset>

          {/* Площади и характеристики */}
          <Fieldset>
            <legend className="text-lg font-medium mb-4">Площади и характеристики</legend>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field>
                <Label>Общая площадь (м²)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.totalArea || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalArea: parseFloat(e.target.value) || undefined }))}
                  placeholder="85.5"
                />
              </Field>

              <Field>
                <Label>Жилая площадь (м²)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.livingArea || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, livingArea: parseFloat(e.target.value) || undefined }))}
                  placeholder="65.2"
                />
              </Field>

              <Field>
                <Label>Площадь кухни (м²)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.kitchenArea || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, kitchenArea: parseFloat(e.target.value) || undefined }))}
                  placeholder="12.3"
                />
              </Field>

              <Field>
                <Label>Комнаты</Label>
                <Input
                  type="number"
                  value={formData.rooms || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, rooms: parseInt(e.target.value) || undefined }))}
                  placeholder="3"
                />
              </Field>

              <Field>
                <Label>Комнаты к сдаче</Label>
                <Input
                  type="number"
                  value={formData.roomsOffered || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roomsOffered: parseInt(e.target.value) || undefined }))}
                  placeholder="3"
                />
              </Field>

              <Field>
                <Label>Этаж</Label>
                <Input
                  type="number"
                  value={formData.floor || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, floor: parseInt(e.target.value) || undefined }))}
                  placeholder="1"
                />
              </Field>

              <Field>
                <Label>Этажей всего</Label>
                <Input
                  type="number"
                  value={formData.floorsTotal || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, floorsTotal: parseInt(e.target.value) || undefined }))}
                  placeholder="5"
                />
              </Field>
            </div>
          </Fieldset>

          {/* Здание */}
          <Fieldset>
            <legend className="text-lg font-medium mb-4">Здание</legend>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field>
                <Label>Тип здания</Label>
                <Select
                  value={formData.buildingType || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, buildingType: e.target.value }))}
                >
                  <option value="">Выберите тип</option>
                  <option value="кирпичный">Кирпичный</option>
                  <option value="панельный">Панельный</option>
                  <option value="монолитный">Монолитный</option>
                </Select>
              </Field>

              <Field>
                <Label>Год постройки</Label>
                <Input
                  type="number"
                  value={formData.buildingYear || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, buildingYear: parseInt(e.target.value) || undefined }))}
                  placeholder="1910"
                />
              </Field>

              <Field>
                <Label>Серия здания</Label>
                <Input
                  value={formData.buildingSeries || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, buildingSeries: e.target.value }))}
                  placeholder="дореволюционная застройка"
                />
              </Field>

              <Field>
                <Label>Состояние ремонта</Label>
                <Select
                  value={formData.renovation || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, renovation: e.target.value }))}
                >
                  <option value="">Выберите состояние</option>
                  <option value="без отделки">Без отделки</option>
                  <option value="требует ремонта">Требует ремонта</option>
                  <option value="хорошее">Хорошее</option>
                  <option value="отличное">Отличное</option>
                </Select>
              </Field>
            </div>
          </Fieldset>

          {/* Удобства здания */}
          <Fieldset>
            <legend className="text-lg font-medium mb-4">Удобства здания</legend>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.elevator || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, elevator: e.target.checked }))}
                  />
                  Лифт
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.parking || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, parking: e.target.checked }))}
                  />
                  Парковка
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.security || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, security: e.target.checked }))}
                  />
                  Охрана
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.concierge || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, concierge: e.target.checked }))}
                  />
                  Консьерж
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.playground || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, playground: e.target.checked }))}
                  />
                  Детская площадка
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.gym || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, gym: e.target.checked }))}
                  />
                  Спортзал
                </Label>
              </Field>
            </div>
          </Fieldset>

          {/* Удобства квартиры */}
          <Fieldset>
            <legend className="text-lg font-medium mb-4">Удобства квартиры</legend>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.balcony || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, balcony: e.target.checked }))}
                  />
                  Балкон
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.loggia || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, loggia: e.target.checked }))}
                  />
                  Лоджия
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.airConditioning || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, airConditioning: e.target.checked }))}
                  />
                  Кондиционер
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.internet || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, internet: e.target.checked }))}
                  />
                  Интернет
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.washingMachine || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, washingMachine: e.target.checked }))}
                  />
                  Стиральная машина
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.dishwasher || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, dishwasher: e.target.checked }))}
                  />
                  Посудомоечная машина
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.tv || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, tv: e.target.checked }))}
                  />
                  ТВ
                </Label>
              </Field>

              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.furniture || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, furniture: e.target.checked }))}
                  />
                  Мебель
                </Label>
              </Field>
            </div>
          </Fieldset>

          {/* Внешние ID */}
          <Fieldset>
            <legend className="text-lg font-medium mb-4">Внешние ID</legend>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label>Яндекс ID здания</Label>
                <Input
                  value={formData.yandexBuildingId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, yandexBuildingId: e.target.value }))}
                  placeholder="building_123"
                />
              </Field>

              <Field>
                <Label>Яндекс ID дома</Label>
                <Input
                  value={formData.yandexHouseId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, yandexHouseId: e.target.value }))}
                  placeholder="house_456"
                />
              </Field>
            </div>
          </Fieldset>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button type="button" onClick={onClose} color="zinc">
            Отмена
          </Button>
          <Button type="submit" color="blue">
            Сохранить изменения
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

// Типы для объектов недвижимости
type Property = {
  id: string
  title: string
  address: string
  amenities: string[]
  propertyType?: string
  category?: string
  dealStatus?: string
  country?: string
  region?: string
  district?: string
  localityName?: string
  apartment?: string
  metroName?: string
  metroTimeOnFoot?: number
  metroTimeOnTransport?: number
  latitude?: number
  longitude?: number
  totalArea?: number
  livingArea?: number
  kitchenArea?: number
  rooms?: number
  roomsOffered?: number
  floor?: number
  floorsTotal?: number
  buildingType?: string
  buildingYear?: number
  buildingSeries?: string
  elevator?: boolean
  parking?: boolean
  security?: boolean
  concierge?: boolean
  playground?: boolean
  gym?: boolean
  balcony?: boolean
  loggia?: boolean
  airConditioning?: boolean
  internet?: boolean
  washingMachine?: boolean
  dishwasher?: boolean
  tv?: boolean
  renovation?: string
  furniture?: boolean
  isElite?: boolean
  yandexBuildingId?: string
  yandexHouseId?: string
  org: {
    id: string
    name: string
  }
}

export default function InventoryPage() {
  const router = useRouter()
  
  // Состояние для переключения вида (таблица/карточки)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  
  // Фильтры для объектов недвижимости
  const [filters, setFilters] = useState({
    propertyType: '',
    category: '',
    dealStatus: '',
    buildingType: '',
    renovation: '',
    isElite: ''
  })
  
  // Состояние для редактирования
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const queryClient = useQueryClient()

  // Получаем текущую организацию пользователя
  const { currentOrganization, currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const { getSelectedOrgId, selectedOrg } = useSelectedOrganization()
  
  // Используем выбранную организацию из селектора, если есть, иначе текущую
  const selectedOrgId = getSelectedOrgId()
  const orgId = selectedOrgId || currentOrgId

  // Запрос объектов недвижимости с новыми полями
  const { data: propertiesData, isLoading: propertiesLoading, refetch: refetchProperties } = useQuery({
    queryKey: ['properties', orgId],
    queryFn: async () => {
      if (!orgId) return { propertiesByOrgId: [] }
      
          const response = await graphqlClient.request(`
            query GetPropertiesByOrg($orgId: UUID!) {
              propertiesByOrgId(orgId: $orgId) {
                id
                title
                address
                amenities
            propertyType
            category
            dealStatus
            country
            region
            district
            localityName
            apartment
            metroName
            metroTimeOnFoot
            metroTimeOnTransport
            latitude
            longitude
            totalArea
            livingArea
            kitchenArea
            rooms
            roomsOffered
            floor
            floorsTotal
            buildingType
            buildingYear
            buildingSeries
            elevator
            parking
            security
            concierge
            playground
            gym
            balcony
            loggia
            airConditioning
            internet
            washingMachine
            dishwasher
            tv
            renovation
            furniture
            isElite
            yandexBuildingId
            yandexHouseId
                org {
                  id
                  name
                }
              }
            }
          `, { orgId }) as any
      
      return response
    },
    enabled: !!orgId,
    refetchOnWindowFocus: false
  })

  const properties = propertiesData?.propertiesByOrgId || []
  
  // Фильтрация объектов
  const filteredProperties = properties.filter((property: Property) => {
    if (filters.propertyType && property.propertyType !== filters.propertyType) return false
    if (filters.category && property.category !== filters.category) return false
    if (filters.dealStatus && property.dealStatus !== filters.dealStatus) return false
    if (filters.buildingType && property.buildingType !== filters.buildingType) return false
    if (filters.renovation && property.renovation !== filters.renovation) return false
    if (filters.isElite && property.isElite?.toString() !== filters.isElite) return false
    return true
  })

  // Функция для просмотра объекта
  const handleViewProperty = (property: Property) => {
    router.push(`/inventory/properties/${property.id}`)
  }

  // Функция для редактирования объекта
  const handleEditProperty = (property: Property) => {
    setEditingProperty(property)
    setIsEditDialogOpen(true)
  }

  // Функция для закрытия диалога редактирования
  const handleCloseEditDialog = () => {
    setEditingProperty(null)
    setIsEditDialogOpen(false)
  }

  // Функция для сохранения изменений
  const handleSaveProperty = async (updatedProperty: Property) => {
    try {
      console.log('Saving property:', updatedProperty)
      
      // Выполняем мутацию обновления объекта
      await graphqlClient.request(UpdatePropertyDocument, {
        id: updatedProperty.id,
        title: updatedProperty.title,
        address: updatedProperty.address,
        propertyType: updatedProperty.propertyType,
        category: updatedProperty.category,
        dealStatus: updatedProperty.dealStatus,
        country: updatedProperty.country,
        region: updatedProperty.region,
        district: updatedProperty.district,
        localityName: updatedProperty.localityName,
        apartment: updatedProperty.apartment,
        metroName: updatedProperty.metroName,
        metroTimeOnFoot: updatedProperty.metroTimeOnFoot,
        metroTimeOnTransport: updatedProperty.metroTimeOnTransport,
        latitude: updatedProperty.latitude,
        longitude: updatedProperty.longitude,
        totalArea: updatedProperty.totalArea,
        livingArea: updatedProperty.livingArea,
        kitchenArea: updatedProperty.kitchenArea,
        rooms: updatedProperty.rooms,
        roomsOffered: updatedProperty.roomsOffered,
        floor: updatedProperty.floor,
        floorsTotal: updatedProperty.floorsTotal,
        buildingType: updatedProperty.buildingType,
        buildingYear: updatedProperty.buildingYear,
        buildingSeries: updatedProperty.buildingSeries,
        elevator: updatedProperty.elevator,
        parking: updatedProperty.parking,
        security: updatedProperty.security,
        concierge: updatedProperty.concierge,
        playground: updatedProperty.playground,
        gym: updatedProperty.gym,
        balcony: updatedProperty.balcony,
        loggia: updatedProperty.loggia,
        airConditioning: updatedProperty.airConditioning,
        internet: updatedProperty.internet,
        washingMachine: updatedProperty.washingMachine,
        dishwasher: updatedProperty.dishwasher,
        tv: updatedProperty.tv,
        renovation: updatedProperty.renovation,
        furniture: updatedProperty.furniture,
        isElite: updatedProperty.isElite,
        yandexBuildingId: updatedProperty.yandexBuildingId,
        yandexHouseId: updatedProperty.yandexHouseId
      })
      
      // Обновляем данные в кэше
      refetchProperties()
      
      // Закрываем диалог
      handleCloseEditDialog()
      
      console.log('Property updated successfully!')
    } catch (error) {
      console.error('Error saving property:', error)
      alert('Ошибка при сохранении объекта: ' + (error as Error).message)
    }
  }

  if (orgLoading || propertiesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Heading level={1}>Управление объектами недвижимости</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Загрузка данных...
          </Text>
        </div>
      </div>
    )
  }

    return (
      <div className="space-y-6">
      {/* Заголовок с улучшенным дизайном */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-8 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5v10h10V11a2 2 0 00-2-2H7a2 2 0 00-2 2v10z" />
              </svg>
        </div>
      </div>
          <div className="flex-1">
            <Heading level={1} className="text-2xl font-bold text-gray-900 dark:text-white">
              Управление объектами недвижимости
            </Heading>
            <Text className="mt-2 text-gray-600 dark:text-gray-300 text-lg">
              Полное управление объектами с поддержкой формата Яндекс.Недвижимости
        </Text>
            <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Яндекс.Недвижимость</span>
      </div>
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span>Детальная информация</span>
            </div>
          </div>
        </div>
            </div>
        </div>


      {/* Фильтры с улучшенным дизайном */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <Heading level={2} className="text-lg font-semibold text-gray-900 dark:text-white">Фильтры</Heading>
            </div>
          </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Field>
            <Label>Тип недвижимости</Label>
            <Combobox
              value={filters.propertyType}
              onChange={(value) => setFilters(prev => ({ ...prev, propertyType: value || '' }))}
              options={['', 'жилая', 'коммерческая']}
              displayValue={(value) => {
                if (!value) return 'Все типы'
                return value === 'жилая' ? 'Жилая' : 'Коммерческая'
              }}
            >
              {(option) => (
                <ComboboxOption value={option}>
                  <ComboboxLabel>
                    {option === '' ? 'Все типы' :
                     option === 'жилая' ? 'Жилая' :
                     option === 'коммерческая' ? 'Коммерческая' : option}
                  </ComboboxLabel>
                </ComboboxOption>
              )}
            </Combobox>
          </Field>

          <Field>
            <Label>Категория</Label>
            <Combobox
              value={filters.category}
              onChange={(value) => setFilters(prev => ({ ...prev, category: value || '' }))}
              options={['', 'квартира', 'комната', 'дом', 'гараж']}
              displayValue={(value) => {
                if (!value) return 'Все категории'
                return value.charAt(0).toUpperCase() + value.slice(1)
              }}
            >
              {(option) => (
                <ComboboxOption value={option}>
                  <ComboboxLabel>
                    {option === '' ? 'Все категории' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </ComboboxLabel>
                </ComboboxOption>
              )}
            </Combobox>
          </Field>

          <Field>
            <Label>Статус сделки</Label>
            <Combobox
              value={filters.dealStatus}
              onChange={(value) => setFilters(prev => ({ ...prev, dealStatus: value || '' }))}
              options={['', 'первичная продажа', 'вторичка', 'аренда']}
              displayValue={(value) => {
                if (!value) return 'Все статусы'
                return value.charAt(0).toUpperCase() + value.slice(1)
              }}
            >
              {(option) => (
                <ComboboxOption value={option}>
                  <ComboboxLabel>
                    {option === '' ? 'Все статусы' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </ComboboxLabel>
                </ComboboxOption>
              )}
            </Combobox>
          </Field>

          <Field>
            <Label>Тип здания</Label>
            <Combobox
              value={filters.buildingType}
              onChange={(value) => setFilters(prev => ({ ...prev, buildingType: value || '' }))}
              options={['', 'кирпичный', 'панельный', 'монолитный']}
              displayValue={(value) => {
                if (!value) return 'Все типы зданий'
                return value.charAt(0).toUpperCase() + value.slice(1)
              }}
            >
              {(option) => (
                <ComboboxOption value={option}>
                  <ComboboxLabel>
                    {option === '' ? 'Все типы зданий' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </ComboboxLabel>
                </ComboboxOption>
              )}
            </Combobox>
          </Field>

          <Field>
            <Label>Ремонт</Label>
            <Combobox
              value={filters.renovation}
              onChange={(value) => setFilters(prev => ({ ...prev, renovation: value || '' }))}
              options={['', 'без отделки', 'требует ремонта', 'хорошее', 'отличное']}
              displayValue={(value) => {
                if (!value) return 'Все состояния'
                return value.charAt(0).toUpperCase() + value.slice(1)
              }}
            >
              {(option) => (
                <ComboboxOption value={option}>
                  <ComboboxLabel>
                    {option === '' ? 'Все состояния' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </ComboboxLabel>
                </ComboboxOption>
              )}
            </Combobox>
          </Field>

          <Field>
            <Label>Элитная</Label>
            <Combobox
              value={filters.isElite}
              onChange={(value) => setFilters(prev => ({ ...prev, isElite: value || '' }))}
              options={['', 'true', 'false']}
              displayValue={(value) => {
                if (!value) return 'Все'
                return value === 'true' ? 'Да' : 'Нет'
              }}
            >
              {(option) => (
                <ComboboxOption value={option}>
                  <ComboboxLabel>
                    {option === '' ? 'Все' : option === 'true' ? 'Да' : 'Нет'}
                  </ComboboxLabel>
                </ComboboxOption>
              )}
            </Combobox>
          </Field>
        </div>
      </div>

      {/* Таблица объектов */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
              <Heading level={2}>Объекты недвижимости</Heading>
                <Text className="text-zinc-600 dark:text-zinc-400">
                Показано объектов: {filteredProperties.length}
                </Text>
              </div>
          </div>
        </div>
        
        {/* Таблица с улучшенным дизайном */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <Heading level={2} className="text-lg font-semibold text-gray-900 dark:text-white">Объекты недвижимости</Heading>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Показано: {filteredProperties.length} из {properties?.length || 0}
                </div>
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
              <Button
                    onClick={() => setViewMode('table')}
                    className={`p-2 ${viewMode === 'table' ? 'bg-white dark:bg-zinc-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-zinc-600'}`}
                  >
                    <TableCellsIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setViewMode('cards')}
                    className={`p-2 ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-zinc-600'}`}
                  >
                    <Squares2X2Icon className="w-4 h-4" />
              </Button>
            </div>
          </div>
              </div>
              </div>
          {/* Контент в зависимости от выбранного вида */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
              <TableHead>
                <TableRow className="bg-gray-50 dark:bg-zinc-900">
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Объект</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Тип</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Площадь</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Комнаты</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Этаж</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Год</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Метро</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Удобства</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</TableHeader>
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Действия</TableHeader>
                </TableRow>
              </TableHead>
            <TableBody>
              {filteredProperties.map((property: Property) => (
                <TableRow 
                  key={property.id} 
                  className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150 cursor-pointer"
                  onClick={() => handleViewProperty(property)}
                >
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div>
                      <Text className="font-medium text-gray-900 dark:text-white">{property.title}</Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400">{property.address}</Text>
                      </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <Badge color="blue">{property.propertyType || 'Не указано'}</Badge>
                      <Text className="text-sm text-gray-600 dark:text-gray-300">{property.category || 'Не указано'}</Text>
                      </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Text className="font-medium">{property.totalArea ? `${property.totalArea} м²` : 'Не указано'}</Text>
                      {property.livingArea && (
                        <Text className="text-sm text-zinc-500">Жилая: {property.livingArea} м²</Text>
                    )}
                      </div>
                  </TableCell>
                  <TableCell>
                    <Text>{property.rooms || 'Не указано'}</Text>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Text>{property.floor || 'Не указано'}</Text>
                      {property.floorsTotal && (
                        <Text className="text-sm text-zinc-500">из {property.floorsTotal}</Text>
                      )}
                      </div>
                  </TableCell>
                  <TableCell>
                    <Text>{property.buildingYear || 'Не указано'}</Text>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Text className="font-medium">{property.metroName || 'Не указано'}</Text>
                      {property.metroTimeOnFoot && (
                        <Text className="text-sm text-zinc-500">{property.metroTimeOnFoot} мин пешком</Text>
                  )}
                    </div>
                  </TableCell>
                  <TableCell>
                        <div className="flex flex-wrap gap-1">
                      {property.elevator && <Badge color="green" className="text-xs">Лифт</Badge>}
                      {property.parking && <Badge color="green" className="text-xs">Парковка</Badge>}
                      {property.security && <Badge color="green" className="text-xs">Охрана</Badge>}
                      {property.balcony && <Badge color="blue" className="text-xs">Балкон</Badge>}
                      {property.internet && <Badge color="blue" className="text-xs">Интернет</Badge>}
                      {property.airConditioning && <Badge color="blue" className="text-xs">Кондиционер</Badge>}
            </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge color={property.isElite ? 'orange' : 'zinc'}>
                        {property.isElite ? 'Элитная' : 'Обычная'}
                            </Badge>
                      {property.renovation && (
                        <Text className="text-sm text-zinc-500">{property.renovation}</Text>
                          )}
                        </div>
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownButton 
                        className="bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-700 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300"
                        onClick={(e: any) => e.stopPropagation()}
                      >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                      </DropdownButton>
                      <DropdownMenu className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg [&>*]:hover:!bg-gray-100 [&>*]:dark:hover:!bg-zinc-700 [&>*]:focus:!bg-gray-100 [&>*]:dark:focus:!bg-zinc-700 [&>*]:hover:!text-gray-900 [&>*]:dark:hover:!text-white [&>*]:focus:!text-gray-900 [&>*]:dark:focus:!text-white">
                        <DropdownItem onClick={(e: any) => { e.stopPropagation(); handleViewProperty(property); }}>
                          Открыть
                        </DropdownItem>
                        <DropdownItem onClick={(e: any) => { e.stopPropagation(); handleEditProperty(property); }}>
                          Редактировать
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
              </Table>
                      </div>
            ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((property: Property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onView={handleViewProperty}
                    onEdit={handleEditProperty}
                  />
                ))}
                        </div>
              {filteredProperties.length === 0 && (
                <div className="text-center py-12">
                  <Text className="text-gray-500 dark:text-gray-400">
                    Объекты не найдены
                  </Text>
              </div>
            )}
        </div>
      )}
          </div>
        </div>
              </div>

      {/* Диалог редактирования объекта */}
      {editingProperty && (
        <EditPropertyDialog
          isOpen={isEditDialogOpen}
          onClose={handleCloseEditDialog}
          onSave={handleSaveProperty}
          property={editingProperty}
        />
      )}
    </div>
  )
}
