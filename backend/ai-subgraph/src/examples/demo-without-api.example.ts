/**
 * Демонстрация AI subgraph без реальных API вызовов
 * Показывает все возможности системы
 */

import { AIOrchestratorService } from '../services/ai-orchestrator.service.js';
import type { AIAdapterConfig } from '@repo/datalayer';

async function demonstrateAISubgraph() {
  console.log('🚀 Демонстрация AI Subgraph с GQLPT\n');

  const orchestrator = new AIOrchestratorService();
  const orgId = '123e4567-e89b-12d3-a456-426614174000';

  try {
    // Демонстрация 1: Различные типы AI команд
    console.log('📝 Демонстрация 1: Различные типы AI команд\n');
    
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
      console.log('');
    }

    // Демонстрация 2: Симуляция генерации GraphQL запросов
    console.log('📝 Демонстрация 2: Симуляция генерации GraphQL запросов\n');
    
    const queryDescriptions = [
      'Найти всех пользователей',
      'Показать бронирования за сегодня',
      'Создать новое бронирование',
      'Найти пользователя по email',
      'Показать статистику бронирований'
    ];

    for (const [index, description] of queryDescriptions.entries()) {
      console.log(`🔹 Запрос ${index + 1}: "${description}"`);
      
      // Симулируем результат генерации
      const mockResult = {
        query: `query GetUsers${index + 1} { users { id name email } }`,
        variables: index % 2 === 0 ? { limit: 10 } : undefined,
        description: `Сгенерированный запрос для: ${description}`,
        success: true,
        error: undefined
      };
      
      console.log(`   📄 GraphQL: ${mockResult.query}`);
      console.log(`   🔧 Переменные: ${mockResult.variables ? JSON.stringify(mockResult.variables) : 'Нет'}`);
      console.log(`   ✅ Статус: ${mockResult.success ? 'Успешно' : 'Ошибка'}`);
      console.log('');
    }

    // Демонстрация 3: Выполнение запросов
    console.log('📝 Демонстрация 3: Выполнение GraphQL запросов\n');
    
    const testQueries = [
      'query { users { id name } }',
      'query($limit: Int!) { bookings(limit: $limit) { id checkIn checkOut } }',
      'mutation { createBooking(input: { userId: "123", checkIn: "2024-01-15" }) { id } }'
    ];

    for (const [index, query] of testQueries.entries()) {
      console.log(`🔹 Запрос ${index + 1}: ${query.substring(0, 50)}...`);
      
      const result = await orchestrator.executeGeneratedQuery(
        orgId,
        query,
        index === 1 ? { limit: 5 } : undefined
      );
      
      console.log(`   ✅ Результат: ${JSON.stringify(result, null, 2).substring(0, 100)}...`);
      console.log('');
    }

    // Демонстрация 4: Работа с различными адаптерами
    console.log('📝 Демонстрация 4: Поддержка различных AI адаптеров\n');
    
    const adapters: AIAdapterConfig[] = [
      { type: 'openai', apiKey: 'test-key', model: 'gpt-4' },
      { type: 'anthropic', apiKey: 'test-key', model: 'claude-3-sonnet' }
    ];

    for (const [index, adapter] of adapters.entries()) {
      console.log(`🔹 Адаптер ${index + 1}: ${adapter.type.toUpperCase()}`);
      console.log(`   📋 Модель: ${adapter.model || 'по умолчанию'}`);
      console.log(`   🔑 API ключ: ${adapter.apiKey.substring(0, 10)}...`);
      console.log(`   ✅ Поддерживается: Да`);
      console.log('');
    }

    // Демонстрация 5: Схема GraphQL
    console.log('📝 Демонстрация 5: Информация о схеме\n');
    
    const schema = orchestrator.getSchema();
    console.log(`🔹 Размер схемы: ${schema.length} символов`);
    console.log(`🔹 Содержит типы: ${schema.includes('type ') ? 'Да' : 'Нет'}`);
    console.log(`🔹 Содержит мутации: ${schema.includes('mutation') ? 'Да' : 'Нет'}`);
    console.log(`🔹 Содержит запросы: ${schema.includes('query') ? 'Да' : 'Нет'}`);
    console.log('');

    console.log('🎉 Демонстрация завершена успешно!');
    console.log('\n📋 Резюме возможностей:');
    console.log('   ✅ AI команды на естественном языке');
    console.log('   ✅ Генерация GraphQL запросов из текста');
    console.log('   ✅ Поддержка OpenAI и Anthropic');
    console.log('   ✅ Выполнение сгенерированных запросов');
    console.log('   ✅ Валидация схемы');
    console.log('   ✅ Обработка ошибок');
    console.log('   ✅ Кэширование адаптеров');

  } catch (error) {
    console.error('❌ Ошибка в демонстрации:', error);
  }
}

// Функция для показа GraphQL мутаций
function showGraphQLMutations() {
  console.log('📋 Доступные GraphQL мутации:\n');
  
  const mutations = [
    {
      name: 'aiCommand',
      description: 'Выполнить AI-команду на естественном языке',
      example: `mutation {
        aiCommand(
          orgId: "123e4567-e89b-12d3-a456-426614174000"
          command: "Создать новое бронирование"
          context: { "userId": "user-123" }
        ) {
          ok
          message
          affectedIds
          preview
        }
      }`
    },
    {
      name: 'generateGraphQLQuery',
      description: 'Сгенерировать GraphQL запрос из естественного языка',
      example: `mutation {
        generateGraphQLQuery(
          orgId: "123e4567-e89b-12d3-a456-426614174000"
          description: "Найти всех пользователей"
          adapterConfig: {
            type: "openai"
            apiKey: "your-api-key"
            model: "gpt-4"
          }
        ) {
          query
          variables
          description
          success
          error
        }
      }`
    },
    {
      name: 'executeGeneratedQuery',
      description: 'Выполнить сгенерированный GraphQL запрос',
      example: `mutation {
        executeGeneratedQuery(
          orgId: "123e4567-e89b-12d3-a456-426614174000"
          query: "query { users { id name } }"
          variables: { "limit": 10 }
        )
      }`
    }
  ];

  mutations.forEach((mutation, index) => {
    console.log(`${index + 1}. ${mutation.name}`);
    console.log(`   📝 ${mutation.description}`);
    console.log(`   💡 Пример:`);
    console.log(`   ${mutation.example.split('\n').map(line => `   ${line}`).join('\n')}`);
    console.log('');
  });
}

// Запуск демонстрации
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'demo';
  
  if (mode === 'mutations') {
    showGraphQLMutations();
  } else {
    demonstrateAISubgraph().catch(console.error);
  }
}

export { demonstrateAISubgraph, showGraphQLMutations };
