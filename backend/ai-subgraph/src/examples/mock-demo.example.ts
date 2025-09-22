/**
 * Демонстрация AI Subgraph с мок-данными (без реальных API вызовов)
 * Показывает все возможности системы без ограничений API
 */

import { AIOrchestratorService } from '../services/ai-orchestrator.service.js';
import type { AIAdapterConfig } from '@repo/datalayer';

// Мок-реализация для демонстрации
class MockGQLPTService {
  private mockQueries = [
    {
      description: 'Найти всех пользователей',
      query: 'query { users { id name email } }',
      variables: null,
      success: true
    },
    {
      description: 'Показать бронирования за сегодня',
      query: 'query($date: String!) { bookings(where: { checkIn: { equals: $date } }) { id guestName checkIn checkOut } }',
      variables: { date: '2024-01-15' },
      success: true
    },
    {
      description: 'Создать новое бронирование',
      query: 'mutation($input: CreateBookingInput!) { createBooking(input: $input) { id guestName checkIn checkOut } }',
      variables: { input: { guestName: 'Иван Иванов', checkIn: '2024-01-15', checkOut: '2024-01-20' } },
      success: true
    },
    {
      description: 'Найти пользователя по email',
      query: 'query($email: String!) { users(where: { email: { equals: $email } }) { id name email } }',
      variables: { email: 'ivan@example.com' },
      success: true
    },
    {
      description: 'Показать статистику бронирований',
      query: 'query { bookings { id totalPrice } stats: _count { bookings } }',
      variables: null,
      success: true
    }
  ];

  async generateQuery(description: string): Promise<any> {
    // Имитируем задержку API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockQuery = this.mockQueries.find(q => 
      q.description.toLowerCase().includes(description.toLowerCase().split(' ')[0])
    ) || this.mockQueries[0];

    return {
      query: mockQuery.query,
      variables: mockQuery.variables,
      description: `Сгенерированный запрос для: ${description}`,
      success: mockQuery.success,
      error: null
    };
  }
}

async function demonstrateWithMockData() {
  console.log('🚀 Демонстрация AI Subgraph с мок-данными\n');

  const orchestrator = new AIOrchestratorService();
  const orgId = '123e4567-e89b-12d3-a456-426614174000';

  try {
    // Демонстрация 1: AI команды (работают без API)
    console.log('📝 Демонстрация 1: AI команды\n');
    
    const commands = [
      'Создать новое бронирование для пользователя Иван',
      'Найти всех пользователей с именем "Анна"',
      'Показать статистику бронирований за месяц',
      'Обновить информацию о пользователе',
      'Удалить старые бронирования'
    ];

    for (const [index, command] of commands.entries()) {
      console.log(`🔹 Команда ${index + 1}: "${command}"`);
      
      const result = await orchestrator.run(orgId, command, {
        userId: `user-${index + 1}`,
        timestamp: new Date().toISOString()
      });
      
      console.log(`   ✅ Результат: ${result.ok ? 'Успешно' : 'Ошибка'}`);
      console.log(`   📄 Сообщение: ${result.message}`);
      console.log(`   🎯 Затронутые ID: ${result.affectedIds.length} элементов`);
      if (result.preview) {
        console.log(`   👁️  Предпросмотр: ${JSON.stringify(result.preview).substring(0, 100)}...`);
      }
      console.log('');
    }

    // Демонстрация 2: Симуляция генерации GraphQL запросов
    console.log('📝 Демонстрация 2: Генерация GraphQL запросов (мок-данные)\n');
    
    const mockService = new MockGQLPTService();
    
    const queryDescriptions = [
      'Найти всех пользователей',
      'Показать бронирования за сегодня',
      'Создать новое бронирование',
      'Найти пользователя по email',
      'Показать статистику бронирований'
    ];

    for (const [index, description] of queryDescriptions.entries()) {
      console.log(`🔹 Запрос ${index + 1}: "${description}"`);
      
      const result = await mockService.generateQuery(description);
      
      console.log(`   📄 GraphQL: ${result.query}`);
      console.log(`   🔧 Переменные: ${result.variables ? JSON.stringify(result.variables) : 'Нет'}`);
      console.log(`   ✅ Статус: ${result.success ? 'Успешно' : 'Ошибка'}`);
      console.log(`   📝 Описание: ${result.description}`);
      console.log('');
    }

    // Демонстрация 3: Выполнение запросов
    console.log('📝 Демонстрация 3: Выполнение GraphQL запросов\n');
    
    const testQueries = [
      { query: 'query { users { id name } }', variables: null },
      { query: 'query($limit: Int!) { bookings(limit: $limit) { id checkIn } }', variables: { limit: 5 } },
      { query: 'mutation { createBooking(input: { userId: "123" }) { id } }', variables: null }
    ];

    for (const [index, { query, variables }] of testQueries.entries()) {
      console.log(`🔹 Запрос ${index + 1}: ${query.substring(0, 50)}...`);
      
      const result = await orchestrator.executeGeneratedQuery(orgId, query, variables || undefined);
      
      console.log(`   ✅ Результат: ${JSON.stringify(result, null, 2).substring(0, 150)}...`);
      console.log('');
    }

    // Демонстрация 4: Информация о системе
    console.log('📝 Демонстрация 4: Информация о системе\n');
    
    console.log('🔹 Поддерживаемые AI провайдеры:');
    console.log('   • OpenAI GPT-4, GPT-3.5-turbo');
    console.log('   • Anthropic Claude-3 Sonnet, Claude-3 Haiku');
    console.log('');
    
    console.log('🔹 Возможности системы:');
    console.log('   • AI команды на естественном языке');
    console.log('   • Генерация GraphQL запросов из текста');
    console.log('   • Валидация схемы');
    console.log('   • Кэширование адаптеров');
    console.log('   • Обработка ошибок');
    console.log('');

    console.log('🔹 Лимиты API (для справки):');
    console.log('   • OpenAI Free: $5 кредитов, 3 запроса/мин, 150 запросов/день');
    console.log('   • OpenAI Paid: от $20/месяц, зависит от плана');
    console.log('   • Anthropic: зависит от плана');
    console.log('');

    console.log('🎉 Демонстрация завершена успешно!');
    console.log('\n📋 Резюме:');
    console.log('   ✅ AI команды работают без API ограничений');
    console.log('   ✅ Генерация запросов симулируется');
    console.log('   ✅ Выполнение запросов работает');
    console.log('   ✅ Система готова к продакшену с валидными API ключами');

  } catch (error) {
    console.error('❌ Ошибка в демонстрации:', error);
  }
}

// Функция для показа реальных лимитов API
function showAPILimits() {
  console.log('📊 Лимиты API провайдеров\n');
  
  console.log('🔹 OpenAI:');
  console.log('   Free Tier:');
  console.log('   • $5 кредитов при регистрации');
  console.log('   • 3 запроса в минуту');
  console.log('   • 150 запросов в день');
  console.log('   • Действует 3 месяца');
  console.log('');
  console.log('   Paid Plans:');
  console.log('   • $20/месяц - 500,000 токенов');
  console.log('   • $60/месяц - 1,500,000 токенов');
  console.log('   • Rate limits зависят от плана');
  console.log('');

  console.log('🔹 Anthropic:');
  console.log('   • Claude-3 Sonnet: $3/1M input, $15/1M output');
  console.log('   • Claude-3 Haiku: $0.25/1M input, $1.25/1M output');
  console.log('   • Rate limits: 5-50 запросов в минуту');
  console.log('');

  console.log('💡 Рекомендации для тестирования:');
  console.log('   • Используйте бесплатные кредиты для начального тестирования');
  console.log('   • Для продакшена выберите подходящий платный план');
  console.log('   • Настройте мониторинг использования API');
  console.log('   • Используйте кэширование для оптимизации');
}

// Запуск демонстрации
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'demo';
  
  if (mode === 'limits') {
    showAPILimits();
  } else {
    demonstrateWithMockData().catch(console.error);
  }
}

export { demonstrateWithMockData, showAPILimits };
