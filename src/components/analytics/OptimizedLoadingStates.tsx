import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Brain,
  Loader2,
  Wifi,
  WifiOff
} from "lucide-react";

interface OptimizedLoadingStatesProps {
  isLoading: boolean;
  hasError: boolean;
  isOffline?: boolean;
  loadingMessage?: string;
  errorMessage?: string;
  showSkeleton?: boolean;
  animationType?: 'pulse' | 'shimmer' | 'bounce';
}

export function OptimizedLoadingStates({
  isLoading,
  hasError,
  isOffline = false,
  loadingMessage = "Loading analytics...",
  errorMessage = "Failed to load data",
  showSkeleton = true,
  animationType = 'shimmer'
}: OptimizedLoadingStatesProps) {

  // Shimmer animation CSS
  const shimmerAnimation = `
    @keyframes shimmer {
      0% { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
    .shimmer {
      background: linear-gradient(90deg, hsl(var(--muted)) 0px, hsl(var(--muted-foreground)/0.1) 40px, hsl(var(--muted)) 80px);
      background-size: 200px 100%;
      animation: shimmer 1.5s infinite;
    }
  `;

  const getAnimationClass = () => {
    switch (animationType) {
      case 'pulse': return 'animate-pulse';
      case 'bounce': return 'animate-bounce';
      case 'shimmer': return 'shimmer';
      default: return 'animate-pulse';
    }
  };

  // Error State
  if (hasError && !isLoading) {
    return (
      <Card className="bg-gradient-card border-destructive/20">
        <CardHeader className="text-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              {isOffline ? (
                <WifiOff className="w-8 h-8 text-destructive" />
              ) : (
                <BarChart3 className="w-8 h-8 text-destructive" />
              )}
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">
                {isOffline ? 'Connection Lost' : 'Loading Failed'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {isOffline 
                  ? 'Please check your internet connection and try again.'
                  : errorMessage
                }
              </p>
            </div>
            <Badge variant="destructive" className="animate-pulse">
              {isOffline ? 'Offline' : 'Error'}
            </Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Loading State
  if (isLoading || (!hasError && showSkeleton)) {
    return (
      <>
        <style>{shimmerAnimation}</style>
        <div className="space-y-6 animate-fade-in">
          {/* Hero KPIs Loading */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className={`bg-gradient-card ${getAnimationClass()}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Interactive Summary Loading */}
          <Card className={`bg-gradient-card ${getAnimationClass()}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-6 w-48" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overview metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center space-y-2">
                    <Skeleton className="w-12 h-12 mx-auto rounded-full" />
                    <Skeleton className="h-6 w-12 mx-auto" />
                    <Skeleton className="h-3 w-16 mx-auto" />
                  </div>
                ))}
              </div>

              {/* Detailed insights loading */}
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Skeleton className="w-5 h-5 mt-0.5 rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-5 w-12 rounded-full" />
                          </div>
                          <Skeleton className="h-3 w-full max-w-md" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart Loading */}
          <Card className={`bg-gradient-card ${getAnimationClass()}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <Skeleton className="h-8 w-24 rounded" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded" />
            </CardContent>
          </Card>

          {/* Loading indicator with message */}
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{loadingMessage}</span>
              {isOffline && (
                <Badge variant="outline" className="animate-pulse">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline Mode
                </Badge>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return null;
}

// Specialized loading components for different sections
export function ChartLoadingSkeleton() {
  return (
    <Card className="bg-gradient-card animate-pulse">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            {[40, 60, 80, 45, 70, 55, 90].map((height, i) => (
              <Skeleton 
                key={i} 
                className="w-8 rounded-t" 
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricCardSkeleton() {
  return (
    <Card className="bg-gradient-card animate-pulse">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function HeatmapLoadingSkeleton() {
  return (
    <Card className="bg-gradient-card animate-pulse">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((week) => (
            <div key={week} className="flex gap-1">
              <Skeleton className="h-3 w-16" />
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <Skeleton key={day} className="h-3 w-3 rounded-sm" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}