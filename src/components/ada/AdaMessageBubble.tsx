import React, { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Bot,
  User,
  Copy,
  ThumbsUp,
  Heart,
  Paperclip,
  CalendarPlus,
  Calendar,
  Check
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  message: string;
  is_user: boolean;
  created_at: string;
  file_upload_id?: string;
  metadata?: any;
  reactions?: string[];
}

interface AdaMessageBubbleProps {
  message: ChatMessage;
  isLast: boolean;
  highContrast?: boolean;
  onCopy: (message: string) => void;
  onReaction: (messageId: string, reaction: string) => void;
  onAddToCalendar?: (data: any) => void;
  onSyncToGoogle?: (data: any) => void;
}

export const AdaMessageBubble = memo(function AdaMessageBubble({
  message,
  isLast,
  highContrast = false,
  onCopy,
  onReaction,
  onAddToCalendar,
  onSyncToGoogle
}: AdaMessageBubbleProps) {
  const isUser = message.is_user;
  const hasCalendarData = message.metadata?.can_add_to_calendar;
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    onCopy(message.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTap = () => {
    // Toggle actions on tap for mobile
    if (!isUser) {
      setShowActions(prev => !prev);
    }
  };
  
  return (
    <div 
      className={cn(
        "flex gap-2 sm:gap-3 max-w-full group",
        isUser ? "justify-end" : "justify-start",
        isLast && "mb-2 sm:mb-4"
      )}
      role="listitem"
      aria-label={`${isUser ? 'Your' : 'Ada\'s'} message`}
    >
      {/* Bot avatar - smaller on mobile */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
      )}
      
      <div className={cn(
        "flex flex-col space-y-1.5 sm:space-y-2",
        // Wider bubbles on mobile for better readability
        "max-w-[88%] sm:max-w-[80%] md:max-w-[75%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div 
          className={cn(
            "relative px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-sm border transition-all duration-200",
            isUser 
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md" 
              : "bg-gradient-to-br from-card to-card/80 text-foreground rounded-bl-md border-border/50",
            highContrast && (
              isUser 
                ? "bg-black text-white border-white" 
                : "bg-white text-black border-black"
            ),
            // Tap effect
            "active:scale-[0.98] transition-transform touch-manipulation"
          )}
          onClick={handleTap}
        >
          <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({...props}) => <h1 className="text-base sm:text-lg font-bold mb-2 text-foreground" {...props} />,
                h2: ({...props}) => <h2 className="text-sm sm:text-base font-semibold mb-2 text-foreground" {...props} />,
                h3: ({...props}) => <h3 className="text-xs sm:text-sm font-medium mb-1 text-foreground" {...props} />,
                p: ({...props}) => <p className="mb-2 last:mb-0 text-foreground" {...props} />,
                ul: ({...props}) => <ul className="list-disc list-inside mb-2 space-y-1 text-foreground" {...props} />,
                ol: ({...props}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-foreground" {...props} />,
                li: ({...props}) => <li className="text-foreground text-sm" {...props} />,
                strong: ({...props}) => <strong className="font-semibold text-foreground" {...props} />,
                em: ({...props}) => <em className="italic text-foreground" {...props} />,
                code: ({children, className, ...props}) => {
                  const isInline = !className || !className.includes('language-');
                  return isInline 
                    ? <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground" {...props}>{children}</code>
                    : <code className="block bg-muted p-2 sm:p-3 rounded-md text-xs font-mono overflow-x-auto text-foreground" {...props}>{children}</code>;
                },
                pre: ({...props}) => <pre className="bg-muted p-2 sm:p-3 rounded-md overflow-x-auto mb-2" {...props} />,
                blockquote: ({...props}) => <blockquote className="border-l-4 border-primary pl-3 sm:pl-4 italic text-muted-foreground mb-2" {...props} />,
              }}
            >
              {message.message}
            </ReactMarkdown>
          </div>
          
          {message.file_upload_id && (
            <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
              <Paperclip className="w-3 h-3" />
              File attached
            </div>
          )}
          
          {/* Action buttons - show on hover (desktop) or tap (mobile) */}
          {!isUser && (
            <div className={cn(
              "absolute -bottom-2 right-2 flex gap-1 transition-opacity duration-200",
              "bg-background rounded-full shadow-md p-1 border",
              // Desktop: hover, Mobile: tap to show
              "opacity-0 group-hover:opacity-100",
              showActions && "opacity-100"
            )}>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 sm:h-6 sm:w-6 p-0 text-muted-foreground hover:text-foreground touch-target"
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                aria-label="Copy message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 sm:h-6 sm:w-6 p-0 text-muted-foreground hover:text-foreground touch-target"
                onClick={(e) => { e.stopPropagation(); onReaction(message.id, '👍'); }}
                aria-label="Like message"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 sm:h-6 sm:w-6 p-0 text-muted-foreground hover:text-foreground touch-target"
                onClick={(e) => { e.stopPropagation(); onReaction(message.id, '❤️'); }}
                aria-label="Love message"
              >
                <Heart className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Calendar action buttons */}
        {hasCalendarData && (
          <div className="flex flex-wrap gap-2">
            {message.metadata?.can_add_to_calendar && onAddToCalendar && (
              <Button
                size="sm"
                onClick={() => onAddToCalendar(message.metadata.parsed_data)}
                className={cn(
                  "h-8 sm:h-9 text-xs sm:text-sm touch-target",
                  "bg-gradient-to-r from-green-500 to-green-600",
                  "hover:from-green-600 hover:to-green-700 text-white shadow-md"
                )}
              >
                <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                Add to Calendar
              </Button>
            )}
            {message.metadata?.can_sync_to_google && onSyncToGoogle && (
              <Button
                size="sm"
                onClick={() => onSyncToGoogle(message.metadata.parsed_data)}
                variant="outline"
                className="h-8 sm:h-9 text-xs sm:text-sm border-blue-300 text-blue-600 hover:bg-blue-50 touch-target"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Sync to Google
              </Button>
            )}
          </div>
        )}
        
        {/* Timestamp */}
        <div className="text-[10px] sm:text-xs text-muted-foreground px-1">
          {format(new Date(message.created_at), 'HH:mm')}
        </div>
        
        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 px-1">
            {message.reactions.map((reaction, index) => (
              <span key={index} className="text-sm">{reaction}</span>
            ))}
          </div>
        )}
      </div>
      
      {/* User avatar - smaller on mobile */}
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-secondary to-secondary/90 flex items-center justify-center shadow-lg">
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
      )}
    </div>
  );
});