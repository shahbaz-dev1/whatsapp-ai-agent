import { ChatbotService } from '../services/chatbot.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { AIService } from '../services/ai.service';
import { ChatHistoryService } from '../services/chat-history.service';
import { WebSocketService } from '../services/websocket.service';
import { WhatsAppMessage } from '../types';

// Mock the services
jest.mock('../services/whatsapp.service');
jest.mock('../services/ai.service');
jest.mock('../services/chat-history.service');
jest.mock('../services/websocket.service');

describe('ChatbotService', () => {
  let chatbotService: ChatbotService;
  let mockWhatsAppService: jest.Mocked<WhatsAppService>;
  let mockAIService: jest.Mocked<AIService>;
  let mockChatHistoryService: jest.Mocked<ChatHistoryService>;
  let mockWebSocketService: jest.Mocked<WebSocketService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockWhatsAppService = new WhatsAppService() as jest.Mocked<WhatsAppService>;
    mockAIService = new AIService({} as any) as jest.Mocked<AIService>;
    mockChatHistoryService = new ChatHistoryService() as jest.Mocked<ChatHistoryService>;
    mockWebSocketService = new WebSocketService() as jest.Mocked<WebSocketService>;

    // Setup default mock implementations
    mockWhatsAppService.onMessage = jest.fn();
    mockWhatsAppService.onConnectionStatusChange = jest.fn();
    mockWhatsAppService.isConnected = jest.fn().mockReturnValue(true);
    mockAIService.validateConfig = jest.fn().mockReturnValue(true);
    mockWebSocketService.getConnectedClientsCount = jest.fn().mockReturnValue(0);
    mockChatHistoryService.getTotalChats = jest.fn().mockReturnValue(0);
    mockChatHistoryService.getTotalMessages = jest.fn().mockReturnValue(0);

    // Create chatbot service instance
    chatbotService = new ChatbotService(
      mockWhatsAppService,
      mockAIService,
      mockChatHistoryService,
      mockWebSocketService,
      1000
    );
  });

  describe('initialization', () => {
    it('should setup event handlers on construction', () => {
      expect(mockWhatsAppService.onMessage).toHaveBeenCalled();
      expect(mockWhatsAppService.onConnectionStatusChange).toHaveBeenCalled();
    });

    it('should return correct status', () => {
      const status = chatbotService.getStatus();
      
      expect(status).toEqual({
        whatsappConnected: true,
        aiServiceConnected: true,
        webSocketClients: 0,
        isProcessing: false,
        totalChats: 0,
        totalMessages: 0,
      });
    });
  });

  describe('chat history management', () => {
    it('should get chat history', () => {
      const mockHistory = [{ id: '1', content: 'test' }] as WhatsAppMessage[];
      mockChatHistoryService.getChatHistory = jest.fn().mockReturnValue(mockHistory);

      const result = chatbotService.getChatHistory('test-chat');

      expect(result).toEqual(mockHistory);
      expect(mockChatHistoryService.getChatHistory).toHaveBeenCalledWith('test-chat');
    });

    it('should clear chat history', () => {
      chatbotService.clearChatHistory('test-chat');

      expect(mockChatHistoryService.clearChatHistory).toHaveBeenCalledWith('test-chat');
    });

    it('should search messages', () => {
      const mockResults = [{ id: '1', content: 'found' }] as WhatsAppMessage[];
      mockChatHistoryService.searchMessages = jest.fn().mockReturnValue(mockResults);

      const result = chatbotService.searchMessages('test-chat', 'search');

      expect(result).toEqual(mockResults);
      expect(mockChatHistoryService.searchMessages).toHaveBeenCalledWith('test-chat', 'search');
    });
  });

  describe('manual message sending', () => {
    it('should send manual message', async () => {
      mockWhatsAppService.sendMessage = jest.fn().mockResolvedValue(true);

      const result = await chatbotService.sendManualMessage('test-chat', 'Hello');

      expect(result).toBe(true);
      expect(mockWhatsAppService.sendMessage).toHaveBeenCalledWith('test-chat', 'Hello');
    });
  });

  describe('chat history export/import', () => {
    it('should export chat history', () => {
      const mockExport = '{"chatId": "test", "messages": []}';
      mockChatHistoryService.exportChatHistory = jest.fn().mockReturnValue(mockExport);

      const result = chatbotService.exportChatHistory('test-chat');

      expect(result).toBe(mockExport);
      expect(mockChatHistoryService.exportChatHistory).toHaveBeenCalledWith('test-chat');
    });

    it('should import chat history', () => {
      const mockData = '{"chatId": "test", "messages": []}';
      mockChatHistoryService.importChatHistory = jest.fn().mockReturnValue(true);

      const result = chatbotService.importChatHistory('test-chat', mockData);

      expect(result).toBe(true);
      expect(mockChatHistoryService.importChatHistory).toHaveBeenCalledWith('test-chat', mockData);
    });
  });

  describe('cleanup', () => {
    it('should cleanup old histories', () => {
      mockChatHistoryService.cleanupOldHistories = jest.fn().mockReturnValue(5);

      const result = chatbotService.cleanupOldHistories(30);

      expect(result).toBe(5);
      expect(mockChatHistoryService.cleanupOldHistories).toHaveBeenCalledWith(30);
    });

    it('should shutdown gracefully', async () => {
      await chatbotService.shutdown();

      expect(mockWhatsAppService.disconnect).toHaveBeenCalled();
      expect(mockWebSocketService.close).toHaveBeenCalled();
    });
  });
}); 