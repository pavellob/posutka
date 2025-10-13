import type { UUID } from '@repo/shared/types-only';
export type { UUID };
export interface AICommandResult {
    ok: boolean;
    message?: string;
    affectedIds: string[];
    preview?: unknown;
}
export interface GraphQLQueryResult {
    query: string;
    variables?: Record<string, any>;
    description?: string;
    success: boolean;
    error?: string;
}
export interface AIAdapterConfig {
    type: 'openai' | 'anthropic';
    apiKey: string;
    model?: string;
}
