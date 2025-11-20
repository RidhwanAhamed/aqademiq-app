/* README — src/pages/Ada.tsx
This page orchestrates the Ada AI assistant workspace. Backend must expose GET /api/chat/conversations?userId=<string> returning {conversations:[{id,messagePreview,messageCount,createdAt}]}, and POST /api/chat/messages with body {conversationId?:string,userId:string,message:string} returning {conversationId, messageId, streamed:boolean}. Responses should include timestamps so the UI can refresh conversation history after each interaction.
*/
// Purpose: Hosts Ada AI chat layout with responsive history toggle. TODO: API -> /api/chat/conversations & /api/chat/messages.
import { AdaAIChat } from "@/components/AdaAIChat";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { History, Info, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const Ada = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pendingCloseTimeout = useRef<number | null>(null);
  const HISTORY_ANIMATION_DURATION = 280;
  const adaContainerRef = useRef<HTMLDivElement>(null);

  const openHistory = () => {
    if (pendingCloseTimeout.current) {
      window.clearTimeout(pendingCloseTimeout.current);
      pendingCloseTimeout.current = null;
    }
    setIsHistoryVisible(true);
    requestAnimationFrame(() => setIsHistoryOpen(true));
  };

  const closeHistory = () => {
    setIsHistoryOpen(false);
    pendingCloseTimeout.current = window.setTimeout(() => {
      setIsHistoryVisible(false);
      pendingCloseTimeout.current = null;
    }, HISTORY_ANIMATION_DURATION);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setRefreshKey(prev => prev + 1);
    closeHistory();
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setRefreshKey(prev => prev + 1);
    closeHistory();
  };

  const handleToggleHistory = () => {
    if (isHistoryVisible && isHistoryOpen) {
      closeHistory();
    } else {
      openHistory();
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        closeHistory();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (typeof document === 'undefined') return;
      const fullscreenActive = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreenActive);
      if (fullscreenActive) {
        closeHistory();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingCloseTimeout.current) {
        window.clearTimeout(pendingCloseTimeout.current);
      }
    };
  }, []);

  const handleToggleFullscreen = async () => {
    if (typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        await adaContainerRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  return (
    <div
      ref={adaContainerRef}
      className="relative flex h-screen w-full flex-col bg-background lg:flex-row"
    >
      {/* Desktop: Conversation Sidebar */}
      {!isFullscreen && (
        <div className="hidden lg:block">
          <ConversationSidebar
            user={user}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            className="w-72"
          />
        </div>
      )}

      {/* Center: Chat Interface */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with About Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className={isFullscreen ? "" : "lg:hidden"}
              onClick={handleToggleHistory}
              aria-expanded={isHistoryOpen}
              aria-controls="ada-chat-history"
              aria-label={isHistoryOpen ? "Hide chat history" : "Show chat history"}
            >
              <History className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Ada AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/about-ada-ai')}
              aria-label="About Ada AI"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <AdaAIChat 
            key={refreshKey} 
            selectedConversationId={currentConversationId}
            onConversationChange={setCurrentConversationId}
          />
        </div>
      </div>

      {/* Mobile Overlay Sidebar */}
      {isHistoryVisible && (
        <div
          className={cn(
            "fixed inset-0 z-40 flex",
            !isFullscreen && "lg:hidden"
          )}
          role="dialog"
          aria-modal="true"
        >
          <div
            id="ada-chat-history"
            className={`h-full w-80 max-w-[85%] border-r bg-background shadow-2xl transform transition-transform duration-300 ease-out ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <ConversationSidebar
              user={user}
              currentConversationId={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              className="w-full h-full"
              showMobileClose
              onClose={closeHistory}
            />
          </div>
          <button
            className={`flex-1 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isHistoryOpen ? 'opacity-100' : 'opacity-0'}`}
            aria-label="Close chat history overlay"
            onClick={closeHistory}
          />
        </div>
      )}
    </div>
  );
};

export default Ada;
