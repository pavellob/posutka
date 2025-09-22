/**
 * Пример использования GQLPT в AI subgraph
 * 
 * Этот файл демонстрирует, как использовать новые мутации
 * для генерации GraphQL запросов из естественного языка.
 */

import { AIOrchestratorService } from '../services/ai-orchestrator.service.js';
import type { AIAdapterConfig } from '@repo/datalayer';

// Пример конфигурации для OpenAI
const openaiConfig: AIAdapterConfig = {
  type: 'openai',
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
  model: 'gpt-4',
};

// Пример конфигурации для Anthropic
const anthropicConfig: AIAdapterConfig = {
  type: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-api-key',
  model: 'claude-3-sonnet-20240229',
};

async function exampleUsage() {
  const orchestrator = new AIOrchestratorService();
  const orgId = '123e4567-e89b-12d3-a456-426614174000';

  console.log('🚀 Пример использования GQLPT в AI subgraph\n');

  try {
    // Пример 1: Генерация простого запроса
    console.log('📝 Пример 1: Генерация простого запроса');
    const simpleQuery = await orchestrator.generateGraphQLQuery(
      orgId,
      'Найти всех пользователей с именем "Иван"',
      openaiConfig
    );
    
    console.log('Результат:', JSON.stringify(simpleQuery, null, 2));
    console.log('');

    // Пример 2: Генерация сложного запроса с контекстом
    console.log('📝 Пример 2: Генерация сложного запроса с контекстом');
    const complexQuery = await orchestrator.generateGraphQLQuery(
      orgId,
      'Показать все бронирования за последний месяц с деталями пользователей',
      anthropicConfig,
      {
        availableTypes: ['Booking', 'User', 'Organization'],
        dateRange: 'last_month',
        includeDetails: true
      }
    );
    
    console.log('Результат:', JSON.stringify(complexQuery, null, 2));
    console.log('');

    // Пример 3: Выполнение сгенерированного запроса
    if (simpleQuery.success && simpleQuery.query) {
      console.log('📝 Пример 3: Выполнение сгенерированного запроса');
      const executionResult = await orchestrator.executeGeneratedQuery(
        orgId,
        simpleQuery.query,
        simpleQuery.variables
      );
      
      console.log('Результат выполнения:', JSON.stringify(executionResult, null, 2));
    }

  } catch (error) {
    console.error('❌ Ошибка в примере:', error);
  }
}

// Пример GraphQL мутаций для использования в клиенте
export const exampleMutations = {
  // Генерация GraphQL запроса
  generateQuery: `
    mutation GenerateGraphQLQuery($orgId: UUID!, $description: String!, $adapterConfig: AIAdapterConfig!) {
      generateGraphQLQuery(
        orgId: $orgId
        description: $description
        adapterConfig: $adapterConfig
      ) {
        query
        variables
        description
        success
        error
      }
    }
  `,

  // Выполнение сгенерированного запроса
  executeQuery: `
    mutation ExecuteGeneratedQuery($orgId: UUID!, $query: String!, $variables: JSON) {
      executeGeneratedQuery(
        orgId: $orgId
        query: $query
        variables: $variables
      )
    }
  `,

  // Обычная AI команда
  aiCommand: `
    mutation AICommand($orgId: UUID!, $command: String!, $context: JSON) {
      aiCommand(
        orgId: $orgId
        command: $command
        context: $context
      ) {
        ok
        message
        affectedIds
        preview
      }
    }
  `
};

// Пример переменных для мутаций
export const exampleVariables = {
  generateQuery: {
    orgId: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Найти всех пользователей с именем "Иван"',
    adapterConfig: {
      type: 'openai',
      apiKey: 'your-api-key',
      model: 'gpt-4'
    }
  },
  
  executeQuery: {
    orgId: '123e4567-e89b-12d3-a456-426614174000',
    query: 'query($name: String!) { users(where: { name: { equals: $name } }) { id name } }',
    variables: { name: 'Иван' }
  },
  
  aiCommand: {
    orgId: '123e4567-e89b-12d3-a456-426614174000',
    command: 'Создать новое бронирование для пользователя Иван',
    context: { userId: 'user-123', checkIn: '2024-01-15', checkOut: '2024-01-20' }
  }
};

// Запуск примера, если файл выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage().catch(console.error);
}
