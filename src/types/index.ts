/**
 * WhatsApp message types
 */
export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  timestamp: number;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  content: string;
  isGroup: boolean;
  groupId?: string | undefined;
  senderName?: string | undefined;
}

/**
 * Chat history interface
 */
export interface ChatHistory {
  chatId: string;
  messages: WhatsAppMessage[];
  lastUpdated: number;
}

/**
 * AI response interface
 */
export interface AIResponse {
  message: string;
  confidence: number;
  context: string[];
  timestamp: number;
}

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: 'message' | 'status' | 'error' | 'connection';
  data: any;
  timestamp: number;
}

/**
 * Supported AI providers
 */
export type AIProvider = 'openai' | 'gemini';

/**
 * Application configuration interface (add provider)
 */
export interface AppConfig {
  port: number;
  aiProvider: AIProvider;
  openaiApiKey?: string | undefined;
  openaiModel?: string | undefined;
  geminiApiKey?: string | undefined;
  geminiModel?: string | undefined;
  maxHistoryLength: number;
  responseDelay: number;
  logLevel: string;
}

/**
 * WhatsApp connection status
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATING = 'authenticating',
  READY = 'ready',
}

/**
 * Message processing result
 */
export interface MessageProcessingResult {
  success: boolean;
  response?: string;
  error?: string;
  processingTime: number;
}

/**
 * AI service configuration (add provider)
 */
export interface AIServiceConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}

/**
 * Logger levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Event types for the application
 */
export enum EventType {
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_SENT = 'message_sent',
  CONNECTION_STATUS_CHANGED = 'connection_status_changed',
  AI_RESPONSE_GENERATED = 'ai_response_generated',
  ERROR_OCCURRED = 'error_occurred',
}

/**
 * Event interface
 */
export interface AppEvent {
  type: EventType;
  data: any;
  timestamp: number;
}

/**
 * Health check interface
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  connections: number;
  lastError?: string;
} 