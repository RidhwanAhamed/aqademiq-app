import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { WifiOff, Wifi, AlertTriangle, RefreshCw } from "lucide-react";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";

export function ConnectionStatus() {
  const { isOnline, connectionError, clearError, hasConnection } = useConnectionStatus();

  if (hasConnection) {
    return null;
  }

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
        
        {connectionError && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              clearError();
              window.location.reload();
            }}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </Alert>
  );
}