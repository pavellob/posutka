import { createServer } from 'nice-grpc';
import { OpsGrpcService } from '../grpc/ops.grpc.service.js';
import type { IOpsDL } from '@repo/datalayer';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('grpc-transport');

export class GrpcTransport {
  private server: any = null;
  private isServerRunning = false;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly dl: IOpsDL
  ) {}

  async start(): Promise<void> {
    try {
      logger.info('Starting GRPC transport with nice-grpc', { 
        host: this.host, 
        port: this.port 
      });

      // Создаем GRPC сервис с datalayer
      const grpcService = new OpsGrpcService(this.dl);
      
      // Создаем определение сервиса для nice-grpc
      const OpsServiceDefinition = {
        createCleaningTask: {
          path: '/ops.OpsService/CreateCleaningTask',
          requestStream: false,
          responseStream: false,
          requestSerialize: (value: any) => {
            logger.debug('Serializing request', { value });
            return Buffer.from(JSON.stringify(value));
          },
          requestDeserialize: (value: Buffer) => {
            const str = value.toString();
            const parsed = JSON.parse(str);
            logger.debug('Deserialized request', { str, parsed });
            return parsed;
          },
          responseSerialize: (value: any) => Buffer.from(JSON.stringify(value)),
          responseDeserialize: (value: Buffer) => JSON.parse(value.toString()),
        },
      };
      
      // Создаем GRPC сервер с правильным определением
      this.server = createServer(OpsServiceDefinition);
      
      // Регистрируем методы
      this.server.add(OpsServiceDefinition, {
        createCleaningTask: grpcService.CreateCleaningTask.bind(grpcService),
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
