import type { 
  IAIOrchestrator, 
  UUID, 
  AICommandResult, 
  GraphQLQueryResult, 
  AIAdapterConfig 
} from '@repo/datalayer';
import { GQLPTService } from './gqlpt.service.js';

export class AIOrchestratorService implements IAIOrchestrator {
  private gqlptService: GQLPTService;
  private initializedAdapters: Map<string, AIAdapterConfig> = new Map();

  constructor() {
    this.gqlptService = new GQLPTService();
  }

  async run(orgId: UUID, command: string, context?: unknown): Promise<AICommandResult> {
    // Базовая реализация для выполнения AI команд
    // Здесь можно интегрировать другие AI сервисы
    
    try {
      // Простая логика обработки команд
      const commandLower = command.toLowerCase();
      
      if (commandLower.includes('создать') || commandLower.includes('добавить')) {
        return {
          ok: true,
          message: `Команда "${command}" выполнена успешно`,
          affectedIds: [orgId],
          preview: { action: 'create', command, context }
        };
      }
      
      if (commandLower.includes('найти') || commandLower.includes('поиск')) {
        return {
          ok: true,
          message: `Поиск по команде "${command}" выполнен`,
          affectedIds: [],
          preview: { action: 'search', command, context }
        };
      }
      
      return {
        ok: true,
        message: `Команда "${command}" обработана`,
        affectedIds: [orgId],
        preview: { action: 'process', command, context }
      };
    } catch (error) {
      console.error('Ошибка выполнения AI команды:', error);
      return {
        ok: false,
        message: `Ошибка выполнения команды: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        affectedIds: [],
      };
    }
  }

  async generateGraphQLQuery(
    orgId: UUID,
    description: string,
    adapterConfig: AIAdapterConfig,
    schemaContext?: Record<string, any>
  ): Promise<GraphQLQueryResult> {
    try {
      // Проверяем, инициализирован ли адаптер для этой организации
      const adapterKey = `${orgId}-${adapterConfig.type}`;
      
      if (!this.initializedAdapters.has(adapterKey)) {
        await this.gqlptService.initializeAdapter(adapterConfig);
        this.initializedAdapters.set(adapterKey, adapterConfig);
      }

      // Генерируем GraphQL запрос
      const result = await this.gqlptService.generateQuery(description, schemaContext);
      
      return result;
    } catch (error) {
      console.error('Ошибка генерации GraphQL запроса:', error);
      return {
        query: '',
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        description: `Не удалось сгенерировать запрос для: ${description}`,
      };
    }
  }

  async executeGeneratedQuery(
    orgId: UUID,
    query: string,
    variables?: Record<string, any>
  ): Promise<any> {
    try {
      // Здесь можно добавить логику для выполнения запроса
      // Например, через GraphQL gateway или напрямую к subgraph'ам
      
      // Пока возвращаем заглушку с информацией о запросе
      return {
        data: {
          message: 'Запрос успешно выполнен',
          query,
          variables,
          orgId,
          timestamp: new Date().toISOString(),
        },
        success: true,
      };
    } catch (error) {
      console.error('Ошибка выполнения GraphQL запроса:', error);
      throw new Error(`Ошибка выполнения запроса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  getGQLPTService(): GQLPTService {
    return this.gqlptService;
  }

  isAdapterInitialized(orgId: UUID, adapterType: string): boolean {
    const adapterKey = `${orgId}-${adapterType}`;
    return this.initializedAdapters.has(adapterKey);
  }

  getSchema(): string {
    return this.gqlptService.getSchema();
  }
}
