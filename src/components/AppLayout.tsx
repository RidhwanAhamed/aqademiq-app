import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SmartNudge } from "@/components/SmartNudge";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

export function AppLayout() {
  const { signOut, user, loading } = useAuth();
  const navigate = useNavigate();
  const { isKeyboardVisible } = useKeyboardHeight();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Header - with iOS safe area support */}
          <header className="lg:hidden border-b bg-card/95 backdrop-blur-lg flex items-center justify-between px-4 sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center space-x-2 h-14">
              <SidebarTrigger className="h-9 w-9">
                <Menu className="h-4 w-4" />
              </SidebarTrigger>
              <span className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">
                Aqademiq
              </span>
            </div>
            <div className="flex items-center h-14">
              <Button 
                onClick={() => signOut()}
                variant="ghost" 
                size="icon"
                className="h-9 w-9"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Main Content - With bottom padding on mobile for nav (removed when keyboard visible) */}
          <main className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden min-w-0",
            isKeyboardVisible ? "pb-0" : "pb-20 lg:pb-0"
          )}>
            <Outlet />
          </main>

          {/* Smart Nudge - Floating above bottom nav */}
          <SmartNudge className="fixed bottom-24 left-4 right-4 z-50 lg:bottom-4 lg:left-auto lg:right-4 lg:w-96" />

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
