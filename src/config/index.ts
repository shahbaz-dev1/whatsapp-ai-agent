import dotenv from 'dotenv';
import Joi from 'joi';
import { AppConfig, AIServiceConfig, AIProvider } from '../types';

// Load environment variables
dotenv.config();

/**
 * Environment variables validation schema
 */
const envSchema = Joi.object({
  PORT: Joi.number().default(3000),
  AI_PROVIDER: Joi.string().valid('openai', 'gemini').default('openai'),
  OPENAI_API_KEY: Joi.string().allow(''),
  OPENAI_MODEL: Joi.string().default('gpt-3.5-turbo'),
  GEMINI_API_KEY: Joi.string().allow(''),
  GEMINI_MODEL: Joi.string().default('gemini-pro'),
  MAX_HISTORY_LENGTH: Joi.number().default(50),
  RESPONSE_DELAY: Joi.number().default(1000),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  AI_MAX_TOKENS: Joi.number().default(150),
  AI_TEMPERATURE: Joi.number().min(0).max(2).default(0.7),
}).unknown();

/**
 * Validate and get environment variables
 */
const validateEnv = (): void => {
  const { error } = envSchema.validate(process.env);
  if (error) {
    throw new Error(`Environment validation error: ${error.message}`);
  }
};

/**
 * Get application configuration
 */
export const getAppConfig = (): AppConfig => {
  validateEnv();
  const aiProvider = (process.env['AI_PROVIDER'] as AIProvider) || 'openai';
  return {
    port: parseInt(process.env['PORT'] || '3000', 10),
    aiProvider,
    openaiApiKey: process.env['OPENAI_API_KEY'],
    openaiModel: process.env['OPENAI_MODEL'],
    geminiApiKey: process.env['GEMINI_API_KEY'],
    geminiModel: process.env['GEMINI_MODEL'],
    maxHistoryLength: parseInt(process.env['MAX_HISTORY_LENGTH'] || '50', 10),
    responseDelay: parseInt(process.env['RESPONSE_DELAY'] || '1000', 10),
    logLevel: process.env['LOG_LEVEL'] || 'info',
  };
};

/**
 * Get AI service configuration
 */
export const getAIServiceConfig = (): AIServiceConfig => {
  validateEnv();
  const provider = (process.env['AI_PROVIDER'] as AIProvider) || 'openai';
  let apiKey = '';
  let model = '';
  if (provider === 'openai') {
    apiKey = process.env['OPENAI_API_KEY'] || '';
    model = process.env['OPENAI_MODEL'] || 'gpt-3.5-turbo';
  } else if (provider === 'gemini') {
    apiKey = process.env['GEMINI_API_KEY'] || '';
    model = process.env['GEMINI_MODEL'] || 'gemini-pro';
  }
  return {
    provider,
    apiKey,
    model,
    maxTokens: parseInt(process.env['AI_MAX_TOKENS'] || '150', 10),
    temperature: parseFloat(process.env['AI_TEMPERATURE'] || '0.7'),
    systemPrompt: `You are a helpful WhatsApp AI assistant. You should:\n- Be friendly and conversational\n- Provide helpful and accurate responses\n- Keep responses concise but informative\n- Use appropriate emojis when suitable\n- Ask clarifying questions when needed\n- Maintain context from the conversation history`,
  };
};

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env['NODE_ENV'] === 'development';
};

/**
 * Check if running in production mode
 */
export const isProduction = (): boolean => {
  return process.env['NODE_ENV'] === 'production';
}; 