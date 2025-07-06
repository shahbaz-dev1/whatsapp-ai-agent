import { WhatsAppService } from './whatsapp.service';
import { AIService } from './ai.service';
import { ChatHistoryService } from './chat-history.service';
import { WebSocketService } from './websocket.service';
import { WhatsAppMessage, MessageProcessingResult, ConnectionStatus } from '../types';
import { logger } from '../utils/logger';

/**
 * Main Chatbot Service that orchestrates all components
 */
export class ChatbotService {
  private whatsappService: WhatsAppService;
  private aiService: AIService;
  private chatHistoryService: ChatHistoryService;
  private webSocketService: WebSocketService;
  private isProcessing: boolean = false;
  private responseDelay: number;

  constructor(
    whatsappService: WhatsAppService,
    aiService: AIService,
    chatHistoryService: ChatHistoryService,
    webSocketService: WebSocketService,
    responseDelay: number = 1000
  ) {
    this.whatsappService = whatsappService;
    this.aiService = aiService;
    this.chatHistoryService = chatHistoryService;
    this.webSocketService = webSocketService;
    this.responseDelay = responseDelay;

    this.setupEventHandlers();
    logger.info('Chatbot Service initialized');
  }

  /**
   * Setup event handlers for all services
   */
  private setupEventHandlers(): void {
    // WhatsApp message handler
    this.whatsappService.onMessage((message: WhatsAppMessage) => {
      this.handleIncomingMessage(message);
    });

    // WhatsApp connection status handler
    this.whatsappService.onConnectionStatusChange((status: ConnectionStatus) => {
      this.webSocketService.sendConnectionStatus(status);
      logger.info('WhatsApp connection status changed', { status });
    });
  }

  /**
   * Initialize the chatbot
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing chatbot...');

      // Initialize WebSocket service
      this.webSocketService.initialize();

      // Initialize WhatsApp service
      await this.whatsappService.initialize();

      // Test AI service connection
      const aiConnected = await this.aiService.testConnection();
      if (!aiConnected) {
        throw new Error('AI service connection failed');
      }

      logger.info('Chatbot initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize chatbot', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Handle incoming WhatsApp message
   */
  private async handleIncomingMessage(message: WhatsAppMessage): Promise<void> {
    if (this.isProcessing) {
      logger.warn('Message processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      logger.info('Processing incoming message', { 
        from: message.from, 
        content: message.content.substring(0, 50) 
      });

      // Notify WebSocket clients
      this.webSocketService.sendMessageReceived(message);

      // Add message to chat history
      this.chatHistoryService.addMessage(message.to, message);

      // Process message and generate response
      logger.info('About to process message with AI service');
      const result = await this.processMessage(message);
      logger.info('AI processing result', { success: result.success, hasResponse: !!result.response, error: result.error });

      if (result.success && result.response) {
        // Add delay to simulate human-like response
        await this.delay(this.responseDelay);

        // Send response via WhatsApp
        logger.info('Sending AI response via WhatsApp');
        const sent = await this.whatsappService.sendMessage(message.from, result.response);

        if (sent) {
          // Add bot response to chat history
          const botMessage: WhatsAppMessage = {
            id: `bot-${Date.now()}`,
            from: message.to,
            to: message.from,
            timestamp: Date.now(),
            type: 'text',
            content: result.response,
            isGroup: message.isGroup,
            groupId: message.groupId || undefined,
            senderName: 'AI Assistant',
          };

          this.chatHistoryService.addMessage(message.to, botMessage);
          this.webSocketService.sendMessageSent(botMessage);

          logger.info('Response sent successfully', { 
            to: message.from, 
            responseLength: result.response.length 
          });
        } else {
          logger.error('Failed to send WhatsApp response');
        }
      } else {
        logger.error('Message processing failed', { error: result.error });
        this.webSocketService.sendError({ 
          message: 'Failed to process message', 
          error: result.error 
        });
      }

      const processingTime = Date.now() - startTime;
      logger.info('Message processing completed', { processingTime });

    } catch (error) {
      logger.error('Error processing message', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      this.webSocketService.sendError({ 
        message: 'Error processing message', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process message and generate AI response
   */
  private async processMessage(message: WhatsAppMessage): Promise<MessageProcessingResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting AI message processing');
      
      // Get chat history for context
      const chatHistory = this.chatHistoryService.getConversationContext(message.to);
      logger.info('Retrieved chat history', { historyLength: chatHistory.length });

      // Generate AI response
      logger.info('Calling AI service to generate response');
      const aiResponse = await this.aiService.generateResponse(
        message.content,
        chatHistory
      );
      logger.info('AI response generated successfully', { responseLength: aiResponse.message.length });

      // Notify WebSocket clients about AI response
      this.webSocketService.sendAIResponseGenerated(aiResponse);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        response: aiResponse.message,
        processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error in processMessage', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get chatbot status
   */
  getStatus(): {
    whatsappConnected: boolean;
    aiServiceConnected: boolean;
    webSocketClients: number;
    isProcessing: boolean;
    totalChats: number;
    totalMessages: number;
  } {
    return {
      whatsappConnected: this.whatsappService.isConnected(),
      aiServiceConnected: this.aiService.validateConfig(),
      webSocketClients: this.webSocketService.getConnectedClientsCount(),
      isProcessing: this.isProcessing,
      totalChats: this.chatHistoryService.getTotalChats(),
      totalMessages: this.chatHistoryService.getTotalMessages(),
    };
  }

  /**
   * Send manual message (for testing)
   */
  async sendManualMessage(chatId: string, message: string): Promise<boolean> {
    return await this.whatsappService.sendMessage(chatId, message);
  }

  /**
   * Get chat history for a specific chat
   */
  getChatHistory(chatId: string): WhatsAppMessage[] {
    return this.chatHistoryService.getChatHistory(chatId);
  }

  /**
   * Clear chat history
   */
  clearChatHistory(chatId: string): void {
    this.chatHistoryService.clearChatHistory(chatId);
  }

  /**
   * Search messages in chat history
   */
  searchMessages(chatId: string, query: string): WhatsAppMessage[] {
    return this.chatHistoryService.searchMessages(chatId, query);
  }

  /**
   * Export chat history
   */
  exportChatHistory(chatId: string): string | null {
    return this.chatHistoryService.exportChatHistory(chatId);
  }

  /**
   * Import chat history
   */
  importChatHistory(chatId: string, jsonData: string): boolean {
    return this.chatHistoryService.importChatHistory(chatId, jsonData);
  }

  /**
   * Cleanup old chat histories
   */
  cleanupOldHistories(daysOld: number = 30): number {
    return this.chatHistoryService.cleanupOldHistories(daysOld);
  }

  /**
   * Shutdown chatbot
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down chatbot...');

    try {
      await this.whatsappService.disconnect();
      this.webSocketService.close();
      
      logger.info('Chatbot shutdown completed');
    } catch (error) {
      logger.error('Error during chatbot shutdown', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
} 