import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";

export function AppLayout() {
  const { signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>
        
        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <header className="lg:hidden h-14 border-b bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-40">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded bg-gradient-primary flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <span className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">
                StudyFlow
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
          <main className="flex-1 overflow-auto pb-20 lg:pb-0">
            <div className="container mx-auto px-4 py-4 lg:px-6 lg:py-6">
              <Outlet />
            </div>
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}