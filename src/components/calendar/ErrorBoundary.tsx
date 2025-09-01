import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class CalendarErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Calendar Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log error details for debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('Detailed error info:', errorDetails);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-xl text-destructive">
                Calendar Error
              </CardTitle>
              <CardDescription>
                Something went wrong while loading the calendar. This might be a temporary issue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Error Details:</h4>
                <p className="text-sm text-muted-foreground font-mono">
                  {this.state.error?.message || 'Unknown error occurred'}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Stack Trace (Development)
                    </summary>
                    <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Try these solutions:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Refresh the page to reload the calendar</li>
                  <li>Check your internet connection</li>
                  <li>Clear your browser cache and cookies</li>
                  <li>Try a different browser or incognito mode</li>
                  <li>Contact support if the problem persists</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={this.handleRetry}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  Error ID: {Date.now().toString(36)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple wrapper component for easier usage
interface CalendarErrorBoundaryWrapperProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function CalendarErrorBoundaryWrapper({ 
  children, 
  onError 
}: CalendarErrorBoundaryWrapperProps) {
  return (
    <CalendarErrorBoundary onError={onError}>
      {children}
    </CalendarErrorBoundary>
  );
}

// Hook for error reporting
export function useCalendarErrorReporting() {
  const reportError = React.useCallback((error: Error, context?: string) => {
    console.error(`Calendar Error${context ? ` (${context})` : ''}:`, error);
    
    // Here you could send error to monitoring service
    // Example: errorTrackingService.captureException(error, { context });
  }, []);

  return { reportError };
}