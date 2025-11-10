'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './button';
import { Heading } from './heading';
import { Text } from './text';
import { Badge } from './badge';
import { graphqlClient } from '@/lib/graphql-client';
import { 
  GET_CHECKLISTS_BY_UNIT, 
  GET_CHECKLIST_BY_UNIT_AND_STAGE,
  CREATE_CHECKLIST_INSTANCE,
  GET_CHECKLIST_TEMPLATE
} from '@/lib/graphql-queries';
import { 
  PlusIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { ChecklistInstanceDialog } from './checklist-instance-dialog';

interface UnitChecklistsProps {
  unitId: string;
  unitName?: string;
}

type ChecklistStage = 'PRE_CLEANING' | 'CLEANING' | 'FINAL_REPORT';

const STAGE_CONFIG: Record<ChecklistStage, { label: string; color: string; icon: any; description: string }> = {
  PRE_CLEANING: {
    label: 'Приёмка',
    color: 'blue',
    description: 'Чек-лист при приёмке квартиры',
    icon: ClipboardDocumentCheckIcon,
  },
  CLEANING: {
    label: 'Уборка',
    color: 'green',
    description: 'Чек-лист во время уборки',
    icon: DocumentCheckIcon,
  },
  FINAL_REPORT: {
    label: 'Финальный отчёт',
    color: 'purple',
    description: 'Финальный отчёт после уборки',
    icon: CheckCircleIcon,
  },
};

export function UnitChecklists({ unitId, unitName }: UnitChecklistsProps) {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<ChecklistStage | null>(null);

  // Получить шаблон чек-листа для этой единицы
  const { data: checklistsData, isLoading: checklistsLoading } = useQuery<any>({
    queryKey: ['checklists', unitId],
    queryFn: () => graphqlClient.request(GET_CHECKLISTS_BY_UNIT, {
      unitId,
    }),
    enabled: !!unitId,
  });

  // Получить инстансы для каждой стадии
  const { data: preCleaningData } = useQuery<any>({
    queryKey: ['checklist-instance', unitId, 'PRE_CLEANING'],
    queryFn: () => graphqlClient.request(GET_CHECKLIST_BY_UNIT_AND_STAGE, {
      unitId,
      stage: 'PRE_CLEANING',
    }),
    enabled: !!unitId,
  });

  const { data: cleaningData } = useQuery<any>({
    queryKey: ['checklist-instance', unitId, 'CLEANING'],
    queryFn: () => graphqlClient.request(GET_CHECKLIST_BY_UNIT_AND_STAGE, {
      unitId,
      stage: 'CLEANING',
    }),
    enabled: !!unitId,
  });

  const { data: finalReportData } = useQuery<any>({
    queryKey: ['checklist-instance', unitId, 'FINAL_REPORT'],
    queryFn: () => graphqlClient.request(GET_CHECKLIST_BY_UNIT_AND_STAGE, {
      unitId,
      stage: 'FINAL_REPORT',
    }),
    enabled: !!unitId,
  });

  const checklists = checklistsData?.checklistsByUnit || [];
  const template = checklists[0];

  const instances = {
    PRE_CLEANING: preCleaningData?.checklistByUnitAndStage,
    CLEANING: cleaningData?.checklistByUnitAndStage,
    FINAL_REPORT: finalReportData?.checklistByUnitAndStage,
  };

  // Мутация для создания инстанса
  const createInstanceMutation = useMutation({
    mutationFn: async (stage: ChecklistStage) => {
      return graphqlClient.request(CREATE_CHECKLIST_INSTANCE, {
        unitId,
        stage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', unitId] });
      queryClient.invalidateQueries({ queryKey: ['checklists', unitId] });
      setSelectedStage(null);
    },
  });

  const handleCreateInstance = (stage: ChecklistStage) => {
    createInstanceMutation.mutate(stage);
  };

  if (checklistsLoading) {
    return (
      <div className="p-6 text-center">
        <Text>Загрузка чеклистов...</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={4}>Чеклисты уборки</Heading>
          {unitName && (
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Квартира: {unitName}
            </Text>
          )}
        </div>
      </div>

      {/* Template Info */}
      {template && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Heading level={5} className="text-blue-900 dark:text-blue-100">
                {template.name}
              </Heading>
              <Text className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {template.items?.length || 0} пунктов в шаблоне
              </Text>
            </div>
            {template.isActive && (
              <Badge color="green">Активный</Badge>
            )}
          </div>
        </div>
      )}

      {/* Checklist Instances Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(STAGE_CONFIG) as ChecklistStage[]).map((stage) => {
          const config = STAGE_CONFIG[stage];
          const instance = instances[stage];
          const Icon = config.icon;
          const hasInstance = !!instance;
          const isCompleted = instance?.status === 'SUBMITTED';
          const isLocked = instance?.status === 'LOCKED';

          return (
            <div
              key={stage}
              className={`
                p-6 rounded-lg border-2 transition-all duration-200
                ${hasInstance
                  ? isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : isLocked
                    ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                  : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-600'
                }
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`
                    p-3 rounded-lg
                    ${hasInstance
                      ? isCompleted
                        ? 'bg-green-500 text-white'
                        : isLocked
                        ? 'bg-gray-500 text-white'
                        : 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }
                  `}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <Heading level={5} className="mb-0">
                      {config.label}
                    </Heading>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {config.description}
                    </Text>
                  </div>
                </div>
              </div>

              {hasInstance ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge 
                      color={
                        isCompleted ? 'green' : 
                        isLocked ? 'zinc' : 
                        'blue'
                      }
                    >
                      {isCompleted ? 'Завершён' : 
                       isLocked ? 'Заблокирован' : 
                       'В работе'}
                    </Badge>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {instance.items?.length || 0} пунктов
                    </Text>
                  </div>

                  {instance.answers && instance.answers.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-zinc-700">
                      <Text className="text-xs text-gray-600 dark:text-gray-400">
                        Заполнено: {instance.answers.length} / {instance.items?.length || 0}
                      </Text>
                    </div>
                  )}

                  <Button
                    onClick={() => setSelectedStage(stage)}
                    color={config.color as any}
                    className="w-full"
                  >
                    Открыть
                  </Button>
                  {instance.id && (
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                      Создан: {new Date(instance.createdAt).toLocaleDateString('ru-RU')}
                    </Text>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    Чек-лист не создан
                  </Text>
                  <Button
                    onClick={() => handleCreateInstance(stage)}
                    color={config.color as any}
                    className="w-full"
                    disabled={createInstanceMutation.isPending || !template}
                  >
                    {createInstanceMutation.isPending ? (
                      'Создание...'
                    ) : (
                      <>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Создать чек-лист
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Template Items Preview */}
      {template && template.items && template.items.length > 0 && (
        <div className="mt-6">
          <Heading level={5} className="mb-4">Пункты шаблона</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {template.items.slice(0, 6).map((item: any, index: number) => (
              <div
                key={item.id}
                className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg text-sm"
              >
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <Text className="font-medium">{item.title}</Text>
                    {item.requiresPhoto && (
                      <Badge color="blue" className="mt-1 text-xs">
                        Требуется фото
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {template.items.length > 6 && (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              И ещё {template.items.length - 6} пунктов...
            </Text>
          )}
        </div>
      )}

      {!template && (
        <div className="p-8 text-center border border-dashed border-gray-300 dark:border-zinc-700 rounded-lg">
          <Text className="text-gray-600 dark:text-gray-400 mb-4">
            Пока нет шаблона чек-листа для этой квартиры
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-500">
            Шаблон чек-листа будет создан автоматически при первом использовании
          </Text>
        </div>
      )}

      {/* Checklist Instance Dialog */}
      {selectedStage && (
        <ChecklistInstanceDialog
          isOpen={!!selectedStage}
          onClose={() => setSelectedStage(null)}
          unitId={unitId}
          stage={selectedStage}
          instanceId={instances[selectedStage]?.id}
        />
      )}
    </div>
  );
}
