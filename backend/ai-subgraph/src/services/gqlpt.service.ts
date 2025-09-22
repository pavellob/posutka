import { GQLPTClient } from 'gqlpt';
import { AdapterOpenAI } from '@gqlpt/adapter-openai';
import { AdapterAnthropic } from '@gqlpt/adapter-anthropic';
import { buildSchema, printSchema } from 'graphql';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface AIAdapterConfig {
  type: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
}

export interface GraphQLQueryResult {
  query: string;
  variables?: Record<string, any>;
  description?: string;
  success: boolean;
  error?: string;
}

export class GQLPTService {
  private client: GQLPTClient | null = null;
  private schema: string;

  constructor() {
    // Загружаем схему из supergraph
    this.schema = this.loadSupergraphSchema();
  }

  private loadSupergraphSchema(): string {
    try {
      const schemaPath = join(process.cwd(), '../../gateway-mesh/supergraph.graphql');
      return readFileSync(schemaPath, 'utf-8');
    } catch (error) {
      console.warn('Не удалось загрузить supergraph схему, используем базовую схему');
      return `
        type Query {
          _empty: Boolean
        }
        type Mutation {
          _empty: Boolean
        }
      `;
    }
  }

  async initializeAdapter(config: AIAdapterConfig): Promise<void> {
    let adapter;

    switch (config.type) {
      case 'openai':
        adapter = new AdapterOpenAI({
          apiKey: config.apiKey,
        });
        break;
      case 'anthropic':
        adapter = new AdapterAnthropic({
          apiKey: config.apiKey,
        });
        break;
      default:
        throw new Error(`Неподдерживаемый тип адаптера: ${config.type}`);
    }

    this.client = new GQLPTClient({
      typeDefs: this.schema,
      adapter,
    });

    await this.client.connect();
  }

  async generateQuery(
    description: string,
    schemaContext?: Record<string, any>
  ): Promise<GraphQLQueryResult> {
    if (!this.client) {
      throw new Error('GQLPT клиент не инициализирован. Вызовите initializeAdapter() сначала.');
    }

    try {
      // Добавляем контекст схемы к описанию, если предоставлен
      let enhancedDescription = description;
      if (schemaContext) {
        enhancedDescription = `${description}\n\nКонтекст схемы: ${JSON.stringify(schemaContext, null, 2)}`;
      }

      const result = await this.client.generateQueryAndVariables(enhancedDescription);

      return {
        query: result.query,
        variables: result.variables,
        description: `Сгенерированный запрос для: ${description}`,
        success: true,
      };
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

  async executeQuery(
    query: string,
    variables?: Record<string, any>
  ): Promise<any> {
    if (!this.client) {
      throw new Error('GQLPT клиент не инициализирован');
    }

    try {
      // Здесь можно добавить логику для выполнения запроса
      // Пока возвращаем заглушку
      return {
        data: null,
        message: 'Запрос успешно выполнен (заглушка)',
        query,
        variables,
      };
    } catch (error) {
      console.error('Ошибка выполнения GraphQL запроса:', error);
      throw error;
    }
  }

  getSchema(): string {
    return this.schema;
  }

  isInitialized(): boolean {
    return this.client !== null;
  }
}
