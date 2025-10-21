import { 
  Home, 
  Calendar, 
  BookOpen, 
  Target, 
  Clock, 
  BarChart3, 
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Bot,
  LogOut,
  TrendingUp,
  Sparkles,
  Store
} from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { AddCourseDialog } from "@/components/AddCourseDialog";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  badge?: string;
}

const mainItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Ada AI", url: "/ada", icon: Sparkles, badge: "Beta" },
  { title: "Marketplace", url: "/marketplace", icon: Store, badge: "Coming Soon" },
  { title: "Courses", url: "/courses", icon: BookOpen },
  { title: "Assignments", url: "/assignments", icon: Target },
  { title: "Study Timer", url: "/timer", icon: Clock },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const bottomItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, open, setOpen } = useSidebar();
  const { signOut } = useAuth();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const [showAddCourse, setShowAddCourse] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClass = (active: boolean) =>
    active 
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {open && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      
      <Sidebar
        className={`transition-all duration-300 ${collapsed ? "w-16" : "w-64"} border-r bg-card md:relative fixed z-50 h-full`}
        collapsible="icon"
      >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">
                Aqademiq
              </span>
            </div>
          )}
          <SidebarTrigger className="min-h-[44px] min-w-[44px]" />
        </div>
      </div>

      <SidebarContent className="flex flex-col h-full">
        {/* Quick Add Button */}
        <div className="p-4">
          <Button 
            className="w-full bg-gradient-primary hover:opacity-90 shadow-primary"
            size={collapsed ? "icon" : "default"}
            onClick={() => setShowAddCourse(true)}
          >
            <Plus className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Quick Add</span>}
          </Button>
        </div>

        {/* Main Navigation */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                     <NavLink 
                       to={item.url} 
                       end={item.url === "/"}
                       className={getNavClass(isActive(item.url))}
                       onClick={() => setOpen(false)}
                     >
                       <item.icon className="w-5 h-5" />
                       {!collapsed && (
                         <div className="flex items-center justify-between flex-1 ml-3">
                           <span>{item.title}</span>
                           {item.badge && (
                             <Badge variant="secondary" className="text-xs px-2 py-0.5 ml-2">
                               {item.badge}
                             </Badge>
                           )}
                         </div>
                       )}
                     </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Navigation */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                   <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={getNavClass(isActive(item.url))}
                      onClick={() => setOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            
            {/* Sign Out Button */}
            <div className="mt-4 p-2">
              <Button
                onClick={() => signOut()}
                variant="outline"
                size={collapsed ? "icon" : "default"}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              >
                <LogOut className="w-4 h-4" />
                {!collapsed && <span className="ml-2">Sign Out</span>}
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <AddCourseDialog 
        open={showAddCourse} 
        onOpenChange={setShowAddCourse} 
      />
    </Sidebar>
    </>
  );
}