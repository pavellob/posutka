# @repo/storage-service

Библиотека для работы с MinIO хранилищем файлов в проекте Posutka.

## Установка

Пакет автоматически доступен через workspace в других пакетах:

```json
{
  "dependencies": {
    "@repo/storage-service": "workspace:*"
  }
}
```

## Использование

### Инициализация из переменных окружения

```typescript
import { createMinioServiceFromEnv } from '@repo/storage-service';

const minioService = createMinioServiceFromEnv();
```

### Инициализация с конфигурацией

```typescript
import { MinioService } from '@repo/storage-service';

const minioService = new MinioService({
  endpoint: 'minio.example.com:9000',
  accessKey: 'your-access-key',
  secretKey: 'your-secret-key',
  bucket: 'posutka',
  useSSL: true,
  publicUrl: 'https://cdn.example.com',
});
```

### Загрузка файла

```typescript
import { Readable } from 'stream';
import { Buffer } from 'buffer';

const fileBuffer = Buffer.from('file content');
const result = await minioService.uploadFile({
  objectKey: 'checklists/123/items/456/templates/789.jpg',
  buffer: fileBuffer,
  mimeType: 'image/jpeg',
  metadata: {
    'custom-header': 'value',
  },
});

console.log('File uploaded:', result.url);
```

### Удаление файла

```typescript
await minioService.deleteFile({
  objectKey: 'checklists/123/items/456/templates/789.jpg',
});
```

### Получение URL файла

```typescript
const url = await minioService.getFileUrl({
  objectKey: 'checklists/123/items/456/templates/789.jpg',
  expiry: 3600, // 1 час
});
```

### Проверка существования файла

```typescript
const exists = await minioService.fileExists('checklists/123/items/456/templates/789.jpg');
```

### Получение метаданных файла

```typescript
const metadata = await minioService.getFileMetadata('checklists/123/items/456/templates/789.jpg');
console.log('Size:', metadata.size);
console.log('Content-Type:', metadata.contentType);
```

### Генерация presigned PUT URL для прямой загрузки

```typescript
// Генерация URL для прямой загрузки с клиента
const presignedUrl = await minioService.getPresignedPutUrl({
  objectKey: 'checklists/123/items/456/templates/789.jpg',
  mimeType: 'image/jpeg',
  expiry: 3600, // 1 час
});

console.log('Presigned PUT URL:', presignedUrl.url);
// Клиент может загрузить файл напрямую на этот URL через PUT запрос

// Генерация нескольких URLs для мультизагрузки
const presignedUrls = await minioService.getPresignedPutUrls([
  { objectKey: 'file1.jpg', mimeType: 'image/jpeg' },
  { objectKey: 'file2.jpg', mimeType: 'image/jpeg' },
], 3600);
```

### Прямая загрузка с клиента (пример)

После получения presigned URL, клиент может загрузить файл напрямую:

```typescript
// На фронтенде/мобильном приложении
const response = await fetch(presignedUrl.url, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': presignedUrl.mimeType || file.type || 'image/jpeg',
  },
});

if (response.ok) {
  // Файл загружен успешно
  // Теперь можно сохранить objectKey в БД через мутацию confirmFileUploads
}
```

## Переменные окружения

- `MINIO_ENDPOINT` или `MINIO_URL` - endpoint MinIO (например: `minio.example.com:9000`)
- `MINIO_ACCESS_KEY` - access key
- `MINIO_SECRET_KEY` - secret key
- `MINIO_BUCKET` - bucket для хранения (по умолчанию: `posutka`)
- `MINIO_USE_SSL` - использовать SSL (`true`/`false`, по умолчанию определяется автоматически)
- `MINIO_PUBLIC_URL` - публичный URL для доступа к файлам (опционально)
- `MINIO_REGION` - регион (опционально)

## Структура ключей объектов

Для чек-листов рекомендуется использовать следующую структуру:

- Шаблонные фото пунктов: `checklists/{checklistId}/items/{itemId}/templates/{uuid}`
- Фото выполнения пункта: `runs/{cleaningRunId}/submissions/{submissionId}/{uuid}`
- Произвольные фото уборки: `runs/{cleaningRunId}/custom/{uuid}`

