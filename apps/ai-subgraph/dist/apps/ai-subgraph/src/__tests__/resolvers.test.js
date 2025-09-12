import { describe, it, expect, vi } from 'vitest';
import { resolvers } from '../resolvers/index.js';
describe('AI Subgraph Resolvers', () => {
    const mockOrchestrator = {
        run: vi.fn(),
    };
    const context = {
        orchestrator: mockOrchestrator,
    };
    describe('Mutation.aiCommand', () => {
        it('should call orchestrator.run with correct parameters', async () => {
            const mockResult = {
                ok: true,
                message: 'Test command executed',
                affectedIds: ['test-id-1'],
                preview: { action: 'test' },
            };
            vi.mocked(mockOrchestrator.run).mockResolvedValue(mockResult);
            const result = await resolvers.Mutation.aiCommand(null, {
                orgId: 'org-123',
                command: 'test command',
                context: { test: 'data' },
            }, context);
            expect(mockOrchestrator.run).toHaveBeenCalledWith('org-123', 'test command', { test: 'data' });
            expect(result).toEqual(mockResult);
        });
        it('should handle command without context', async () => {
            const mockResult = {
                ok: true,
                message: 'Command without context',
                affectedIds: [],
                preview: { action: 'no-context' },
            };
            vi.mocked(mockOrchestrator.run).mockResolvedValue(mockResult);
            const result = await resolvers.Mutation.aiCommand(null, {
                orgId: 'org-456',
                command: 'simple command',
            }, context);
            expect(mockOrchestrator.run).toHaveBeenCalledWith('org-456', 'simple command', undefined);
            expect(result).toEqual(mockResult);
        });
        it('should handle orchestrator errors', async () => {
            const error = new Error('Orchestrator failed');
            vi.mocked(mockOrchestrator.run).mockRejectedValue(error);
            await expect(resolvers.Mutation.aiCommand(null, {
                orgId: 'org-789',
                command: 'failing command',
            }, context)).rejects.toThrow('Orchestrator failed');
        });
        it('should handle failed command result', async () => {
            const mockResult = {
                ok: false,
                message: 'Command failed',
                affectedIds: [],
                preview: { error: true },
            };
            vi.mocked(mockOrchestrator.run).mockResolvedValue(mockResult);
            const result = await resolvers.Mutation.aiCommand(null, {
                orgId: 'org-999',
                command: 'failing command',
            }, context);
            expect(result.ok).toBe(false);
            expect(result.message).toBe('Command failed');
        });
    });
});
