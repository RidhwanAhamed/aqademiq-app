import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, Sparkles, Clock, MoreHorizontal, BarChart3, BookOpen, GraduationCap, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

const mainNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Sparkles, label: 'Ada', path: '/ada' },
  { icon: Clock, label: 'Timer', path: '/timer' },
];

const moreNavItems = [
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: BookOpen, label: 'Assignments', path: '/assignments' },
  { icon: GraduationCap, label: 'Courses', path: '/courses' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { isKeyboardVisible } = useKeyboardHeight();

  // Hide nav completely when keyboard is visible (ChatGPT-style)
  if (isKeyboardVisible) {
    return null;
  }

  const isMoreActive = moreNavItems.some(item => 
    location.pathname === item.path || location.pathname.startsWith(item.path)
  );

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full min-w-[64px] gap-0.5 transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          {/* More button - opens sheet */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full min-w-[64px] gap-0.5 transition-colors",
              isMoreActive 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal className={cn(
              "w-5 h-5 transition-transform",
              isMoreActive && "scale-110"
            )} />
            <span className={cn(
              "text-[10px] font-medium",
              isMoreActive && "font-semibold"
            )}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More menu sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-2xl pb-8 safe-area-bottom">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg">More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-4">
            {moreNavItems.map((item) => {
              const isActive = location.pathname === item.path || 
                location.pathname.startsWith(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-6 h-6" />
                  <span className="text-xs font-medium text-center">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}