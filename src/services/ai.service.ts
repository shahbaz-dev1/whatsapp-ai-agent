import { AIResponse, WhatsAppMessage, AIServiceConfig } from '../types';
import { logger } from '../utils/logger';

// Only import OpenAI if needed
let OpenAI: any;
try {
  OpenAI = require('openai').default;
} catch {}

/**
 * AI Service for generating intelligent responses (OpenAI or Gemini)
 */
export class AIService {
  private openai: any;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
    if (config.provider === 'openai') {
      this.openai = new OpenAI({ apiKey: config.apiKey });
      logger.info('AI Service initialized with OpenAI');
    } else {
      logger.info('AI Service initialized with Gemini');
    }
  }

  /**
   * Generate AI response based on chat history
   */
  async generateResponse(
    message: string,
    chatHistory: WhatsAppMessage[],
  ): Promise<AIResponse> {
    if (this.config.provider === 'openai') {
      return this.generateOpenAIResponse(message, chatHistory);
    } else {
      return this.generateGeminiResponse(message, chatHistory);
    }
  }

  /**
   * Generate response using OpenAI
   */
  private async generateOpenAIResponse(
    message: string,
    chatHistory: WhatsAppMessage[],
  ): Promise<AIResponse> {
    const startTime = Date.now();
    logger.debug('Generating OpenAI response', { message, historyLength: chatHistory.length });
    try {
      const conversationContext = this.buildConversationContext(chatHistory);
      const messages = [
        { role: 'system' as const, content: this.config.systemPrompt },
        ...conversationContext,
        { role: 'user' as const, content: message },
      ];
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });
      const aiMessage = completion.choices[0]?.message?.content || 'I apologize, but I cannot generate a response at the moment.';
      const response: AIResponse = {
        message: aiMessage,
        confidence: this.calculateConfidence(completion),
        context: this.extractContext(chatHistory),
        timestamp: Date.now(),
      };
      logger.info('OpenAI response generated', { processingTime: Date.now() - startTime });
      return response;
    } catch (error) {
      logger.error('Error generating OpenAI response', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`Failed to generate OpenAI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate response using Gemini
   */
  private async generateGeminiResponse(
    message: string,
    chatHistory: WhatsAppMessage[],
  ): Promise<AIResponse> {
    const startTime = Date.now();
    logger.debug('Generating Gemini response', { message, historyLength: chatHistory.length });
    try {
      const context = this.buildConversationContext(chatHistory)
        .map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.content}`)
        .join('\n');
      const prompt = `${this.config.systemPrompt}\n${context}\nUser: ${message}\nBot:`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
      const body = {
        contents: [
          {
            parts: [
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
        },
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API error', { status: response.status, errorText });
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }
      const data: any = await response.json();
      const aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I cannot generate a response at the moment.';
      const aiResponse: AIResponse = {
        message: aiMessage,
        confidence: 0.9, // Gemini does not provide a confidence score
        context: this.extractContext(chatHistory),
        timestamp: Date.now(),
      };
      logger.info('Gemini response generated', { processingTime: Date.now() - startTime });
      return aiResponse;
    } catch (error) {
      logger.error('Error generating Gemini response', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`Failed to generate Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build conversation context from chat history
   */
  private buildConversationContext(
    chatHistory: WhatsAppMessage[],
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const context: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    // Take last 10 messages for context (to avoid token limits)
    const recentHistory = chatHistory.slice(-10);
    
    for (const msg of recentHistory) {
      const role = msg.from.includes('@s.whatsapp.net') ? 'assistant' : 'user';
      const content = msg.content;
      
      if (content.trim()) {
        context.push({ role, content });
      }
    }

    return context;
  }

  /**
   * Calculate confidence score based on OpenAI response
   */
  private calculateConfidence(completion: any): number {
    // Simple confidence calculation based on finish_reason
    const finishReason = completion.choices[0]?.finish_reason;
    
    switch (finishReason) {
      case 'stop':
        return 0.9; // High confidence for complete responses
      case 'length':
        return 0.7; // Medium confidence for truncated responses
      case 'content_filter':
        return 0.5; // Lower confidence for filtered content
      default:
        return 0.6; // Default confidence
    }
  }

  /**
   * Extract relevant context from chat history
   */
  private extractContext(chatHistory: WhatsAppMessage[]): string[] {
    const topics: string[] = [];
    
    // Extract key topics from recent messages
    const recentMessages = chatHistory.slice(-5);
    
    for (const msg of recentMessages) {
      const words = msg.content.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 3 && !this.isCommonWord(word)) {
          topics.push(word);
        }
      });
    }
    
    return topics.slice(0, 5); // Limit to 5 topics
  }

  /**
   * Check if word is a common word
   */
  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
      'her', 'its', 'our', 'their', 'mine', 'yours', 'his', 'hers', 'ours',
      'theirs', 'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else',
      'when', 'at', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'under',
      'over', 'inside', 'outside', 'within', 'without', 'against', 'toward',
      'towards', 'upon', 'across', 'behind', 'beneath', 'beside', 'beyond',
      'inside', 'near', 'off', 'out', 'outside', 'over', 'past', 'since',
      'through', 'throughout', 'to', 'toward', 'under', 'underneath', 'until',
      'up', 'upon', 'with', 'within', 'without'
    ];
    
    return commonWords.includes(word);
  }

  /**
   * Validate AI service configuration
   */
  validateConfig(): boolean {
    if (!this.config.apiKey) {
      logger.error(`${this.config.provider} API key is required`);
      return false;
    }
    
    if (!this.config.model) {
      logger.error(`${this.config.provider} model is required`);
      return false;
    }
    
    return true;
  }

  /**
   * Test AI service connectivity
   */
  async testConnection(): Promise<boolean> {
    if (this.config.provider === 'openai') {
      try {
        await this.openai.models.list();
        logger.info('OpenAI service connection test successful');
        return true;
      } catch (error) {
        logger.error('OpenAI service connection test failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        return false;
      }
    } else {
      // For Gemini, just check if API key is set
      if (this.config.apiKey) {
        logger.info('Gemini service connection test (API key present)');
        return true;
      } else {
        logger.error('Gemini service connection test failed: API key missing');
        return false;
      }
    }
  }
} 