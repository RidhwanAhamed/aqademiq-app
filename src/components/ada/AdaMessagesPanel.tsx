import React, { useRef, useEffect, useMemo, memo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdaMessageBubble, ChatMessage } from './AdaMessageBubble';
import { cn } from '@/lib/utils';
import {
  MessageCircle,
  CalendarPlus,
  Calendar,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';

interface AdaAction {
  type: 'CREATE_EVENT';
  title: string;
  start_iso: string;
  end_iso: string;
  location?: string;
  notes?: string;
}

interface ScheduleConflict {
  conflict_type: string;
  conflict_id: string;
  conflict_title: string;
  conflict_start: string;
  conflict_end: string;
}

interface PendingAction {
  action: AdaAction;
  status: 'pending' | 'confirmed' | 'cancelled';
  conflicts?: ScheduleConflict[];
  createdBlockId?: string;
}

interface AdaMessagesPanelProps {
  messages: ChatMessage[];
  pendingActions: PendingAction[];
  highContrast?: boolean;
  onCopy: (message: string) => void;
  onReaction: (messageId: string, reaction: string) => void;
  onAddToCalendar?: (data: any) => void;
  onSyncToGoogle?: (data: any) => void;
  onConfirmAction: (index: number) => void;
  onCancelAction: (index: number) => void;
  onQuickSuggestion: (text: string) => void;
}

export const AdaMessagesPanel = memo(function AdaMessagesPanel({
  messages,
  pendingActions,
  highContrast = false,
  onCopy,
  onReaction,
  onAddToCalendar,
  onSyncToGoogle,
  onConfirmAction,
  onCancelAction,
  onQuickSuggestion
}: AdaMessagesPanelProps) {
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      requestAnimationFrame(() => {
        const viewport = scrollViewportRef.current;
        if (viewport) {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        }
      });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Track scroll position for FAB visibility
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  const scrollToBottom = () => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  };

  // Memoize message list to prevent re-renders
  const messageElements = useMemo(() => {
    return messages.map((message, index) => (
      <AdaMessageBubble
        key={message.id}
        message={message}
        isLast={index === messages.length - 1}
        highContrast={highContrast}
        onCopy={onCopy}
        onReaction={onReaction}
        onAddToCalendar={onAddToCalendar}
        onSyncToGoogle={onSyncToGoogle}
      />
    ));
  }, [messages, highContrast, onCopy, onReaction, onAddToCalendar, onSyncToGoogle]);

  // Memoize pending actions UI
  const pendingActionsUI = useMemo(() => {
    return pendingActions
      .filter(p => p.status === 'pending')
      .map((pending, idx) => {
        const action = pending.action;
        const startDate = new Date(action.start_iso);
        const endDate = new Date(action.end_iso);
        const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const actionIndex = pendingActions.indexOf(pending);

        return (
          <div 
            key={`action-${idx}`}
            className="flex justify-start animate-fade-in"
          >
            <div className="flex items-start gap-2 sm:gap-3 w-full sm:max-w-[85%]">
              <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <CalendarPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <Card className={cn(
                "flex-1 p-3 sm:p-4 border-amber-200 dark:border-amber-800",
                "bg-gradient-to-br from-amber-50 to-orange-50",
                "dark:from-amber-950/30 dark:to-orange-950/30"
              )}>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 text-xs">
                      Confirm
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Create: <strong>{action.title}</strong>
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span>{startTime} - {endTime}</span>
                    </div>
                    {action.location && (
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0">📍</span>
                        <span className="truncate">{action.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {pending.conflicts && pending.conflicts.length > 0 && (
                    <div className="p-2 bg-destructive/10 rounded-md border border-destructive/20">
                      <div className="flex items-center gap-2 text-destructive text-xs font-medium">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Conflict: {pending.conflicts[0].conflict_title}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => onConfirmAction(actionIndex)}
                      className={cn(
                        "flex-1 sm:flex-none h-9 touch-target",
                        "bg-gradient-to-r from-green-500 to-emerald-500",
                        "hover:from-green-600 hover:to-emerald-600 text-white"
                      )}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCancelAction(actionIndex)}
                      className="flex-1 sm:flex-none h-9 touch-target text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5 mr-1.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );
      });
  }, [pendingActions, onConfirmAction, onCancelAction]);

  return (
    <div 
      className="absolute inset-0"
      style={{ 
        contain: 'strict',
        willChange: 'scroll-position'
      }}
    >
      <ScrollArea className="h-full w-full" viewportRef={scrollViewportRef}>
        <div 
          className="p-3 sm:p-6 space-y-3 sm:space-y-4" 
          role="log" 
          aria-live="polite" 
          aria-label="Chat messages"
        >
          {messages.length === 0 ? (
            <div className="text-center py-8 sm:py-12 space-y-4 px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2 text-base sm:text-lg">Welcome to Ada! 👋</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  I'm here to help organize your academic life. Upload schedules, ask questions, or plan your studies.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4 sm:mt-6">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onQuickSuggestion("Help me organize my schedule")}
                  className="text-xs rounded-full h-9 px-4 touch-target"
                >
                  Organize Schedule
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onQuickSuggestion("Create a study plan")}
                  className="text-xs rounded-full h-9 px-4 touch-target"
                >
                  Study Planning
                </Button>
              </div>
            </div>
          ) : (
            <>
              {messageElements}
              {pendingActionsUI}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Scroll to bottom FAB */}
      {showScrollButton && (
        <Button
          size="icon"
          variant="secondary"
          onClick={scrollToBottom}
          className={cn(
            "absolute bottom-4 right-4 h-10 w-10 rounded-full shadow-lg",
            "bg-background/90 backdrop-blur-sm border",
            "hover:bg-background animate-fade-in",
            "touch-target"
          )}
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
});