import React, { memo } from 'react';
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
  Calendar
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
  
  return (
    <div 
      className={cn(
        "flex gap-3 max-w-full group",
        isUser ? "justify-end" : "justify-start",
        isLast && "mb-4"
      )}
      role="listitem"
      aria-label={`${isUser ? 'Your' : 'Ada\'s'} message`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className={cn(
        "flex flex-col space-y-2 max-w-[85%] sm:max-w-[75%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "relative px-4 py-3 rounded-2xl shadow-sm border transition-all duration-200 hover:shadow-md",
          isUser 
            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md" 
            : "bg-gradient-to-br from-card to-card/80 text-foreground rounded-bl-md border-border/50",
          highContrast && (
            isUser 
              ? "bg-black text-white border-white" 
              : "bg-white text-black border-black"
          )
        )}>
          <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({...props}) => <h1 className="text-lg font-bold mb-2 text-foreground" {...props} />,
                h2: ({...props}) => <h2 className="text-base font-semibold mb-2 text-foreground" {...props} />,
                h3: ({...props}) => <h3 className="text-sm font-medium mb-1 text-foreground" {...props} />,
                p: ({...props}) => <p className="mb-2 last:mb-0 text-foreground" {...props} />,
                ul: ({...props}) => <ul className="list-disc list-inside mb-2 space-y-1 text-foreground" {...props} />,
                ol: ({...props}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-foreground" {...props} />,
                li: ({...props}) => <li className="text-foreground" {...props} />,
                strong: ({...props}) => <strong className="font-semibold text-foreground" {...props} />,
                em: ({...props}) => <em className="italic text-foreground" {...props} />,
                code: ({children, className, ...props}) => {
                  const isInline = !className || !className.includes('language-');
                  return isInline 
                    ? <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground" {...props}>{children}</code>
                    : <code className="block bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto text-foreground" {...props}>{children}</code>;
                },
                pre: ({...props}) => <pre className="bg-muted p-3 rounded-md overflow-x-auto mb-2" {...props} />,
                blockquote: ({...props}) => <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-2" {...props} />,
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
          
          {!isUser && (
            <div className="absolute -bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background rounded-full shadow-md p-1 border">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => onCopy(message.message)}
                aria-label="Copy message"
              >
                <Copy className="w-3 h-3" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => onReaction(message.id, '👍')}
                aria-label="Like message"
              >
                <ThumbsUp className="w-3 h-3" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => onReaction(message.id, '❤️')}
                aria-label="Love message"
              >
                <Heart className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        
        {hasCalendarData && (
          <div className="flex flex-wrap gap-2">
            {message.metadata?.can_add_to_calendar && onAddToCalendar && (
              <Button
                size="sm"
                onClick={() => onAddToCalendar(message.metadata.parsed_data)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md"
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                Add to Calendar
              </Button>
            )}
            {message.metadata?.can_sync_to_google && onSyncToGoogle && (
              <Button
                size="sm"
                onClick={() => onSyncToGoogle(message.metadata.parsed_data)}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Sync to Google
              </Button>
            )}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground px-2">
          {format(new Date(message.created_at), 'HH:mm')}
        </div>
        
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 px-2">
            {message.reactions.map((reaction, index) => (
              <span key={index} className="text-sm">{reaction}</span>
            ))}
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-secondary/90 flex items-center justify-center shadow-lg">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
});
