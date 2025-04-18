/**
 * Simple logger utility for the application
 */

// Define log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Set current log level based on environment
const currentLogLevel = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] 
  : (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);

/**
 * Logger class with methods for different log levels
 */
class Logger {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'app';
    this.logLevel = options.logLevel || currentLogLevel;
  }

  /**
   * Format log message with timestamp and metadata
   * @param {String} level - Log level
   * @param {String} message - Log message
   * @param {Object} meta - Additional metadata
   * @returns {Object} Formatted log object
   */
  formatLog(level, message, meta = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...meta
    };
  }

  /**
   * Log error message
   * @param {String} message - Error message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      const logObject = this.formatLog('error', message, meta);
      console.error(JSON.stringify(logObject));
    }
  }

  /**
   * Log warning message
   * @param {String} message - Warning message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      const logObject = this.formatLog('warn', message, meta);
      console.warn(JSON.stringify(logObject));
    }
  }

  /**
   * Log info message
   * @param {String} message - Info message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      const logObject = this.formatLog('info', message, meta);
      console.info(JSON.stringify(logObject));
    }
  }

  /**
   * Log debug message
   * @param {String} message - Debug message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      const logObject = this.formatLog('debug', message, meta);
      console.debug(JSON.stringify(logObject));
    }
  }
}

// Create default logger instance
const logger = new Logger();

module.exports = {
  logger,
  Logger,
  LOG_LEVELS
};
