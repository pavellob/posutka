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
import { CreatePropertyDialog } from '@/components/create-property-dialog'
import { Squares2X2Icon, TableCellsIcon, EllipsisVerticalIcon, PlusIcon, EyeIcon, PencilIcon } from '@heroicons/react/24/outline'

// Компонент карточки объекта недвижимости
function PropertyCard({ property, onEdit, onView }: { property: Property; onEdit: (property: Property) => void; onView: (property: Property) => void }) {
  // Собираем все изображения из всех юнитов
  const allImages = property.units?.flatMap(unit => unit.images || []).filter(Boolean) || []
  const mainImage = allImages[0] || null
  
  return (
    <div 
      className="group relative bg-white dark:bg-zinc-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.2)]"
      onClick={() => onView(property)}
    >
      {/* Изображение объекта */}
      <div className="relative w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-800 overflow-hidden">
        {mainImage ? (
          <>
            <img
              src={mainImage}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            {allImages.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {allImages.length}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Контент карточки */}
      <div className="p-4">
        {/* Заголовок и действия */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <Heading level={3} className="text-base font-medium text-gray-900 dark:text-white truncate mb-0.5">
              {property.title}
            </Heading>
            <Text className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {property.address}
            </Text>
          </div>
          {/* Действия при наведении */}
          <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onView(property)
              }}
              className="p-1.5 rounded-full bg-white dark:bg-zinc-700 shadow-md hover:bg-gray-50 dark:hover:bg-zinc-600 transition-colors"
              title="Просмотр"
            >
              <EyeIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(property)
              }}
              className="p-1.5 rounded-full bg-white dark:bg-zinc-700 shadow-md hover:bg-gray-50 dark:hover:bg-zinc-600 transition-colors"
              title="Редактировать"
            >
              <PencilIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Бейджи */}
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge color="blue" className="text-xs px-1.5 py-0.5">{property.propertyType || 'Не указано'}</Badge>
          {property.category && (
            <Badge color="green" className="text-xs px-1.5 py-0.5">{property.category}</Badge>
          )}
          {property.isElite && (
            <Badge color="orange" className="text-xs px-1.5 py-0.5">Элитная</Badge>
          )}
        </div>

        {/* Основная информация - компактная сетка */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <Text className="text-gray-500 dark:text-gray-400">Площадь</Text>
            <Text className="block font-medium text-gray-900 dark:text-white">
              {property.totalArea ? `${property.totalArea} м²` : '—'}
            </Text>
          </div>
          <div>
            <Text className="text-gray-500 dark:text-gray-400">Комнаты</Text>
            <Text className="block font-medium text-gray-900 dark:text-white">
              {property.rooms || '—'}
            </Text>
          </div>
          <div>
            <Text className="text-gray-500 dark:text-gray-400">Этаж</Text>
            <Text className="block font-medium text-gray-900 dark:text-white">
              {property.floor ? `${property.floor}${property.floorsTotal ? `/${property.floorsTotal}` : ''}` : '—'}
            </Text>
          </div>
          <div>
            <Text className="text-gray-500 dark:text-gray-400">Год</Text>
            <Text className="block font-medium text-gray-900 dark:text-white">
              {property.buildingYear || '—'}
            </Text>
          </div>
        </div>

        {/* Метро - компактно */}
        {property.metroName && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-zinc-700">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <Text className="text-xs text-gray-600 dark:text-gray-300 truncate">
                {property.metroName}
                {property.metroTimeOnFoot && ` • ${property.metroTimeOnFoot} мин`}
              </Text>
            </div>
          </div>
        )}

        {/* Удобства - компактно, только если есть */}
        {(property.elevator || property.parking || property.security || property.balcony || property.airConditioning || property.internet || property.tv) && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-zinc-700">
            <div className="flex flex-wrap gap-1">
              {property.elevator && <Badge color="green" className="text-[10px] px-1 py-0">Лифт</Badge>}
              {property.parking && <Badge color="green" className="text-[10px] px-1 py-0">Парковка</Badge>}
              {property.security && <Badge color="green" className="text-[10px] px-1 py-0">Охрана</Badge>}
              {property.balcony && <Badge color="blue" className="text-[10px] px-1 py-0">Балкон</Badge>}
              {property.airConditioning && <Badge color="blue" className="text-[10px] px-1 py-0">Кондиционер</Badge>}
              {property.internet && <Badge color="blue" className="text-[10px] px-1 py-0">Интернет</Badge>}
              {property.tv && <Badge color="blue" className="text-[10px] px-1 py-0">ТВ</Badge>}
            </div>
          </div>
        )}
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
                  <option value="квартира">Юнит</option>
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

          {/* Удобства юнита */}
          <Fieldset>
            <legend className="text-lg font-medium mb-4">Удобства юнита</legend>
            
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
  units?: {
    id: string
    name: string
    images: string[]
  }[]
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
  
  // Состояние для диалогов создания
  const [isCreatePropertyDialogOpen, setIsCreatePropertyDialogOpen] = useState(false)
  
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
                units {
                  id
                  name
                  images
                }
              }
            }
          `, { orgId }) as any
      
      console.log('📊 GraphQL response:', response)
      if (response?.propertiesByOrgId) {
        response.propertiesByOrgId.forEach((p: any) => {
          console.log(`Property ${p.title}:`, {
            id: p.id,
            unitsCount: p.units?.length || 0,
            units: p.units?.map((u: any) => ({
              id: u.id,
              name: u.name,
              images: u.images,
              imagesCount: u.images?.length || 0
            })) || []
          })
        })
      }
      
      return response
    },
    enabled: !!orgId,
    refetchOnWindowFocus: false
  })

  const properties = propertiesData?.propertiesByOrgId || []
  
  // Дополнительная отладка
  console.log('🏠 Properties loaded:', properties.length)
  let totalPropertiesWithImages = 0
  properties.forEach((p: any) => {
    if (p.units && p.units.length > 0) {
      const totalImages = p.units.flatMap((u: any) => u.images || []).filter(Boolean).length
      console.log(`  - ${p.title}: ${p.units.length} units, ${totalImages} images`)
      if (totalImages > 0) totalPropertiesWithImages++
      
      // Детальная информация о units
      p.units.forEach((u: any) => {
        if (u.images && u.images.length > 0) {
          console.log(`    Unit ${u.name}: ${u.images.length} images`, u.images)
        }
      })
    } else {
      console.log(`  - ${p.title}: no units`)
    }
  })
  console.log(`📸 Properties with images: ${totalPropertiesWithImages} of ${properties.length}`)
  
  if (totalPropertiesWithImages === 0 && properties.length > 0) {
    console.warn('⚠️ No images found! Make sure to:')
    console.warn('  1. Restart inventory-subgraph to pick up schema changes')
    console.warn('  2. Restart gateway-mesh to update supergraph')
    console.warn('  3. Re-import XML file to save images to database')
  }
  
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

        {/* Кнопки создания */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setIsCreatePropertyDialogOpen(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">🏢 Создать объект</span>
            <span className="sm:hidden">🏢 Объект</span>
          </Button>
          
          
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
              options={['', 'юнит', 'комната', 'дом', 'гараж']}
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
                  <TableHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Фото</TableHeader>
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
                  <TableCell className="px-6 py-4">
                    {(() => {
                      const allImages = property.units?.flatMap(unit => unit.images || []).filter(Boolean) || []
                      const mainImage = allImages[0]
                      return mainImage ? (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-zinc-700 flex-shrink-0">
                          <img
                            src={mainImage}
                            alt={property.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          {allImages.length > 1 && (
                            <div className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 rounded-tl">
                              +{allImages.length - 1}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )
                    })()}
                  </TableCell>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

      {/* Диалоги создания */}
      <CreatePropertyDialog
        open={isCreatePropertyDialogOpen}
        onClose={() => setIsCreatePropertyDialogOpen(false)}
        onSuccess={() => {
          setIsCreatePropertyDialogOpen(false)
          // Обновляем данные
        }}
        orgId={orgId || ''}
      />


    </div>
  )
}
