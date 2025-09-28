// Утилиты для работы с JWT токенами

/**
 * Проверяет, истек ли JWT токен
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true; // Считаем токен недействительным при ошибке парсинга
  }
}

/**
 * Получает время истечения токена в миллисекундах
 */
export function getTokenExpirationTime(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Конвертируем в миллисекунды
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
}

/**
 * Проверяет, нужно ли обновить токен (за 5 минут до истечения)
 */
export function shouldRefreshToken(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = payload.exp;
    const timeUntilExpiry = expirationTime - currentTime;
    
    // Обновляем токен за 5 минут до истечения
    return timeUntilExpiry < 300; // 300 секунд = 5 минут
  } catch (error) {
    console.error('Error parsing token:', error);
    return true; // Считаем, что нужно обновить при ошибке
  }
}

/**
 * Получает информацию о токене
 */
export function getTokenInfo(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.userId,
      email: payload.email,
      exp: payload.exp,
      iat: payload.iat,
      isExpired: isTokenExpired(token),
      shouldRefresh: shouldRefreshToken(token)
    };
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
}
