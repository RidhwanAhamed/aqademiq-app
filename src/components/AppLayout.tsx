import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, Loader2 } from "lucide-react";
import { useEffect } from "react";

export function AppLayout() {
  const { signOut, user, loading } = useAuth();
  const navigate = useNavigate();

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
        
        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <header className="lg:hidden h-16 border-b bg-card flex items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <SidebarTrigger className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </SidebarTrigger>
              <span className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">
                Aqademiq
              </span>
            </div>
            <Button 
              onClick={() => signOut()}
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}