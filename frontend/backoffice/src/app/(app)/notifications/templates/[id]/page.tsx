'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { graphqlClient } from '@/lib/graphql-client';
import {
  GET_NOTIFICATION_TEMPLATE,
  UPSERT_NOTIFICATION_TEMPLATE,
  DELETE_NOTIFICATION_TEMPLATE,
} from '@/lib/graphql-queries';
import { Button } from '@/components/button';
import { Heading, Subheading } from '@/components/heading';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Text } from '@/components/text';
import { Divider } from '@/components/divider';
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

export default function NotificationTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const queryClient = useQueryClient();

  const [template, setTemplate] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['notificationTemplate', templateId],
    queryFn: async () => {
      const result = await graphqlClient.request<{ notificationTemplate: any }>(
        GET_NOTIFICATION_TEMPLATE,
        { id: templateId }
      );
      return result.notificationTemplate;
    },
    enabled: !!templateId,
  });

  useEffect(() => {
    if (data) {
      setTemplate(data);
    }
  }, [data]);

  const upsertMutation = useMutation({
    mutationFn: async (input: any) => {
      return graphqlClient.request(UPSERT_NOTIFICATION_TEMPLATE, { 
        input: {
          id: input.id,
          eventType: input.eventType,
          name: input.name,
          titleTemplate: input.titleTemplate,
          messageTemplate: input.messageTemplate,
          defaultNotificationChannels: input.defaultChannels || [],
          defaultPriority: input.defaultPriority || 'NORMAL',
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationTemplate', templateId] });
      queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return graphqlClient.request(DELETE_NOTIFICATION_TEMPLATE, { id });
    },
    onSuccess: () => {
      router.push('/notifications/templates');
    },
  });

  const handleSave = () => {
    if (!template || !template.name || !template.titleTemplate || !template.messageTemplate) {
      alert('Заполните все обязательные поля');
      return;
    }

    upsertMutation.mutate({
      id: template.id,
      eventType: template.eventType,
      name: template.name,
      titleTemplate: template.titleTemplate,
      messageTemplate: template.messageTemplate,
      defaultChannels: template.defaultChannels || [],
      defaultPriority: template.defaultPriority || 'NORMAL',
    });
  };

  const handleDelete = () => {
    if (confirm('Вы уверены, что хотите удалить этот шаблон?')) {
      deleteMutation.mutate(templateId);
    }
  };

  const insertVariable = (path: string, field: 'titleTemplate' | 'messageTemplate') => {
    if (!template) return;
    const textarea = document.querySelector(`textarea[name="${field}"]`) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + `{{${path}}}` + text.substring(end);
      
      setTemplate({ ...template, [field]: newText });
      
      // Устанавливаем курсор после вставленного текста
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + path.length + 4, start + path.length + 4);
      }, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-zinc-500">Загрузка шаблона...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-zinc-500">Шаблон не найден</div>
      </div>
    );
  }

  const availableVariables = getAvailableVariables(template.eventType);
  const eventName = Object.values(EVENT_GROUPS)
    .flatMap(group => group.events)
    .find(e => e.id === template.eventType)?.name || template.eventType;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading>Редактирование шаблона</Heading>
          <Text className="mt-2 text-zinc-500">
            {eventName} • {template.name}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button color="zinc" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
          </Button>
          <Button onClick={handleSave} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
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
        {/* Левая колонка: Переменные */}
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              Доступные переменные:
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {availableVariables.map((variable, index) => {
                const fullVariable = '{{' + variable.path + '}}';
                // Сокращаем отображение для очень длинных переменных
                const displayVariable = fullVariable.length > 50 
                  ? fullVariable.substring(0, 47) + '...'
                  : fullVariable;
                
                return (
                  <button
                    key={index}
                    onClick={() => insertVariable(variable.path, 'messageTemplate')}
                    className="w-full text-left text-xs p-2 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors group"
                    title={fullVariable.length > 50 ? fullVariable : undefined}
                  >
                    <code className="text-blue-600 dark:text-blue-400 font-mono text-[10px] break-all whitespace-normal block leading-relaxed">
                      {displayVariable}
                    </code>
                    <div className="text-zinc-600 dark:text-zinc-400 mt-1 text-[11px]">
                      {variable.description}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-blue-700 dark:text-blue-300">
              💡 Нажмите на переменную, чтобы вставить её в поле сообщения
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Доступные фильтры:
            </div>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
              <li><code>|date</code> - форматирование даты</li>
              <li><code>|time</code> - форматирование только времени</li>
              <li><code>|currency:RUB</code> - форматирование валюты</li>
              <li><code>|gradeLabel</code> - преобразование grade в текст</li>
              <li><code>|difficultyLabel</code> - преобразование cleaningDifficulty (D0, D1...) в текст</li>
              <li><code>|default:&quot;N/A&quot;</code> - значение по умолчанию</li>
            </ul>
          </div>
        </div>

        {/* Правая колонка: Редактор */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Название шаблона *
            </label>
            <Input
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              placeholder="Например: Основной шаблон"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Заголовок уведомления *
            </label>
            <Input
              value={template.titleTemplate}
              onChange={(e) => setTemplate({ ...template, titleTemplate: e.target.value })}
              placeholder="🧹 Новая уборка назначена!"
              name="titleTemplate"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Текст сообщения *
            </label>
            <Textarea
              value={template.messageTemplate}
              onChange={(e) => setTemplate({ ...template, messageTemplate: e.target.value })}
              placeholder={`Вам назначена уборка в "{{payload.unitName}}"\n\n📅 Дата и время: {{payload.scheduledAt|date}}\n📍 Адрес: {{payload.unitAddress}}`}
              rows={15}
              name="messageTemplate"
              className="font-mono text-sm"
            />
            <div className="mt-2 text-xs text-zinc-500">
              Используйте переменные в формате {'{{path}}'} или с фильтрами {'{{path|filter}}'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

