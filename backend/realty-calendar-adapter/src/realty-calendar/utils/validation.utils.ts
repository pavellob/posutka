import { z, ZodError } from 'zod';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('validation-utils');

/**
 * Безопасная валидация с логированием ошибок
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): { success: true; data: T } | { success: false; error: string; details?: ZodError['errors'] } {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errorMessage = result.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      
      logger.warn('Validation failed', {
        context,
        errors: result.error.errors,
      });
      
      return {
        success: false,
        error: errorMessage,
        details: result.error.errors,
      };
    }
  } catch (error: any) {
    logger.error('Unexpected validation error', {
      context,
      error: error.message,
    });
    
    return {
      success: false,
      error: error.message || 'Validation failed',
    };
  }
}

/**
 * Форматирует ошибки Zod для пользователя
 */
export function formatZodError(error: ZodError): string {
  return error.errors
    .map(e => {
      const path = e.path.length > 0 ? e.path.join('.') : 'root';
      return `${path}: ${e.message}`;
    })
    .join('; ');
}

