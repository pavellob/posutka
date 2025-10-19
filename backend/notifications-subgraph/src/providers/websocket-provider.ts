import { WebSocketServer, WebSocket } from 'ws';
import { createGraphQLLogger } from '@repo/shared-logger';
import {
  BaseNotificationProvider,
  Channel,
  type NotificationMessage,
  type DeliveryResult,
} from './base-provider.js';

const logger = createGraphQLLogger('websocket-provider');

interface WebSocketClient {
  ws: WebSocket;
  userId?: string;
  orgId?: string;
  subscribedEvents: string[];
}

/**
 * Провайдер для отправки уведомлений через WebSocket (real-time).
 * Реализует GraphQL subscriptions pattern.
 */
export class WebSocketProvider extends BaseNotificationProvider {
  readonly channel = Channel.WEBSOCKET;
  readonly name = 'WebSocket';
  
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  
  constructor(private readonly port: number = 4020) {
    super();
  }
  
  async initialize(): Promise<void> {
    try {
      logger.info(`Initializing WebSocket server on port ${this.port}...`);
      
      this.wss = new WebSocketServer({ port: this.port });
      
      this.wss.on('connection', (ws: WebSocket) => {
        const clientId = this.generateClientId();
        
        logger.info(`New WebSocket client connected: ${clientId}`);
        
        const client: WebSocketClient = {
          ws,
          subscribedEvents: [],
        };
        
        this.clients.set(clientId, client);
        
        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleClientMessage(clientId, message);
          } catch (error) {
            logger.error('Failed to parse client message:', error);
          }
        });
        
        ws.on('close', () => {
          logger.info(`WebSocket client disconnected: ${clientId}`);
          this.clients.delete(clientId);
        });
        
        ws.on('error', (error: Error) => {
          logger.error(`WebSocket error for client ${clientId}:`, error);
        });
        
        // Отправляем приветственное сообщение
        this.sendToClient(ws, {
          type: 'connection_ack',
          clientId,
          message: 'Connected to notifications service',
        });
      });
      
      this.wss.on('error', (error: Error) => {
        logger.error('WebSocket server error:', error);
      });
      
      logger.info(`WebSocket server running on port ${this.port}`);
      
      await super.initialize();
    } catch (error) {
      logger.error('Failed to initialize WebSocket server:', error);
      throw error;
    }
  }
  
  async send(message: NotificationMessage): Promise<DeliveryResult> {
    this.ensureInitialized();
    
    if (!this.wss) {
      return {
        success: false,
        error: 'WebSocket server not initialized',
      };
    }
    
    try {
      const recipientId = message.recipientId;
      let sentCount = 0;
      let failedCount = 0;
      
      // Отправляем всем клиентам, которые подписаны на этого пользователя
      for (const [clientId, client] of this.clients.entries()) {
        if (client.userId === recipientId || client.orgId === recipientId) {
          const sent = this.sendToClient(client.ws, {
            type: 'notification',
            data: {
              id: message.id,
              title: message.title,
              message: message.message,
              priority: message.priority,
              metadata: message.metadata,
              actionUrl: message.actionUrl,
              actionText: message.actionText,
              timestamp: new Date().toISOString(),
            },
          });
          
          if (sent) {
            sentCount++;
          } else {
            failedCount++;
          }
        }
      }
      
      logger.info(`WebSocket notification sent: ${sentCount} delivered, ${failedCount} failed`, {
        notificationId: message.id,
        recipientId,
      });
      
      return {
        success: sentCount > 0,
        deliveredAt: new Date(),
        error: sentCount === 0 ? 'No active WebSocket clients for this recipient' : undefined,
      };
    } catch (error) {
      logger.error('Failed to send WebSocket notification:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async canSend(recipientId: string): Promise<boolean> {
    if (!this.initialized || !this.wss) {
      return false;
    }
    
    // Проверяем, есть ли активные клиенты для этого получателя
    for (const client of this.clients.values()) {
      if (client.userId === recipientId || client.orgId === recipientId) {
        return client.ws.readyState === WebSocket.OPEN;
      }
    }
    
    return false;
  }
  
  async shutdown(): Promise<void> {
    if (this.wss) {
      // Закрываем все соединения
      for (const client of this.clients.values()) {
        client.ws.close();
      }
      this.clients.clear();
      
      // Закрываем сервер
      await new Promise<void>((resolve) => {
        this.wss!.close(() => {
          logger.info('WebSocket server closed');
          resolve();
        });
      });
      
      this.wss = null;
    }
    
    await super.shutdown();
  }
  
  /**
   * Обработка сообщений от клиента (подписки, отписки и т.д.).
   */
  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    switch (message.type) {
      case 'subscribe':
        // Подписка на уведомления пользователя/организации
        if (message.userId) {
          client.userId = message.userId;
          logger.info(`Client ${clientId} subscribed to user ${message.userId}`);
        }
        if (message.orgId) {
          client.orgId = message.orgId;
          logger.info(`Client ${clientId} subscribed to org ${message.orgId}`);
        }
        if (message.events) {
          client.subscribedEvents = message.events;
          logger.info(`Client ${clientId} subscribed to events:`, message.events);
        }
        
        this.sendToClient(client.ws, {
          type: 'subscription_ack',
          userId: client.userId,
          orgId: client.orgId,
          events: client.subscribedEvents,
        });
        break;
      
      case 'unsubscribe':
        client.userId = undefined;
        client.orgId = undefined;
        client.subscribedEvents = [];
        
        this.sendToClient(client.ws, {
          type: 'unsubscription_ack',
        });
        break;
      
      case 'ping':
        this.sendToClient(client.ws, {
          type: 'pong',
          timestamp: Date.now(),
        });
        break;
      
      default:
        logger.warn(`Unknown message type from client ${clientId}:`, message.type);
    }
  }
  
  /**
   * Отправить сообщение клиенту.
   */
  private sendToClient(ws: WebSocket, data: any): boolean {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        logger.error('Failed to send message to WebSocket client:', error);
        return false;
      }
    }
    return false;
  }
  
  /**
   * Генерировать уникальный ID клиента.
   */
  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  
  /**
   * Получить количество активных подключений.
   */
  getActiveConnectionsCount(): number {
    return this.clients.size;
  }
  
  /**
   * Получить список активных клиентов (для отладки).
   */
  getActiveClients(): Array<{ clientId: string; userId?: string; orgId?: string }> {
    return Array.from(this.clients.entries()).map(([clientId, client]) => ({
      clientId,
      userId: client.userId,
      orgId: client.orgId,
    }));
  }
}

