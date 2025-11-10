/**
 * Утилиты для формирования ключей объектов в хранилище
 */

/**
 * Формирует ключ для шаблонного фото пункта чек-листа
 */
export function getChecklistItemTemplateKey(
  checklistId: string,
  itemId: string,
  fileId: string,
  extension?: string
): string {
  const ext = extension ? `.${extension.replace(/^\./, '')}` : '';
  return `checklists/${checklistId}/items/${itemId}/templates/${fileId}${ext}`;
}

/**
 * Формирует ключ для фото выполнения пункта чек-листа
 */
export function getSubmissionMediaKey(
  cleaningRunId: string,
  submissionId: string,
  fileId: string,
  extension?: string
): string {
  const ext = extension ? `.${extension.replace(/^\./, '')}` : '';
  return `runs/${cleaningRunId}/submissions/${submissionId}/${fileId}${ext}`;
}

/**
 * Формирует ключ для произвольного фото уборки
 */
export function getCustomCleaningPhotoKey(
  cleaningRunId: string,
  fileId: string,
  extension?: string
): string {
  const ext = extension ? `.${extension.replace(/^\./, '')}` : '';
  return `runs/${cleaningRunId}/custom/${fileId}${ext}`;
}

/**
 * Определяет расширение файла из MIME типа
 */
export function getExtensionFromMimeType(mimeType: string): string | undefined {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'application/pdf': 'pdf',
  };
  
  return mimeToExt[mimeType.toLowerCase()];
}

/**
 * Генерирует уникальный ID для файла
 */
export function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

