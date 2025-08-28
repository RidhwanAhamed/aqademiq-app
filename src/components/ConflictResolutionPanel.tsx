import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Users, 
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Zap,
  Target,
  Calendar,
  BarChart3,
  Lightbulb,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useAdvancedConflictDetection, type AdvancedConflict } from '@/hooks/useAdvancedConflictDetection';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ConflictResolutionPanelProps {
  onConflictResolved?: (conflictId: string) => void;
  onRefreshNeeded?: () => void;
  className?: string;
}

const CONFLICT_TYPE_ICONS = {
  time_overlap: Clock,
  deadline_cluster: Calendar,
  workload_peak: TrendingUp,
  location_conflict: MapPin,
  travel_time: MapPin,
  study_overload: BarChart3
};

const CONFLICT_COLORS = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  major: 'text-orange-600 bg-orange-50 border-orange-200',
  minor: 'text-yellow-600 bg-yellow-50 border-yellow-200'
};

export function ConflictResolutionPanel({ 
  onConflictResolved,
  onRefreshNeeded,
  className 
}: ConflictResolutionPanelProps) {
  const { toast } = useToast();
  const {
    conflicts,
    loading,
    conflictAnalytics,
    detectConflicts,
    autoResolveConflicts,
    refreshConflicts
  } = useAdvancedConflictDetection();

  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([]);
  const [resolutionProgress, setResolutionProgress] = useState(0);
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('overview');
  const [autoResolving, setAutoResolving] = useState(false);

  useEffect(() => {
    // Initial conflict detection
    detectConflicts();
  }, [detectConflicts]);

  const handleAutoResolve = async () => {
    if (selectedConflicts.length === 0) {
      toast({
        title: 'No Conflicts Selected',
        description: 'Please select conflicts to auto-resolve',
        variant: 'destructive'
      });
      return;
    }

    setAutoResolving(true);
    setResolutionProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setResolutionProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const results = await autoResolveConflicts(selectedConflicts);

      clearInterval(progressInterval);
      setResolutionProgress(100);

      // Show results
      if (results.resolved > 0) {
        toast({
          title: 'Conflicts Resolved',
          description: `Successfully resolved ${results.resolved} conflicts`,
        });
        
        setSelectedConflicts([]);
        onRefreshNeeded?.();
      }

      if (results.failed > 0) {
        toast({
          title: 'Some Resolutions Failed',
          description: `${results.failed} conflicts could not be auto-resolved`,
          variant: 'destructive'
        });
      }

    } catch (error) {
      console.error('Auto-resolve error:', error);
      toast({
        title: 'Resolution Failed',
        description: 'Failed to auto-resolve conflicts. Please try manual resolution.',
        variant: 'destructive'
      });
    } finally {
      setAutoResolving(false);
      setTimeout(() => setResolutionProgress(0), 2000);
    }
  };

  const handleRefreshConflicts = async () => {
    try {
      await refreshConflicts();
      toast({
        title: 'Conflicts Refreshed',
        description: 'Conflict analysis has been updated'
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh conflicts',
        variant: 'destructive'
      });
    }
  };

  const toggleConflictExpansion = (conflictId: string) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId);
    } else {
      newExpanded.add(conflictId);
    }
    setExpandedConflicts(newExpanded);
  };

  const toggleConflictSelection = (conflictId: string) => {
    setSelectedConflicts(prev => 
      prev.includes(conflictId)
        ? prev.filter(id => id !== conflictId)
        : [...prev, conflictId]
    );
  };

  const getSeverityBadge = (severity: AdvancedConflict['severity']) => {
    const variants = {
      critical: 'destructive',
      major: 'secondary', 
      minor: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[severity]} className="text-xs">
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const renderConflictItem = (conflict: AdvancedConflict) => {
    const IconComponent = CONFLICT_TYPE_ICONS[conflict.type];
    const isExpanded = expandedConflicts.has(conflict.id);
    const isSelected = selectedConflicts.includes(conflict.id);

    return (
      <Card key={conflict.id} className={cn(
        "transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary/50 bg-primary/5"
      )}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleConflictExpansion(conflict.id)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn(
                    "p-2 rounded-lg border",
                    CONFLICT_COLORS[conflict.severity]
                  )}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-sm font-medium truncate">
                        {conflict.title}
                      </CardTitle>
                      {getSeverityBadge(conflict.severity)}
                      {conflict.auto_resolvable && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-600">
                          <Zap className="w-3 h-3 mr-1" />
                          Auto-fix
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {conflict.description}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {conflict.affected_items.length} items affected
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {conflict.suggestions.length} suggestions
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-2">
                  {conflict.auto_resolvable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleConflictSelection(conflict.id);
                      }}
                      className={cn(
                        "h-8 w-8 p-0",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Affected Items */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Affected Items
                </h4>
                <div className="space-y-2">
                  {conflict.affected_items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-sm">
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      <span className="font-medium">{item.title}</span>
                      {item.start_time && (
                        <span className="text-muted-foreground">
                          {new Date(item.start_time).toLocaleDateString()}
                        </span>
                      )}
                      {item.location && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Smart Suggestions
                </h4>
                <div className="space-y-2">
                  {conflict.suggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{suggestion.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Impact: {Math.round(suggestion.impact_score * 100)}%
                            </Badge>
                            {suggestion.auto_executable && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-600">
                                Auto-executable
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-2"
                          onClick={() => {
                            // Implement suggestion execution
                            toast({
                              title: 'Suggestion Applied',
                              description: suggestion.description
                            });
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                      
                      {suggestion.estimated_time_savings && (
                        <p className="text-xs text-muted-foreground">
                          Estimated time savings: {Math.round(suggestion.estimated_time_savings)} minutes
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              {conflict.metadata && (
                <div className="p-3 bg-muted/20 rounded-lg">
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">Technical Details</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(conflict.metadata).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key.replace(/_/g, ' ')}: </span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Conflict Resolution Center
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshConflicts}
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold">{conflictAnalytics.total_conflicts}</p>
                      <p className="text-xs text-muted-foreground">Total Conflicts</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{conflictAnalytics.auto_resolvable}</p>
                      <p className="text-xs text-muted-foreground">Auto-Resolvable</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{Math.round(conflictAnalytics.estimated_time_impact / 60)}h</p>
                      <p className="text-xs text-muted-foreground">Time Impact</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">{conflictAnalytics.severity_breakdown.critical}</p>
                      <p className="text-xs text-muted-foreground">Critical</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Auto-Resolve Section */}
              {conflictAnalytics.auto_resolvable > 0 && (
                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-green-800 mb-1">
                          Smart Auto-Resolution Available
                        </h3>
                        <p className="text-sm text-green-700 mb-3">
                          {selectedConflicts.length > 0 
                            ? `${selectedConflicts.length} conflicts selected for auto-resolution`
                            : `${conflictAnalytics.auto_resolvable} conflicts can be automatically resolved`
                          }
                        </p>
                        
                        {resolutionProgress > 0 && (
                          <div className="space-y-2">
                            <Progress value={resolutionProgress} className="h-2" />
                            <p className="text-xs text-green-600">
                              Resolving conflicts... {resolutionProgress}%
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        onClick={handleAutoResolve}
                        disabled={autoResolving || selectedConflicts.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {autoResolving ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Auto-Resolve ({selectedConflicts.length})
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="conflicts" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Analyzing conflicts...</p>
                </div>
              ) : conflicts.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No conflicts detected! Your schedule looks well-organized.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {conflicts
                    .sort((a, b) => {
                      // Sort by severity (critical first), then by type
                      const severityOrder = { critical: 3, major: 2, minor: 1 };
                      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
                      if (severityDiff !== 0) return severityDiff;
                      return a.type.localeCompare(b.type);
                    })
                    .map(renderConflictItem)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Severity Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Severity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(conflictAnalytics.severity_breakdown).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            severity === 'critical' && "bg-red-500",
                            severity === 'major' && "bg-orange-500", 
                            severity === 'minor' && "bg-yellow-500"
                          )} />
                          <span className="text-sm font-medium capitalize">{severity}</span>
                        </div>
                        <span className="text-sm font-bold">{count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Type Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Conflict Types</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(conflictAnalytics.type_breakdown).map(([type, count]) => {
                      const IconComponent = CONFLICT_TYPE_ICONS[type as keyof typeof CONFLICT_TYPE_ICONS];
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                          <span className="text-sm font-bold">{count}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}