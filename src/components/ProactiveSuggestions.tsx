import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProactiveSuggestions } from "@/hooks/useProactiveSuggestions";
import { Bell, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ProactiveSuggestions() {
  const { suggestions, markAsRead, loading } = useProactiveSuggestions();
  const navigate = useNavigate();

  if (!loading && suggestions.length === 0) {
    return null;
  }

  const handleSuggestionClick = (message: string) => {
    navigate("/ada", { state: { prompt: message } });
  };

  return (
    <Card className="bg-gradient-card shadow-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Proactive Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && suggestions.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground">Checking for suggestions...</p>
        ) : (
          suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-background/60"
            >
              <button
                type="button"
                onClick={() => handleSuggestionClick(suggestion.message)}
                className="text-left flex-1 text-sm text-foreground hover:text-primary transition-colors"
              >
                {suggestion.message}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => markAsRead(suggestion.id)}
                aria-label="Dismiss suggestion"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
