/**
 * Простой пример использования AI subgraph с GQLPT
 */

import { AIOrchestratorService } from '../services/ai-orchestrator.service.js';
import type { AIAdapterConfig } from '@repo/datalayer';

async function simpleExample() {
  console.log('🚀 Простой пример использования AI subgraph с GQLPT\n');

  // Создаем экземпляр сервиса
  const orchestrator = new AIOrchestratorService();
  const orgId = '123e4567-e89b-12d3-a456-426614174000';

  try {
    // Пример 1: Обычная AI команда
    console.log('📝 Пример 1: Выполнение AI команды');
    const commandResult = await orchestrator.run(
      orgId,
      'Создать новое бронирование для пользователя Иван',
      { userId: 'user-123', checkIn: '2024-01-15' }
    );
    
    console.log('Результат команды:', JSON.stringify(commandResult, null, 2));
    console.log('');

    // Пример 2: Генерация GraphQL запроса (без реального AI)
    console.log('📝 Пример 2: Генерация GraphQL запроса');
    const queryResult = await orchestrator.generateGraphQLQuery(
      orgId,
      'Найти всех пользователей с именем "Иван"',
      {
        type: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4'
      }
    );
    
    console.log('Результат генерации:', JSON.stringify(queryResult, null, 2));
    console.log('');

    // Пример 3: Выполнение запроса
    if (queryResult.success && queryResult.query) {
      console.log('📝 Пример 3: Выполнение сгенерированного запроса');
      const executionResult = await orchestrator.executeGeneratedQuery(
        orgId,
        queryResult.query,
        queryResult.variables
      );
      
      console.log('Результат выполнения:', JSON.stringify(executionResult, null, 2));
    }

    console.log('✅ Все примеры выполнены успешно!');

  } catch (error) {
    console.error('❌ Ошибка в примере:', error);
  }
}

// Запуск примера
if (import.meta.url === `file://${process.argv[1]}`) {
  simpleExample().catch(console.error);
}

export { simpleExample };
