import React, { useRef, useEffect, useMemo, memo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdaMessageBubble, ChatMessage } from './AdaMessageBubble';
import { cn } from '@/lib/utils';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import {
  CalendarPlus,
  Calendar,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';

// All supported Ada AI action types
type AdaActionType = 
  | 'CREATE_EVENT' | 'UPDATE_EVENT' | 'DELETE_EVENT'
  | 'CREATE_ASSIGNMENT' | 'UPDATE_ASSIGNMENT' | 'DELETE_ASSIGNMENT' | 'COMPLETE_ASSIGNMENT'
  | 'CREATE_EXAM' | 'UPDATE_EXAM' | 'DELETE_EXAM'
  | 'CREATE_STUDY_SESSION' | 'UPDATE_STUDY_SESSION' | 'DELETE_STUDY_SESSION'
  | 'CREATE_COURSE' | 'UPDATE_COURSE' | 'DELETE_COURSE'
  | 'CREATE_CORNELL_NOTES';

interface AdaAction {
  type: AdaActionType;
  id?: string;
  title?: string;
  name?: string;
  start_iso?: string;
  end_iso?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  due_date?: string;
  exam_date?: string;
  location?: string;
  notes?: string;
  description?: string;
  course_id?: string;
  course_name?: string;
  priority?: number;
  estimated_hours?: number;
  assignment_type?: string;
  exam_type?: string;
  duration_minutes?: number;
  credits?: number;
  code?: string;
  instructor?: string;
  [key: string]: any;
}

interface ScheduleConflict {
  conflict_type: string;
  conflict_id: string;
  conflict_title: string;
  conflict_start: string;
  conflict_end: string;
}

export interface PendingAction {
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
  const { isKeyboardVisible } = useKeyboardHeight();

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

  // Scroll to bottom when keyboard appears
  useEffect(() => {
    if (isKeyboardVisible) {
      requestAnimationFrame(() => {
        const viewport = scrollViewportRef.current;
        if (viewport) {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        }
      });
    }
  }, [isKeyboardVisible]);

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
        const actionIndex = pendingActions.indexOf(pending);
        
        // Determine action details based on type
        const isCreate = action.type.startsWith('CREATE_');
        const isUpdate = action.type.startsWith('UPDATE_');
        const isDelete = action.type.startsWith('DELETE_');
        const isComplete = action.type === 'COMPLETE_ASSIGNMENT';
        
        const entityType = action.type.split('_').slice(1).join(' ').toLowerCase();
        const actionLabel = isCreate ? 'Create' : isUpdate ? 'Update' : isDelete ? 'Delete' : 'Complete';
        const entityName = action.title || action.name || 'item';
        
        // Format date/time if available
        let dateStr = '';
        let timeStr = '';
        if (action.start_iso) {
          const startDate = new Date(action.start_iso);
          const endDate = action.end_iso ? new Date(action.end_iso) : null;
          dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const endTime = endDate?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          timeStr = endTime ? `${startTime} - ${endTime}` : startTime;
        } else if (action.scheduled_start) {
          const startDate = new Date(action.scheduled_start);
          const endDate = action.scheduled_end ? new Date(action.scheduled_end) : null;
          dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const endTime = endDate?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          timeStr = endTime ? `${startTime} - ${endTime}` : startTime;
        } else if (action.due_date) {
          dateStr = new Date(action.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        } else if (action.exam_date) {
          dateStr = new Date(action.exam_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }

        const badgeColor = isDelete ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-300' :
                          isUpdate ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300' :
                          'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300';

        return (
          <div key={`action-${idx}`} className="flex justify-start animate-fade-in">
            <div className="flex items-start gap-2 sm:gap-3 w-full sm:max-w-[85%]">
              <div className={cn(
                "flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-lg",
                isDelete ? "bg-gradient-to-br from-red-500 to-rose-500" :
                isUpdate ? "bg-gradient-to-br from-blue-500 to-indigo-500" :
                "bg-gradient-to-br from-amber-500 to-orange-500"
              )}>
                <CalendarPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <Card className={cn(
                "flex-1 p-3 sm:p-4",
                isDelete ? "border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30" :
                isUpdate ? "border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30" :
                "border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"
              )}>
                <div className="space-y-2 sm:space-y-3">
                  <Badge variant="outline" className={cn("text-xs", badgeColor)}>
                    {actionLabel} {entityType}
                  </Badge>
                  <p className="text-sm font-medium text-foreground">
                    {actionLabel}: <strong>{entityName}</strong>
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {/* Date and time */}
                    {dateStr && <div className="flex items-center gap-2"><Calendar className="w-3 h-3" /><span>{dateStr}</span></div>}
                    {timeStr && <div className="flex items-center gap-2"><Clock className="w-3 h-3" /><span>{timeStr}</span></div>}
                    
                    {/* Course */}
                    {action.course_name && <div className="flex items-center gap-2"><span>📚</span><span>{action.course_name}</span></div>}
                    
                    {/* Location */}
                    {action.location && <div className="flex items-center gap-2"><span>📍</span><span>{action.location}</span></div>}
                    
                    {/* Priority (for assignments) */}
                    {action.priority && (
                      <div className="flex items-center gap-2">
                        <span>⭐</span>
                        <span>Priority: {action.priority === 1 ? 'High' : action.priority === 2 ? 'Medium' : 'Low'}</span>
                      </div>
                    )}
                    
                    {/* Assignment type */}
                    {action.assignment_type && (
                      <div className="flex items-center gap-2">
                        <span>📋</span>
                        <span>Type: {action.assignment_type.charAt(0).toUpperCase() + action.assignment_type.slice(1)}</span>
                      </div>
                    )}
                    
                    {/* Exam type and duration */}
                    {action.exam_type && (
                      <div className="flex items-center gap-2">
                        <span>📝</span>
                        <span>Type: {action.exam_type.charAt(0).toUpperCase() + action.exam_type.slice(1)}</span>
                      </div>
                    )}
                    {action.duration_minutes && (
                      <div className="flex items-center gap-2">
                        <span>⏱️</span>
                        <span>Duration: {action.duration_minutes} min</span>
                      </div>
                    )}
                    
                    {/* Estimated hours */}
                    {action.estimated_hours && (
                      <div className="flex items-center gap-2">
                        <span>⏳</span>
                        <span>Est. {action.estimated_hours} hour(s)</span>
                      </div>
                    )}
                    
                    {/* Course credits */}
                    {action.credits && (
                      <div className="flex items-center gap-2">
                        <span>🎓</span>
                        <span>{action.credits} credits</span>
                      </div>
                    )}
                    
                    {/* Course code */}
                    {action.code && (
                      <div className="flex items-center gap-2">
                        <span>🔢</span>
                        <span>Code: {action.code}</span>
                      </div>
                    )}
                    
                    {/* Instructor */}
                    {action.instructor && (
                      <div className="flex items-center gap-2">
                        <span>👨‍🏫</span>
                        <span>{action.instructor}</span>
                      </div>
                    )}
                    
                    {/* Description/notes */}
                    {(action.description || action.notes) && (
                      <div className="flex items-start gap-2 mt-1">
                        <span>📝</span>
                        <span className="line-clamp-2">{action.description || action.notes}</span>
                      </div>
                    )}
                  </div>
                  {pending.conflicts?.length > 0 && (
                    <div className="p-2 bg-destructive/10 rounded-md border border-destructive/20">
                      <div className="flex items-center gap-2 text-destructive text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" /><span>Conflict: {pending.conflicts[0].conflict_title}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => onConfirmAction(actionIndex)}
                      className={cn("flex-1 sm:flex-none h-9 touch-target text-white",
                        isDelete ? "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600" :
                        "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      )}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />{isDelete ? 'Delete' : 'Confirm'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onCancelAction(actionIndex)} className="flex-1 sm:flex-none h-9 touch-target text-muted-foreground">
                      <X className="w-3.5 h-3.5 mr-1.5" />Cancel
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
      className="absolute inset-0 overflow-hidden"
      style={{ 
        contain: 'strict'
      }}
    >
      <ScrollArea className="h-full w-full" viewportRef={scrollViewportRef}>
        <div 
          className="p-3 sm:p-6" 
          role="log" 
          aria-live="polite" 
          aria-label="Chat messages"
          style={{ 
            minHeight: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            paddingBottom: isKeyboardVisible ? '140px' : undefined // Extra space for fixed input
          }}
        >
          {messages.length === 0 ? (
            /* ChatGPT-style centered welcome - fills available space */
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-8">
                What can I help with?
              </h2>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                <Button 
                  variant="outline" 
                  onClick={() => onQuickSuggestion("Help me organize my schedule")}
                  className="rounded-full h-9 px-4 text-sm touch-target"
                >
                  Organize Schedule
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => onQuickSuggestion("Create a study plan")}
                  className="rounded-full h-9 px-4 text-sm touch-target"
                >
                  Study Planning
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => onQuickSuggestion("Upload my timetable")}
                  className="rounded-full h-9 px-4 text-sm touch-target"
                >
                  Upload Timetable
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {messageElements}
              {pendingActionsUI}
            </div>
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