import React, { lazy, ComponentType } from 'react';

/**
 * Creates a lazy-loaded component with offline fallback
 * If the chunk fails to load (e.g., offline), shows an offline placeholder
 */
export function offlineLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3
): React.LazyExoticComponent<T> {
  return lazy(() => 
    retryImport(importFn, retries).catch((error) => {
      console.warn('Failed to load chunk, falling back to offline placeholder:', error);
      // Dynamically import the placeholder to avoid JSX in .ts file
      return import('@/components/OfflineSuspenseFallback').then(module => ({
        default: module.OfflinePlaceholder as unknown as T
      }));
    })
  );
}

/**
 * Retries a dynamic import with exponential backoff
 */
async function retryImport<T>(
  importFn: () => Promise<T>,
  retries: number,
  delay = 1000
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    // If we're offline, don't retry - fail immediately
    if (!navigator.onLine) {
      throw error;
    }
    
    // Wait and retry with exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryImport(importFn, retries - 1, delay * 2);
  }
}

/**
 * Preload a lazy component - useful for critical routes
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  // Only preload if online
  if (navigator.onLine) {
    importFn().catch(() => {
      // Silently fail - we'll handle this when the route is actually loaded
    });
  }
}
