import React, { createContext, useContext, ReactNode } from 'react';
import { useOfflineStartup, OfflineStartupState } from '@/hooks/useOfflineStartup';
import { OfflineStartupScreen } from './OfflineStartupScreen';
import { Loader2 } from 'lucide-react';

interface OfflineFirstContextValue extends OfflineStartupState {
  retry: () => void;
}

const OfflineFirstContext = createContext<OfflineFirstContextValue | null>(null);

export function useOfflineFirst() {
  const context = useContext(OfflineFirstContext);
  if (!context) {
    throw new Error('useOfflineFirst must be used within OfflineFirstProvider');
  }
  return context;
}

interface OfflineFirstProviderProps {
  children: ReactNode;
}

export function OfflineFirstProvider({ children }: OfflineFirstProviderProps) {
  const offlineState = useOfflineStartup();

  // Show loading while restoring
  if (offlineState.isRestoring) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading Aqademiq...</p>
        </div>
      </div>
    );
  }

  // Show offline startup screen if offline without cached session
  if (offlineState.isOffline && !offlineState.hasCachedSession) {
    return <OfflineStartupScreen onRetry={offlineState.retry} />;
  }

  return (
    <OfflineFirstContext.Provider value={offlineState}>
      {children}
    </OfflineFirstContext.Provider>
  );
}

export default OfflineFirstProvider;
