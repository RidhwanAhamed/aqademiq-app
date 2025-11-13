import { AdaAIChat } from "@/components/AdaAIChat";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Ada = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Left: Conversation Sidebar */}
      <ConversationSidebar
        user={user}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      {/* Center: Chat Interface */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with About Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-lg font-semibold">Ada AI</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/about-ada-ai')}
            className="gap-2"
          >
            <Info className="h-4 w-4" />
            About Ada AI
          </Button>
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
    </div>
  );
};

export default Ada;
