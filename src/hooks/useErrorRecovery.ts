import { useState, useCallback, useEffect } from 'react';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { errorService } from '@/utils/errorService';
import { retryWithBackoff } from '@/utils/networkErrorHandler';
import { logger } from '@/utils/logger';

interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableAutoRecovery?: boolean;
  feature?: string;
}

interface RecoveryState {
  isRecovering: boolean;
  retryCount: number;
  lastError: any;
  canRetry: boolean;
}

export function useErrorRecovery(options: RecoveryOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    enableAutoRecovery = false,
    feature = 'unknown'
  } = options;

  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    isRecovering: false,
    retryCount: 0,
    lastError: null,
    canRetry: true
  });

  const { showErrorToast, showSuccessToast } = useEnhancedToast();

  /**
   * Execute operation with automatic error recovery
   */
  const executeWithRecovery = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> => {
    setRecoveryState(prev => ({ ...prev, isRecovering: true }));

    try {
      const result = await retryWithBackoff(operation, maxRetries, retryDelay);
      
      // Reset recovery state on success
      setRecoveryState({
        isRecovering: false,
        retryCount: 0,
        lastError: null,
        canRetry: true
      });

      if (recoveryState.retryCount > 0) {
        showSuccessToast(
          'Operation Successful',
          `${operationName} completed after ${recoveryState.retryCount} retry attempts.`
        );
      }

      logger.info('Operation completed with recovery', {
        operationName,
        retryCount: recoveryState.retryCount,
        feature
      });

      return result;
    } catch (error) {
      const canRetry = recoveryState.retryCount < maxRetries;
      
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
        retryCount: prev.retryCount + 1,
        lastError: error,
        canRetry
      }));

      // Show enhanced error toast with recovery context
      showErrorToast(error, {
        feature,
        retryFunction: canRetry ? () => executeWithRecovery(operation, operationName) : undefined
      });

      logger.error('Operation failed with recovery', {
        operationName,
        error: error instanceof Error ? error.message : error,
        retryCount: recoveryState.retryCount,
        canRetry,
        feature
      });

      throw error;
    }
  }, [maxRetries, retryDelay, recoveryState.retryCount, feature, showErrorToast, showSuccessToast]);

  /**
   * Manual retry of the last failed operation
   */
  const retryLastOperation = useCallback(async (operation: () => Promise<any>) => {
    if (!recoveryState.canRetry) {
      showErrorToast(new Error('Maximum retry attempts exceeded'), { feature });
      return;
    }

    return executeWithRecovery(operation, 'retry operation');
  }, [recoveryState.canRetry, executeWithRecovery, feature, showErrorToast]);

  /**
   * Reset recovery state
   */
  const resetRecovery = useCallback(() => {
    setRecoveryState({
      isRecovering: false,
      retryCount: 0,
      lastError: null,
      canRetry: true
    });
  }, []);

  /**
   * Auto-recovery for network operations
   */
  useEffect(() => {
    if (enableAutoRecovery && recoveryState.lastError && recoveryState.canRetry) {
      const autoRecoveryTimer = setTimeout(() => {
        logger.info('Auto-recovery triggered', {
          feature,
          retryCount: recoveryState.retryCount
        });
        // Auto-recovery would need the original operation reference
        // This is a placeholder for future implementation
      }, retryDelay * Math.pow(2, recoveryState.retryCount));

      return () => clearTimeout(autoRecoveryTimer);
    }
  }, [enableAutoRecovery, recoveryState.lastError, recoveryState.canRetry, recoveryState.retryCount, retryDelay, feature]);

  return {
    executeWithRecovery,
    retryLastOperation,
    resetRecovery,
    recoveryState,
    isRecovering: recoveryState.isRecovering,
    canRetry: recoveryState.canRetry,
    retryCount: recoveryState.retryCount
  };
}