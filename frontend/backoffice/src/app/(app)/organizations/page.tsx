'use client'

import { useState } from 'react'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Badge } from '@/components/badge'
import { Dialog } from '@/components/dialog'
import { Fieldset, Field, Label } from '@/components/fieldset'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { useSelectedOrganization } from '@/hooks/useSelectedOrganization'

export default function OrganizationsPage() {
  const { selectedOrg, changeOrganization, getAllOrganizations } = useSelectedOrganization()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    name: '',
    initials: '',
    color: 'bg-blue-500'
  })

  const organizations = getAllOrganizations()

  const handleCreateOrganization = (e: React.FormEvent) => {
    e.preventDefault()
    // Здесь будет логика создания новой организации
    console.log('Creating organization:', createFormData)
    setShowCreateDialog(false)
    setCreateFormData({ name: '', initials: '', color: 'bg-blue-500' })
  }

  const getColorName = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'bg-blue-500': 'Синий',
      'bg-gray-500': 'Серый',
      'bg-purple-500': 'Фиолетовый',
      'bg-green-500': 'Зеленый',
      'bg-red-500': 'Красный',
      'bg-yellow-500': 'Желтый',
      'bg-orange-500': 'Оранжевый'
    }
    return colorMap[color] || 'Неизвестный'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Heading level={1}>Организации</Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Управление организациями и выбор активной организации
          </Text>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          Создать организацию
        </Button>
      </div>

      {/* Текущая организация */}
      {selectedOrg && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Текущая организация</Heading>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${selectedOrg.color}`}>
              <span className="text-white font-bold text-lg">{selectedOrg.initials}</span>
            </div>
            <div>
              <Text className="text-lg font-semibold">{selectedOrg.name}</Text>
              <Text className="text-sm text-zinc-500">Активная организация</Text>
            </div>
          </div>
        </div>
      )}

      {/* Список организаций */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <Heading level={2}>Все организации</Heading>
          <Text className="text-sm text-zinc-500 mt-1">
            Выберите организацию для переключения контекста
          </Text>
        </div>
        
        <Table striped>
          <TableHead>
            <tr>
              <TableHeader>Организация</TableHeader>
              <TableHeader>Цвет</TableHeader>
              <TableHeader>Статус</TableHeader>
              <TableHeader>Действия</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {organizations.map((org: any) => (
              <TableRow key={org.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${org.color}`}>
                      <span className="text-white font-semibold text-sm">{org.initials}</span>
                    </div>
                    <div>
                      <Text className="font-medium">{org.name}</Text>
                      <Text className="text-sm text-zinc-500">ID: {org.id}</Text>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge color="green">
                    {getColorName(org.color)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {selectedOrg?.id === org.id ? (
                    <Badge color="green">Активная</Badge>
                  ) : (
                    <Badge color="green">Неактивная</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {selectedOrg?.id !== org.id && (
                    <Button onClick={() => changeOrganization(org)}>
                      Выбрать
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Диалог создания организации */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} size="lg">
        <div className="space-y-6">
          <Heading level={2}>Создать новую организацию</Heading>
          
          <form onSubmit={handleCreateOrganization} className="space-y-4">
            <Field>
              <Label>Название организации</Label>
              <Input
                value={createFormData.name}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Введите название организации"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>Инициалы</Label>
                <Input
                  value={createFormData.initials}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, initials: e.target.value }))}
                  placeholder="П"
                  maxLength={3}
                  required
                />
              </Field>

              <Field>
                <Label>Цвет</Label>
                <Select
                  value={createFormData.color}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, color: e.target.value }))}
                >
                  <option value="bg-blue-500">Синий</option>
                  <option value="bg-gray-500">Серый</option>
                  <option value="bg-purple-500">Фиолетовый</option>
                  <option value="bg-green-500">Зеленый</option>
                  <option value="bg-red-500">Красный</option>
                  <option value="bg-yellow-500">Желтый</option>
                  <option value="bg-orange-500">Оранжевый</option>
                </Select>
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setShowCreateDialog(false)}
              >
                Отмена
              </Button>
              <Button type="submit">
                Создать организацию
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  )
}
