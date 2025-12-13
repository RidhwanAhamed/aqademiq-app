import { Activity, Gauge, BrainCircuit, Clock3, Layers3, ClipboardCheck, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileAnalyticsTab = 
  | "activity" 
  | "performance" 
  | "efficiency" 
  | "time" 
  | "planning" 
  | "tasks";

interface TabConfig {
  id: MobileAnalyticsTab;
  label: string;
  icon: LucideIcon;
}

const tabs: TabConfig[] = [
  { id: "activity", label: "Activity", icon: Activity },
  { id: "performance", label: "Trends", icon: Gauge },
  { id: "efficiency", label: "Efficiency", icon: BrainCircuit },
  { id: "time", label: "Time", icon: Clock3 },
  { id: "planning", label: "Planning", icon: Layers3 },
  { id: "tasks", label: "Tasks", icon: ClipboardCheck },
];

interface MobileAnalyticsTabsProps {
  activeTab: MobileAnalyticsTab;
  onTabChange: (tab: MobileAnalyticsTab) => void;
}

export function MobileAnalyticsTabs({ activeTab, onTabChange }: MobileAnalyticsTabsProps) {
  return (
    <div className="flex-shrink-0 border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex gap-1 p-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all min-h-[40px]",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
