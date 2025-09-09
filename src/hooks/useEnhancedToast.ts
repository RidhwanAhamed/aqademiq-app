import React, { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorService, EnhancedError, ErrorSeverity } from '@/utils/errorService';

interface ToastQueue {
  id: string;
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  priority: number;
}

interface ErrorToastOptions {
  feature?: string;
  retryFunction?: () => void;
  reconnectGoogle?: () => void;
  showActions?: boolean;
}

export function useEnhancedToast() {
  const { toast } = useToast();
  const [toastQueue, setToastQueue] = useState<ToastQueue[]>([]);
  const [processingQueue, setProcessingQueue] = useState(false);

  /**
   * Process toast queue with rate limiting
   */
  const processQueue = useCallback(() => {
    if (processingQueue || toastQueue.length === 0) return;

    setProcessingQueue(true);
    
    // Sort by priority (higher number = higher priority)
    const sortedQueue = [...toastQueue].sort((a, b) => b.priority - a.priority);
    const nextToast = sortedQueue[0];
    
    if (nextToast) {
      toast({
        title: nextToast.title,
        description: nextToast.description,
        variant: nextToast.variant,
      });

      // Remove processed toast from queue
      setToastQueue(prev => prev.filter(t => t.id !== nextToast.id));
    }
    
    setProcessingQueue(false);
    
    // Process next toast after delay
    if (sortedQueue.length > 1) {
      setTimeout(processQueue, 1500);
    }
  }, [toastQueue, processingQueue, toast]);

  /**
   * Add toast to queue with deduplication
   */
  const queueToast = useCallback((toastData: Omit<ToastQueue, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newToast = { ...toastData, id };
    
    // Check for similar toasts in queue
    const isDuplicate = toastQueue.some(t => 
      t.title === newToast.title && t.description === newToast.description
    );
    
    if (!isDuplicate) {
      setToastQueue(prev => [...prev, newToast]);
      
      // Start processing if not already processing
      setTimeout(processQueue, 100);
    }
  }, [toastQueue, processQueue]);

  /**
   * Show error toast with enhanced error handling
   */
  const showErrorToast = useCallback((
    error: any, 
    options: ErrorToastOptions = {}
  ) => {
    const enhancedError = errorService.processError(error, options, 'error');
    
    const priority = enhancedError.severity === 'critical' ? 4 : 
                    enhancedError.severity === 'error' ? 3 :
                    enhancedError.severity === 'warning' ? 2 : 1;

    queueToast({
      title: "Error",
      description: enhancedError.userMessage,
      variant: enhancedError.severity === 'critical' || enhancedError.severity === 'error' ? 'destructive' : 'default',
      priority
    });

    return enhancedError;
  }, [queueToast]);

  /**
   * Show success toast
   */
  const showSuccessToast = useCallback((
    title: string,
    description: string
  ) => {
    queueToast({
      title,
      description,
      variant: 'default',
      priority: 2
    });
  }, [queueToast]);

  /**
   * Show warning toast
   */
  const showWarningToast = useCallback((
    title: string,
    description: string
  ) => {
    queueToast({
      title,
      description,
      variant: 'default',
      priority: 3
    });
  }, [queueToast]);

  /**
   * Show info toast
   */
  const showInfoToast = useCallback((
    title: string,
    description: string
  ) => {
    queueToast({
      title,
      description,
      variant: 'default',
      priority: 1
    });
  }, [queueToast]);

  /**
   * Clear toast queue
   */
  const clearQueue = useCallback(() => {
    setToastQueue([]);
  }, []);

  /**
   * Get queue status
   */
  const getQueueStatus = useCallback(() => ({
    queueLength: toastQueue.length,
    processingQueue,
    hasHighPriorityToasts: toastQueue.some(t => t.priority >= 3)
  }), [toastQueue, processingQueue]);

  return {
    // Enhanced toast functions
    showErrorToast,
    showSuccessToast,
    showWarningToast,
    showInfoToast,
    
    // Queue management
    clearQueue,
    getQueueStatus,
    
    // Original toast for backward compatibility
    toast
  };
}