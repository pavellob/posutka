import { describe, it, expect, vi } from 'vitest';
import type { IAIOrchestrator, AICommandResult, GraphQLQueryResult, AIAdapterConfig } from '@repo/datalayer';
import { resolvers } from '../resolvers/index.js';

describe('AI Subgraph Resolvers', () => {
  const mockOrchestrator: IAIOrchestrator = {
    run: vi.fn(),
    generateGraphQLQuery: vi.fn(),
    executeGeneratedQuery: vi.fn(),
  };

  const context = {
    orchestrator: mockOrchestrator,
  };

  describe('Mutation.aiCommand', () => {
    it('should call orchestrator.run with correct parameters', async () => {
      const mockResult: AICommandResult = {
        ok: true,
        message: 'Test command executed',
        affectedIds: ['test-id-1'],
        preview: { action: 'test' },
      };

      vi.mocked(mockOrchestrator.run).mockResolvedValue(mockResult);

      const result = await resolvers.Mutation.aiCommand(
        null,
        {
          orgId: 'org-123',
          command: 'test command',
          context: { test: 'data' },
        },
        context
      );

      expect(mockOrchestrator.run).toHaveBeenCalledWith(
        'org-123',
        'test command',
        { test: 'data' }
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle command without context', async () => {
      const mockResult: AICommandResult = {
        ok: true,
        message: 'Command without context',
        affectedIds: [],
        preview: { action: 'no-context' },
      };

      vi.mocked(mockOrchestrator.run).mockResolvedValue(mockResult);

      const result = await resolvers.Mutation.aiCommand(
        null,
        {
          orgId: 'org-456',
          command: 'simple command',
        },
        context
      );

      expect(mockOrchestrator.run).toHaveBeenCalledWith(
        'org-456',
        'simple command',
        undefined
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle orchestrator errors', async () => {
      const error = new Error('Orchestrator failed');
      vi.mocked(mockOrchestrator.run).mockRejectedValue(error);

      await expect(
        resolvers.Mutation.aiCommand(
          null,
          {
            orgId: 'org-789',
            command: 'failing command',
          },
          context
        )
      ).rejects.toThrow('Orchestrator failed');
    });

    it('should handle failed command result', async () => {
      const mockResult: AICommandResult = {
        ok: false,
        message: 'Command failed',
        affectedIds: [],
        preview: { error: true },
      };

      vi.mocked(mockOrchestrator.run).mockResolvedValue(mockResult);

      const result = await resolvers.Mutation.aiCommand(
        null,
        {
          orgId: 'org-999',
          command: 'failing command',
        },
        context
      );

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Command failed');
    });
  });

  describe('Mutation.generateGraphQLQuery', () => {
    it('should call orchestrator.generateGraphQLQuery with correct parameters', async () => {
      const mockResult: GraphQLQueryResult = {
        query: 'query { test }',
        variables: { test: 'variable' },
        description: 'Test query',
        success: true,
      };

      vi.mocked(mockOrchestrator.generateGraphQLQuery).mockResolvedValue(mockResult);

      const adapterConfig: AIAdapterConfig = {
        type: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };

      const result = await resolvers.Mutation.generateGraphQLQuery(
        null,
        {
          orgId: 'org-123',
          description: 'test description',
          adapterConfig,
          schemaContext: { test: 'schema' },
        },
        context
      );

      expect(mockOrchestrator.generateGraphQLQuery).toHaveBeenCalledWith(
        'org-123',
        'test description',
        adapterConfig,
        { test: 'schema' }
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle failed query generation', async () => {
      const mockResult: GraphQLQueryResult = {
        query: '',
        success: false,
        error: 'Generation failed',
        description: 'Failed to generate query',
      };

      vi.mocked(mockOrchestrator.generateGraphQLQuery).mockResolvedValue(mockResult);

      const adapterConfig: AIAdapterConfig = {
        type: 'anthropic',
        apiKey: 'test-key',
      };

      const result = await resolvers.Mutation.generateGraphQLQuery(
        null,
        {
          orgId: 'org-456',
          description: 'failing description',
          adapterConfig,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Generation failed');
    });
  });

  describe('Mutation.executeGeneratedQuery', () => {
    it('should call orchestrator.executeGeneratedQuery with correct parameters', async () => {
      const mockResult = {
        data: { test: 'result' },
        success: true,
      };

      vi.mocked(mockOrchestrator.executeGeneratedQuery).mockResolvedValue(mockResult);

      const result = await resolvers.Mutation.executeGeneratedQuery(
        null,
        {
          orgId: 'org-123',
          query: 'query { test }',
          variables: { test: 'variable' },
        },
        context
      );

      expect(mockOrchestrator.executeGeneratedQuery).toHaveBeenCalledWith(
        'org-123',
        'query { test }',
        { test: 'variable' }
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle query execution without variables', async () => {
      const mockResult = {
        data: { simple: 'result' },
        success: true,
      };

      vi.mocked(mockOrchestrator.executeGeneratedQuery).mockResolvedValue(mockResult);

      const result = await resolvers.Mutation.executeGeneratedQuery(
        null,
        {
          orgId: 'org-456',
          query: 'query { simple }',
        },
        context
      );

      expect(mockOrchestrator.executeGeneratedQuery).toHaveBeenCalledWith(
        'org-456',
        'query { simple }',
        undefined
      );
      expect(result).toEqual(mockResult);
    });
  });
});
