import { BarChart3 } from "lucide-react";

export function MobileAnalyticsHeader() {
  return (
    <header className="flex items-center justify-between px-4 py-3 flex-shrink-0">
      <div className="space-y-0.5">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <p className="text-xs text-muted-foreground">
          Understand how you study and improve focus
        </p>
      </div>
      <BarChart3 className="w-5 h-5 text-primary flex-shrink-0" />
    </header>
  );
}
