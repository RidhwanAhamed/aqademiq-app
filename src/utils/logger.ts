// Centralized logging utility for better debugging and monitoring
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;
  private flushInterval = 10000; // 10 seconds

  constructor() {
    // Flush logs periodically in production
    if (!this.isDevelopment) {
      setInterval(() => this.flushLogs(), this.flushInterval);
    }
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date()
    };

    // In development, log to console with formatting
    if (this.isDevelopment) {
      const timestamp = entry.timestamp.toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message, data);
          break;
        case 'warn':
          console.warn(prefix, message, data);
          break;
        case 'debug':
          console.debug(prefix, message, data);
          break;
        default:
          console.log(prefix, message, data);
      }
    } else {
      // In production, buffer logs for external service integration
      this.bufferLog(entry);
    }
  }

  private bufferLog(entry: LogEntry) {
    this.logBuffer.push(entry);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }

    // Flush immediately for critical errors
    if (entry.level === 'error') {
      this.flushLogs();
    }
  }

  private async flushLogs() {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Future: Send to monitoring service
      // await this.sendToMonitoring(logsToFlush);
      
      // For now, store in session storage for debugging
      const existingLogs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
      const updatedLogs = [...existingLogs, ...logsToFlush].slice(-50); // Keep last 50 logs
      sessionStorage.setItem('app_logs', JSON.stringify(updatedLogs));
    } catch (error) {
      // Restore logs to buffer if flush fails
      this.logBuffer = [...logsToFlush, ...this.logBuffer];
    }
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(limit: number = 20): LogEntry[] {
    if (this.isDevelopment) {
      return this.logBuffer.slice(-limit);
    }
    
    try {
      const storedLogs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
      return storedLogs.slice(-limit);
    } catch {
      return [];
    }
  }

  /**
   * Clear log buffer/storage
   */
  clearLogs() {
    this.logBuffer = [];
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('app_logs');
    }
  }

  /**
   * Log error with enhanced context
   */
  logError(message: string, error: any, context?: Record<string, any>) {
    this.error(message, {
      error: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      ...context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    });
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }
}

export const logger = new Logger();