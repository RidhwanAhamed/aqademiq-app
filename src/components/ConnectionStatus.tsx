import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { WifiOff, Wifi, AlertTriangle, RefreshCw } from "lucide-react";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useState } from "react";

export function ConnectionStatus() {
  const { isOnline, connectionError, clearError, testConnection, hasConnection } = useConnectionStatus();
  const [testing, setTesting] = useState(false);

  // Only show component when there's an actual connection issue
  if (isOnline && !connectionError) {
    return null;
  }

  const handleRetry = async () => {
    setTesting(true);
    clearError();
    
    try {
      const connected = await testConnection();
      if (connected) {
        // Connection restored, clear any errors
        clearError();
      }
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Alert className={`mb-4 ${!isOnline ? 'border-destructive' : 'border-warning'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <WifiOff className="h-4 w-4" />
          ) : connectionError ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Wifi className="h-4 w-4" />
          )}
          <AlertDescription>
            {!isOnline 
              ? "No internet connection. Please check your network settings."
              : connectionError || "Connection issues detected"
            }
          </AlertDescription>
        </div>
        
        {(connectionError || !isOnline) && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={testing}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Retry'}
          </Button>
        )}
      </div>
    </Alert>
  );
}