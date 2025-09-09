import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EnhancedError } from '@/utils/errorService';

interface ErrorRecoveryProps {
  error: EnhancedError;
  onRetry?: () => Promise<void>;
  onDismiss?: () => void;
  showProgress?: boolean;
}

export const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({ 
  error, 
  onRetry, 
  onDismiss,
  showProgress = false 
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryProgress, setRetryProgress] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return AlertCircle;
      case 'error': return AlertCircle;
      case 'warning': return Clock;
      case 'info': return CheckCircle;
      default: return AlertCircle;
    }
  };

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    setRetryProgress(0);

    try {
      if (showProgress) {
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setRetryProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);
      }

      await onRetry();
      
      if (showProgress) {
        setRetryProgress(100);
        setTimeout(() => setRetryProgress(0), 500);
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Auto-retry with countdown for network errors
  useEffect(() => {
    if (error.canRetry && error.context.isNetworkError && onRetry && countdown === null) {
      setCountdown(30); // 30 second countdown
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            handleRetry();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [error, onRetry, countdown]);

  const Icon = getSeverityIcon(error.severity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-${error.severity === 'critical' ? 'destructive' : error.severity === 'error' ? 'destructive' : error.severity === 'warning' ? 'warning' : 'muted'}/10`}>
                <Icon className={`h-4 w-4 text-${error.severity === 'critical' ? 'destructive' : error.severity === 'error' ? 'destructive' : error.severity === 'warning' ? 'warning' : 'muted-foreground'}`} />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">
                  {error.severity === 'critical' ? 'Critical Error' :
                   error.severity === 'error' ? 'Error' :
                   error.severity === 'warning' ? 'Warning' : 'Information'}
                </CardTitle>
                <Badge variant={getSeverityColor(error.severity)} className="mt-1 text-xs">
                  {error.severity.charAt(0).toUpperCase() + error.severity.slice(1)}
                </Badge>
              </div>
            </div>
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error.userMessage}
          </p>

          {showProgress && isRetrying && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Retrying...</span>
                <span>{retryProgress}%</span>
              </div>
              <Progress value={retryProgress} className="h-2" />
            </div>
          )}

          {countdown !== null && (
            <div className="text-xs text-muted-foreground text-center py-2 bg-muted/30 rounded-md">
              Automatic retry in {countdown} seconds
            </div>
          )}

          {error.userActions && error.userActions.length > 0 && (
            <div className="flex gap-2 pt-2">
              {error.canRetry && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex-1"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Try Again
                    </>
                  )}
                </Button>
              )}
              
              {error.userActions.slice(0, 2).map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={action.action}
                  className="flex-1"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {error.context && Object.keys(error.context).length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Technical Details
              </summary>
              <pre className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground overflow-x-auto">
                {JSON.stringify(
                  { 
                    id: error.id,
                    timestamp: error.timestamp,
                    retryCount: error.retryCount,
                    ...error.context 
                  }, 
                  null, 
                  2
                )}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};