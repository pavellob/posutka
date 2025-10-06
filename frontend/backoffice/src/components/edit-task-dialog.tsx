'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Select } from '@/components/select'
import { Fieldset } from '@/components/fieldset'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'

// GraphQL мутация для обновления задачи
const UPDATE_TASK = `
  mutation UpdateTask($id: UUID!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      id
      type
      status
      note
      dueAt
      createdAt
      updatedAt
    }
  }
`

interface EditTaskDialogProps {
  isOpen: boolean
  onClose: () => void
  task: any
  onSuccess: () => void
}

export function EditTaskDialog({ isOpen, onClose, task, onSuccess }: EditTaskDialogProps) {
  const [formData, setFormData] = useState({
    type: '',
    status: '',
    note: '',
    dueAt: ''
  })

  const queryClient = useQueryClient()

  // Заполняем форму данными задачи при открытии
  useEffect(() => {
    if (task) {
      setFormData({
        type: task.type || '',
        status: task.status || '',
        note: task.note || '',
        dueAt: task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : ''
      })
    }
  }, [task])

  const updateTaskMutation = useMutation({
    mutationFn: async (input: any) => {
      return await graphqlClient.request(UPDATE_TASK, {
        id: task.id,
        input: {
          type: input.type,
          status: input.status,
          note: input.note,
          dueAt: input.dueAt ? new Date(input.dueAt).toISOString() : null
        }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onSuccess()
    },
    onError: (error) => {
      console.error('Ошибка при обновлении задачи:', error)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateTaskMutation.mutate(formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (!task) return null

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Редактировать задачу</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Fieldset>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Тип задачи</label>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                >
                  <option value="">Выберите тип</option>
                  <option value="CLEANING">Уборка</option>
                  <option value="CHECKIN">Заселение гостя</option>
                  <option value="CHECKOUT">Выселение гостя</option>
                  <option value="MAINTENANCE">Техническое обслуживание</option>
                  <option value="INVENTORY">Инвентаризация</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Статус</label>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="">Выберите статус</option>
                  <option value="TODO">Ожидает</option>
                  <option value="IN_PROGRESS">В работе</option>
                  <option value="DONE">Завершена</option>
                  <option value="CANCELED">Отменена</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Заметка</label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder="Описание задачи..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Срок выполнения</label>
                <Input
                  type="datetime-local"
                  value={formData.dueAt}
                  onChange={(e) => handleChange('dueAt', e.target.value)}
                />
              </div>
            </div>
          </Fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              className="bg-black hover:bg-gray-800 text-white border-gray-600"
              disabled={updateTaskMutation.isPending}
            >
              {updateTaskMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
