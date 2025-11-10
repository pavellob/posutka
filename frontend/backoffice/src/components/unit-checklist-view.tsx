'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heading } from './heading';
import { Text } from './text';
import { Badge } from './badge';
import { graphqlClient } from '@/lib/graphql-client';
import { GET_CHECKLISTS_BY_UNIT } from '@/lib/graphql-queries';
import { 
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';

interface UnitChecklistViewProps {
  unitId: string;
  unitName?: string;
}

type ViewMode = 'cards' | 'list';

export function UnitChecklistView({ unitId, unitName }: UnitChecklistViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const { data: checklistsData, isLoading } = useQuery<any>({
    queryKey: ['checklists', unitId],
    queryFn: () => graphqlClient.request(GET_CHECKLISTS_BY_UNIT, { unitId }),
    enabled: !!unitId,
  });

  const checklists = checklistsData?.checklistsByUnit || [];

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <Text>Загрузка чеклиста...</Text>
      </div>
    );
  }

  if (checklists.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Heading level={4}>Чеклист уборки</Heading>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {unitName && `Квартира: ${unitName}`}
            </Text>
          </div>
        </div>

        <div className="p-12 text-center border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-900/50">
          <Heading level={5} className="mb-2">Чеклист не создан</Heading>
          <Text className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Шаблон чек-листа будет создан автоматически при первом использовании
          </Text>
        </div>
      </div>
    );
  }

  const displayedChecklist = checklists[0];
  const items = displayedChecklist.items || [];
  const itemsWithPhotos = items.filter((item: any) => item.requiresPhoto).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Heading level={4}>{displayedChecklist.name}</Heading>
            {displayedChecklist.isActive && (
              <Badge color="green">Активный</Badge>
            )}
          </div>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {unitName && `Квартира: ${unitName}`}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg">
            <button
              onClick={() => setViewMode('cards')}
              className={`
                p-2 rounded transition-colors
                ${viewMode === 'cards'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
              title="Вид карточек"
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`
                p-2 rounded transition-colors
                ${viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
              title="Вид списка"
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">Пунктов</Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{items.length}</Text>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">Пунктов с фото</Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{itemsWithPhotos}</Text>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">Версия</Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {displayedChecklist.version || '1'}
          </Text>
        </div>
      </div>

      {/* Checklist Items */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item: any, index: number) => (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white font-semibold text-sm flex-shrink-0 shadow-md">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <Heading level={6} className="mb-0 text-gray-900 dark:text-gray-100">
                    {item.title}
                  </Heading>
                </div>
              </div>
              
              {item.description && (
                <div className="mb-4">
                  <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.description}
                  </Text>
                </div>
              )}

              {item.requiresPhoto && (
                <Badge color="blue" className="mt-2">
                  Требуется фото
                </Badge>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: any, index: number) => (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white font-semibold text-sm flex-shrink-0 shadow-md">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <Heading level={6} className="mb-0 text-gray-900 dark:text-gray-100">
                    {item.title}
                  </Heading>
                  
                  {item.description && (
                    <div className="mt-2">
                      <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {item.description}
                      </Text>
                    </div>
                  )}

                  {item.requiresPhoto && (
                    <Badge color="blue" className="mt-2">
                      Требуется фото
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
