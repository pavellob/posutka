/**
 * Форматирует денежную сумму в читаемый вид
 * @param amount Сумма в копейках/центах
 * @param currency Код валюты
 * @returns Отформатированная строка
 */
export function formatMoney(amount: number, currency: string): string {
  const value = amount / 100 // конвертируем из копеек в рубли/доллары
  
  const formatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  
  return formatter.format(value)
}

/**
 * Форматирует дату в локальном формате
 * @param date Строка даты или объект Date
 * @returns Отформатированная строка
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('ru-RU')
}

/**
 * Форматирует дату и время в локальном формате
 * @param date Строка даты или объект Date
 * @returns Отформатированная строка
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString('ru-RU')
}

/**
 * Вычисляет количество ночей между двумя датами
 * @param checkIn Дата заезда
 * @param checkOut Дата выезда
 * @returns Количество ночей
 */
export function calculateNights(checkIn: string | Date, checkOut: string | Date): number {
  const checkInDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn
  const checkOutDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut
  
  const diffTime = checkOutDate.getTime() - checkInDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Проверяет, является ли дата сегодняшней
 * @param date Дата для проверки
 * @returns true, если дата сегодняшняя
 */
export function isToday(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  
  return dateObj.toDateString() === today.toDateString()
}

/**
 * Проверяет, является ли дата будущей
 * @param date Дата для проверки
 * @returns true, если дата в будущем
 */
export function isFuture(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  
  return dateObj > today
}

/**
 * Проверяет, является ли дата прошедшей
 * @param date Дата для проверки
 * @returns true, если дата в прошлом
 */
export function isPast(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  
  return dateObj < today
}
