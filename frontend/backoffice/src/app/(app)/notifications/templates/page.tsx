'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { graphqlClient } from '@/lib/graphql-client';
import {
  GET_NOTIFICATION_TEMPLATES,
  UPSERT_NOTIFICATION_TEMPLATE,
  DELETE_NOTIFICATION_TEMPLATE,
} from '@/lib/graphql-queries';
import { Button } from '@/components/button';
import { Heading, Subheading } from '@/components/heading';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Text } from '@/components/text';
import { Badge } from '@/components/badge';
import { Divider } from '@/components/divider';
import { Select } from '@/components/select';
import Link from 'next/link';

const EVENT_GROUPS = {
  cleaning: {
    name: 'Уборки',
    events: [
      { id: 'CLEANING_AVAILABLE', name: 'Доступна уборка' },
      { id: 'CLEANING_ASSIGNED', name: 'Уборка назначена' },
      { id: 'CLEANING_STARTED', name: 'Уборка начата' },
      { id: 'CLEANING_COMPLETED', name: 'Уборка завершена' },
      { id: 'CLEANING_PRECHECK_COMPLETED', name: 'Приёмка завершена' },
      { id: 'CLEANING_READY_FOR_REVIEW', name: 'Требуется финальная проверка' },
      { id: 'CLEANING_DIFFICULTY_SET', name: 'Сложность уборки указана' },
      { id: 'CLEANING_APPROVED', name: 'Уборка одобрена' },
      { id: 'CLEANING_CANCELLED', name: 'Уборка отменена' },
    ],
  },
  tasks: {
    name: 'Задачи',
    events: [
      { id: 'TASK_CREATED', name: 'Задача создана' },
      { id: 'TASK_ASSIGNED', name: 'Задача назначена' },
      { id: 'TASK_STATUS_CHANGED', name: 'Статус задачи изменен' },
      { id: 'TASK_COMPLETED', name: 'Задача завершена' },
    ],
  },
  bookings: {
    name: 'Бронирования',
    events: [
      { id: 'BOOKING_CREATED', name: 'Бронирование создано' },
      { id: 'BOOKING_CONFIRMED', name: 'Бронирование подтверждено' },
      { id: 'BOOKING_CANCELLED', name: 'Бронирование отменено' },
      { id: 'BOOKING_CHECKIN', name: 'Заселение' },
      { id: 'BOOKING_CHECKOUT', name: 'Выселение' },
    ],
  },
  payments: {
    name: 'Платежи',
    events: [
      { id: 'PAYMENT_RECEIVED', name: 'Платеж получен' },
      { id: 'PAYMENT_FAILED', name: 'Платеж не прошел' },
      { id: 'INVOICE_CREATED', name: 'Счет создан' },
      { id: 'INVOICE_OVERDUE', name: 'Счет просрочен' },
    ],
  },
};

// Функция для получения доступных переменных для типа события
function getAvailableVariables(eventType: string): Array<{ path: string; description: string }> {
  const variables: Record<string, Array<{ path: string; description: string }>> = {
    CLEANING_ASSIGNED: [
      { path: 'payload.unitName', description: 'Название квартиры' },
      { path: 'payload.scheduledAt|date', description: 'Дата и время (форматированная)' },
      { path: 'payload.unitAddress', description: 'Адрес квартиры' },
      { path: 'payload.cleanerName', description: 'Имя уборщика' },
      { path: 'payload.unitGrade|gradeLabel', description: 'Размер объекта (текст)' },
      { path: 'payload.cleaningDifficulty', description: 'Сложность уборки' },
      { path: 'payload.priceAmount|currency:payload.priceCurrency', description: 'Стоимость (форматированная)' },
      { path: 'payload.requiresLinenChange', description: 'Требуется смена белья' },
      { path: 'payload.cleaningId', description: 'ID уборки' },
    ],
    CLEANING_AVAILABLE: [
      { path: 'payload.unitName', description: 'Название квартиры' },
      { path: 'payload.scheduledAt|date', description: 'Дата и время (форматированная)' },
      { path: 'payload.unitAddress', description: 'Адрес квартиры' },
      { path: 'payload.unitGrade|gradeLabel', description: 'Размер объекта (текст)' },
      { path: 'payload.cleaningDifficulty', description: 'Сложность уборки' },
      { path: 'payload.priceAmount|currency:payload.priceCurrency', description: 'Стоимость (форматированная)' },
      { path: 'payload.cleaningId', description: 'ID уборки' },
    ],
    CLEANING_COMPLETED: [
      { path: 'payload.unitName', description: 'Название квартиры' },
      { path: 'payload.cleanerName', description: 'Имя уборщика' },
      { path: 'payload.scheduledAt|date', description: 'Запланировано (форматированная дата)' },
      { path: 'payload.startedAt|date', description: 'Начато (форматированная дата)' },
      { path: 'payload.completedAt|date', description: 'Завершено (форматированная дата)' },
      { path: 'payload.unitAddress', description: 'Адрес квартиры' },
      { path: 'payload.checklistStats.total', description: 'Всего пунктов чеклиста' },
      { path: 'payload.checklistStats.completed', description: 'Выполнено пунктов' },
      { path: 'payload.checklistStats.incomplete', description: 'Не выполнено пунктов' },
      { path: 'payload.cleaningId', description: 'ID уборки' },
    ],
    CLEANING_PRECHECK_COMPLETED: [
      { path: 'payload.unitName', description: 'Название квартиры' },
      { path: 'payload.cleanerName', description: 'Имя уборщика' },
      { path: 'payload.scheduledAt|date', description: 'Запланировано (форматированная дата)' },
      { path: 'payload.submittedAt|date', description: 'Приёмка завершена (форматированная дата)' },
      { path: 'payload.unitAddress', description: 'Адрес квартиры' },
      { path: 'payload.checklistStats.total', description: 'Всего пунктов чеклиста' },
      { path: 'payload.checklistStats.completed', description: 'Выполнено пунктов' },
      { path: 'payload.checklistStats.incomplete', description: 'Не выполнено пунктов' },
      { path: 'payload.cleaningId', description: 'ID уборки' },
    ],
    CLEANING_READY_FOR_REVIEW: [
      { path: 'payload.unitName', description: 'Название квартиры' },
      { path: 'payload.cleanerName', description: 'Имя уборщика' },
      { path: 'payload.scheduledAt|date', description: 'Дата (форматированная)' },
      { path: 'payload.unitAddress', description: 'Адрес квартиры' },
      { path: 'payload.difficulty', description: 'Сложность уборки (0-5)' },
      { path: 'payload.priceAmount|currency:payload.priceCurrency', description: 'Стоимость (форматированная)' },
      { path: 'payload.cleaningId', description: 'ID уборки' },
    ],
    BOOKING_CREATED: [
      { path: 'payload.bookingId', description: 'ID бронирования' },
      { path: 'payload.guestName', description: 'ФИО гостя' },
      { path: 'payload.guestPhone', description: 'Телефон гостя' },
      { path: 'payload.guestEmail', description: 'Email гостя' },
      { path: 'payload.checkIn|date', description: 'Дата и время заезда (форматированная)' },
      { path: 'payload.checkIn|time', description: 'Время заезда (только время)' },
      { path: 'payload.checkOut|date', description: 'Дата и время выезда (форматированная)' },
      { path: 'payload.checkOut|time', description: 'Время выезда (только время)' },
      { path: 'payload.unitAddress', description: 'Адрес объекта' },
      { path: 'payload.unitName', description: 'Название объекта' },
      { path: 'payload.lockCode', description: 'Код от замка (последние 4 цифры телефона)' },
      { path: 'payload.houseRules', description: 'Правила проживания' },
      { path: 'payload.checkInInstructions', description: 'Инструкция по заселению (статичный текст)' },
      { path: 'payload.guestsCount', description: 'Количество гостей' },
      { path: 'payload.priceBreakdown.total.amount|currency:payload.priceBreakdown.total.currency', description: 'Общая стоимость (форматированная)' },
      { path: 'payload.priceBreakdown.basePrice.amount|currency:payload.priceBreakdown.basePrice.currency', description: 'Базовая стоимость (форматированная)' },
    ],
  };

  return variables[eventType] || [];
}

export default function NotificationTemplatesPage() {
  const router = useRouter();
  const [selectedEventType, setSelectedEventType] = useState<string>('CLEANING_ASSIGNED');
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<{ notificationTemplates: any[] }>({
    queryKey: ['notificationTemplates', selectedEventType],
    queryFn: async () => {
      const result = await graphqlClient.request<{ notificationTemplates: any[] }>(
        GET_NOTIFICATION_TEMPLATES,
        { eventType: selectedEventType }
      );
      return result;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: any) => {
      const result = await graphqlClient.request<{ upsertNotificationTemplate: { id: string } }>(UPSERT_NOTIFICATION_TEMPLATE, { 
        input: {
          eventType: input.eventType,
          name: input.name,
          titleTemplate: input.titleTemplate,
          messageTemplate: input.messageTemplate,
          defaultNotificationChannels: input.defaultChannels || [],
          defaultPriority: input.defaultPriority || 'NORMAL',
        }
      });
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
      // Перенаправляем на страницу шаблона после создания
      if (data?.upsertNotificationTemplate?.id) {
        router.push(`/notifications/templates/${data.upsertNotificationTemplate.id}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return graphqlClient.request(DELETE_NOTIFICATION_TEMPLATE, { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
    },
  });

  const availableVariables = getAvailableVariables(selectedEventType);

  const handleCreate = () => {
    // Создаем новый шаблон и перенаправляем на его страницу
    const eventName = Object.values(EVENT_GROUPS)
      .flatMap(group => group.events)
      .find(e => e.id === selectedEventType)?.name || selectedEventType;
    
    const newTemplate = {
      eventType: selectedEventType,
      name: `Новый шаблон: ${eventName}`,
      titleTemplate: 'Заголовок уведомления',
      messageTemplate: 'Текст уведомления',
      defaultChannels: [],
      defaultPriority: 'NORMAL',
    };

    upsertMutation.mutate(newTemplate);
  };

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот шаблон?')) {
      deleteMutation.mutate(id);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-zinc-500">Загрузка шаблонов...</div>
      </div>
    );
  }

  const templates = data?.notificationTemplates || [];
  const selectedEventName = Object.values(EVENT_GROUPS)
    .flatMap(group => group.events)
    .find(e => e.id === selectedEventType)?.name || selectedEventType;

  return (
    <div className="space-y-6 p-6">
      <div>
        <Heading>Шаблоны уведомлений</Heading>
        <Text className="mt-2 text-zinc-500">
          Управляйте шаблонами уведомлений для различных событий. Используйте переменные в формате {'{{path.to.value}}'} или с фильтрами {'{{path.to.value|filter}}'}.
        </Text>
      </div>

      {/* Табы */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8">
          <Link
            href="/notifications"
            className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            Список уведомлений
          </Link>
          <Link
            href="/notifications/templates"
            className="whitespace-nowrap border-b-2 border-blue-500 px-1 py-4 text-sm font-medium text-blue-600 dark:text-blue-400"
          >
            Шаблоны
          </Link>
        </nav>
      </div>

      <Divider />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка: Выбор события и список шаблонов */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Тип события
            </label>
            <Select
              value={selectedEventType}
              onChange={(e) => {
                setSelectedEventType(e.target.value);
              }}
            >
              {Object.entries(EVENT_GROUPS).map(([groupKey, group]) => (
                <optgroup key={groupKey} label={group.name}>
                  {group.events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Шаблоны для {selectedEventName}
              </label>
              <Button onClick={handleCreate}>
                + Создать
              </Button>
            </div>
            <div className="space-y-2">
              {templates.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  Нет шаблонов для этого события
                </div>
              ) : (
                templates.map(template => (
                  <Link
                    key={template.id}
                    href={`/notifications/templates/${template.id}`}
                    className="block p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          Обновлен: {new Date(template.updatedAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <Button
                        color="zinc"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(template.id);
                        }}
                      >
                        Удалить
                      </Button>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Правая колонка: Информация */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-center h-64 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <div className="text-center text-zinc-500">
              <div className="text-lg mb-2">📝</div>
              <div>Выберите шаблон для редактирования или создайте новый</div>
              <div className="mt-4 text-sm">
                Нажмите на шаблон в списке слева, чтобы открыть его страницу
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

