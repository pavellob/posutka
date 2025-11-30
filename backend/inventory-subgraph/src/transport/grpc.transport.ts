import { createServer } from 'nice-grpc';
import { InventoryGrpcService } from '../grpc/inventory.grpc.service.js';
import type { IDataLayerInventory } from '@repo/datalayer';
import { createGraphQLLogger } from '@repo/shared-logger';
import { InventoryServiceDefinition } from '@repo/grpc-sdk';
// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import type { PrismaClient } from '@prisma/client';

const logger = createGraphQLLogger('grpc-transport');

export class GrpcTransport {
  private server: any = null;
  private isServerRunning = false;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly dl: IDataLayerInventory,
    private readonly prisma: PrismaClient
  ) {}

  async start(): Promise<void> {
    try {
      logger.info('Starting GRPC transport with nice-grpc', { 
        host: this.host, 
        port: this.port 
      });

      // Создаем GRPC сервис с datalayer и Prisma
      const grpcService = new InventoryGrpcService(this.dl, this.prisma);
      
      // Создаем GRPC сервер с использованием сгенерированного определения сервиса
      this.server = createServer();
      
      // Регистрируем сервис с методами
      this.server.add(InventoryServiceDefinition, {
        getProperty: grpcService.GetProperty.bind(grpcService),
        getPropertyByExternalRef: grpcService.GetPropertyByExternalRef.bind(grpcService),
        searchPropertyByAddress: grpcService.SearchPropertyByAddress.bind(grpcService),
        createProperty: grpcService.CreateProperty.bind(grpcService),
        getUnit: grpcService.GetUnit.bind(grpcService),
        getUnitByExternalRef: grpcService.GetUnitByExternalRef.bind(grpcService),
        getUnitsByProperty: grpcService.GetUnitsByProperty.bind(grpcService),
        createUnit: grpcService.CreateUnit.bind(grpcService),
      });
      
      // Запускаем сервер
      await this.server.listen(`${this.host}:${this.port}`);
      
      this.isServerRunning = true;
      logger.info(`GRPC server started on ${this.host}:${this.port}`);
    } catch (error: any) {
      logger.error('Failed to start GRPC transport', { error: error.message });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.server && this.isServerRunning) {
      logger.info('Stopping GRPC transport');
      
      await this.server.shutdown();
      this.isServerRunning = false;
      this.server = null;
      logger.info('GRPC transport stopped');
    }
  }

  isRunning(): boolean {
    return this.isServerRunning;
  }
}

