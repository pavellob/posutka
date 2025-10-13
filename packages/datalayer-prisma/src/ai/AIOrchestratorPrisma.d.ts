import { PrismaClient } from '@prisma/client';
import type { IAIOrchestrator, AICommandResult, GraphQLQueryResult, AIAdapterConfig, UUID } from '@repo/datalayer';
export declare class AIOrchestratorPrisma implements IAIOrchestrator {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    run(orgId: string, command: string, context?: unknown): Promise<AICommandResult>;
    private handleCreateBooking;
    private handleShowBookings;
    private handleCreateInvoice;
    private handleShowStats;
    generateGraphQLQuery(orgId: UUID, description: string, adapterConfig: AIAdapterConfig, schemaContext?: Record<string, any>): Promise<GraphQLQueryResult>;
    executeGeneratedQuery(orgId: UUID, query: string, variables?: Record<string, any>): Promise<any>;
}
