/**
 * Simple logger utility for MonkiHub
 * Provides consistent logging with environment-aware output
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  /**
   * Log informational messages
   */
  info: (...args) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Log warning messages (always shown)
   */
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Log error messages (always shown)
   */
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log security-related events (always shown)
   */
  security: (...args) => {
    console.log('[SECURITY]', ...args);
  },

  /**
   * Log socket events (only in development)
   */
  socket: (...args) => {
    if (isDevelopment) {
      console.log('[SOCKET]', ...args);
    }
  }
};

module.exports = logger;
