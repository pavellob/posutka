import { useState } from 'react';
import { graphqlClient } from '@/lib/graphql-client';

export interface PresignedUploadUrl {
  url: string;
  objectKey: string;
  expiresIn: number;
  mimeType?: string;
}

export interface FileUploadProgress {
  file: File;
  objectKey: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

/**
 * Хук для загрузки файлов через presigned PUT URLs
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<FileUploadProgress[]>([]);

  /**
   * Загружает файл напрямую в MinIO через presigned URL
   */
  const uploadFile = async (
    file: File,
    presignedUrl: PresignedUploadUrl,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('PUT', presignedUrl.url);
      xhr.setRequestHeader('Content-Type', presignedUrl.mimeType || file.type || 'application/octet-stream');
      xhr.send(file);
    });
  };

  /**
   * Загружает несколько файлов через presigned URLs
   */
  const uploadFiles = async (
    files: File[],
    presignedUrls: PresignedUploadUrl[],
    onProgress?: (progress: FileUploadProgress[]) => void
  ): Promise<void> => {
    if (files.length !== presignedUrls.length) {
      throw new Error('Files and presigned URLs count must match');
    }

    setUploading(true);
    const progressList: FileUploadProgress[] = files.map((file, index) => ({
      file,
      objectKey: presignedUrls[index].objectKey,
      progress: 0,
      status: 'pending',
    }));
    setProgress(progressList);

    try {
      const uploadPromises = files.map((file, index) => {
        const presignedUrl = presignedUrls[index];
        progressList[index].status = 'uploading';

        return uploadFile(file, presignedUrl, (progressPercent) => {
          progressList[index].progress = progressPercent;
          if (onProgress) {
            // Передаем прогресс с именем файла для отображения
            onProgress([...progressList]);
          }
          setProgress([...progressList]);
        })
          .then(() => {
            progressList[index].status = 'success';
            progressList[index].progress = 100;
            if (onProgress) {
              onProgress([...progressList]);
            }
            setProgress([...progressList]);
          })
          .catch((error) => {
            progressList[index].status = 'error';
            progressList[index].error = error.message;
            if (onProgress) {
              onProgress([...progressList]);
            }
            setProgress([...progressList]);
            throw error;
          });
      });

      await Promise.all(uploadPromises);
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    progress,
    uploadFile,
    uploadFiles,
  };
}

