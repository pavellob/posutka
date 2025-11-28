'use client';

import { useState, useCallback, useMemo, useRef, FormEvent, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from './dialog';
import { Button } from './button';
import { Heading } from './heading';
import { Text } from './text';
import { Badge } from './badge';
import { FileUpload } from './file-upload';
import { graphqlClient } from '@/lib/graphql-client';
import { 
  GET_CHECKLIST_INSTANCE,
  GET_CHECKLIST_BY_CLEANING_AND_STAGE,
  GET_CHECKLIST_BY_REPAIR_AND_STAGE,
  ANSWER_CHECKLIST_ITEM,
  ATTACH_TO_CHECKLIST_ITEM,
  GET_CHECKLIST_ATTACHMENT_UPLOAD_URLS,
  REMOVE_CHECKLIST_ATTACHMENT,
  SUBMIT_CHECKLIST,
  PROMOTE_CHECKLIST,
  ADD_CHECKLIST_ITEM,
} from '@/lib/graphql-queries';
import { 
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon,
  TrashIcon,
  Bars3Icon,
  PlusIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import type { PresignedUploadUrl } from '@/hooks/useFileUpload';
import { Input } from './input';
import { Textarea } from './textarea';

interface ChecklistInstanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  stage: 'PRE_CLEANING' | 'CLEANING' | 'FINAL_REPORT' | 'REPAIR_INSPECTION' | 'REPAIR_RESULT';
  instanceId?: string;
  cleaningId?: string;
  repairId?: string;
  canEdit?: boolean;
  onStartCleaning?: () => void;
  orgId?: string;
}

const STAGE_LABELS: Record<string, string> = {
  PRE_CLEANING: 'Приёмка',
  CLEANING: 'Уборка',
  FINAL_REPORT: 'Финальный отчёт',
};

// Компонент для перетаскиваемого фото
function SortablePhoto({
  attachment,
  onDelete,
  dragDisabled,
}: {
  attachment: any
  onDelete: () => void
  dragDisabled?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attachment.id, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group
        ${isDragging ? 'z-50' : ''}
      `}
    >
      <div className="relative">
        <img
          src={attachment.url}
          alt={attachment.caption || 'Фото'}
          className="w-full h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-zinc-700"
        />
        {!dragDisabled && (
          <button
            {...attributes}
            {...listeners}
            className="absolute top-1 left-1 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          >
            <Bars3Icon className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={!!dragDisabled}
          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <TrashIcon className="w-3 h-3" />
        </button>
      </div>
      {attachment.caption && (
        <Text className="text-xs text-gray-500 mt-1 truncate">
          {attachment.caption}
        </Text>
      )}
    </div>
  );
}

export function ChecklistInstanceDialog({
  isOpen,
  onClose,
  unitId,
  stage,
  instanceId,
  cleaningId,
  canEdit = true,
  onStartCleaning,
  orgId,
}: ChecklistInstanceDialogProps) {
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemRequired, setNewItemRequired] = useState(false);
  const [newItemRequiresPhoto, setNewItemRequiresPhoto] = useState(false);
  const [newItemPhotoMin, setNewItemPhotoMin] = useState('');
  const [newItemError, setNewItemError] = useState<string | null>(null);
  const [selectedExampleImage, setSelectedExampleImage] = useState<{ url: string; caption?: string; index: number; total: number } | null>(null);
  const [exampleImageList, setExampleImageList] = useState<Array<{ url: string; caption?: string }>>([]);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});

  // Получить инстанс чек-листа
  const resolvedInstanceKey = instanceId || `${repairId ?? cleaningId ?? unitId}-${stage}`;

  const { data: instanceData, isLoading } = useQuery<any>({
    queryKey: ['checklist-instance', resolvedInstanceKey],
    queryFn: () => {
      if (instanceId) {
        return graphqlClient.request(GET_CHECKLIST_INSTANCE, { id: instanceId });
      }
      if (repairId) {
        return graphqlClient.request(GET_CHECKLIST_BY_REPAIR_AND_STAGE, { repairId, stage });
      }
      if (!cleaningId) throw new Error('Either instanceId, cleaningId, or repairId must be provided');
      return graphqlClient.request(GET_CHECKLIST_BY_CLEANING_AND_STAGE, { cleaningId, stage });
    },
    enabled: isOpen && !!unitId && (!!instanceId || !!cleaningId || !!repairId),
  });

  const instance = instanceData?.checklistInstance || instanceData?.checklistByCleaning || instanceData?.checklistByRepair;
  const items = instance?.items || [];
  const answers = instance?.answers || [];
  const attachments = useMemo(() => instance?.attachments || [], [instance?.attachments]);
  
  // Инициализируем itemNotes из существующих ответов
  useEffect(() => {
    if (answers && answers.length > 0) {
      const notesMap: Record<string, string> = {};
      answers.forEach((answer: any) => {
        if (answer.note) {
          notesMap[answer.itemKey] = answer.note;
        }
      });
      setItemNotes((prev) => {
        // Обновляем только если есть новые заметки, чтобы не перезаписывать пользовательский ввод
        const hasNewNotes = Object.keys(notesMap).length > 0;
        if (hasNewNotes) {
          return { ...prev, ...notesMap };
        }
        return prev;
      });
    }
  }, [answers]);
  const resetNewItemForm = () => {
    setNewItemTitle('');
    setNewItemDescription('');
    setNewItemRequired(false);
    setNewItemRequiresPhoto(false);
    setNewItemPhotoMin('');
    setNewItemError(null);
  };

  const invalidateStageQueries = useCallback(() => {
    if (cleaningId) {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', cleaningId, stage] });
      queryClient.invalidateQueries({ queryKey: ['cleaning', cleaningId] });
    }
  }, [cleaningId, queryClient, stage]);

  // Мутация для ответа на пункт
  const answerMutation = useMutation({
    mutationFn: async (input: { instanceId: string; itemKey: string; value: any; note?: string }) => {
      return graphqlClient.request(ANSWER_CHECKLIST_ITEM, { input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', resolvedInstanceKey] });
      invalidateStageQueries();
    },
  });

  // Мутация для отправки чек-листа
  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      return graphqlClient.request(SUBMIT_CHECKLIST, { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', resolvedInstanceKey] });
      queryClient.invalidateQueries({ queryKey: ['checklists', unitId] });
      invalidateStageQueries();
    },
  });

  // Мутация для промоута
  const promoteMutation = useMutation({
    mutationFn: async ({ fromInstanceId, toStage }: { fromInstanceId: string; toStage: string }) => {
      return graphqlClient.request(PROMOTE_CHECKLIST, { fromInstanceId, toStage });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', resolvedInstanceKey] });
      queryClient.invalidateQueries({ queryKey: ['checklists', unitId] });
      if (cleaningId) {
        queryClient.invalidateQueries({ queryKey: ['cleaning', cleaningId] });
        if (variables?.toStage) {
          queryClient.invalidateQueries({ queryKey: ['checklist-instance', cleaningId, variables.toStage] });
        }
      }
      invalidateStageQueries();
      onClose();
    },
  });

  // Мутация для загрузки фото
  const attachMutation = useMutation({
    mutationFn: async (input: { instanceId: string; itemKey: string; objectKey: string; caption?: string }) => {
      return graphqlClient.request(ATTACH_TO_CHECKLIST_ITEM, { input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', resolvedInstanceKey] });
    },
  });

  // Мутация для удаления фото
  const removeAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      return graphqlClient.request(REMOVE_CHECKLIST_ATTACHMENT, { attachmentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', resolvedInstanceKey] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (input: any) => {
      return graphqlClient.request(ADD_CHECKLIST_ITEM, { input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', resolvedInstanceKey] });
      resetNewItemForm();
      setIsAddingItem(false);
      invalidateStageQueries();
    },
    onError: (error: any) => {
      setNewItemError(error?.message ?? 'Не удалось добавить пункт');
    },
  });

  const startTriggeredRef = useRef(false);

  const triggerStartCleaning = useCallback(() => {
    if (!onStartCleaning) return;
    if (startTriggeredRef.current) return;
    if (!canEdit) return;
    if (stage !== 'PRE_CLEANING') return;
    if (instance?.status !== 'DRAFT') return;
    startTriggeredRef.current = true;
    onStartCleaning();
  }, [canEdit, instance?.status, onStartCleaning, stage]);

  const handleAnswer = (itemKey: string, value: any, note?: string) => {
    if (!instance?.id) return;
    triggerStartCleaning();
    const noteToSave = note !== undefined ? note : (itemNotes[itemKey] || undefined);
    answerMutation.mutate({
      instanceId: instance.id,
      itemKey,
      value,
      note: noteToSave,
    });
  };

  const handleNoteChange = (itemKey: string, note: string) => {
    setItemNotes((prev) => ({ ...prev, [itemKey]: note }));
  };

  const handleSaveNote = (itemKey: string) => {
    const answer = getAnswer(itemKey);
    if (answer && answer.value !== undefined && answer.value !== null) {
      handleAnswer(itemKey, answer.value, itemNotes[itemKey]);
    }
  };

  // Получить presigned URLs для загрузки фото
  const getPhotoUploadUrls = useCallback(
    (itemKey: string) =>
      async (files: File[]): Promise<PresignedUploadUrl[]> => {
        if (!instance?.id || !files.length) return [];
        triggerStartCleaning();

        const mimeTypes = files.map((f) => f.type);
        const response = (await graphqlClient.request(GET_CHECKLIST_ATTACHMENT_UPLOAD_URLS, {
          input: {
            instanceId: instance.id,
            itemKey,
            count: files.length,
            mimeTypes,
          },
        })) as any;

        return response.getChecklistAttachmentUploadUrls;
      },
    [instance?.id, triggerStartCleaning]
  );

  // Подтвердить загрузку фото
  const confirmPhotoUploads = useCallback(
    (itemKey: string) =>
      async (
        objectKeys: string[],
        files: File[],
        captions: string[]
      ): Promise<void> => {
        if (!instance?.id || !objectKeys.length) return;
        triggerStartCleaning();

        // URL будет создан на бэкенде из objectKey
        await Promise.all(
          objectKeys.map((objectKey, index) => {
            return attachMutation.mutateAsync({
              instanceId: instance.id,
              itemKey,
              objectKey,
              caption: captions[index] || undefined,
            });
          })
        );
      },
    [instance?.id, attachMutation, triggerStartCleaning]
  );

  const getAnswer = (itemKey: string) => {
    return answers.find((a: any) => a.itemKey === itemKey);
  };

  const getAttachments = (itemKey: string) => {
    return attachments.filter((a: any) => a.itemKey === itemKey);
  };

  // Обработка drag-and-drop для фото
  const handlePhotoDragEnd = useCallback((event: DragEndEvent, itemKey: string) => {
    const { active, over } = event;
    if (!over || !instance?.id) return;

    const itemAttachments = attachments.filter((a: any) => a.itemKey === itemKey);
    const oldIndex = itemAttachments.findIndex((att: any) => att.id === active.id);
    const newIndex = itemAttachments.findIndex((att: any) => att.id === over.id);

    if (oldIndex !== newIndex) {
      // TODO: Добавить мутацию для обновления порядка фото
      // Пока просто обновляем локально
      const newAttachments = arrayMove(itemAttachments, oldIndex, newIndex);
      // Можно добавить мутацию updateAttachmentOrder если нужно сохранять порядок
    }
  }, [instance?.id, attachments]);

  const handleSubmit = () => {
    if (!instance?.id) return;
    submitMutation.mutate(instance.id);
  };

  const handlePromote = (toStage: string) => {
    if (!instance?.id) return;
    promoteMutation.mutate({
      fromInstanceId: instance.id,
      toStage,
    });
  };

  const handleCreateCustomItem = (event: FormEvent) => {
    event.preventDefault();
    if (!instance?.id) return;
    triggerStartCleaning();

    const title = newItemTitle.trim();
    setNewItemError(null);

    if (!title) {
      setNewItemError('Укажите название пункта');
      return;
    }

    let photoMinValue: number | undefined;
    if (newItemRequiresPhoto) {
      const parsed = Number(newItemPhotoMin);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setNewItemError('Минимальное количество фото должно быть больше нуля');
        return;
      }
      photoMinValue = Math.max(1, Math.floor(parsed));
    }

    const input: any = {
      instanceId: instance.id,
      key: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description: newItemDescription.trim() || undefined,
      type: 'BOOL',
      required: newItemRequired,
      requiresPhoto: newItemRequiresPhoto,
      order: (items?.length ?? 0) + 1,
    };

    if (photoMinValue !== undefined) {
      input.photoMin = photoMinValue;
    }

    addItemMutation.mutate(input);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onClose={onClose} size="2xl">
        <DialogBody>
          <Text>Загрузка чек-листа...</Text>
        </DialogBody>
      </Dialog>
    );
  }

  if (!instance) {
    return (
      <Dialog open={isOpen} onClose={onClose} size="2xl">
        <DialogBody>
          <Text>Чек-лист не найден</Text>
        </DialogBody>
      </Dialog>
    );
  }

  const sortedItems = [...items].sort((a: any, b: any) => a.order - b.order);
  const itemStates = sortedItems.map((item: any) => {
    const answer = getAnswer(item.key)
    const attachmentsForItem = getAttachments(item.key)
    const hasRequiredPhotos = item.requiresPhoto
      ? attachmentsForItem.length >= (item.photoMin || 1)
      : true
    const hasValue = answer !== undefined && answer !== null && answer.value !== undefined && answer.value !== null
    const value = answer?.value
    // isCompleted: true если есть ответ (true или false) И выполнены требования по фото
    const isCompleted = item.requiresPhoto ? (hasValue && hasRequiredPhotos) : hasValue
    const isNegative = value === false
    // isMissingRequired: обязательный пункт не заполнен (нет ответа вообще)
    const isMissingRequired = item.required && !hasValue
    return { item, answer, attachments: attachmentsForItem, isCompleted, isNegative, isMissingRequired }
  })

  const completedItems = itemStates.filter((state) => state.isCompleted).length
  const hasNegativeAnswers = itemStates.some((state) => state.isNegative)
  const hasMissingRequired = itemStates.some((state) => state.isMissingRequired)

  const canSubmit =
    canEdit &&
    instance.status === 'DRAFT' &&
    !hasMissingRequired

  const canPromote = canEdit && instance.status === 'SUBMITTED' && stage === 'PRE_CLEANING';

  return (
    <>
    <Dialog open={isOpen} onClose={onClose} size="3xl">
      <DialogTitle>
        {STAGE_LABELS[stage]} - Чек-лист
      </DialogTitle>
      <DialogDescription>
        {unitId && (
          <>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Квартира: {unitId}
            </span>
            <span className="sm:hidden"> </span>
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>
          </>
        )}
        <span className="inline-flex flex-wrap items-center gap-2">
          {instance.status && (
            <Badge
              color={
                instance.status === 'SUBMITTED'
                  ? 'green'
                  : instance.status === 'LOCKED'
                    ? 'zinc'
                    : 'blue'
              }
            >
              {instance.status === 'SUBMITTED'
                ? 'Завершён'
                : instance.status === 'LOCKED'
                  ? 'Заблокирован'
                  : 'В работе'}
            </Badge>
          )}
          {!canEdit && instance.status === 'DRAFT' && (
            <Badge color="zinc">Только просмотр</Badge>
          )}
        </span>
      </DialogDescription>

      <DialogBody>
        <div className="space-y-4">
          {/* Progress */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Text className="text-sm font-medium">Прогресс</Text>
              <Text className="text-sm font-bold">
                {completedItems} / {sortedItems.length}
              </Text>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedItems / sortedItems.length) * 100}%` }}
              />
            </div>
          </div>

          {canEdit && instance.status === 'DRAFT' && (
            <div className="p-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/40">
              {!isAddingItem ? (
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                      Нужен дополнительный пункт только для этой уборки?
                    </Text>
                  </div>
                  <Button color="blue" onClick={() => {
                    triggerStartCleaning();
                    setIsAddingItem(true);
                  }}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Добавить пункт
                  </Button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleCreateCustomItem}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        Название *
                      </label>
                      <Input
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="Например: Проверить состояние мебели"
                        required
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        Описание
                      </label>
                      <Textarea
                        value={newItemDescription}
                        onChange={(e) => setNewItemDescription(e.target.value)}
                        placeholder="Добавьте детали для исполнителя (опционально)"
                        rows={3}
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:col-span-2">
                      <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                          checked={newItemRequired}
                          onChange={(e) => setNewItemRequired(e.target.checked)}
                        />
                        Обязательный пункт
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                          checked={newItemRequiresPhoto}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNewItemRequiresPhoto(checked);
                            if (checked && !newItemPhotoMin) {
                              setNewItemPhotoMin('1');
                            }
                            if (!checked) {
                              setNewItemPhotoMin('');
                            }
                          }}
                        />
                        Требуется фото
                      </label>
                      {newItemRequiresPhoto && (
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-zinc-700 dark:text-zinc-200">
                            Мин. фото
                          </label>
                          <Input
                            type="number"
                            min={1}
                            value={newItemPhotoMin}
                            onChange={(e) => setNewItemPhotoMin(e.target.value)}
                            className="w-24"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {newItemError && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-200">
                      {newItemError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      color="zinc"
                      disabled={addItemMutation.isPending}
                      onClick={() => {
                        resetNewItemForm();
                        setIsAddingItem(false);
                      }}
                    >
                      Отменить
                    </Button>
                    <Button
                      type="submit"
                      color="blue"
                      disabled={addItemMutation.isPending}
                    >
                      {addItemMutation.isPending ? 'Добавляем...' : 'Сохранить пункт'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Items */}
          <div className="space-y-3">
            {itemStates.map(({ item, answer, attachments: itemAttachments, isCompleted, isNegative, isMissingRequired }) => {
              return (
                <div
                  key={item.id}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${isMissingRequired
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                      : isNegative
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-600'
                        : isCompleted
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-600'
                          : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                        <Heading level={6} className="mb-0 flex-1">
                          {item.order}. {item.title}
                        </Heading>
                        <div className="flex flex-wrap items-center gap-2">
                          {item.required && (
                            <Badge color="red" className="text-xs">Обязательно</Badge>
                          )}
                          {item.requiresPhoto && (
                            <Badge color="blue" className="text-xs">
                              Фото: {itemAttachments.length} / {item.photoMin || 1}
                            </Badge>
                          )}
                          {isMissingRequired && (
                            <Badge color="red" className="text-xs">Требует заполнения</Badge>
                          )}
                          {!isMissingRequired && isCompleted && !isNegative && (
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          )}
                          {isNegative && (
                            <Badge color="amber" className="text-xs">Проблема</Badge>
                          )}
                        </div>
                      </div>
                      {item.description && (
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {item.description}
                        </Text>
                      )}
                      {/* Задачи, связанные с этим пунктом */}
                      {item.tasks && item.tasks.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Связанные задачи:
                          </Text>
                          {item.tasks.map((task: any) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700"
                            >
                              <ClipboardDocumentListIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <div className="flex-1 min-w-0">
                                <Text className="text-xs font-medium text-blue-900 dark:text-blue-100 truncate">
                                  {task.note || 'Задача'}
                                </Text>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge
                                    color={
                                      task.status === 'DONE'
                                        ? 'green'
                                        : task.status === 'IN_PROGRESS'
                                          ? 'blue'
                                          : 'orange'
                                    }
                                    className="text-xs"
                                  >
                                    {task.status === 'DONE'
                                      ? 'Завершена'
                                      : task.status === 'IN_PROGRESS'
                                        ? 'В работе'
                                        : 'Ожидает'}
                                  </Badge>
                                  {task.assignedTo && (
                                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {task.assignedTo.name}
                                    </Text>
                                  )}
                                  {task.assignedCleaner && (
                                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {task.assignedCleaner.firstName} {task.assignedCleaner.lastName}
                                    </Text>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Answer */}
                  {item.type === 'BOOL' && (
                    <div className="space-y-3 mt-3">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAnswer(item.key, true)}
                          color={answer?.value === true ? 'green' : 'zinc'}
                          disabled={!canEdit || instance.status !== 'DRAFT'}
                        >
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          Выполнено
                        </Button>
                        <Button
                          onClick={() => handleAnswer(item.key, false)}
                          color={answer?.value === false ? 'red' : 'zinc'}
                          disabled={!canEdit || instance.status !== 'DRAFT'}
                        >
                          <XCircleIcon className="w-4 h-4 mr-1" />
                          Проблема
                        </Button>
                      </div>
                      {/* Описание/комментарий к пункту */}
                      {canEdit && instance.status === 'DRAFT' && (
                        <div>
                          <Textarea
                            value={itemNotes[item.key] || answer?.note || ''}
                            onChange={(e) => handleNoteChange(item.key, e.target.value)}
                            onBlur={() => {
                              // Сохраняем описание при потере фокуса, если есть ответ
                              if (answer && answer.value !== undefined && answer.value !== null) {
                                handleSaveNote(item.key);
                              }
                            }}
                            placeholder="Добавить описание или комментарий (опционально)"
                            rows={2}
                            className="w-full"
                          />
                          <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Описание сохраняется автоматически при потере фокуса
                          </Text>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Example Media (from template) - показываем только для PRE_CLEANING */}
                  {stage === 'PRE_CLEANING' && item.exampleMedia && item.exampleMedia.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <PhotoIcon className="w-4 h-4 text-amber-500" />
                        <Text className="text-sm font-medium text-amber-700 dark:text-amber-400">
                          Примеры фото из шаблона
                        </Text>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {item.exampleMedia.map((media: any, index: number) => {
                          const allMedia = item.exampleMedia.map((m: any) => ({ url: m.url, caption: m.caption }));
                          return (
                            <div 
                              key={media.id} 
                              className="relative group cursor-pointer"
                              onClick={() => {
                                setExampleImageList(allMedia);
                                setSelectedExampleImage({ 
                                  url: media.url, 
                                  caption: media.caption, 
                                  index,
                                  total: allMedia.length 
                                });
                              }}
                            >
                              <div className="relative overflow-hidden rounded-lg border-2 border-amber-200 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-200">
                                <img
                                  src={media.url}
                                  alt={media.caption || 'Пример'}
                                  className="w-full h-20 sm:h-24 object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                {/* Overlay с иконкой зума */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <svg 
                                      className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-lg" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" 
                                      />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              {media.caption && (
                                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                  {media.caption}
                                </Text>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <PhotoIcon className="w-4 h-4 text-gray-500" />
                      <Text className="text-sm font-medium">
                        {stage === 'PRE_CLEANING' ? 'Ваши фото' : 'Фото'}
                      </Text>
                      {itemAttachments.length > 0 && (
                        <Badge color="blue" className="text-xs">
                          {itemAttachments.length}
                        </Badge>
                      )}
                      {item.requiresPhoto && (
                        <Badge color="blue" className="text-xs">
                          Требуется: {item.photoMin || 1}
                        </Badge>
                      )}
                    </div>
                    
                    {itemAttachments.length > 0 && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handlePhotoDragEnd(e, item.key)}
                      >
                        <SortableContext
                          items={itemAttachments.map((att: any) => att.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            {itemAttachments.map((att: any) => (
                              <SortablePhoto
                                key={att.id}
                                attachment={att}
                                onDelete={() => {
                                  if (!canEdit || instance.status !== 'DRAFT') return;
                                  if (confirm('Удалить это фото?')) {
                                    removeAttachmentMutation.mutate(att.id);
                                  }
                                }}
                                dragDisabled={!canEdit || instance.status !== 'DRAFT'}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}

                    {canEdit && instance.status === 'DRAFT' && (
                      <FileUpload
                        onGetPresignedUrls={getPhotoUploadUrls(item.key)}
                        onConfirmUploads={confirmPhotoUploads(item.key)}
                        maxFiles={10}
                        accept="image/*"
                        multiple={true}
                        onUploadSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ['checklist-instance', resolvedInstanceKey] });
                        }}
                      />
                    )}
                  </div>

                  {/* Note - показываем только если чеклист не в режиме редактирования */}
                  {answer?.note && (!canEdit || instance.status !== 'DRAFT') && (
                    <div className="mt-3 p-2 bg-gray-100 dark:bg-zinc-800 rounded">
                      <Text className="text-sm font-medium mb-1">Описание:</Text>
                      <Text className="text-sm">{answer.note}</Text>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogBody>

      <DialogActions>
        <Button onClick={onClose} color="zinc">
          Закрыть
        </Button>
        {instance.status === 'DRAFT' && (
          <Button
            onClick={handleSubmit}
            color="green"
            disabled={submitMutation.isPending || hasMissingRequired}
          >
            {submitMutation.isPending ? 'Отправка...' : 'Отправить'}
          </Button>
        )}
        {canPromote && (
          <Button
            onClick={() => handlePromote('CLEANING')}
            color="blue"
            disabled={promoteMutation.isPending}
          >
            {promoteMutation.isPending ? 'Промоут...' : 'Промоутить в уборку'}
          </Button>
        )}
        {instance.status === 'SUBMITTED' && stage === 'CLEANING' && (
          <Button
            onClick={() => handlePromote('FINAL_REPORT')}
            color="purple"
            disabled={promoteMutation.isPending || !canEdit}
          >
            {promoteMutation.isPending ? 'Промоут...' : 'Промоутить в финальный отчёт'}
          </Button>
        )}
      </DialogActions>
    </Dialog>


    {/* Dialog для просмотра увеличенного примера фото */}
    {selectedExampleImage && (
      <Dialog open={!!selectedExampleImage} onClose={() => setSelectedExampleImage(null)}>
        <DialogBody className="p-0 max-w-4xl">
          <div className="relative">
            <img
              src={selectedExampleImage.url}
              alt={selectedExampleImage.caption || 'Пример'}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            {selectedExampleImage.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4">
                <Text className="text-sm">{selectedExampleImage.caption}</Text>
              </div>
            )}
            {exampleImageList.length > 1 && (
              <>
                {selectedExampleImage.index > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIndex = selectedExampleImage.index - 1;
                      setSelectedExampleImage({ 
                        ...selectedExampleImage, 
                        url: exampleImageList[newIndex].url,
                        caption: exampleImageList[newIndex].caption,
                        index: newIndex
                      });
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    aria-label="Предыдущее фото"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {selectedExampleImage.index < exampleImageList.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIndex = selectedExampleImage.index + 1;
                      setSelectedExampleImage({ 
                        ...selectedExampleImage, 
                        url: exampleImageList[newIndex].url,
                        caption: exampleImageList[newIndex].caption,
                        index: newIndex
                      });
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    aria-label="Следующее фото"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {selectedExampleImage.index + 1} / {selectedExampleImage.total}
                </div>
              </>
            )}
            <button
              onClick={() => setSelectedExampleImage(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Закрыть"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </DialogBody>
      </Dialog>
    )}
  </>
  );
}

