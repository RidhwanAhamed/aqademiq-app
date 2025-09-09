import { logger } from '@/utils/logger';
import { analyzeError } from '@/utils/networkErrorHandler';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface EnhancedError {
  id: string;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  context: Record<string, any>;
  timestamp: Date;
  canRetry: boolean;
  retryCount: number;
  userActions?: ErrorAction[];
}

export interface ErrorAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'outline' | 'destructive';
}

class ErrorService {
  private errorHistory: EnhancedError[] = [];
  private recentErrors = new Map<string, number>();
  private maxHistorySize = 50;
  private deduplicationWindow = 5000; // 5 seconds

  /**
   * Process and enhance an error for user display
   */
  processError(
    error: any, 
    context: Record<string, any> = {},
    severity: ErrorSeverity = 'error'
  ): EnhancedError {
    const errorId = this.generateErrorId();
    const timestamp = new Date();
    
    // Analyze the error using existing network handler
    const networkAnalysis = analyzeError(error);
    
    // Determine user message and actions
    const userMessage = this.getUserMessage(error, networkAnalysis, context);
    const userActions = this.getUserActions(error, networkAnalysis, context);
    
    const enhancedError: EnhancedError = {
      id: errorId,
      message: error?.message || 'Unknown error',
      userMessage,
      severity: this.determineSeverity(error, networkAnalysis, severity),
      context: {
        ...context,
        originalError: error?.name || 'Unknown',
        isNetworkError: networkAnalysis.isNetworkError,
        isAuthError: networkAnalysis.isAuthError
      },
      timestamp,
      canRetry: networkAnalysis.shouldRetry,
      retryCount: 0,
      userActions
    };

    // Check for deduplication
    if (this.shouldDeduplicateError(enhancedError)) {
      return enhancedError; // Don't add to history
    }

    // Add to history
    this.addToHistory(enhancedError);
    
    // Log the error
    logger.error('Error processed', {
      errorId,
      userMessage,
      severity,
      context: enhancedError.context
    });

    return enhancedError;
  }

  /**
   * Generate user-friendly error messages
   */
  private getUserMessage(error: any, networkAnalysis: any, context: Record<string, any>): string {
    // Use network analysis if available
    if (networkAnalysis.userMessage !== 'An unexpected error occurred. Please try again.') {
      return networkAnalysis.userMessage;
    }

    const errorMessage = error?.message?.toLowerCase() || '';
    
    // Context-specific messages
    if (context.feature === 'sync') {
      if (errorMessage.includes('token')) {
        return 'Your Google Calendar connection has expired. Please reconnect your account.';
      }
      if (errorMessage.includes('quota')) {
        return 'Google Calendar sync limit reached. Please wait and try again later.';
      }
      return 'Failed to sync with Google Calendar. Please check your connection and try again.';
    }

    if (context.feature === 'auth') {
      if (errorMessage.includes('invalid')) {
        return 'Invalid credentials. Please check your email and password.';
      }
      if (errorMessage.includes('network')) {
        return 'Unable to connect to authentication servers. Please check your internet connection.';
      }
      return 'Authentication failed. Please try signing in again.';
    }

    if (context.feature === 'database') {
      return 'Unable to save your changes. Please check your connection and try again.';
    }

    // Generic fallback with context
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Connection error. Please check your internet connection and try again.';
    }

    if (errorMessage.includes('permission')) {
      return 'You do not have permission to perform this action.';
    }

    return 'An unexpected error occurred. Our team has been notified.';
  }

  /**
   * Generate contextual user actions
   */
  private getUserActions(error: any, networkAnalysis: any, context: Record<string, any>): ErrorAction[] {
    const actions: ErrorAction[] = [];

    // Add retry action if applicable
    if (networkAnalysis.shouldRetry && context.retryFunction) {
      actions.push({
        label: 'Try Again',
        action: context.retryFunction,
        variant: 'outline'
      });
    }

    // Context-specific actions
    if (context.feature === 'sync' && error?.message?.includes('token')) {
      actions.push({
        label: 'Reconnect Google',
        action: () => context.reconnectGoogle?.(),
        variant: 'default'
      });
    }

    if (context.feature === 'auth') {
      actions.push({
        label: 'Back to Sign In',
        action: () => window.location.href = '/auth',
        variant: 'outline'
      });
    }

    // Add report issue action for critical errors
    if (this.determineSeverity(error, networkAnalysis, 'error') === 'critical') {
      actions.push({
        label: 'Report Issue',
        action: () => this.reportIssue(error, context),
        variant: 'destructive'
      });
    }

    return actions;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: any, networkAnalysis: any, defaultSeverity: ErrorSeverity): ErrorSeverity {
    const errorMessage = error?.message?.toLowerCase() || '';

    // Critical errors
    if (errorMessage.includes('security') || 
        errorMessage.includes('auth') && !networkAnalysis.isNetworkError ||
        error?.name === 'SecurityError') {
      return 'critical';
    }

    // Network errors are usually warnings (temporary)
    if (networkAnalysis.isNetworkError) {
      return 'warning';
    }

    // User input errors are info level
    if (errorMessage.includes('validation') || errorMessage.includes('invalid input')) {
      return 'info';
    }

    return defaultSeverity;
  }

  /**
   * Check if error should be deduplicated
   */
  private shouldDeduplicateError(error: EnhancedError): boolean {
    const errorKey = `${error.message}-${error.context.feature || 'general'}`;
    const now = Date.now();
    const lastSeen = this.recentErrors.get(errorKey);

    if (lastSeen && (now - lastSeen) < this.deduplicationWindow) {
      return true; // Deduplicate
    }

    this.recentErrors.set(errorKey, now);
    
    // Clean up old entries
    for (const [key, timestamp] of this.recentErrors.entries()) {
      if (now - timestamp > this.deduplicationWindow) {
        this.recentErrors.delete(key);
      }
    }

    return false;
  }

  /**
   * Add error to history with size management
   */
  private addToHistory(error: EnhancedError): void {
    this.errorHistory.unshift(error);
    
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Report critical issues (placeholder for future integration)
   */
  private reportIssue(error: any, context: Record<string, any>): void {
    // Future: Integrate with error reporting service (Sentry, etc.)
    console.error('Issue reported:', { error, context, timestamp: new Date() });
    
    // For now, provide user feedback
    if (window.navigator && window.navigator.clipboard) {
      const reportData = JSON.stringify({
        error: error?.message,
        context,
        timestamp: new Date().toISOString(),
        userAgent: window.navigator.userAgent
      }, null, 2);
      
      window.navigator.clipboard.writeText(reportData).then(() => {
        alert('Error details copied to clipboard. Please share this with our support team.');
      });
    }
  }

  /**
   * Get recent error history
   */
  getErrorHistory(limit: number = 10): EnhancedError[] {
    return this.errorHistory.slice(0, limit);
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(e => e.timestamp.getTime() > oneHourAgo);
    
    return {
      totalErrors: this.errorHistory.length,
      recentErrors: recentErrors.length,
      criticalErrors: recentErrors.filter(e => e.severity === 'critical').length,
      networkErrors: recentErrors.filter(e => e.context.isNetworkError).length,
      authErrors: recentErrors.filter(e => e.context.isAuthError).length
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
    this.recentErrors.clear();
  }
}

export const errorService = new ErrorService();