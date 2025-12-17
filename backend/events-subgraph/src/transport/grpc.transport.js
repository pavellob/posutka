import { createServer } from 'nice-grpc';
import { createGraphQLLogger } from '@repo/shared-logger';
import { EventsServiceDefinition } from '@repo/grpc-sdk';
import { EventsGrpcService } from '../grpc/events.grpc.service.js';
const logger = createGraphQLLogger('events-grpc-transport');
export class GrpcTransport {
    eventBus;
    prisma;
    server = null;
    host;
    port;
    constructor(eventBus, prisma, host = 'localhost', port = 4113) {
        this.eventBus = eventBus;
        this.prisma = prisma;
        this.host = host;
        this.port = port;
    }
    async start() {
        try {
            logger.info('Starting GRPC transport with nice-grpc', {
                host: this.host,
                port: this.port,
            });
            const eventsService = new EventsGrpcService(this.prisma, this.eventBus);
            this.server = createServer();
            this.server.add(EventsServiceDefinition, {
                publishEvent: eventsService.PublishEvent.bind(eventsService),
                publishBulkEvents: eventsService.PublishBulkEvents.bind(eventsService),
                getEventStatus: eventsService.GetEventStatus.bind(eventsService),
            });
            await this.server.listen(`${this.host}:${this.port}`);
            logger.info('✅ GRPC transport started successfully', {
                host: this.host,
                port: this.port,
            });
        }
        catch (error) {
            logger.error('Failed to start GRPC transport', error);
            throw error;
        }
    }
    async stop() {
        if (this.server) {
            await this.server.shutdown();
            this.server = null;
            logger.info('GRPC transport stopped');
        }
    }
}
