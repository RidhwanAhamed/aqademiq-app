import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Vibrate, Bell, BellOff, Smartphone } from "lucide-react";
import { haptics } from "@/services/haptics";
import { notificationService } from "@/services/notifications";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

export function NativeFeaturesTester() {
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();

  const testHaptic = async (type: string, fn: () => Promise<void>) => {
    await fn();
    toast({
      title: "Haptic Triggered",
      description: `${type} haptic feedback sent`,
    });
  };

  const showTestNotification = async () => {
    await notificationService.showLocalNotification({
      title: "Test Notification",
      body: "This is a test notification from Aqademiq!",
      data: { type: "test" }
    });
    toast({
      title: "Notification Sent",
      description: "Check your notification center",
    });
  };

  const scheduleNotification = async () => {
    const scheduleTime = new Date(Date.now() + 5000); // 5 seconds from now
    await notificationService.scheduleNotification({
      title: "Scheduled Test",
      body: "This notification was scheduled 5 seconds ago!",
      schedule: { at: scheduleTime }
    });
    toast({
      title: "Notification Scheduled",
      description: "Will appear in 5 seconds",
    });
  };

  const cancelAllNotifications = async () => {
    await notificationService.cancelAllNotifications();
    toast({
      title: "Notifications Cancelled",
      description: "All pending notifications have been cancelled",
    });
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader className="pb-2 sm:pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Smartphone className="w-5 h-5" />
            Native Features Testing
          </CardTitle>
          <Badge variant={isNative ? "default" : "secondary"}>
            {isNative ? "Native" : "Web"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isNative && (
          <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              These features only work on iOS/Android. Run the app via Xcode or Android Studio to test.
            </p>
          </div>
        )}

        {/* Haptics Section */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <Vibrate className="w-4 h-4" />
            Haptic Feedback
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="h-10"
              onClick={() => testHaptic("Light", haptics.light)}
            >
              Light
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-10"
              onClick={() => testHaptic("Medium", haptics.medium)}
            >
              Medium
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-10"
              onClick={() => testHaptic("Heavy", haptics.heavy)}
            >
              Heavy
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-10"
              onClick={() => testHaptic("Selection", haptics.selectionChanged)}
            >
              Selection
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-10 bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
              onClick={() => testHaptic("Success", haptics.success)}
            >
              Success
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-10 bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20"
              onClick={() => testHaptic("Warning", haptics.warning)}
            >
              Warning
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-10 bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
              onClick={() => testHaptic("Error", haptics.error)}
            >
              Error
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-10"
              onClick={() => testHaptic("Vibrate", () => haptics.vibrate(300))}
            >
              Vibrate
            </Button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <Bell className="w-4 h-4" />
            Local Notifications
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              className="h-12 sm:h-10"
              onClick={showTestNotification}
            >
              <Bell className="w-4 h-4 mr-2" />
              Show Now
            </Button>
            <Button 
              variant="outline" 
              className="h-12 sm:h-10"
              onClick={scheduleNotification}
            >
              <Bell className="w-4 h-4 mr-2" />
              Schedule (5s)
            </Button>
            <Button 
              variant="outline" 
              className="h-12 sm:h-10"
              onClick={cancelAllNotifications}
            >
              <BellOff className="w-4 h-4 mr-2" />
              Cancel All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
