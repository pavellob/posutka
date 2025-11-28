'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from './button';
import { Text } from './text';
import { useFileUpload, type PresignedUploadUrl } from '@/hooks/useFileUpload';

interface FileUploadProps {
  /** Получить presigned URLs для загрузки */
  onGetPresignedUrls: (files: File[]) => Promise<PresignedUploadUrl[]>;
  /** Подтвердить загрузку файлов */
  onConfirmUploads: (objectKeys: string[], files: File[], captions: string[]) => Promise<void>;
  /** Максимальное количество файлов */
  maxFiles?: number;
  /** Принимаемые типы файлов */
  accept?: string;
  /** Множественный выбор */
  multiple?: boolean;
  /** Callback при успешной загрузке */
  onUploadSuccess?: (files: File[]) => void;
  /** Callback при ошибке */
  onUploadError?: (error: Error) => void;
  /** Подписи к файлам */
  captions?: string[];
  /** Автоматическая загрузка при выборе файлов */
  autoUpload?: boolean;
}

export function FileUpload({
  onGetPresignedUrls,
  onConfirmUploads,
  maxFiles = 10,
  accept = 'image/*,video/*',
  multiple = true,
  onUploadSuccess,
  onUploadError,
  autoUpload = true,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileCaptions, setFileCaptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles } = useFileUpload();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxFiles - selectedFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);

    // Очищаем input для возможности повторной загрузки того же файла
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Если включена автоматическая загрузка, загружаем сразу
    if (autoUpload) {
      setUploading(true);
      try {
        // 1. Получаем presigned URLs
        const presignedUrls = await onGetPresignedUrls(filesToAdd);

        // 2. Если presigned URLs пустые, просто сохраняем файлы (для последующей загрузки)
        if (presignedUrls.length === 0 || presignedUrls.every(url => !url.url)) {
          const emptyObjectKeys = new Array(filesToAdd.length).fill('');
          await onConfirmUploads(emptyObjectKeys, filesToAdd, new Array(filesToAdd.length).fill(''));
          if (onUploadSuccess) {
            onUploadSuccess(filesToAdd);
          }
          return;
        }

        if (presignedUrls.length !== filesToAdd.length) {
          const error = new Error(
            `Presigned URL mismatch: expected ${filesToAdd.length}, received ${presignedUrls.length}`
          );
          console.error(error);
          if (onUploadError) {
            onUploadError(error);
          }
          return;
        }

        // 3. Загружаем файлы напрямую в MinIO
        await uploadFiles(filesToAdd, presignedUrls, (progressList) => {
          const progressMap: Record<string, number> = {};
          progressList.forEach((p) => {
            progressMap[p.file.name] = p.progress;
          });
          setUploadProgress(progressMap);
        });

        // 4. Подтверждаем загрузку в БД
        const objectKeys = presignedUrls.map((url) => url.objectKey);
        await onConfirmUploads(objectKeys, filesToAdd, new Array(filesToAdd.length).fill(''));

        setUploadProgress({});

        if (onUploadSuccess) {
          onUploadSuccess(filesToAdd);
        }
      } catch (error) {
        console.error('Upload error:', error);
        if (onUploadError) {
          onUploadError(error as Error);
        }
      } finally {
        setUploading(false);
      }
    } else {
      // Если автоматическая загрузка отключена, добавляем файлы в список
      setSelectedFiles((prev) => [...prev, ...filesToAdd]);
      setFileCaptions((prev) => [...prev, ...new Array(filesToAdd.length).fill('')]);
    }
  }, [selectedFiles.length, maxFiles, autoUpload, onGetPresignedUrls, onConfirmUploads, uploadFiles, onUploadSuccess, onUploadError]);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileCaptions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCaptionChange = useCallback((index: number, caption: string) => {
    setFileCaptions((prev) => {
      const newCaptions = [...prev];
      newCaptions[index] = caption;
      return newCaptions;
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    const filesToUpload = [...selectedFiles];

    setUploading(true);
    try {
      // 1. Получаем presigned URLs
      const presignedUrls = await onGetPresignedUrls(filesToUpload);

      // 2. Если presigned URLs пустые, просто сохраняем файлы (для последующей загрузки)
      if (presignedUrls.length === 0 || presignedUrls.every(url => !url.url)) {
        const emptyObjectKeys = new Array(filesToUpload.length).fill('');
        await onConfirmUploads(emptyObjectKeys, filesToUpload, fileCaptions);
        setSelectedFiles([]);
        setFileCaptions([]);
        setUploadProgress({});
        if (onUploadSuccess) {
          onUploadSuccess(filesToUpload);
        }
        return;
      }

      if (presignedUrls.length !== filesToUpload.length) {
        const error = new Error(
          `Presigned URL mismatch: expected ${filesToUpload.length}, received ${presignedUrls.length}`
        );
        console.error(error);
        if (onUploadError) {
          onUploadError(error);
        }
        return;
      }

      // 3. Загружаем файлы напрямую в MinIO
      await uploadFiles(filesToUpload, presignedUrls, (progressList) => {
        const progressMap: Record<string, number> = {};
        progressList.forEach((p) => {
          // Используем имя файла как ключ для отображения прогресса
          progressMap[p.file.name] = p.progress;
        });
        setUploadProgress(progressMap);
      });

      // 4. Подтверждаем загрузку в БД
      const objectKeys = presignedUrls.map((url) => url.objectKey);
      await onConfirmUploads(objectKeys, filesToUpload, fileCaptions);

      // 4. Очищаем состояние
      setSelectedFiles([]);
      setFileCaptions([]);
      setUploadProgress({});

      if (onUploadSuccess) {
        onUploadSuccess(filesToUpload);
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (onUploadError) {
        onUploadError(error as Error);
      }
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, fileCaptions, onGetPresignedUrls, onConfirmUploads, uploadFiles, onUploadSuccess, onUploadError]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const remainingSlots = maxFiles - selectedFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);

    // Если включена автоматическая загрузка, загружаем сразу
    if (autoUpload) {
      setUploading(true);
      setUploadingFiles(filesToAdd);
      setUploadProgress({});
      try {
        // 1. Получаем presigned URLs
        const presignedUrls = await onGetPresignedUrls(filesToAdd);

        // 2. Если presigned URLs пустые, просто сохраняем файлы (для последующей загрузки)
        if (presignedUrls.length === 0 || presignedUrls.every(url => !url.url)) {
          const emptyObjectKeys = new Array(filesToAdd.length).fill('');
          await onConfirmUploads(emptyObjectKeys, filesToAdd, new Array(filesToAdd.length).fill(''));
          if (onUploadSuccess) {
            onUploadSuccess(filesToAdd);
          }
          setUploadingFiles([]);
          setUploadProgress({});
          return;
        }

        if (presignedUrls.length !== filesToAdd.length) {
          const error = new Error(
            `Presigned URL mismatch: expected ${filesToAdd.length}, received ${presignedUrls.length}`
          );
          console.error(error);
          if (onUploadError) {
            onUploadError(error);
          }
          setUploadingFiles([]);
          setUploadProgress({});
          return;
        }

        // 3. Загружаем файлы напрямую в MinIO
        await uploadFiles(filesToAdd, presignedUrls, (progressList) => {
          const progressMap: Record<string, number> = {};
          progressList.forEach((p) => {
            progressMap[p.file.name] = p.progress;
          });
          setUploadProgress(progressMap);
        });

        // 4. Подтверждаем загрузку в БД
        const objectKeys = presignedUrls.map((url) => url.objectKey);
        await onConfirmUploads(objectKeys, filesToAdd, new Array(filesToAdd.length).fill(''));

        setUploadingFiles([]);
        setUploadProgress({});

        if (onUploadSuccess) {
          onUploadSuccess(filesToAdd);
        }
      } catch (error) {
        console.error('Upload error:', error);
        if (onUploadError) {
          onUploadError(error as Error);
        }
        setUploadingFiles([]);
        setUploadProgress({});
      } finally {
        setUploading(false);
      }
    } else {
      // Если автоматическая загрузка отключена, добавляем файлы в список
      setSelectedFiles((prev) => [...prev, ...filesToAdd]);
      setFileCaptions((prev) => [...prev, ...new Array(filesToAdd.length).fill('')]);
    }
  }, [selectedFiles.length, maxFiles, autoUpload, onGetPresignedUrls, onConfirmUploads, uploadFiles, onUploadSuccess, onUploadError]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div
        className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer touch-manipulation"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          // Добавляем capture для мобильных устройств
          capture={accept.includes('image') ? 'environment' : undefined}
        />
        <Text className="text-gray-600 dark:text-gray-400">
          {typeof window !== 'undefined' && 'ontouchstart' in window
            ? 'Нажмите для выбора фото (загрузка автоматическая)'
            : 'Перетащите файлы сюда или нажмите для выбора (загрузка автоматическая)'}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          {accept === 'image/*,video/*' ? 'Изображения и видео' : accept}
        </Text>
        {maxFiles && (
          <Text className="text-xs text-gray-500 dark:text-gray-500">
            Максимум {maxFiles} файлов
          </Text>
        )}
      </div>

      {/* Selected Files - показываем только если автоматическая загрузка отключена */}
      {!autoUpload && selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg"
            >
              <div className="flex-1">
                <Text className="text-sm font-medium">{file.name}</Text>
                <Text className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </Text>
                {uploading && uploadProgress[file.name] !== undefined && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress[file.name] || 0}%` }}
                      />
                    </div>
                    <Text className="text-xs text-gray-500 mt-1">
                      {Math.round(uploadProgress[file.name] || 0)}%
                    </Text>
                  </div>
                )}
                <input
                  type="text"
                  value={fileCaptions[index] || ''}
                  onChange={(e) => handleCaptionChange(index, e.target.value)}
                  placeholder="Подпись к фото (опционально)"
                  className="mt-2 w-full px-2 py-1 text-sm border border-gray-300 dark:border-zinc-700 rounded dark:bg-zinc-900"
                  maxLength={200}
                />
              </div>
              <Button
                onClick={() => handleRemoveFile(index)}
                className="text-red-600 hover:text-red-800"
                disabled={uploading}
              >
                Удалить
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Индикатор загрузки при автоматической загрузке */}
      {autoUpload && uploading && uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file, index) => {
            const progress = uploadProgress[file.name] || 0;
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <div className="flex-shrink-0">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <Text className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                    {file.name}
                  </Text>
                  <div className="mt-1">
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <Text className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      {progress > 0 ? `${Math.round(progress)}%` : 'Подготовка...'}
                    </Text>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Button - показываем только если автоматическая загрузка отключена */}
      {!autoUpload && selectedFiles.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? 'Загрузка...' : `Загрузить ${selectedFiles.length} файл(ов)`}
        </Button>
      )}
    </div>
  );
}

