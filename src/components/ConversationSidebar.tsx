import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Conversation {
  conversation_id: string;
  created_at: string;
  message_preview: string;
  message_count: number;
}

interface ConversationSidebarProps {
  user: any;
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({ 
  user, 
  currentConversationId, 
  onSelectConversation,
  onNewConversation 
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    
    const loadConversations = async () => {
      setLoading(true);
      try {
        // Get all conversations with preview and count
        const { data, error } = await supabase
          .from('chat_messages')
          .select('conversation_id, created_at, message')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          // Group by conversation_id and get first message as preview
          const convMap = new Map<string, Conversation>();
          
          data.forEach(msg => {
            if (!msg.conversation_id) return;
            
            if (!convMap.has(msg.conversation_id)) {
              convMap.set(msg.conversation_id, {
                conversation_id: msg.conversation_id,
                created_at: msg.created_at,
                message_preview: msg.message.slice(0, 60),
                message_count: 1
              });
            } else {
              const conv = convMap.get(msg.conversation_id)!;
              conv.message_count++;
            }
          });

          setConversations(Array.from(convMap.values()));
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user]);

  // Auto-scroll to newest conversation when list updates
  useEffect(() => {
    if (scrollRef.current && conversations.length > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [conversations]);

  if (!user) return null;

  return (
    <div className="w-64 border-r bg-background flex flex-col h-screen">
      {/* Fixed Header */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <Button 
          onClick={onNewConversation}
          className="w-full"
          variant="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Scrollable Conversation List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 scrollbar-thin"
      >
        <div className="space-y-2">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.conversation_id}
                onClick={() => onSelectConversation(conv.conversation_id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  "hover:bg-muted/50",
                  currentConversationId === conv.conversation_id 
                    ? "bg-muted border border-primary" 
                    : "bg-muted/20"
                )}
              >
                <div className="flex items-start gap-2">
                  <MessageCircle className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.message_preview}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conv.created_at), 'MMM d, h:mm a')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {conv.message_count} msgs
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
