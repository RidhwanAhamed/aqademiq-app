import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Copy, Bug } from 'lucide-react';
import { logger } from '@/utils/logger';
import { errorService } from '@/utils/errorService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Generate enhanced error
    const enhancedError = errorService.processError(error, {
      feature: 'error_boundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      retryCount: this.state.retryCount
    }, 'critical');

    this.setState({
      error,
      errorInfo,
      errorId: enhancedError.id,
    });

    // Enhanced logging
    logger.logError('ErrorBoundary caught an error', error, {
      errorId: enhancedError.id,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      props: this.props
    });
  }

  handleReset = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: undefined,
      retryCount: prevState.retryCount + 1
    }));
    
    // Log retry attempt
    logger.info('ErrorBoundary retry attempted', {
      retryCount: this.state.retryCount + 1,
      errorId: this.state.errorId
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyError = async () => {
    if (!this.state.error) return;

    const errorDetails = {
      message: this.state.error.message,
      stack: this.state.error.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      userAgent: navigator.userAgent
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      // Could show a toast here but we're in error state
      console.log('Error details copied to clipboard');
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkOrNetworkError = this.state.error && (
        this.state.error.name === 'ChunkLoadError' ||
        /Loading chunk [\d]+ failed/i.test(this.state.error.message) ||
        /Failed to fetch dynamically imported module/i.test(this.state.error.message) ||
        /Importing a module script failed/i.test(this.state.error.message)
      );

      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-card/80 backdrop-blur-sm border-border/50 shadow-elevated">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">
                {isChunkOrNetworkError ? 'You appear to be offline' : 'Something went wrong'}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {isChunkOrNetworkError
                  ? 'We could not load part of the app. Check your internet connection and try again.'
                  : 'We apologize for the inconvenience. An unexpected error occurred.'}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {this.state.error && !isChunkOrNetworkError && (
                <div className="space-y-3">
                  <details className="bg-muted/50 p-3 rounded-lg text-xs">
                    <summary className="cursor-pointer font-medium mb-2 flex items-center gap-2">
                      <Bug className="h-3 w-3" />
                      Error Details
                      {this.state.errorId && (
                        <span className="text-xs text-muted-foreground">
                          ID: {this.state.errorId.slice(-8)}
                        </span>
                      )}
                    </summary>
                    <div className="space-y-2 mt-2">
                      <div>
                        <div className="font-medium text-xs mb-1">Error Message:</div>
                        <pre className="whitespace-pre-wrap text-xs text-muted-foreground bg-background/50 p-2 rounded">
                          {this.state.error.message}
                        </pre>
                      </div>
                      {this.state.retryCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Retry attempts: {this.state.retryCount}
                        </div>
                      )}
                    </div>
                  </details>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleCopyError}
                    className="w-full text-xs"
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copy Error Details
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>
                  {isChunkOrNetworkError
                    ? 'Once you are back online, reload the app to continue where you left off.'
                    : 'If this problem persists, please refresh the page or contact support.'}
                </p>
                {this.state.errorId && !isChunkOrNetworkError && (
                  <p className="font-mono">Error ID: {this.state.errorId}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}