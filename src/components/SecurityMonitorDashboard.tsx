import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle, Eye, RefreshCw } from 'lucide-react';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

/**
 * Security Monitor Dashboard Component
 * Provides comprehensive security monitoring interface for administrators and users
 */
export function SecurityMonitorDashboard() {
  const { 
    metrics, 
    alerts, 
    loading: monitoringLoading, 
    monitorActivity,
    logSecurityEvent
  } = useSecurityMonitoring();
  
  const { 
    events, 
    loading: auditLoading, 
    refetch: refetchAuditLog 
  } = useSecurityAudit();

  const handleRefreshMonitoring = async () => {
    await logSecurityEvent('security_dashboard_refreshed', 'security_monitoring');
    await monitorActivity();
    await refetchAuditLog();
  };

  const getRiskBadgeVariant = (riskScore: number) => {
    if (riskScore >= 8) return 'destructive';
    if (riskScore >= 6) return 'default';
    return 'secondary';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Total events logged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.highRiskAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Check</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono">
              {formatTimestamp(metrics.lastSecurityCheck)}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefreshMonitoring}
              disabled={monitoringLoading}
              className="mt-2"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${monitoringLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Security Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Active Security Alerts
            </CardTitle>
            <CardDescription>
              Security alerts requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <Alert key={index} variant={alert.risk_score >= 8 ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.alert_message}</span>
                    <Badge variant={getRiskBadgeVariant(alert.risk_score)}>
                      Risk: {alert.risk_score}/10
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1 text-sm">
                      <div><strong>Type:</strong> {alert.alert_type}</div>
                      <div><strong>Event Count:</strong> {alert.event_count}</div>
                      <div><strong>Last Occurrence:</strong> {formatTimestamp(alert.last_occurrence)}</div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>
            Latest security audit log entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLoading ? (
            <div className="flex items-center justify-center p-4">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Loading security events...
            </div>
          ) : events.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No security events recorded yet
            </div>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 10).map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="font-medium">{event.action}</div>
                    <div className="text-sm text-muted-foreground">
                      {event.resource_type}
                      {event.details && Object.keys(event.details).length > 0 && (
                        <span className="ml-2 text-xs">
                          ({Object.keys(event.details).length} details)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground ml-4">
                    {formatTimestamp(event.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
          <CardDescription>
            Proactive security measures to enhance protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Enhanced Authentication</AlertTitle>
              <AlertDescription>
                Consider enabling two-factor authentication for additional security.
              </AlertDescription>
            </Alert>

            <Alert>
              <Eye className="h-4 w-4" />
              <AlertTitle>Regular Security Audits</AlertTitle>
              <AlertDescription>
                Review security logs regularly and monitor for unusual activity patterns.
              </AlertDescription>
            </Alert>

            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertTitle>Token Rotation</AlertTitle>
              <AlertDescription>
                Regularly refresh OAuth tokens and review connected applications.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}