/**
 * Типы для работы с хранилищем файлов
 */

export interface StorageConfig {
  /** Endpoint MinIO (например: minio.example.com:9000) */
  endpoint: string;
  /** Access Key */
  accessKey: string;
  /** Secret Key */
  secretKey: string;
  /** Использовать SSL */
  useSSL?: boolean;
  /** Bucket для хранения файлов */
  bucket: string;
  /** URL для доступа к файлам (public URL) */
  publicUrl?: string;
  /** Регион (опционально) */
  region?: string;
}

export interface UploadFileOptions {
  /** Путь к файлу в хранилище */
  objectKey: string;
  /** Buffer файла */
  buffer: Buffer;
  /** MIME тип файла */
  mimeType?: string;
  /** Метаданные файла */
  metadata?: Record<string, string>;
}

export interface UploadFileResult {
  /** Ключ объекта в хранилище */
  objectKey: string;
  /** Публичный URL для доступа к файлу */
  url: string;
  /** MIME тип */
  mimeType?: string;
  /** Размер файла в байтах */
  size: number;
  /** ETag файла */
  etag?: string;
}

export interface DeleteFileOptions {
  /** Ключ объекта для удаления */
  objectKey: string;
}

export interface GetFileUrlOptions {
  /** Ключ объекта */
  objectKey: string;
  /** Время жизни URL в секундах (для presigned URLs) */
  expiry?: number;
}

export interface GetPresignedPutUrlOptions {
  /** Ключ объекта для загрузки */
  objectKey: string;
  /** MIME тип файла */
  mimeType?: string;
  /** Время жизни URL в секундах */
  expiry?: number;
  /** Размер файла в байтах (опционально, для валидации) */
  contentLength?: number;
}

export interface PresignedPutUrlResult {
  /** Presigned PUT URL для загрузки */
  url: string;
  /** Ключ объекта */
  objectKey: string;
  /** Время жизни URL */
  expiresIn: number;
}

