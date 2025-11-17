'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from './button';
import { Heading } from './heading';
import { Text } from './text';
import { Input } from './input';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from './dialog';
import { FileUpload } from './file-upload';
import { graphqlClient } from '@/lib/graphql-client';
import { 
  GET_CHECKLISTS_BY_UNIT,
  CREATE_CHECKLIST_TEMPLATE,
  ADD_TEMPLATE_ITEM,
  UPDATE_TEMPLATE_ITEM,
  REMOVE_TEMPLATE_ITEM,
  UPDATE_TEMPLATE_ITEM_ORDER,
  GET_TEMPLATE_ITEM_EXAMPLE_MEDIA_UPLOAD_URLS,
  ADD_TEMPLATE_ITEM_EXAMPLE_MEDIA,
  REMOVE_TEMPLATE_ITEM_EXAMPLE_MEDIA,
} from '@/lib/graphql-queries';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  Bars3Icon,
  Squares2X2Icon,
  ListBulletIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { PresignedUploadUrl } from '@/hooks/useFileUpload';

interface UnitChecklistEditorViewProps {
  unitId: string;
  unitName?: string;
}

type ViewMode = 'cards' | 'list';

function ExampleMediaGallery({ media }: { media: any[] }) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; caption?: string } | null>(null);
  const [imageList, setImageList] = useState<Array<{ url: string; caption?: string }>>([]);
  const [imageIndex, setImageIndex] = useState(0);

  const handleImageClick = (mediaIndex: number) => {
    const allMedia = media.map((m) => ({ url: m.url, caption: m.caption }));
    setImageList(allMedia);
    setImageIndex(mediaIndex);
    setSelectedImage(allMedia[mediaIndex]);
  };

  const handleNext = () => {
    if (imageIndex < imageList.length - 1) {
      const newIndex = imageIndex + 1;
      setImageIndex(newIndex);
      setSelectedImage(imageList[newIndex]);
    }
  };

  const handlePrevious = () => {
    if (imageIndex > 0) {
      const newIndex = imageIndex - 1;
      setImageIndex(newIndex);
      setSelectedImage(imageList[newIndex]);
    }
  };

  return (
    <>
      <div className="mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
          {media.map((m: any, index: number) => (
            <div 
              key={m.id} 
              className="relative group cursor-pointer" 
              onClick={() => handleImageClick(index)}
            >
              <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200">
                <img
                  src={m.url}
                  alt={m.caption || 'Пример'}
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
              {m.caption && (
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 truncate">
                  {m.caption}
                </Text>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedImage && (
        <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)}>
          <DialogBody className="p-0 max-w-4xl">
            <div className="relative">
              <img
                src={selectedImage.url}
                alt={selectedImage.caption || 'Пример'}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              {selectedImage.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4">
                  <Text className="text-sm">{selectedImage.caption}</Text>
                </div>
              )}
              {imageList.length > 1 && (
                <>
                  {imageIndex > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevious();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  {imageIndex < imageList.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
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

function SortableCardItem({ item, index, onEdit, onDelete }: { 
  item: any; 
  index: number;
  onEdit: (item: any) => void;
  onDelete: (itemKey: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative bg-white dark:bg-black rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-800"
    >
      {/* Заголовок - Material Design elevation */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1.5 sm:p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Переместить"
            >
              <Bars3Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <Heading level={6} className="mb-0 text-gray-900 dark:text-white flex-1 min-w-0 text-sm sm:text-base font-medium">
              {item.title}
            </Heading>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all duration-200"
              aria-label="Редактировать"
            >
              <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => onDelete(item.key)}
              className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all duration-200"
              aria-label="Удалить"
            >
              <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Контент - Material Design spacing */}
      <div className="p-4 sm:p-6">
        {item.description && (
          <div className="mb-4">
            <Text className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {item.description}
            </Text>
          </div>
        )}

        {/* Примеры фото - адаптивная сетка */}
        {item.exampleMedia && item.exampleMedia.length > 0 && (
          <div className="mt-4">
            <ExampleMediaGallery media={item.exampleMedia} />
          </div>
        )}
      </div>
    </div>
  );
}

function SortableListItem({ item, index, onEdit, onDelete }: { 
  item: any; 
  index: number;
  onEdit: (item: any) => void;
  onDelete: (itemKey: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group bg-white dark:bg-zinc-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-zinc-200 dark:border-zinc-800"
    >
      {/* Заголовок на весь верх */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Bars3Icon className="w-4 h-4" />
            </button>
            <Heading level={6} className="mb-0 text-gray-900 dark:text-gray-100 flex-1 min-w-0">
              {item.title}
            </Heading>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(item)}
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors opacity-60 hover:opacity-100"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(item.key)}
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors opacity-60 hover:opacity-100"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Контент */}
      <div className="p-4">
        {item.description && (
          <div className="mb-4">
            <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {item.description}
            </Text>
          </div>
        )}

        {/* Примеры фото */}
        {item.exampleMedia && item.exampleMedia.length > 0 && (
          <ExampleMediaGallery media={item.exampleMedia} />
        )}
      </div>
    </div>
  );
}

function AddItemDialog({
  isOpen,
  onClose,
  templateId,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  onSave: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(false);
  const [requiresPhoto, setRequiresPhoto] = useState(true);
  const [photoMin, setPhotoMin] = useState(1);
  const [createdItemKey, setCreatedItemKey] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingCaptions, setPendingCaptions] = useState<string[]>([]);

  const addExampleMediaMutation = useMutation({
    mutationFn: async (input: any) => {
      return graphqlClient.request(ADD_TEMPLATE_ITEM_EXAMPLE_MEDIA, { input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklists', templateId] });
    },
  });

  // Подтвердить загрузку примеров фото (после создания пункта)
  const confirmExampleMediaUploads = async (
    itemKey: string,
    objectKeys: string[],
    files: File[],
    captions: string[]
  ): Promise<void> => {
    if (!objectKeys.length) return;

    const filesData = objectKeys.map((objectKey, index) => ({
      objectKey,
      mimeType: files[index]?.type || 'image/jpeg',
      caption: captions[index] || undefined,
    }));

    await addExampleMediaMutation.mutateAsync({
      templateId,
      itemKey,
      files: filesData,
    });
  };

  // Обработчик загрузки файлов
  const handleFileUpload = async (objectKeys: string[], files: File[], captions: string[]) => {
    if (createdItemKey && objectKeys.length > 0 && objectKeys[0] !== '') {
      // Пункт уже создан и файлы загружены, подтверждаем загрузку
      await confirmExampleMediaUploads(createdItemKey, objectKeys, files, captions);
    } else if (!createdItemKey) {
      // Пункт еще не создан, сохраняем файлы для последующей загрузки
      setPendingFiles(files);
      setPendingCaptions(captions);
    }
  };

  const addItemMutation = useMutation({
    mutationFn: async (input: any) => {
      return graphqlClient.request(ADD_TEMPLATE_ITEM, { input });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklists', templateId] });
      
      onSave();
    },
  });

  const handleSave = async () => {
    if (!title.trim()) return;

    const key = `item-${Date.now()}`;
    
    await addItemMutation.mutateAsync({
      templateId,
      key,
      title,
      description: description || undefined,
      required,
      requiresPhoto,
      photoMin: requiresPhoto ? photoMin : undefined,
      type: 'BOOL',
    });

    // Сохраняем ключ созданного пункта
    setCreatedItemKey(key);
    
    // Если есть отложенные файлы, загружаем их после создания пункта
    if (pendingFiles.length > 0) {
      try {
        // Получаем presigned URLs для отложенных файлов
        const mimeTypes = pendingFiles.map((f) => f.type);
        const response = await graphqlClient.request(GET_TEMPLATE_ITEM_EXAMPLE_MEDIA_UPLOAD_URLS, {
          input: {
            templateId,
            itemKey: key,
            count: pendingFiles.length,
            mimeTypes,
          },
        }) as any;
        
        const presignedUrls = response.getTemplateItemExampleMediaUploadUrls;
        
        // Загружаем файлы на MinIO
        const uploadedObjectKeys: string[] = [];
        for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          const presignedUrl = presignedUrls[i];
          
          // Загружаем файл на MinIO
          const uploadResponse = await fetch(presignedUrl.url, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type,
            },
          });
          
          if (uploadResponse.ok) {
            uploadedObjectKeys.push(presignedUrl.objectKey);
          }
        }
        
        // Подтверждаем загрузку
        if (uploadedObjectKeys.length > 0) {
          await confirmExampleMediaUploads(key, uploadedObjectKeys, pendingFiles, pendingCaptions);
        }
        
        // Очищаем отложенные файлы
        setPendingFiles([]);
        setPendingCaptions([]);
      } catch (error) {
        console.error('Failed to upload pending files:', error);
      }
    }
  };

  // Сброс формы при закрытии
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setRequired(false);
      setRequiresPhoto(true);
      setPhotoMin(1);
      setCreatedItemKey(null);
      setPendingFiles([]);
      setPendingCaptions([]);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>
        Добавить пункт
      </DialogTitle>
      <DialogDescription>
        Создайте новый пункт чек-листа
      </DialogDescription>
      
      <DialogBody>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Название пункта *
            </label>
            <Input
              placeholder="Название пункта"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Описание
            </label>
            <Input
              placeholder="Описание (необязательно)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Text className="text-sm text-gray-700 dark:text-gray-300">
                Обязательный пункт
              </Text>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresPhoto}
                onChange={(e) => setRequiresPhoto(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Text className="text-sm text-gray-700 dark:text-gray-300">
                Требуется фото
              </Text>
            </label>

            {requiresPhoto && (
              <div className="pl-7">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Минимальное количество фото
                </label>
                <Input
                  type="number"
                  min="1"
                  value={photoMin}
                  onChange={(e) => setPhotoMin(parseInt(e.target.value) || 1)}
                  className="w-24"
                />
              </div>
            )}
          </div>

          {/* Примеры фото */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Heading level={5} className="mb-1">Примеры фото</Heading>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Добавьте примеры фото для этого пункта
                </Text>
              </div>
            </div>

            <FileUpload
              onGetPresignedUrls={async (files: File[]) => {
                if (!createdItemKey) {
                  // Если пункт еще не создан, сохраняем файлы локально
                  // и возвращаем пустой массив - файлы будут загружены после создания пункта
                  setPendingFiles(files);
                  setPendingCaptions(new Array(files.length).fill(''));
                  // Возвращаем пустой массив, но FileUpload все равно вызовет onConfirmUploads
                  return [];
                }
                
                // Если пункт уже создан, получаем presigned URLs
                const mimeTypes = files.map((f) => f.type);
                const response = await graphqlClient.request(GET_TEMPLATE_ITEM_EXAMPLE_MEDIA_UPLOAD_URLS, {
                  input: {
                    templateId,
                    itemKey: createdItemKey,
                    count: files.length,
                    mimeTypes,
                  },
                }) as any;
                return response.getTemplateItemExampleMediaUploadUrls;
              }}
              onConfirmUploads={handleFileUpload}
              maxFiles={10}
              accept="image/*"
              multiple={true}
              onUploadSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['checklists'] });
                queryClient.invalidateQueries({ queryKey: ['checklists', templateId] });
              }}
            />
          </div>
        </div>
      </DialogBody>

      <DialogActions>
        <Button onClick={onClose}>
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          color="blue"
          disabled={addItemMutation.isPending || !title.trim()}
        >
          {addItemMutation.isPending ? 'Добавление...' : 'Добавить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditItemDialog({ 
  isOpen, 
  onClose, 
  item, 
  templateId,
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  item: any | null;
  templateId: string;
  onSave: (data: any) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(false);
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [photoMin, setPhotoMin] = useState(1);

  const updateItemMutation = useMutation({
    mutationFn: async (input: any) => {
      return graphqlClient.request(UPDATE_TEMPLATE_ITEM, { input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklists', templateId] });
      onSave({ title, description, required, requiresPhoto, photoMin });
    },
  });

  const addExampleMediaMutation = useMutation({
    mutationFn: async (input: any) => {
      return graphqlClient.request(ADD_TEMPLATE_ITEM_EXAMPLE_MEDIA, { input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklists', templateId] });
    },
  });

  const removeExampleMediaMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      return graphqlClient.request(REMOVE_TEMPLATE_ITEM_EXAMPLE_MEDIA, { mediaId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklists', templateId] });
    },
  });

  // Получить presigned URLs для загрузки примеров фото
  const getExampleMediaUploadUrls = async (files: File[]): Promise<PresignedUploadUrl[]> => {
    if (!item || !files.length) return [];

    const mimeTypes = files.map((f) => f.type);
    const response = await graphqlClient.request(GET_TEMPLATE_ITEM_EXAMPLE_MEDIA_UPLOAD_URLS, {
      input: {
        templateId,
        itemKey: item.key,
        count: files.length,
        mimeTypes,
      },
    }) as any;

    return response.getTemplateItemExampleMediaUploadUrls;
  };

  // Подтвердить загрузку примеров фото
  const confirmExampleMediaUploads = async (
    objectKeys: string[],
    files: File[],
    captions: string[]
  ): Promise<void> => {
    if (!item || !objectKeys.length) return;

    // URL будет создан на бэкенде из objectKey
    const filesData = objectKeys.map((objectKey, index) => ({
      objectKey,
      mimeType: files[index]?.type || 'image/jpeg',
      caption: captions[index] || undefined,
    }));

    await addExampleMediaMutation.mutateAsync({
      templateId,
      itemKey: item.key,
      files: filesData,
    });
  };

  const handleSave = () => {
    if (!item || !title.trim()) return;

    updateItemMutation.mutate({
      templateId,
      itemKey: item.key,
      title,
      description: description || undefined,
      required,
      requiresPhoto,
      photoMin: requiresPhoto ? photoMin : undefined,
    });
  };

  // Инициализация формы при открытии
  useEffect(() => {
    if (item && isOpen) {
      setTitle(item.title || '');
      setDescription(item.description || '');
      setRequired(item.required || false);
      setRequiresPhoto(item.requiresPhoto || false);
      setPhotoMin(item.photoMin || 1);
    }
  }, [item, isOpen]);

  if (!item) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>
        Редактировать пункт
      </DialogTitle>
      <DialogDescription>
        Измените параметры пункта чек-листа
      </DialogDescription>
      
      <DialogBody>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Название пункта *
            </label>
            <Input
              placeholder="Название пункта"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Описание
            </label>
            <Input
              placeholder="Описание (необязательно)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              <Text className="text-sm">Обязательный пункт</Text>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requiresPhoto}
                onChange={(e) => setRequiresPhoto(e.target.checked)}
              />
              <div className="flex-1">
                <Text className="text-sm">Требуется фото</Text>
                {requiresPhoto && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Минимальное количество фото
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={photoMin}
                      onChange={(e) => setPhotoMin(parseInt(e.target.value) || 1)}
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Примеры фото */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Heading level={5} className="mb-1">Примеры фото</Heading>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Добавьте примеры фото для этого пункта
                </Text>
              </div>
            </div>

            {item.exampleMedia && item.exampleMedia.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                {item.exampleMedia.map((media: any) => (
                  <div key={media.id} className="relative group">
                    <img
                      src={media.url}
                      alt={media.caption || 'Пример'}
                      className="w-full h-24 object-cover rounded-xl shadow-md"
                    />
                    <button
                      onClick={() => removeExampleMediaMutation.mutate(media.id)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                    {media.caption && (
                      <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {media.caption}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            )}

            <FileUpload
              onGetPresignedUrls={getExampleMediaUploadUrls}
              onConfirmUploads={confirmExampleMediaUploads}
              maxFiles={10}
              accept="image/*"
              multiple={true}
              onUploadSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['checklists'] });
                queryClient.invalidateQueries({ queryKey: ['checklists', templateId] });
              }}
            />
          </div>
        </div>
      </DialogBody>

      <DialogActions>
        <Button
          onClick={onClose}
          color="zinc"
        >
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          color="blue"
          disabled={updateItemMutation.isPending || !title.trim()}
        >
          {updateItemMutation.isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function UnitChecklistEditorView({ unitId, unitName }: UnitChecklistEditorViewProps) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: checklistsData, isLoading } = useQuery<any>({
    queryKey: ['checklists', unitId],
    queryFn: () => graphqlClient.request(GET_CHECKLISTS_BY_UNIT, { unitId }),
    enabled: !!unitId,
  });

  const checklists = checklistsData?.checklistsByUnit || [];
  const template = checklists[0];
  const items = template?.items || [];
  const itemsWithPhotos = items.filter((item: any) => item.requiresPhoto).length;


  const removeItemMutation = useMutation({
    mutationFn: async ({ templateId, itemKey }: { templateId: string; itemKey: string }) => {
      return graphqlClient.request(REMOVE_TEMPLATE_ITEM, { templateId, itemKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', unitId] });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ templateId, itemKeys }: { templateId: string; itemKeys: string[] }) => {
      return graphqlClient.request(UPDATE_TEMPLATE_ITEM_ORDER, { templateId, itemKeys });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', unitId] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !template) return;

    const oldIndex = items.findIndex((item: any) => item.key === active.id);
    const newIndex = items.findIndex((item: any) => item.key === over.id);

    if (oldIndex !== newIndex) {
      const newItems = arrayMove(items, oldIndex, newIndex);
      const itemKeys = newItems.map((item: any) => item.key);
      updateOrderMutation.mutate({ templateId: template.id, itemKeys });
    }
  };


  const handleEditItem = (item: any) => {
    setEditingItem(item);
  };

  const handleDeleteItem = (itemKey: string) => {
    if (!template) return;
    if (!confirm('Удалить этот пункт?')) return;

    removeItemMutation.mutate({ templateId: template.id, itemKey });
  };

  const handleSaveEdit = (data: any) => {
    setEditingItem(null);
  };

  const cancelEdit = () => {
    setEditingItem(null);
  };

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      return graphqlClient.request(CREATE_CHECKLIST_TEMPLATE, { unitId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', unitId] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <Text>Загрузка чеклиста...</Text>
      </div>
    );
  }

  if (!template) {
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

        <div className="p-12 text-center border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800">
          <Heading level={5} className="mb-2">Чеклист не создан</Heading>
          <Text className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Создайте шаблон чек-листа для этой квартиры
          </Text>
          <Button
            onClick={() => createTemplateMutation.mutate()}
            color="blue"
            disabled={createTemplateMutation.isPending}
          >
            {createTemplateMutation.isPending ? 'Создание...' : (
              <>
                <PlusIcon className="w-4 h-4 mr-2" />
                Создать чеклист
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Heading level={4}>Чек-лист (версия {template.version})</Heading>
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
            {template.version || '1'}
          </Text>
        </div>
      </div>

      {/* Add Item Dialog */}
      <AddItemDialog
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        templateId={template.id}
        onSave={() => setShowAddForm(false)}
      />

      {/* Checklist Items */}
      {items.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-300 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-900/50">
          <Text className="text-gray-600 dark:text-gray-400 mb-4">
            Пока нет пунктов.
          </Text>
          <Button
            onClick={() => setShowAddForm(true)}
            color="blue"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Добавить первый пункт
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item: any) => item.key)}
            strategy={verticalListSortingStrategy}
          >
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {items.map((item: any, index: number) => (
                  <SortableCardItem
                    key={item.key}
                    item={item}
                    index={index}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item: any, index: number) => (
                  <SortableListItem
                    key={item.key}
                    item={item}
                    index={index}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      )}

      {/* Add Button (when form is hidden) */}
      {items.length > 0 && (
        <div className="flex justify-center">
          <Button
            onClick={() => setShowAddForm(true)}
            color="blue"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Добавить пункт
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      {editingItem && (
        <EditItemDialog
          isOpen={!!editingItem}
          onClose={cancelEdit}
          item={editingItem}
          templateId={template.id}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
    