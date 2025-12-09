/* README — src/pages/Ada.tsx
This page orchestrates the Ada AI assistant workspace with premium mobile-first design like ChatGPT.
*/
import { AdaAIChat } from "@/components/AdaAIChat";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const Ada = () => {
  const { user } = useAuth();
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
      className="relative flex w-full h-full bg-background lg:flex-row overflow-hidden"
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

      {/* Center: Chat Interface - Takes full height with strict containment */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <AdaAIChat 
          key={refreshKey} 
          selectedConversationId={currentConversationId}
          onConversationChange={setCurrentConversationId}
          isFullScreen={isFullscreen}
          onFullScreenToggle={handleToggleFullscreen}
          onHistoryToggle={handleToggleHistory}
          isHistoryOpen={isHistoryOpen}
        />
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
            className={cn(
              "h-full w-80 max-w-[85%] border-r bg-background shadow-2xl",
              "transform transition-transform duration-300 ease-out",
              isHistoryOpen ? 'translate-x-0' : '-translate-x-full'
            )}
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
            className={cn(
              "flex-1 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
              isHistoryOpen ? 'opacity-100' : 'opacity-0'
            )}
            aria-label="Close chat history overlay"
            onClick={closeHistory}
          />
        </div>
      )}
    </div>
  );
};

export default Ada;