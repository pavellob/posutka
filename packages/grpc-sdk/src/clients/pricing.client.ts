import { createChannel, createClient, type Client } from 'nice-grpc';
import { createGraphQLLogger } from '@repo/shared-logger';
import type {
  PricingServiceDefinition,
  CalculateCleaningCostRequest,
  CalculateCleaningCostResponse,
} from '../generated/pricing.js';
import { 
  PricingServiceDefinition as PricingServiceDef,
  CoeffMode,
} from '../generated/pricing.js';

const logger = createGraphQLLogger('grpc-pricing-client');

export interface CalculateCleaningCostParams {
  unitId: string;
  difficulty?: number; // 0..5
  mode?: 'BASIC' | 'INCREASED';
}

export class PricingGrpcClient {
  private client: Client<PricingServiceDefinition> | null = null;
  private isConnected = false;
  private readonly host: string;
  private readonly port: number;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;
  private readonly timeout: number;

  constructor(config: {
    host: string;
    port: number;
    retryAttempts?: number;
    retryDelay?: number;
    timeout?: number;
  }) {
    this.host = config.host;
    this.port = config.port;
    this.retryAttempts = config.retryAttempts ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.timeout = config.timeout ?? 10000;
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      const channel = createChannel(`${this.host}:${this.port}`);
      this.client = createClient(PricingServiceDef, channel);
      this.isConnected = true;
      logger.info('Connected to Pricing gRPC server', { host: this.host, port: this.port });
    } catch (error) {
      logger.error('Failed to connect to Pricing gRPC server', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      // nice-grpc doesn't have explicit disconnect, but we can clear the reference
      this.client = null;
      this.isConnected = false;
      logger.info('Disconnected from Pricing gRPC server');
    }
  }

  async CalculateCleaningCost(params: CalculateCleaningCostParams): Promise<CalculateCleaningCostResponse> {
    await this.connect();

    if (!this.client) {
      throw new Error('gRPC client not initialized');
    }

    const request: CalculateCleaningCostRequest = {
      unitId: params.unitId,
      difficulty: params.difficulty !== undefined ? params.difficulty : undefined,
      mode: params.mode === 'INCREASED' ? CoeffMode.COEFF_MODE_INCREASED : CoeffMode.COEFF_MODE_BASIC,
    };

    try {
      logger.debug('Calling calculateCleaningCost', { request });
      const response = await this.client.calculateCleaningCost(request as any);
      logger.debug('calculateCleaningCost response', { response });
      return response;
    } catch (error) {
      logger.error('Error calling calculateCleaningCost', error);
      throw error;
    }
  }
}

// Фабрика для создания клиента
export function createPricingGrpcClient(config: {
  host: string;
  port: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}): PricingGrpcClient {
  return new PricingGrpcClient(config);
}

