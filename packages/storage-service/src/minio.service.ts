import * as Minio from 'minio';
import type { 
  StorageConfig, 
  UploadFileOptions, 
  UploadFileResult, 
  DeleteFileOptions, 
  GetFileUrlOptions,
  GetPresignedPutUrlOptions,
  PresignedPutUrlResult,
} from './types.js';

// Простой логгер для библиотеки (можно заменить на внешний)
const logger = {
  info: (message: string, data?: any) => console.log(`[MinioService] ${message}`, data || ''),
  error: (message: string, error?: any, data?: any) => console.error(`[MinioService] ${message}`, error || '', data || ''),
  warn: (message: string, data?: any) => console.warn(`[MinioService] ${message}`, data || ''),
};

/**
 * Сервис для работы с MinIO хранилищем файлов
 */
export class MinioService {
  private client: Minio.Client;
  private bucket: string;
  private publicUrl?: string;
  
  constructor(config: StorageConfig) {
    // Парсим endpoint (может быть как host:port, так и URL)
    const endpoint = this.parseEndpoint(config.endpoint);
    
    this.client = new Minio.Client({
      endPoint: endpoint.host,
      port: endpoint.port,
      useSSL: config.useSSL ?? endpoint.isSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      region: config.region,
    });
    
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl;
    
    logger.info('MinioService initialized', {
      endpoint: config.endpoint,
      bucket: this.bucket,
      useSSL: config.useSSL ?? endpoint.isSSL,
    });
    
    // Инициализируем bucket при старте (асинхронно, без блокировки)
    // Если подключение не удается, это не критично - можно будет повторить позже
    this.ensureBucket().catch((error) => {
      logger.warn('Failed to ensure bucket exists on startup (will retry on first use)', {
        error: error.message,
        bucket: this.bucket,
      });
    });
  }
  
  /**
   * Парсит endpoint в host и port
   */
  private parseEndpoint(endpoint: string): { host: string; port: number; isSSL: boolean } {
    // Проверяем наличие протокола
    const isSSL = endpoint.startsWith('https://');
    
    // Убираем протокол если есть
    let cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
    
    // Проверяем есть ли порт
    const parts = cleanEndpoint.split(':');
    
    if (parts.length === 2) {
      const port = parseInt(parts[1], 10);
      if (isNaN(port)) {
        // Если порт невалидный, используем стандартный
        return {
          host: cleanEndpoint,
          port: isSSL ? 443 : 9000,
          isSSL,
        };
      }
      
      return {
        host: parts[0],
        port,
        isSSL,
      };
    }
    
    // Если порта нет, используем стандартный
    return {
      host: cleanEndpoint,
      port: isSSL ? 443 : 9000,
      isSSL,
    };
  }
  
  /**
   * Создает bucket если его нет
   */
  private async ensureBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        logger.info(`Bucket ${this.bucket} created`);
      } else {
        logger.info(`Bucket ${this.bucket} exists`);
      }
    } catch (error: any) {
      // Не бросаем ошибку при инициализации - это может быть временная проблема сети
      // Bucket будет создан при первой попытке загрузки файла
      logger.warn('Failed to ensure bucket exists (will retry on first upload)', {
        error: error.message,
        bucket: this.bucket,
        code: error.code,
      });
      // Не пробрасываем ошибку дальше - это не критично для старта сервиса
    }
  }
  
  /**
   * Загружает файл в хранилище
   */
  async uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
    try {
      const { objectKey, buffer, mimeType, metadata } = options;
      
      const metaData: Record<string, string> = {
        ...metadata,
      };
      
      if (mimeType) {
        metaData['Content-Type'] = mimeType;
      }
      
      const result = await this.client.putObject(
        this.bucket,
        objectKey,
        buffer,
        buffer.length,
        metaData
      );
      
      // Формируем публичный URL
      const url = this.getPublicUrl(objectKey);
      
      logger.info('File uploaded successfully', {
        objectKey,
        bucket: this.bucket,
        size: buffer.length,
        etag: result.etag,
      });
      
      return {
        objectKey,
        url,
        mimeType,
        size: buffer.length,
        etag: result.etag,
      };
    } catch (error) {
      logger.error('Failed to upload file', {
        objectKey: options.objectKey,
        error,
      });
      throw error;
    }
  }
  
  /**
   * Удаляет файл из хранилища
   */
  async deleteFile(options: DeleteFileOptions): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, options.objectKey);
      logger.info('File deleted successfully', {
        objectKey: options.objectKey,
        bucket: this.bucket,
      });
    } catch (error) {
      logger.error('Failed to delete file', {
        objectKey: options.objectKey,
        error,
      });
      throw error;
    }
  }
  
  /**
   * Получает URL для доступа к файлу
   */
  async getFileUrl(options: GetFileUrlOptions): Promise<string> {
    const { objectKey, expiry } = options;
    
    // Если есть публичный URL, используем его
    if (this.publicUrl) {
      return this.getPublicUrl(objectKey);
    }
    
    // Иначе генерируем presigned URL
    try {
      const url = await this.client.presignedGetObject(
        this.bucket,
        objectKey,
        expiry || 7 * 24 * 60 * 60 // 7 дней по умолчанию
      );
      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL', {
        objectKey,
        error,
      });
      throw error;
    }
  }
  
  /**
   * Получает публичный URL для файла
   */
  private getPublicUrl(objectKey: string): string {
    if (this.publicUrl) {
      // Убираем trailing slash если есть
      const baseUrl = this.publicUrl.replace(/\/$/, '');
      // Убираем leading slash у objectKey если есть
      const cleanKey = objectKey.replace(/^\//, '');
      return `${baseUrl}/${cleanKey}`;
    }
    
    // Если нет публичного URL, возвращаем objectKey
    return objectKey;
  }
  
  /**
   * Проверяет существование файла
   */
  async fileExists(objectKey: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, objectKey);
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
  
  /**
   * Получает метаданные файла
   */
  async getFileMetadata(objectKey: string): Promise<{
    size: number;
    etag?: string;
    contentType?: string;
    lastModified?: Date;
  }> {
    try {
      const stat = await this.client.statObject(this.bucket, objectKey);
      return {
        size: stat.size,
        etag: stat.etag,
        contentType: stat.metaData?.['content-type'],
        lastModified: stat.lastModified,
      };
    } catch (error) {
      logger.error('Failed to get file metadata', {
        objectKey,
        error,
      });
      throw error;
    }
  }

  /**
   * Генерирует presigned PUT URL для прямой загрузки файла
   */
  async getPresignedPutUrl(options: GetPresignedPutUrlOptions): Promise<PresignedPutUrlResult> {
    try {
      const { objectKey, mimeType, expiry = 3600, contentLength } = options;

      // presignedPutObject принимает (bucket, objectKey, expiry)
      // Metadata не передается через presigned URL, она устанавливается при PUT запросе
      const url = await this.client.presignedPutObject(
        this.bucket,
        objectKey,
        expiry
      );

      logger.info('Presigned PUT URL generated', {
        objectKey,
        expiry,
        mimeType,
      });

      return {
        url,
        objectKey,
        expiresIn: expiry,
      };
    } catch (error) {
      logger.error('Failed to generate presigned PUT URL', {
        objectKey: options.objectKey,
        error,
      });
      throw error;
    }
  }

  /**
   * Генерирует несколько presigned PUT URLs для мультизагрузки
   */
  async getPresignedPutUrls(
    options: Array<{
      objectKey: string;
      mimeType?: string;
      contentLength?: number;
    }>,
    expiry: number = 3600
  ): Promise<PresignedPutUrlResult[]> {
    return Promise.all(
      options.map(opt => this.getPresignedPutUrl({ ...opt, expiry }))
    );
  }

  /**
   * Проверяет, был ли файл загружен после генерации presigned URL
   * (полезно для валидации после прямой загрузки)
   */
  async verifyFileUploaded(objectKey: string): Promise<boolean> {
    return this.fileExists(objectKey);
  }
}

/**
 * Создает экземпляр MinioService из переменных окружения
 * 
 * Поддерживает стандартные переменные и переменные из addon'ов (например, Northflank)
 */
export function createMinioServiceFromEnv(): MinioService {
  // MINIO_URL имеет приоритет над MINIO_ENDPOINT
  // Также проверяем переменные из addon'ов (обычно они имеют префикс или содержат _HOST/_PORT)
  const endpoint = 
    process.env.MINIO_URL || 
    process.env.MINIO_ENDPOINT || 
    (process.env.MINIO_HOST && process.env.MINIO_PORT ? `${process.env.MINIO_HOST}:${process.env.MINIO_PORT}` : '') ||
    '';
  
  // Access Key может быть в разных переменных (из addon'ов обычно MINIO_ROOT_USER или MINIO_ACCESS_KEY_ID)
  const accessKey = 
    process.env.MINIO_ACCESS_KEY || 
    process.env.MINIO_ACCESS_KEY_ID ||
    process.env.MINIO_ROOT_USER ||
    process.env.MINIO_USERNAME ||
    '';
  
  // Secret Key может быть в разных переменных (из addon'ов обычно MINIO_ROOT_PASSWORD или MINIO_SECRET_ACCESS_KEY)
  const secretKey = 
    process.env.MINIO_SECRET_KEY || 
    process.env.MINIO_SECRET_ACCESS_KEY ||
    process.env.MINIO_ROOT_PASSWORD ||
    process.env.MINIO_PASSWORD ||
    '';
  
  const bucket = process.env.MINIO_BUCKET || 'posutka';
  
  // Определяем SSL автоматически из URL или используем переменную
  const useSSL = 
    endpoint.startsWith('https://') ||
    process.env.MINIO_USE_SSL === 'true' || 
    process.env.MINIO_USE_SSL === '1' ||
    process.env.MINIO_TLS === 'true';
  
  const publicUrl = process.env.MINIO_PUBLIC_URL;
  const region = process.env.MINIO_REGION;
  
  if (!endpoint || !accessKey || !secretKey) {
    throw new Error(
      'MinIO configuration is missing.\n' +
      'Required variables:\n' +
      '  - MINIO_URL or MINIO_ENDPOINT (or MINIO_HOST + MINIO_PORT)\n' +
      '  - MINIO_ACCESS_KEY or MINIO_ACCESS_KEY_ID or MINIO_ROOT_USER\n' +
      '  - MINIO_SECRET_KEY or MINIO_SECRET_ACCESS_KEY or MINIO_ROOT_PASSWORD\n\n' +
      'Available environment variables:\n' +
      Object.keys(process.env)
        .map(key => `  - ${key}`)
        .join('\n') || '  (none found)'
    );
  }
  
  return new MinioService({
    endpoint,
    accessKey,
    secretKey,
    bucket,
    useSSL,
    publicUrl,
    region,
  });
}

