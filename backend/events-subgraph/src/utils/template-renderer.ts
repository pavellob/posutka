import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('template-renderer');

/**
 * Утилита для рендеринга шаблонов уведомлений с поддержкой переменных и фильтров.
 * 
 * Синтаксис:
 * - {{path.to.value}} - простая подстановка
 * - {{path.to.value|filter}} - с фильтром
 * - {{path.to.value|filter:arg}} - с фильтром и аргументом
 * 
 * Доступные фильтры:
 * - date - форматирование даты (с временем)
 * - time - форматирование только времени (без даты)
 * - currency - форматирование валюты (требует аргумент - код валюты)
 * - gradeLabel - преобразование grade в текст
 * - difficultyLabel - преобразование cleaningDifficulty (D0, D1...) в текстовое описание
 * - default - значение по умолчанию
 * 
 * Для события BOOKING_CREATED доступны следующие поля в payload:
 * - payload.bookingId - ID бронирования
 * - payload.guestName - ФИО гостя
 * - payload.guestPhone - Телефон гостя
 * - payload.guestEmail - Email гостя
 * - payload.checkIn - Дата и время заезда (можно использовать с фильтром date или time)
 * - payload.checkOut - Дата и время выезда (можно использовать с фильтром date или time)
 * - payload.unitAddress - Адрес объекта
 * - payload.unitName - Название объекта
 * - payload.lockCode - Код от замка (последние 4 цифры телефона)
 * - payload.houseRules - Правила проживания (если указаны)
 * - payload.guestsCount - Количество гостей
 */
export class TemplateRenderer {
  /**
   * Рендерит шаблон с подстановкой переменных из контекста
   */
  static render(template: string, context: any): string {
    if (!template) return '';
    
    // Регулярное выражение для поиска {{path.to.value|filter:arg}}
    const regex = /\{\{([^}]+)\}\}/g;
    
    return template.replace(regex, (match, expression) => {
      try {
        const [path, ...filters] = expression.split('|').map((s: string) => s.trim());
        const value = this.getNestedValue(context, path);
        
        // Автоматически добавляем фильтр currency для priceAmount, если он не указан
        if (path.endsWith('priceAmount') && !filters.some((f: string) => f.startsWith('currency'))) {
          filters.push('currency');
        }
        
        // Автоматически добавляем фильтр difficultyLabel для cleaningDifficulty, если он не указан
        if (path.endsWith('cleaningDifficulty') && !filters.some((f: string) => f.startsWith('difficultyLabel'))) {
          filters.push('difficultyLabel');
        }
        
        return this.applyFilters(value, filters, context);
      } catch (error: any) {
        logger.warn('Failed to render template variable', { 
          match, 
          expression, 
          error: error.message 
        });
        return match; // Возвращаем исходный текст при ошибке
      }
    });
  }
  
  /**
   * Получает значение по пути (например, "payload.unitName")
   */
  private static getNestedValue(obj: any, path: string): any {
    if (!path) return undefined;
    
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      return current[key];
    }, obj);
  }
  
  /**
   * Применяет фильтры к значению
   */
  private static applyFilters(value: any, filters: string[], context: any): string {
    let result = value;
    
    for (const filter of filters) {
      if (!filter) continue;
      
      const [filterName, ...args] = filter.split(':').map((s: string) => s.trim());
      
      switch (filterName) {
        case 'date':
          result = this.formatDate(result);
          break;
        case 'time':
          result = this.formatTime(result);
          break;
        case 'currency':
          const currency = args[0] || this.getNestedValue(context, 'payload.priceCurrency') || 'RUB';
          result = this.formatCurrency(result, currency);
          break;
        case 'gradeLabel':
          result = this.formatGrade(result);
          break;
        case 'difficultyLabel':
          result = this.formatDifficulty(result);
          break;
        case 'default':
          result = result ?? args[0] ?? '';
          break;
        default:
          // Неизвестный фильтр - просто возвращаем значение
          break;
      }
    }
    
    return String(result ?? '');
  }
  
  /**
   * Форматирует дату в русский формат
   */
  private static formatDate(value: any): string {
    if (!value) return 'не указана';
    
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return 'не указана';
      
      return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'не указана';
    }
  }

  /**
   * Форматирует только время (без даты)
   */
  private static formatTime(value: any): string {
    if (!value) return 'не указано';
    
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return 'не указано';
      
      return date.toLocaleString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'не указано';
    }
  }
  
  /**
   * Форматирует сумму в валюту
   */
  private static formatCurrency(amount: number | undefined | null, currency: string): string {
    if (!amount && amount !== 0) return '';
    
    try {
      const amountInMainUnit = amount / 100;
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: currency || 'RUB',
        minimumFractionDigits: 0
      }).format(amountInMainUnit);
    } catch (error) {
      return String(amount);
    }
  }
  
  /**
   * Преобразует cleaningDifficulty (D0, D1, D2...) в текстовое описание
   */
  private static formatDifficulty(difficulty: string | number | undefined | null): string {
    if (!difficulty && difficulty !== 0) return '';
    
    // Если пришло число, преобразуем в строку D{number}
    let difficultyStr = String(difficulty);
    if (typeof difficulty === 'number') {
      difficultyStr = `D${difficulty}`;
    }
    
    // Убираем пробелы и приводим к верхнему регистру
    difficultyStr = difficultyStr.trim().toUpperCase();
    
    const difficultyLabels: Record<string, string> = {
      'D0': 'D0 - элементарная',
      'D1': 'D1 - поддерживающая',
      'D2': 'D2 - стандартная',
      'D3': 'D3 - расширенная',
      'D4': 'D4 - сложная',
      'D5': 'D5 - капитальная',
    };
    
    return difficultyLabels[difficultyStr] || difficultyStr;
  }
  
  /**
   * Преобразует grade в текстовое описание
   */
  private static formatGrade(grade: number | undefined | null): string {
    if (grade === undefined || grade === null) return '';
    
    const labels: Record<number, string> = {
      0: 'Маленькая комната',
      1: 'Большая комната',
      2: 'Студия',
      3: 'Большая студия',
      4: 'Однушка',
      5: 'Большая однушка',
      6: 'Двушка',
      7: 'Большая двушка',
      8: 'Трешка',
      9: 'Большая трешка',
      10: '4+ комнат',
    };
    
    return labels[grade] || `Размер ${grade}`;
  }
}

