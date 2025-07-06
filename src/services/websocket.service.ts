import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketMessage, EventType, AppEvent, ConnectionStatus } from '../types';
import { logger } from '../utils/logger';

/**
 * WebSocket Service for real-time communication
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private eventHandlers: Map<EventType, Array<(data: any) => void>> = new Map();

  constructor(private port: number = 8080) {
    logger.info('WebSocket Service initialized', { port });
  }

  /**
   * Initialize WebSocket server
   */
  initialize(): void {
    try {
      this.wss = new WebSocketServer({ port: this.port });
      
      this.wss.on('connection', (ws: WebSocket) => {
        this.handleConnection(ws);
      });

      this.wss.on('error', (error) => {
        logger.error('WebSocket server error', { error: error.message });
      });

      logger.info('WebSocket server started', { port: this.port });
    } catch (error) {
      logger.error('Failed to initialize WebSocket server', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);
    logger.info('New WebSocket client connected', { 
      totalClients: this.clients.size 
    });

    // Send initial connection message
    this.sendToClient(ws, {
      type: 'connection',
      data: { status: 'connected', timestamp: Date.now() },
      timestamp: Date.now(),
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        this.handleClientMessage(ws, message);
      } catch (error) {
        logger.error('Error parsing WebSocket message', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      logger.info('WebSocket client disconnected', { 
        totalClients: this.clients.size 
      });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket client error', { 
        error: error.message 
      });
      this.clients.delete(ws);
    });
  }

  /**
   * Handle incoming client messages
   */
  private handleClientMessage(_ws: WebSocket, message: WebSocketMessage): void {
    logger.debug('Received WebSocket message', { 
      type: message.type, 
      data: message.data 
    });

    switch (message.type) {
      case 'message':
        this.broadcastMessage(message);
        break;
      case 'status':
        this.broadcastStatus(message.data);
        break;
      default:
        logger.warn('Unknown WebSocket message type', { type: message.type });
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Error sending message to client', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastMessage(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          logger.error('Error broadcasting message to client', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }
  }

  /**
   * Broadcast status update
   */
  broadcastStatus(status: any): void {
    const message: WebSocketMessage = {
      type: 'status',
      data: status,
      timestamp: Date.now(),
    };
    
    this.broadcastMessage(message);
  }

  /**
   * Broadcast application event
   */
  broadcastEvent(event: AppEvent): void {
    const message: WebSocketMessage = {
      type: 'message',
      data: event,
      timestamp: Date.now(),
    };
    
    this.broadcastMessage(message);
  }

  /**
   * Add event handler
   */
  onEvent(eventType: EventType, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Emit event to all handlers
   */
  emitEvent(event: AppEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event.data);
        } catch (error) {
          logger.error('Error in event handler', { 
            eventType: event.type, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get server status
   */
  getServerStatus(): {
    isRunning: boolean;
    port: number;
    connectedClients: number;
  } {
    return {
      isRunning: this.wss !== null,
      port: this.port,
      connectedClients: this.clients.size,
    };
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.clients.clear();
      logger.info('WebSocket server closed');
    }
  }

  /**
   * Send connection status update
   */
  sendConnectionStatus(status: ConnectionStatus): void {
    this.broadcastEvent({
      type: EventType.CONNECTION_STATUS_CHANGED,
      data: { status },
      timestamp: Date.now(),
    });
  }

  /**
   * Send message received event
   */
  sendMessageReceived(message: any): void {
    this.broadcastEvent({
      type: EventType.MESSAGE_RECEIVED,
      data: message,
      timestamp: Date.now(),
    });
  }

  /**
   * Send message sent event
   */
  sendMessageSent(message: any): void {
    this.broadcastEvent({
      type: EventType.MESSAGE_SENT,
      data: message,
      timestamp: Date.now(),
    });
  }

  /**
   * Send AI response generated event
   */
  sendAIResponseGenerated(response: any): void {
    this.broadcastEvent({
      type: EventType.AI_RESPONSE_GENERATED,
      data: response,
      timestamp: Date.now(),
    });
  }

  /**
   * Send error event
   */
  sendError(error: any): void {
    this.broadcastEvent({
      type: EventType.ERROR_OCCURRED,
      data: error,
      timestamp: Date.now(),
    });
  }
} 