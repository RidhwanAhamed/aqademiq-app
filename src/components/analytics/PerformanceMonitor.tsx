import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Activity, 
  Cpu, 
  Database, 
  Wifi, 
  Battery,
  Smartphone,
  Monitor,
  Zap,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from "lucide-react";

interface PerformanceMonitorProps {
  onOptimizationChange?: (optimizations: any) => void;
}

export function PerformanceMonitor({ onOptimizationChange }: PerformanceMonitorProps) {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 60,
    memoryUsage: 0,
    networkLatency: 0,
    renderTime: 0,
    cacheHitRate: 0,
    batteryLevel: 1,
    connectionType: 'unknown'
  });

  const [optimizations, setOptimizations] = useState({
    enableVirtualization: true,
    enableLazyLoading: true,
    enableDataCaching: true,
    enableImageOptimization: true,
    enableCompressionForLowBandwidth: true,
    enableReducedAnimations: false,
    enableLowPowerMode: false
  });

  const [isMonitoring, setIsMonitoring] = useState(true);

  // Performance monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    const updateMetrics = () => {
      // FPS monitoring
      let lastFrameTime = performance.now();
      let frameCount = 0;
      
      const measureFPS = () => {
        frameCount++;
        const now = performance.now();
        if (now - lastFrameTime >= 1000) {
          setPerformanceMetrics(prev => ({
            ...prev,
            fps: frameCount
          }));
          frameCount = 0;
          lastFrameTime = now;
        }
        if (isMonitoring) requestAnimationFrame(measureFPS);
      };
      requestAnimationFrame(measureFPS);

      // Memory monitoring
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setPerformanceMetrics(prev => ({
          ...prev,
          memoryUsage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        }));
      }

      // Battery monitoring
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          setPerformanceMetrics(prev => ({
            ...prev,
            batteryLevel: battery.level * 100
          }));

          // Enable low power optimizations if battery is low
          if (battery.level < 0.2 && !battery.charging) {
            setOptimizations(prev => ({
              ...prev,
              enableLowPowerMode: true,
              enableReducedAnimations: true
            }));
          }
        }).catch(() => {
          // Battery API not supported
        });
      }

      // Connection monitoring
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setPerformanceMetrics(prev => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown',
          networkLatency: connection.rtt || 0
        }));

        // Enable compression for slow connections
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          setOptimizations(prev => ({
            ...prev,
            enableCompressionForLowBandwidth: true,
            enableReducedAnimations: true
          }));
        }
      }
    };

    const interval = setInterval(updateMetrics, 2000);
    updateMetrics(); // Initial call

    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Notify parent of optimization changes
  useEffect(() => {
    onOptimizationChange?.(optimizations);
  }, [optimizations, onOptimizationChange]);

  const getPerformanceStatus = (metric: string, value: number) => {
    switch (metric) {
      case 'fps':
        return value >= 55 ? 'excellent' : value >= 30 ? 'good' : 'poor';
      case 'memory':
        return value < 50 ? 'excellent' : value < 75 ? 'good' : 'poor';
      case 'battery':
        return value > 50 ? 'excellent' : value > 20 ? 'good' : 'poor';
      case 'network':
        return value < 100 ? 'excellent' : value < 300 ? 'good' : 'poor';
      default:
        return 'good';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-success';
      case 'good': return 'text-primary';
      case 'poor': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return CheckCircle;
      case 'good': return Activity;
      case 'poor': return AlertTriangle;
      default: return Activity;
    }
  };

  const toggleOptimization = (key: keyof typeof optimizations) => {
    setOptimizations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const metrics = [
    {
      id: 'fps',
      label: 'Frame Rate',
      value: performanceMetrics.fps,
      unit: 'fps',
      icon: Monitor,
      status: getPerformanceStatus('fps', performanceMetrics.fps),
      description: 'Smooth animations and interactions'
    },
    {
      id: 'memory',
      label: 'Memory Usage',
      value: Math.round(performanceMetrics.memoryUsage),
      unit: '%',
      icon: Cpu,
      status: getPerformanceStatus('memory', performanceMetrics.memoryUsage),
      description: 'RAM consumption by the application'
    },
    {
      id: 'battery',
      label: 'Battery Level',
      value: Math.round(performanceMetrics.batteryLevel),
      unit: '%',
      icon: Battery,
      status: getPerformanceStatus('battery', performanceMetrics.batteryLevel),
      description: 'Device battery status'
    },
    {
      id: 'network',
      label: 'Network Latency',
      value: performanceMetrics.networkLatency,
      unit: 'ms',
      icon: Wifi,
      status: getPerformanceStatus('network', performanceMetrics.networkLatency),
      description: 'Connection response time'
    }
  ];

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Performance Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              id="monitoring-toggle"
              checked={isMonitoring}
              onCheckedChange={setIsMonitoring}
            />
            <Label htmlFor="monitoring-toggle" className="text-sm">
              Live Monitoring
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const StatusIcon = getStatusIcon(metric.status);
            const statusColor = getStatusColor(metric.status);
            
            return (
              <Card key={metric.id} className="bg-gradient-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold">{metric.value}</span>
                      <span className="text-xs text-muted-foreground">{metric.unit}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                    
                    {/* Progress bar for percentage metrics */}
                    {(metric.id === 'memory' || metric.id === 'battery') && (
                      <Progress 
                        value={metric.value} 
                        className="h-1 mt-2"
                        aria-label={`${metric.label}: ${metric.value}${metric.unit}`}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Optimization Controls */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Performance Optimizations
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(optimizations).map(([key, enabled]) => {
              const labels = {
                enableVirtualization: 'Virtualization',
                enableLazyLoading: 'Lazy Loading', 
                enableDataCaching: 'Data Caching',
                enableImageOptimization: 'Image Optimization',
                enableCompressionForLowBandwidth: 'Low Bandwidth Mode',
                enableReducedAnimations: 'Reduced Animations',
                enableLowPowerMode: 'Low Power Mode'
              };
              
              const descriptions = {
                enableVirtualization: 'Render only visible components',
                enableLazyLoading: 'Load content when needed',
                enableDataCaching: 'Cache API responses locally',
                enableImageOptimization: 'Compress and optimize images',
                enableCompressionForLowBandwidth: 'Reduce data usage',
                enableReducedAnimations: 'Minimize motion for performance',
                enableLowPowerMode: 'Optimize for battery life'
              };
              
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                      {labels[key as keyof typeof labels]}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {descriptions[key as keyof typeof descriptions]}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={enabled}
                    onCheckedChange={() => toggleOptimization(key as keyof typeof optimizations)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Information */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            Device Information
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Connection:</span>
              <span className="ml-2 font-medium capitalize">
                {performanceMetrics.connectionType}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">CPU Cores:</span>
              <span className="ml-2 font-medium">
                {navigator.hardwareConcurrency || 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Platform:</span>
              <span className="ml-2 font-medium">
                {/Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Viewport:</span>
              <span className="ml-2 font-medium">
                {window.innerWidth} × {window.innerHeight}
              </span>
            </div>
          </div>
        </div>

        {/* Performance Recommendations */}
        {(performanceMetrics.fps < 30 || performanceMetrics.memoryUsage > 75) && (
          <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm text-warning mb-2">Performance Optimization Recommended</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {performanceMetrics.fps < 30 && (
                    <li>• Consider enabling reduced animations for smoother performance</li>
                  )}
                  {performanceMetrics.memoryUsage > 75 && (
                    <li>• High memory usage detected - try clearing cache or enabling virtualization</li>
                  )}
                  {performanceMetrics.networkLatency > 500 && (
                    <li>• Slow network detected - enable low bandwidth mode for better experience</li>
                  )}
                </ul>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Auto-enable optimizations based on performance
                  const newOptimizations = {
                    ...optimizations,
                    enableReducedAnimations: performanceMetrics.fps < 30,
                    enableLowPowerMode: performanceMetrics.batteryLevel < 20,
                    enableCompressionForLowBandwidth: performanceMetrics.networkLatency > 500
                  };
                  setOptimizations(newOptimizations);
                  onOptimizationChange?.(newOptimizations);
                }}
                className="text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                Auto-Fix
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}