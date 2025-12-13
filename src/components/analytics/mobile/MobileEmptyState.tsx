import { BarChart3, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function MobileEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
      <div className="p-4 rounded-full bg-muted/30 mb-4">
        <BarChart3 className="w-12 h-12 text-muted-foreground/40" />
      </div>
      
      <h2 className="text-lg font-semibold text-foreground mb-2">
        No Analytics Yet
      </h2>
      
      <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
        Start a study session to see your analytics and track your progress.
      </p>
      
      <Button
        onClick={() => navigate("/timer")}
        className="gap-2"
      >
        <Play className="w-4 h-4" />
        Start Studying
      </Button>
    </div>
  );
}
