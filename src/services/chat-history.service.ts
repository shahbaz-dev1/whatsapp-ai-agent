import { WhatsAppMessage, ChatHistory } from '../types';
import { logger } from '../utils/logger';

/**
 * Chat History Service for managing conversation history
 */
export class ChatHistoryService {
  private chatHistories: Map<string, ChatHistory> = new Map();
  private maxHistoryLength: number;

  constructor(maxHistoryLength: number = 50) {
    this.maxHistoryLength = maxHistoryLength;
    logger.info('Chat History Service initialized', { maxHistoryLength });
  }

  /**
   * Add message to chat history
   */
  addMessage(chatId: string, message: WhatsAppMessage): void {
    try {
      let chatHistory = this.chatHistories.get(chatId);
      
      if (!chatHistory) {
        chatHistory = {
          chatId,
          messages: [],
          lastUpdated: Date.now(),
        };
        this.chatHistories.set(chatId, chatHistory);
      }

      // Add message to history
      chatHistory.messages.push(message);
      
      // Limit history length
      if (chatHistory.messages.length > this.maxHistoryLength) {
        chatHistory.messages = chatHistory.messages.slice(-this.maxHistoryLength);
      }

      chatHistory.lastUpdated = Date.now();

      logger.debug('Message added to chat history', { 
        chatId, 
        messageId: message.id,
        historyLength: chatHistory.messages.length 
      });
    } catch (error) {
      logger.error('Error adding message to chat history', { 
        chatId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Get chat history for a specific chat
   */
  getChatHistory(chatId: string): WhatsAppMessage[] {
    const chatHistory = this.chatHistories.get(chatId);
    return chatHistory ? [...chatHistory.messages] : [];
  }

  /**
   * Get recent messages from chat history
   */
  getRecentMessages(chatId: string, count: number = 10): WhatsAppMessage[] {
    const messages = this.getChatHistory(chatId);
    return messages.slice(-count);
  }

  /**
   * Get conversation context for AI
   */
  getConversationContext(chatId: string, maxMessages: number = 10): WhatsAppMessage[] {
    const messages = this.getChatHistory(chatId);
    return messages.slice(-maxMessages);
  }

  /**
   * Clear chat history for a specific chat
   */
  clearChatHistory(chatId: string): void {
    this.chatHistories.delete(chatId);
    logger.info('Chat history cleared', { chatId });
  }

  /**
   * Get all chat IDs
   */
  getAllChatIds(): string[] {
    return Array.from(this.chatHistories.keys());
  }

  /**
   * Get chat history statistics
   */
  getChatHistoryStats(chatId: string): {
    totalMessages: number;
    lastMessageTime: number | null;
    averageMessageLength: number;
  } {
    const messages = this.getChatHistory(chatId);
    
    if (messages.length === 0) {
      return {
        totalMessages: 0,
        lastMessageTime: null,
        averageMessageLength: 0,
      };
    }

    const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const averageLength = totalLength / messages.length;
    const lastMessageTime = Math.max(...messages.map(msg => msg.timestamp));

    return {
      totalMessages: messages.length,
      lastMessageTime,
      averageMessageLength: Math.round(averageLength),
    };
  }

  /**
   * Search messages in chat history
   */
  searchMessages(chatId: string, query: string): WhatsAppMessage[] {
    const messages = this.getChatHistory(chatId);
    const lowerQuery = query.toLowerCase();
    
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get messages by date range
   */
  getMessagesByDateRange(
    chatId: string, 
    startDate: Date, 
    endDate: Date
  ): WhatsAppMessage[] {
    const messages = this.getChatHistory(chatId);
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    return messages.filter(msg => 
      msg.timestamp >= startTime && msg.timestamp <= endTime
    );
  }

  /**
   * Export chat history to JSON
   */
  exportChatHistory(chatId: string): string | null {
    const chatHistory = this.chatHistories.get(chatId);
    if (!chatHistory) return null;
    
    return JSON.stringify(chatHistory, null, 2);
  }

  /**
   * Import chat history from JSON
   */
  importChatHistory(chatId: string, jsonData: string): boolean {
    try {
      const chatHistory: ChatHistory = JSON.parse(jsonData);
      
      if (chatHistory.chatId !== chatId) {
        logger.error('Chat ID mismatch in imported data');
        return false;
      }
      
      this.chatHistories.set(chatId, chatHistory);
      logger.info('Chat history imported successfully', { chatId });
      return true;
    } catch (error) {
      logger.error('Error importing chat history', { 
        chatId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Get total number of chats
   */
  getTotalChats(): number {
    return this.chatHistories.size;
  }

  /**
   * Get total number of messages across all chats
   */
  getTotalMessages(): number {
    let total = 0;
    for (const chatHistory of this.chatHistories.values()) {
      total += chatHistory.messages.length;
    }
    return total;
  }

  /**
   * Clean up old chat histories (older than specified days)
   */
  cleanupOldHistories(daysOld: number = 30): number {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [chatId, chatHistory] of this.chatHistories.entries()) {
      if (chatHistory.lastUpdated < cutoffTime) {
        this.chatHistories.delete(chatId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('Cleaned up old chat histories', { cleanedCount });
    }
    
    return cleanedCount;
  }
} 