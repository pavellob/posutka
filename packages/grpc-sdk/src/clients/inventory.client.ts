import { createChannel, createClient } from 'nice-grpc';
import { InventoryServiceDefinition } from '../generated/inventory.js';
import type { 
  GetPropertyRequest,
  GetPropertyByExternalRefRequest,
  SearchPropertyByAddressRequest,
  CreatePropertyRequest,
  GetUnitRequest,
  GetUnitByExternalRefRequest,
  GetUnitsByPropertyRequest,
  CreateUnitRequest,
  PropertyResponse,
  UnitResponse,
  UnitsResponse,
  PropertiesResponse
} from '../generated/inventory.js';

export interface InventoryGrpcClientConfig {
  host: string;
  port: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export class InventoryGrpcClient {
  private client: any;
  private channel: any;
  private isConnected = false;

  constructor(private readonly config: InventoryGrpcClientConfig) {}

  async connect(): Promise<void> {
    try {
      const address = `${this.config.host}:${this.config.port}`;
      this.channel = createChannel(address);
      this.client = createClient(InventoryServiceDefinition, this.channel);
      this.isConnected = true;
    } catch (error) {
      throw new Error(`Failed to connect to inventory gRPC server: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      this.channel.close();
      this.isConnected = false;
    }
  }

  // Property методы
  async getProperty(request: GetPropertyRequest): Promise<PropertyResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.getProperty(request);
  }

  async getPropertyByExternalRef(request: GetPropertyByExternalRefRequest): Promise<PropertyResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.getPropertyByExternalRef(request);
  }

  async searchPropertyByAddress(request: SearchPropertyByAddressRequest): Promise<PropertiesResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.searchPropertyByAddress(request);
  }

  async createProperty(request: CreatePropertyRequest): Promise<PropertyResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.createProperty(request);
  }

  // Unit методы
  async getUnit(request: GetUnitRequest): Promise<UnitResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.getUnit(request);
  }

  async getUnitByExternalRef(request: GetUnitByExternalRefRequest): Promise<UnitResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.getUnitByExternalRef(request);
  }

  async getUnitsByProperty(request: GetUnitsByPropertyRequest): Promise<UnitsResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.getUnitsByProperty(request);
  }

  async createUnit(request: CreateUnitRequest): Promise<UnitResponse> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    return this.client.createUnit(request);
  }
}

export function createInventoryGrpcClient(config: InventoryGrpcClientConfig): InventoryGrpcClient {
  return new InventoryGrpcClient(config);
}

