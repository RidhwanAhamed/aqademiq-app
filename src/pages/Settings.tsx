import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeCustomizer } from "@/components/ThemeCustomizer";
import { NotificationSettings } from "@/components/NotificationSettings";
import { GoogleCalendarSettings } from "@/components/GoogleCalendarSettings";
import { EnhancedNotificationSettings } from "@/components/EnhancedNotificationSettings";
import { SecurityMonitorDashboard } from "@/components/SecurityMonitorDashboard";
import { AchievementShowcase } from "@/components/AchievementShowcase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, User, Bell, Palette, Shield, Moon, Sun, Monitor, Download, Smartphone, CheckCircle2, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePWAInstall } from "@/hooks/usePWAInstall";

// Mobile abbreviated labels for tabs
const tabConfig = [
  { value: "general", label: "General", shortLabel: "General", icon: User },
  { value: "achievements", label: "Achievements", shortLabel: "Badges", icon: Trophy },
  { value: "notifications", label: "Notifications", shortLabel: "Alerts", icon: Bell },
  { value: "appearance", label: "Appearance", shortLabel: "Theme", icon: Palette },
  { value: "security", label: "Security", shortLabel: "Security", icon: Shield },
];

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isInstalled, platform } = usePWAInstall();
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    timezone: "UTC"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || user.email || "",
          timezone: data.timezone || "UTC"
        });
      } else {
        setProfile({
          full_name: "",
          email: user.email || "",
          timezone: "UTC"
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.full_name,
          email: profile.email,
          timezone: profile.timezone,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    if (!user) return;

    try {
      const [courses, assignments, exams, scheduleBlocks] = await Promise.all([
        supabase.from('courses').select('*').eq('user_id', user.id),
        supabase.from('assignments').select('*').eq('user_id', user.id),
        supabase.from('exams').select('*').eq('user_id', user.id),
        supabase.from('schedule_blocks').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        courses: courses.data || [],
        assignments: assignments.data || [],
        exams: exams.data || [],
        schedule_blocks: scheduleBlocks.data || [],
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aqademiq-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Error",
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Customize your Aqademiq experience</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
        {/* Scrollable tabs for mobile */}
        <div className="overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex gap-1 sm:grid sm:w-full sm:grid-cols-5 min-w-max sm:min-w-0 h-auto sm:h-10 p-1">
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value} 
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-4 sm:space-y-6">
          <GoogleCalendarSettings />

          {/* Install App Section */}
          <Card className="bg-gradient-card">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Download className="w-5 h-5" />
                Install App
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isInstalled ? (
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400 text-sm sm:text-base">App Installed</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Aqademiq is installed on your device</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {platform === 'desktop' ? (
                      <Monitor className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    ) : (
                      <Smartphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-1 text-sm sm:text-base">Get the native app experience</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Install Aqademiq for faster access, offline support, and a seamless experience.
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 sm:h-10" 
                    onClick={() => navigate('/install')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    View Install Instructions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Profile Settings */}
            <Card className="bg-gradient-card">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <User className="w-5 h-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Your full name" 
                    value={profile.full_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    className="h-12 sm:h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="your@email.com"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    className="h-12 sm:h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-sm">Timezone</Label>
                  <Input 
                    id="timezone" 
                    placeholder="UTC"
                    value={profile.timezone}
                    onChange={(e) => setProfile(prev => ({ ...prev, timezone: e.target.value }))}
                    className="h-12 sm:h-10"
                  />
                </div>
                <Button 
                  className="w-full bg-gradient-primary hover:opacity-90 h-12 sm:h-10"
                  onClick={saveProfile}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Account Actions */}
            <Card className="bg-gradient-card">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <SettingsIcon className="w-5 h-5" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <Button variant="outline" className="w-full h-12 sm:h-10" onClick={exportData}>
                  Export Data
                </Button>
                <Button variant="outline" className="w-full h-12 sm:h-10">
                  Reset All Data
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full h-12 sm:h-10"
                  onClick={() => signOut()}
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4 sm:space-y-6">
          <AchievementShowcase />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
          <EnhancedNotificationSettings />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4 sm:space-y-6">
          <ThemeCustomizer />
        </TabsContent>

        <TabsContent value="security" className="space-y-4 sm:space-y-6">
          <SecurityMonitorDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}