import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { haptics } from '@/services/haptics';
import { notificationService } from '@/services/notifications';
import { 
  Vibrate, 
  Bell, 
  BellRing, 
  BellOff, 
  Smartphone,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export function NativeFeaturesTester() {
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const [permissionStatus, setPermissionStatus] = useState<string>('checking...');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const status = await notificationService.getPermissionStatus();
    setPermissionStatus(status.display);
  };

  const testHaptic = async (type: string, fn: () => Promise<boolean>) => {
    setIsLoading(type);
    const success = await fn();
    setIsLoading(null);
    
    if (success) {
      toast({
        title: `${type} Haptic`,
        description: 'Triggered successfully',
      });
    } else {
      toast({
        title: `${type} Haptic Failed`,
        description: isNative 
          ? 'Check device haptic settings or permissions' 
          : 'Haptics only work on native iOS/Android',
        variant: 'destructive',
      });
    }
  };

  const requestPermissions = async () => {
    setIsLoading('permissions');
    const status = await notificationService.checkAndRequestPermissions();
    setPermissionStatus(status.display);
    setIsLoading(null);
    
    toast({
      title: 'Permission Status',
      description: status.display === 'granted' 
        ? 'Notifications enabled!' 
        : 'Notification permission denied. Please enable in device settings.',
      variant: status.display === 'granted' ? 'default' : 'destructive',
    });
  };

  const showTestNotification = async () => {
    setIsLoading('show');
    
    // Initialize first if needed
    await notificationService.initializeLocal();
    
    const success = await notificationService.showLocalNotification({
      title: 'Test Notification',
      body: 'This is a test from Aqademiq! 🎉',
      data: { type: 'test' }
    });
    
    setIsLoading(null);
    await checkPermissions();
    
    if (success) {
      toast({
        title: 'Notification Sent',
        description: 'Check your notification tray',
      });
    } else {
      toast({
        title: 'Notification Failed',
        description: permissionStatus !== 'granted'
          ? 'Permission denied. Tap "Request Permission" first.'
          : 'Failed to show notification. Check device settings.',
        variant: 'destructive',
      });
    }
  };

  const scheduleNotification = async () => {
    setIsLoading('schedule');
    
    // Initialize first if needed
    await notificationService.initializeLocal();
    
    const scheduleTime = new Date(Date.now() + 5000);
    const id = await notificationService.scheduleNotification({
      title: 'Scheduled Notification',
      body: 'This was scheduled 5 seconds ago! ⏰',
      schedule: { at: scheduleTime }
    });
    
    setIsLoading(null);
    await checkPermissions();
    
    if (id !== null) {
      toast({
        title: 'Notification Scheduled',
        description: 'Will appear in 5 seconds',
      });
    } else {
      toast({
        title: 'Scheduling Failed',
        description: permissionStatus !== 'granted'
          ? 'Permission denied. Tap "Request Permission" first.'
          : 'Failed to schedule notification. Check device settings.',
        variant: 'destructive',
      });
    }
  };

  const cancelAllNotifications = async () => {
    setIsLoading('cancel');
    const success = await notificationService.cancelAllNotifications();
    setIsLoading(null);
    
    if (success) {
      toast({
        title: 'Notifications Cancelled',
        description: 'All pending notifications cleared',
      });
    } else {
      toast({
        title: 'Cancel Failed',
        description: 'Could not cancel notifications',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Native Features Testing
            </CardTitle>
            <CardDescription>
              Test haptic feedback and notifications on your device
            </CardDescription>
          </div>
          <Badge variant={isNative ? 'default' : 'secondary'}>
            {isNative ? `${platform.charAt(0).toUpperCase() + platform.slice(1)}` : 'Web'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isNative && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-500">
              Native features only work on iOS/Android devices. 
              Build with Capacitor and test on a real device or emulator.
            </p>
          </div>
        )}

        {/* Haptic Feedback Section */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Vibrate className="h-4 w-4" />
            Haptic Feedback
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'Light'}
              onClick={() => testHaptic('Light', haptics.light)}
            >
              Light
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'Medium'}
              onClick={() => testHaptic('Medium', haptics.medium)}
            >
              Medium
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'Heavy'}
              onClick={() => testHaptic('Heavy', haptics.heavy)}
            >
              Heavy
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'Selection'}
              onClick={() => testHaptic('Selection', haptics.selectionChanged)}
            >
              Selection
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'Success'}
              onClick={() => testHaptic('Success', haptics.success)}
            >
              ✓ Success
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'Warning'}
              onClick={() => testHaptic('Warning', haptics.warning)}
            >
              ⚠ Warning
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'Error'}
              onClick={() => testHaptic('Error', haptics.error)}
            >
              ✕ Error
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'Vibrate'}
              onClick={() => testHaptic('Vibrate', () => haptics.vibrate(300))}
            >
              Vibrate
            </Button>
          </div>
        </div>

        {/* Local Notifications Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Local Notifications
            </h4>
            <Badge 
              variant={permissionStatus === 'granted' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {permissionStatus === 'granted' ? 'Enabled' : 
               permissionStatus === 'denied' ? 'Denied' : 
               permissionStatus === 'prompt' ? 'Not Asked' : permissionStatus}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'permissions'}
              onClick={requestPermissions}
              className="col-span-2"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Request Permission
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'show'}
              onClick={showTestNotification}
            >
              <BellRing className="h-4 w-4 mr-2" />
              Show Now
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'schedule'}
              onClick={scheduleNotification}
            >
              <Bell className="h-4 w-4 mr-2" />
              In 5 Seconds
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading === 'cancel'}
              onClick={cancelAllNotifications}
              className="col-span-2"
            >
              <BellOff className="h-4 w-4 mr-2" />
              Cancel All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default NativeFeaturesTester;