/**
 * Storage Service - библиотека для работы с MinIO хранилищем
 */

export { MinioService, createMinioServiceFromEnv } from './minio.service.js';
export type {
  StorageConfig,
  UploadFileOptions,
  UploadFileResult,
  DeleteFileOptions,
  GetFileUrlOptions,
  GetPresignedPutUrlOptions,
  PresignedPutUrlResult,
} from './types.js';
export {
  getChecklistItemTemplateKey,
  getSubmissionMediaKey,
  getCustomCleaningPhotoKey,
  getExtensionFromMimeType,
  generateFileId,
} from './key-utils.js';

