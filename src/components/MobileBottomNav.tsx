import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Calendar, 
  BookOpen, 
  Target, 
  Clock, 
  BarChart3, 
  Settings,
  Bot
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  badge?: string;
}

const navItems: NavItem[] = [
  { title: "Home", url: "/", icon: Home },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "StudySage", url: "/studysage", icon: Bot, badge: "Beta" },
  { title: "Courses", url: "/courses", icon: BookOpen },
  { title: "Timer", url: "/timer", icon: Clock },
];

export function MobileBottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border">
      <nav className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className="flex flex-col items-center justify-center min-w-0 flex-1 px-1 py-2 rounded-lg transition-colors"
            >
              <div className={`flex flex-col items-center justify-center ${
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}>
                <div className="relative">
                  <item.icon className="w-5 h-5 mb-1" />
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-2 -right-2 text-[10px] px-1 py-0 h-4 min-w-4"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className={`text-xs font-medium truncate ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}>
                  {item.title}
                </span>
              </div>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}