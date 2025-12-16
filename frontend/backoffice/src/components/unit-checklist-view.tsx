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
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {items.map((item: any, index: number) => (
            <div
              key={item.id}
              className="group relative bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 p-4 h-full flex flex-col overflow-hidden"
            >
              {/* Номер пункта - без отступа слева, Material Design стиль */}
              <div className="flex items-start mb-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-medium flex-shrink-0 mr-2.5">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <Heading level={6} className="mb-0 text-gray-900 dark:text-gray-100 text-sm font-medium leading-snug line-clamp-2">
                    {item.title}
                  </Heading>
                </div>
              </div>
              
              {/* Описание */}
              {item.description && (
                <div className="mb-3 flex-1">
                  <Text className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                    {item.description}
                  </Text>
                </div>
              )}

              {/* Бейдж с фото - Material Design стиль */}
              {item.requiresPhoto && (
                <div className="mt-auto pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <Text className="text-xs text-blue-600 dark:text-blue-400 font-normal">
                      Требуется фото
                    </Text>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-200 dark:divide-zinc-700">
          {items.map((item: any, index: number) => (
            <div
              key={item.id}
              className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors duration-150"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-xs flex-shrink-0 shadow-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Heading level={6} className="mb-1 text-gray-900 dark:text-gray-100">
                        {item.title}
                      </Heading>
                      
                      {item.description && (
                        <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">
                          {item.description}
                        </Text>
                      )}
                    </div>
                    
                    {item.requiresPhoto && (
                      <Badge color="blue" className="flex-shrink-0">
                        📷 Фото
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
