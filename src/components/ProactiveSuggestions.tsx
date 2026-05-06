import type { MouseEvent } from "react";
import { useProactiveSuggestions, type ProactiveSuggestion } from "@/hooks/useProactiveSuggestions";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

function examTitleFromMessage(message: string): string {
  const m = message.match(/"([^"]+)"/);
  return m?.[1]?.trim() || "my exam";
}

/** Short bubble label + agent prompt tailored to proactive rule type. */
function getProactiveAction(s: ProactiveSuggestion): { label: string; prompt: string } {
  const type = s.metadata?.type as string | undefined;

  if (type === "exam_reminder") {
    const title = examTitleFromMessage(s.message);
    return {
      label: "Exam soon",
      prompt: `I have an upcoming exam "${title}". Help me revise and plan focused study time before it.`,
    };
  }

  if (type === "study_nudge") {
    return {
      label: "Study today?",
      prompt:
        "I haven't studied yet today. Please help me schedule a focused study session that fits my calendar.",
    };
  }

  if (type === "struggle_support") {
    const topic =
      typeof s.metadata.topic === "string" && s.metadata.topic.trim()
        ? s.metadata.topic.trim()
        : "this topic";
    const short =
      topic.length > 22 ? `${topic.slice(0, 20)}…` : topic;
    return {
      label: short,
      prompt: `I've been struggling with ${topic}. Create a focused revision plan and concrete steps for me.`,
    };
  }

  const msg = s.message.trim();
  return {
    label: msg.length > 28 ? `${msg.slice(0, 26)}…` : msg,
    prompt: msg,
  };
}

export function ProactiveSuggestions() {
  const { suggestions, markAsRead, loading } = useProactiveSuggestions();
  const navigate = useNavigate();

  if (!loading && suggestions.length === 0) {
    return null;
  }

  const handleBubbleClick = (suggestion: ProactiveSuggestion) => {
    const { prompt } = getProactiveAction(suggestion);
    void markAsRead(suggestion.id);
    navigate("/ada", {
      state: { prompt, proactiveKey: suggestion.id },
    });
  };

  const handleDismiss = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    void markAsRead(id);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      {loading && suggestions.length === 0 ? (
        <span className="text-xs text-muted-foreground">Checking suggestions…</span>
      ) : (
        suggestions.map((suggestion) => {
          const { label } = getProactiveAction(suggestion);
          return (
            <div key={suggestion.id} className="relative inline-flex max-w-full">
              <button
                type="button"
                onClick={() => handleBubbleClick(suggestion)}
                className="inline-flex items-center gap-1.5 max-w-full rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-left text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-primary/15 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                title={suggestion.message}
              >
                <span className="truncate">{label}</span>
              </button>
              <button
                type="button"
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm opacity-90 hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                onClick={(e) => handleDismiss(e, suggestion.id)}
                aria-label="Dismiss suggestion"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
