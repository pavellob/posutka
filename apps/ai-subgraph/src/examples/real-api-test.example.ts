/**
 * Тест с реальным OpenAI API ключом
 */

import { AIOrchestratorService } from '../services/ai-orchestrator.service.js';
import type { AIAdapterConfig } from '@repo/datalayer';

async function testWithRealAPI() {
  console.log('🚀 Тестирование AI subgraph с реальным OpenAI API\n');

  // Ваш API ключ
  const OPENAI_API_KEY = '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';

  const orchestrator = new AIOrchestratorService();
  const orgId = '123e4567-e89b-12d3-a456-426614174000';

  try {
    // Тест 1: Обычная AI команда
    console.log('📝 Тест 1: Выполнение AI команды');
    const commandResult = await orchestrator.run(
      orgId,
      'Создать новое бронирование для пользователя Иван',
      { 
        userId: 'user-123', 
        checkIn: '2024-01-15',
        checkOut: '2024-01-20'
      }
    );
    
    console.log('✅ Результат команды:', JSON.stringify(commandResult, null, 2));
    console.log('');

    // Тест 2: Генерация GraphQL запроса с реальным API
    console.log('📝 Тест 2: Генерация GraphQL запроса с OpenAI');
    const queryResult = await orchestrator.generateGraphQLQuery(
      orgId,
      'Найти всех пользователей с именем "Иван" и показать их бронирования',
      {
        type: 'openai',
        apiKey: OPENAI_API_KEY,
        model: 'gpt-4'
      },
      {
        availableTypes: ['User', 'Booking', 'Organization'],
        includeRelations: true
      }
    );
    
    console.log('✅ Результат генерации:', JSON.stringify(queryResult, null, 2));
    console.log('');

    // Тест 3: Выполнение сгенерированного запроса
    if (queryResult.success && queryResult.query) {
      console.log('📝 Тест 3: Выполнение сгенерированного запроса');
      const executionResult = await orchestrator.executeGeneratedQuery(
        orgId,
        queryResult.query,
        queryResult.variables
      );
      
      console.log('✅ Результат выполнения:', JSON.stringify(executionResult, null, 2));
    }

    // Тест 4: Более сложный запрос
    console.log('\n📝 Тест 4: Сложный запрос');
    const complexQueryResult = await orchestrator.generateGraphQLQuery(
      orgId,
      'Показать все бронирования за последний месяц с деталями пользователей и организаций',
      {
        type: 'openai',
        apiKey: OPENAI_API_KEY,
        model: 'gpt-4'
      },
      {
        dateRange: 'last_month',
        includeDetails: true,
        availableTypes: ['Booking', 'User', 'Organization', 'Room']
      }
    );
    
    console.log('✅ Сложный запрос:', JSON.stringify(complexQueryResult, null, 2));

    console.log('\n🎉 Все тесты выполнены успешно!');

  } catch (error) {
    console.error('❌ Ошибка в тесте:', error);
    
    if (error instanceof Error) {
      console.error('Детали ошибки:', error.message);
      console.error('Стек:', error.stack);
    }
  }
}

// Функция для тестирования только генерации запросов
async function testQueryGeneration() {
  console.log('🧪 Тестирование только генерации запросов\n');

  const OPENAI_API_KEY = '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';
  
  const orchestrator = new AIOrchestratorService();
  const orgId = '123e4567-e89b-12d3-a456-426614174000';

  const testQueries = [
    'Найти всех пользователей',
    'Показать бронирования за сегодня',
    'Создать новое бронирование',
    'Найти пользователя по email',
    'Показать статистику бронирований'
  ];

  for (const [index, query] of testQueries.entries()) {
    console.log(`📝 Тест ${index + 1}: "${query}"`);
    
    try {
      const result = await orchestrator.generateGraphQLQuery(
        orgId,
        query,
        {
          type: 'openai',
          apiKey: OPENAI_API_KEY,
          model: 'gpt-4'
        }
      );
      
      console.log(`✅ Результат ${index + 1}:`, {
        success: result.success,
        query: result.query?.substring(0, 100) + '...',
        hasVariables: !!result.variables,
        error: result.error
      });
      
    } catch (error) {
      console.error(`❌ Ошибка в тесте ${index + 1}:`, error);
    }
    
    console.log('');
  }
}

// Запуск тестов
if (import.meta.url === `file://${process.argv[1]}`) {
  const testType = process.argv[2] || 'full';
  
  if (testType === 'queries') {
    testQueryGeneration().catch(console.error);
  } else {
    testWithRealAPI().catch(console.error);
  }
}

export { testWithRealAPI, testQueryGeneration };
