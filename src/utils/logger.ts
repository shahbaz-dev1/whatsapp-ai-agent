import winston from 'winston';
import { LogLevel } from '../types';

/**
 * Custom log format
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  }),
);

/**
 * Create logger instance
 */
export const createLogger = (level: LogLevel = LogLevel.INFO): winston.Logger => {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ];

  // Add file transport in production
  if (process.env['NODE_ENV'] === 'production') {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: logFormat,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: logFormat,
      }),
    );
  }

  return winston.createLogger({
    level,
    format: logFormat,
    transports,
    exitOnError: false,
  });
};

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context
 */
export const createChildLogger = (context: string): winston.Logger => {
  return logger.child({ context });
};

/**
 * Log levels mapping
 */
export const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Utility functions for common logging patterns
 */
export const logUtils = {
  /**
   * Log method entry
   */
  methodEntry: (methodName: string, params?: any): void => {
    logger.debug(`Entering method: ${methodName}`, { params });
  },

  /**
   * Log method exit
   */
  methodExit: (methodName: string, result?: any): void => {
    logger.debug(`Exiting method: ${methodName}`, { result });
  },

  /**
   * Log performance metrics
   */
  performance: (operation: string, duration: number): void => {
    logger.info(`Performance: ${operation} took ${duration}ms`);
  },

  /**
   * Log API calls
   */
  apiCall: (method: string, url: string, statusCode?: number): void => {
    logger.info(`API Call: ${method} ${url}`, { statusCode });
  },

  /**
   * Log errors with context
   */
  error: (message: string, error?: Error, context?: any): void => {
    logger.error(message, { error: error?.message, stack: error?.stack, context });
  },
};

/**
 * Logger compatible with Baileys (adds trace method)
 */
export const baileysLogger = {
  trace: (..._args: unknown[]) => {}, // no-op for trace
  debug: (...args: unknown[]) => logger.debug(typeof args[0] === 'object' ? args[0] : { msg: args[0] }),
  info: (...args: unknown[]) => logger.info(typeof args[0] === 'object' ? args[0] : { msg: args[0] }),
  warn: (...args: unknown[]) => logger.warn(typeof args[0] === 'object' ? args[0] : { msg: args[0] }),
  error: (...args: unknown[]) => logger.error(typeof args[0] === 'object' ? args[0] : { msg: args[0] }),
  level: 'info',
  child: () => baileysLogger,
}; 