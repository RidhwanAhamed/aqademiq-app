import { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash-es';

interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage: number;
  networkRequests: number;
  lastUpdate: Date;
}

interface OptimizationSettings {
  enableVirtualization: boolean;
  enableLazyLoading: boolean;
  enableMemoization: boolean;
  enableDataCaching: boolean;
  maxCacheSize: number;
  refreshInterval: number;
}

export function usePerformanceOptimization() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0,
    networkRequests: 0,
    lastUpdate: new Date()
  });

  const [settings, setSettings] = useState<OptimizationSettings>({
    enableVirtualization: true,
    enableLazyLoading: true,
    enableMemoization: true,
    enableDataCaching: true,
    maxCacheSize: 100,
    refreshInterval: 5000
  });

  const [dataCache, setDataCache] = useState<Map<string, { data: any; timestamp: number }>>(new Map());
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);

  // Performance monitoring
  const measurePerformance = useCallback((componentName: string, operation: () => void) => {
    const startTime = performance.now();
    operation();
    const endTime = performance.now();
    
    setMetrics(prev => ({
      ...prev,
      renderTime: endTime - startTime,
      lastUpdate: new Date()
    }));

    // Log performance if it's concerning
    const renderTime = endTime - startTime;
    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }, []);

  // Memory monitoring
  useEffect(() => {
    const updateMemoryMetrics = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
        }));
      }
    };

    const interval = setInterval(updateMemoryMetrics, settings.refreshInterval);
    return () => clearInterval(interval);
  }, [settings.refreshInterval]);

  // Network request tracking
  const trackNetworkRequest = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      networkRequests: prev.networkRequests + 1
    }));
  }, []);

  // Data caching with TTL
  const getCachedData = useCallback((key: string, ttl: number = 300000): any => {
    if (!settings.enableDataCaching) return null;
    
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    // Clean up expired cache entries
    if (cached && Date.now() - cached.timestamp >= ttl) {
      dataCache.delete(key);
    }
    
    return null;
  }, [dataCache, settings.enableDataCaching]);

  const setCachedData = useCallback((key: string, data: any) => {
    if (!settings.enableDataCaching) return;
    
    setDataCache(prev => {
      const newCache = new Map(prev);
      
      // Limit cache size
      if (newCache.size >= settings.maxCacheSize) {
        const firstKey = newCache.keys().next().value;
        newCache.delete(firstKey);
      }
      
      newCache.set(key, { data, timestamp: Date.now() });
      return newCache;
    });
  }, [settings.enableDataCaching, settings.maxCacheSize]);

  // Debounced data fetching
  const debouncedFetch = useMemo(
    () => debounce((fetchFn: () => Promise<any>, key?: string) => {
      trackNetworkRequest();
      
      if (key) {
        const cached = getCachedData(key);
        if (cached) return Promise.resolve(cached);
      }
      
      return fetchFn().then(data => {
        if (key) setCachedData(key, data);
        return data;
      });
    }, 300),
    [trackNetworkRequest, getCachedData, setCachedData]
  );

  // Battery and performance detection
  useEffect(() => {
    const checkPowerMode = async () => {
      try {
        // Check battery status if available
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          const isLowBattery = battery.level < 0.2 && !battery.charging;
          
          // Check device capabilities
          const isLowEndDevice = navigator.hardwareConcurrency <= 2;
          const hasSlowConnection = 'connection' in navigator && 
            ((navigator as any).connection.effectiveType === 'slow-2g' || 
             (navigator as any).connection.effectiveType === '2g');
          
          setIsLowPowerMode(isLowBattery || isLowEndDevice || hasSlowConnection);
        }
      } catch (error) {
        console.warn('Could not detect power/performance state:', error);
      }
    };

    checkPowerMode();
  }, []);

  // Automatic optimization adjustments
  useEffect(() => {
    if (isLowPowerMode) {
      setSettings(prev => ({
        ...prev,
        enableVirtualization: true,
        enableLazyLoading: true,
        refreshInterval: 10000, // Slower updates
        maxCacheSize: 50 // Smaller cache
      }));
    }
  }, [isLowPowerMode]);

  // Component visibility optimization
  const useIntersectionObserver = useCallback((
    ref: React.RefObject<Element>,
    options: IntersectionObserverInit = {}
  ) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      if (!settings.enableLazyLoading || !ref.current) return;

      const observer = new IntersectionObserver(([entry]) => {
        setIsVisible(entry.isIntersecting);
      }, {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      });

      observer.observe(ref.current);
      return () => observer.disconnect();
    }, [ref, options, settings.enableLazyLoading]);

    return isVisible;
  }, [settings.enableLazyLoading]);

  // Virtual scrolling helper
  const calculateVirtualItems = useCallback((
    totalItems: number,
    containerHeight: number,
    itemHeight: number,
    scrollTop: number
  ) => {
    if (!settings.enableVirtualization) {
      return { start: 0, end: totalItems - 1, visibleItems: totalItems };
    }

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const buffer = Math.floor(visibleCount * 0.5); // 50% buffer
    
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const end = Math.min(totalItems - 1, start + visibleCount + buffer * 2);
    
    return { start, end, visibleItems: end - start + 1 };
  }, [settings.enableVirtualization]);

  // Performance tips based on metrics
  const getPerformanceTips = useCallback(() => {
    const tips: string[] = [];
    
    if (metrics.renderTime > 16) {
      tips.push('Consider enabling memoization for expensive components');
    }
    
    if (metrics.memoryUsage > 0.8) {
      tips.push('High memory usage detected - consider reducing cache size');
    }
    
    if (metrics.networkRequests > 10) {
      tips.push('Many network requests detected - enable data caching');
    }
    
    if (isLowPowerMode) {
      tips.push('Low power mode detected - optimizations automatically enabled');
    }
    
    return tips;
  }, [metrics, isLowPowerMode]);

  // Clear cache manually
  const clearCache = useCallback(() => {
    setDataCache(new Map());
  }, []);

  return {
    // Metrics
    metrics,
    settings,
    isLowPowerMode,
    
    // Performance tools
    measurePerformance,
    trackNetworkRequest,
    getCachedData,
    setCachedData,
    debouncedFetch,
    
    // Optimization helpers
    useIntersectionObserver,
    calculateVirtualItems,
    
    // Settings
    updateSettings: setSettings,
    clearCache,
    
    // Insights
    getPerformanceTips,
    
    // Cache info
    cacheSize: dataCache.size,
    cacheKeys: Array.from(dataCache.keys())
  };
}