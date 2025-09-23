import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ChatMessage {
  id: string;
  message: string;
  is_user: boolean;
  created_at: string;
  file_upload_id?: string;
  metadata?: any;
  reactions?: string[];
}

interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  soundEnabled: boolean;
  focusOutlines: boolean;
}

interface ChatState {
  welcomeMessageShown: boolean;
  messageCount: number;
  accessibilitySettings: AccessibilitySettings;
  lastSessionTime: string;
}

const STORAGE_KEY = 'ada-chat-state';
const MESSAGE_LIMIT = 50; // Load last 50 messages

export function useChatPersistence(userId?: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [chatState, setChatState] = useState<ChatState>({
    welcomeMessageShown: false,
    messageCount: 0,
    accessibilitySettings: {
      fontSize: 16,
      highContrast: false,
      soundEnabled: true,
      focusOutlines: true
    },
    lastSessionTime: new Date().toISOString()
  });

  // Load chat state from localStorage
  const loadChatState = useCallback((): ChatState => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedState = JSON.parse(stored);
        return {
          ...chatState,
          ...parsedState,
          lastSessionTime: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('Failed to load chat state from localStorage', error);
    }
    return chatState;
  }, []);

  // Save chat state to localStorage
  const saveChatState = useCallback((state: Partial<ChatState>) => {
    try {
      const currentState = loadChatState();
      const newState = { ...currentState, ...state };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      setChatState(newState);
    } catch (error) {
      logger.error('Failed to save chat state to localStorage', error);
    }
  }, [loadChatState]);

  // Load previous chat messages from database
  const loadChatMessages = useCallback(async (): Promise<ChatMessage[]> => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(MESSAGE_LIMIT);

      if (error) {
        logger.error('Failed to load chat messages', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error loading chat messages', error);
      return [];
    }
  }, [userId]);

  // Check if user has previous chat history
  const hasPreviousMessages = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        logger.error('Failed to check for previous messages', error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      logger.error('Error checking for previous messages', error);
      return false;
    }
  }, [userId]);

  // Initialize chat state and load messages
  const initializeChatSession = useCallback(async () => {
    setIsLoading(true);

    try {
      // Load state from localStorage
      const storedState = loadChatState();
      setChatState(storedState);

      // Check if user has previous chat history
      const hasHistory = await hasPreviousMessages();
      
      // Update welcome message flag based on history
      if (hasHistory && !storedState.welcomeMessageShown) {
        saveChatState({ welcomeMessageShown: true });
      }

      // Load previous messages
      const messages = await loadChatMessages();
      
      setIsLoading(false);
      return { messages, hasHistory, state: storedState };
    } catch (error) {
      logger.error('Failed to initialize chat session', error);
      setIsLoading(false);
      return { messages: [], hasHistory: false, state: chatState };
    }
  }, [userId, loadChatState, saveChatState, hasPreviousMessages, loadChatMessages, chatState]);

  // Clear chat history (for refresh functionality)
  const clearChatHistory = useCallback(async () => {
    try {
      saveChatState({ 
        welcomeMessageShown: false, 
        messageCount: 0,
        lastSessionTime: new Date().toISOString()
      });
      return true;
    } catch (error) {
      logger.error('Failed to clear chat history', error);
      return false;
    }
  }, [saveChatState]);

  // Update message count
  const incrementMessageCount = useCallback(() => {
    saveChatState({ 
      messageCount: chatState.messageCount + 1,
      lastSessionTime: new Date().toISOString()
    });
  }, [chatState.messageCount, saveChatState]);

  // Update accessibility settings
  const updateAccessibilitySettings = useCallback((settings: Partial<AccessibilitySettings>) => {
    const newSettings = { ...chatState.accessibilitySettings, ...settings };
    saveChatState({ accessibilitySettings: newSettings });
  }, [chatState.accessibilitySettings, saveChatState]);

  return {
    isLoading,
    chatState,
    initializeChatSession,
    clearChatHistory,
    incrementMessageCount,
    updateAccessibilitySettings,
    saveChatState
  };
}