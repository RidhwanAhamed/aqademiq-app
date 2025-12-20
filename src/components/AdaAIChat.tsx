// Purpose: Ada AI chat - Refactored with isolated components for zero vibration
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { AchievementUnlockModal } from '@/components/AchievementUnlockModal';
import { useToast } from '@/hooks/use-toast';
import { UpgradeToPremiumDialog } from '@/components/UpgradeToPremiumDialog';
import { EnhancedFileUpload } from '@/components/EnhancedFileUpload';
import { ConflictResolutionPanel } from '@/components/ConflictResolutionPanel';
import { useAdvancedConflictDetection } from '@/hooks/useAdvancedConflictDetection';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useAchievements } from '@/hooks/useAchievements';
import { 
  createScheduleBlock, 
  detectScheduleConflicts, 
  deleteScheduleBlock,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  completeAssignment,
  createExam,
  updateExam,
  deleteExam,
  createStudySession,
  updateStudySession,
  deleteStudySession,
  createCourse,
  updateCourse,
  deleteCourse
} from '@/services/api';
import type { Badge } from '@/types/badges';
import { mergeTranscriptWithInput } from '@/utils/voice-cleaner';
import {
  AdaChatHeader,
  AdaMessagesPanel,
  AdaInputPanel,
  type AdaInputPanelRef,
  type ChatMessage,
  type PendingAction,
  type AdaMode
} from '@/components/ada';
import {
  Upload,
  AlertTriangle,
  X
} from 'lucide-react';

interface ScheduleConflict {
  conflict_type: string;
  conflict_id: string;
  conflict_title: string;
  conflict_start: string;
  conflict_end: string;
}

interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  soundEnabled: boolean;
  focusOutlines: boolean;
}

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
  assignment_id?: string;
  exam_id?: string;
  priority?: number;
  is_completed?: boolean;
  status?: string;
  duration_minutes?: number;
  credits?: number;
  code?: string;
  instructor?: string;
  color?: string;
  target_grade?: string;
  assignment_type?: string;
  exam_type?: string;
  // Cornell Notes specific fields
  topic?: string;
  depthLevel?: 'brief' | 'standard' | 'comprehensive';
  fileContent?: string;
  fileName?: string;
  filePrompt?: string;
}

interface ScheduleConflict {
  conflict_type: string;
  conflict_id: string;
  conflict_title: string;
  conflict_start: string;
  conflict_end: string;
}

interface AdaAIChatProps {
  isFullScreen?: boolean;
  onFullScreenToggle?: () => void;
  selectedConversationId?: string | null;
  onConversationChange?: (id: string) => void;
  onHistoryToggle?: () => void;
  isHistoryOpen?: boolean;
}

export function AdaAIChat({
  isFullScreen = false, 
  onFullScreenToggle,
  selectedConversationId,
  onConversationChange,
  onHistoryToggle,
  isHistoryOpen
}: AdaAIChatProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputPanelRef = useRef<AdaInputPanelRef>(null);
  
  // Core state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [chatBadgeUnlock, setChatBadgeUnlock] = useState<Badge | null>(null);
  const [showChatBadgeModal, setShowChatBadgeModal] = useState(false);
  
  // UI state
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showEnhancedUpload, setShowEnhancedUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Conflicts
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [showConflictPanel, setShowConflictPanel] = useState(false);
  const [conflictsDismissed, setConflictsDismissed] = useState(false);
  
  // Pending actions from AI
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  
  // File attachment (ChatGPT style)
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileStatus, setPendingFileStatus] = useState('');
  
  // Mode selector state
  const [currentMode, setCurrentMode] = useState<AdaMode>('chat');
  
  // Accessibility
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({
    fontSize: 16,
    highContrast: false,
    soundEnabled: true,
    focusOutlines: true
  });

  const { detectConflicts } = useAdvancedConflictDetection();
  const { awardAdaApprenticeBadge, awardFirstVoyageBadge, isBadgeUnlocked } = useAchievements();

  const {
    isSupported: isSpeechSupported,
    isListening: isVoiceListening,
    interimTranscript: voiceInterimTranscript,
    finalChunk: voiceFinalChunk,
    error: speechError,
    startListening,
    stopListening,
    acknowledgeFinalChunk,
    resetTranscript
  } = useSpeechToText();

  const MESSAGE_LIMIT = 10;

  // Load conversation history
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!user) return;
      
      try {
        if (selectedConversationId === null) {
          const newConvId = crypto.randomUUID();
          setConversationId(newConvId);
          
          const welcomeMessage: ChatMessage = {
            id: `welcome-${Date.now()}`,
            message: `👋 Hi there! I'm Ada AI, your personal study strategist and productivity engine.\n\nI'm here to help you:\n• **Plan & organize** your academic schedule\n• **Break down** large assignments into manageable tasks\n• **Detect conflicts** and suggest solutions\n• **Parse syllabi & timetables** from files you upload\n• **Optimize** your study sessions for maximum effectiveness\n\nJust ask me things like:\n- "Help me plan for my exam next Friday"\n- "Optimize my schedule this week"\n- "I missed yesterday's study session, what now?"\n\nOr simply **upload your syllabus** and I'll structure it into your calendar automatically! 📚✨`,
            is_user: false,
            created_at: new Date().toISOString(),
            metadata: { welcome: true }
          };
          setMessages([welcomeMessage]);
          setMessageCount(0);
          
          if (onConversationChange) {
            onConversationChange(newConvId);
          }
          return;
        }

        if (selectedConversationId) {
          const { data: historyMessages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('user_id', user.id)
            .eq('conversation_id', selectedConversationId)
            .order('created_at', { ascending: true })
            .limit(50);

          if (error) {
            console.error('Error loading selected conversation:', error);
            return;
          }

          setConversationId(selectedConversationId);
          setMessages(historyMessages || []);
          setMessageCount(historyMessages?.filter(m => m.is_user).length || 0);
          return;
        }

        const { data: historyMessages, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) {
          console.error('Error loading conversation history:', error);
          return;
        }

        if (historyMessages && historyMessages.length > 0) {
          const existingConvId = historyMessages[0].conversation_id;
          const convId = existingConvId || crypto.randomUUID();
          setConversationId(convId);
          setMessages(historyMessages);
          setMessageCount(historyMessages.filter(m => m.is_user).length);
          
          if (onConversationChange && convId) {
            onConversationChange(convId);
          }
        } else {
          const newConvId = crypto.randomUUID();
          setConversationId(newConvId);
          
          const welcomeMessage: ChatMessage = {
            id: `welcome-${Date.now()}`,
            message: `👋 Hi there! I'm Ada AI, your personal study strategist and productivity engine.\n\nI'm here to help you:\n• **Plan & organize** your academic schedule\n• **Break down** large assignments into manageable tasks\n• **Detect conflicts** and suggest solutions\n• **Parse syllabi & timetables** from files you upload\n• **Optimize** your study sessions for maximum effectiveness\n\nJust ask me things like:\n- "Help me plan for my exam next Friday"\n- "Optimize my schedule this week"\n- "I missed yesterday's study session, what now?"\n\nOr simply **upload your syllabus** and I'll structure it into your calendar automatically! 📚✨`,
            is_user: false,
            created_at: new Date().toISOString(),
            metadata: { welcome: true }
          };
          setMessages([welcomeMessage]);
          
          if (onConversationChange) {
            onConversationChange(newConvId);
          }
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
      }
    };

    loadConversationHistory();
  }, [user, selectedConversationId, onConversationChange]);

  // Voice transcript handling
  useEffect(() => {
    if (!voiceFinalChunk) return;
    const currentValue = inputPanelRef.current?.getValue() || '';
    const newValue = mergeTranscriptWithInput(currentValue, voiceFinalChunk.text);
    inputPanelRef.current?.setValue(newValue);
    acknowledgeFinalChunk();
  }, [voiceFinalChunk, acknowledgeFinalChunk]);

  // Speech error handling
  useEffect(() => {
    if (!speechError) return;
    toast({
      title: 'Voice capture unavailable',
      description: speechError,
      variant: 'destructive'
    });
  }, [speechError, toast]);

  // Escape key for fullscreen
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen && onFullScreenToggle) {
        onFullScreenToggle();
      }
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isFullScreen, onFullScreenToggle]);

  // Apply accessibility settings
  useEffect(() => {
    document.documentElement.style.fontSize = `${accessibilitySettings.fontSize}px`;
    document.documentElement.classList.toggle('high-contrast', accessibilitySettings.highContrast);
    document.documentElement.classList.toggle('focus-outlines', accessibilitySettings.focusOutlines);
  }, [accessibilitySettings]);

  // Sound notification
  const playNotificationSound = useCallback(() => {
    if (accessibilitySettings.soundEnabled) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  }, [accessibilitySettings.soundEnabled]);

  // Save chat message
  const saveChatMessage = useCallback(async (message: string, isUser: boolean, fileUploadId?: string, metadata?: any) => {
    if (!user) return null;

    const convId = conversationId || crypto.randomUUID();
    if (!conversationId) {
      setConversationId(convId);
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: user.id,
        conversation_id: convId,
        message,
        is_user: isUser,
        file_upload_id: fileUploadId,
        metadata
      }])
      .select()
      .single();

    if (error) {
      logger.error('Failed to save chat message', error);
      return null;
    }

    return data;
  }, [user, conversationId]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setPendingFile(files[0]);
      setPendingFileStatus('');
    }
  }, []);

  // File handling
  const handleFileSelect = useCallback((file: File) => {
    setPendingFile(file);
    setPendingFileStatus('');
  }, []);

  const handleRemoveFile = useCallback(() => {
    setPendingFile(null);
    setPendingFileStatus('');
  }, []);

  // Upload and index file for RAG
  const uploadAndIndexFile = useCallback(async (file: File): Promise<{ fileId: string; ocrText?: string } | null> => {
    if (!user) return null;

    try {
      setPendingFileStatus('Uploading...');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('study-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: fileRecord, error: fileError } = await supabase
        .from('file_uploads')
        .insert([{
          user_id: user.id,
          file_name: file.name,
          file_url: uploadData.path,
          file_type: file.type,
          status: 'uploaded'
        }])
        .select()
        .single();

      if (fileError) throw fileError;

      let ocrText = '';
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setPendingFileStatus('Extracting text...');
        
        const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('enhanced-ocr-parser', {
          body: { file_id: fileRecord.id, use_fallback: false }
        });

        if (ocrError || !ocrResult?.success) {
          const { data: basicOcrResult } = await supabase.functions.invoke('ocr-parser', {
            body: { file_id: fileRecord.id }
          });
          ocrText = basicOcrResult?.text || '';
        } else {
          ocrText = ocrResult?.text || '';
        }
      }

      if (ocrText.length > 50) {
        setPendingFileStatus('Indexing for AI...');
        
        try {
          await supabase.functions.invoke('generate-embeddings', {
            body: { 
              file_upload_id: fileRecord.id,
              source_type: 'upload',
              metadata: { 
                file_name: file.name,
                file_type: file.type,
                indexed_at: new Date().toISOString()
              }
            }
          });
        } catch (embError) {
          console.log('Embedding error (non-blocking):', embError);
        }
      }

      setPendingFileStatus('Ready!');
      return { fileId: fileRecord.id, ocrText };

    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }, [user]);

  // First Voyage badge unlock (for first event creation via Ada AI)
  const handleFirstVoyageUnlock = useCallback(async () => {
    const badge = await awardFirstVoyageBadge();
    if (badge) {
      logger.info('First Voyage badge unlocked', {
        badgeId: badge.id,
        conversationId
      });
      setChatBadgeUnlock(badge);
      setShowChatBadgeModal(true);
    }
  }, [awardFirstVoyageBadge, conversationId]);

  // Check if user wants schedule parsing
  const wantsScheduleParsing = useCallback((message: string): boolean => {
    const scheduleKeywords = [
      'timetable', 'schedule', 'add to calendar', 'import', 
      'parse schedule', 'class schedule', 'classes', 'add classes',
      'import schedule', 'extract schedule', 'calendar'
    ];
    const lowerMessage = message.toLowerCase();
    return scheduleKeywords.some(keyword => lowerMessage.includes(keyword));
  }, []);

  // Enhanced file upload
  const handleEnhancedFileUpload = useCallback(async (file: File, forceAction?: 'schedule_parser' | 'event_parser' | 'rag_only') => {
    if (!user) return;

    setIsProcessing(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('study-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: fileRecord, error: fileError } = await supabase
        .from('file_uploads')
        .insert([{
          user_id: user.id,
          file_name: file.name,
          file_url: uploadData.path,
          file_type: file.type,
          status: 'uploaded'
        }])
        .select()
        .single();

      if (fileError) throw fileError;

      const { data: signed } = await supabase.storage
        .from('study-files')
        .createSignedUrl(uploadData.path, 3600);

      const userMessage = await saveChatMessage(
        `I've uploaded a file: ${file.name}`,
        true,
        fileRecord.id,
        { file_url: signed?.signedUrl, original_name: file.name }
      );

      if (userMessage) {
        setMessages(prev => [...prev, userMessage]);
        playNotificationSound();
      }

      await processFileWithAgenticAI(fileRecord.id, file, forceAction);

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [user, saveChatMessage, playNotificationSound, toast]);

  // Process file with agentic AI
  const processFileWithAgenticAI = useCallback(async (
    fileId: string, 
    file: File, 
    forceAction?: 'schedule_parser' | 'event_parser' | 'rag_only'
  ) => {
    try {
      const progressMessage = await saveChatMessage(
        '⏳ Processing your file...\n\n📤 **Phase 1:** Uploading ✓\n🔍 **Phase 2:** Extracting text (OCR)...',
        false,
        fileId,
        { processing: true, phase: 'ocr' }
      );
      
      if (progressMessage) {
        setMessages(prev => [...prev, progressMessage]);
      }

      const updateProgress = async (message: string, phase: string) => {
        if (progressMessage) {
          await supabase
            .from('chat_messages')
            .update({ message, metadata: { processing: true, phase } })
            .eq('id', progressMessage.id);
          
          setMessages(prev => prev.map(m => 
            m.id === progressMessage.id ? { ...m, message } : m
          ));
        }
      };

      let ocrResult;
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const { data: enhancedOcrResult, error: enhancedOcrError } = await supabase.functions.invoke('enhanced-ocr-parser', {
          body: { file_id: fileId, use_fallback: false }
        });

        if (enhancedOcrError || !enhancedOcrResult?.success) {
          const { data: basicOcrResult, error: basicOcrError } = await supabase.functions.invoke('ocr-parser', {
            body: { file_id: fileId }
          });
          if (basicOcrError) throw basicOcrError;
          ocrResult = basicOcrResult;
        } else {
          ocrResult = enhancedOcrResult;
        }
      }

      if (ocrResult?.text && ocrResult.text.length > 50) {
        await updateProgress(
          '⏳ Processing your file...\n\n📤 **Phase 1:** Uploading ✓\n🔍 **Phase 2:** Extracting text (OCR) ✓\n🧠 **Phase 2.5:** Indexing for AI search...',
          'indexing'
        );

        try {
          await supabase.functions.invoke('generate-embeddings', {
            body: { 
              file_upload_id: fileId,
              source_type: 'upload',
              metadata: { file_name: file.name, file_type: file.type, indexed_at: new Date().toISOString() }
            }
          });
        } catch (embError) {
          console.log('Embedding error (non-blocking):', embError);
        }
      }

      let recommendedAction: 'schedule_parser' | 'event_parser' | 'rag_only' = forceAction || 'rag_only';
      let classification = null;

      if (!forceAction && ocrResult?.text) {
        await updateProgress(
          '⏳ Processing your file...\n\n📤 **Phase 1:** Uploading ✓\n🔍 **Phase 2:** Extracting text (OCR) ✓\n🧠 **Phase 2.5:** Indexing ✓\n🤖 **Phase 3:** Analyzing document type...',
          'classifying'
        );

        try {
          const { data: classifyResult, error: classifyError } = await supabase.functions.invoke('document-classifier', {
            body: { file_id: fileId, text_content: ocrResult.text }
          });

          if (!classifyError && classifyResult?.success) {
            classification = classifyResult.classification;
            recommendedAction = classification.recommended_action;
          }
        } catch (classifyErr) {
          console.log('Classification error (using fallback):', classifyErr);
        }
      }

      let parseResult;
      
      if (recommendedAction === 'schedule_parser') {
        await updateProgress(
          `⏳ Processing your file...\n\n📤 **Phase 1:** Uploading ✓\n🔍 **Phase 2:** Extracting text (OCR) ✓\n🧠 **Phase 2.5:** Indexing ✓\n🤖 **Phase 3:** ${classification ? `Detected: ${classification.document_type} ✓` : 'Manual import ✓'}\n🎓 **Phase 4:** Parsing academic schedule...`,
          'schedule_parsing'
        );

        const { data, error } = await supabase.functions.invoke('advanced-schedule-parser', {
          body: { 
            file_id: fileId,
            user_id: user?.id,
            auto_add_to_calendar: true,
            sync_to_google: false,
            enable_conflict_detection: true,
            enable_workload_balancing: true
          }
        });

        if (error) throw error;
        parseResult = data;

        if (parseResult.schedule_data) {
          const detectedConflicts = await detectConflicts(parseResult.schedule_data);
          parseResult.conflicts = [...(parseResult.conflicts || []), ...detectedConflicts];
        }

      } else if (recommendedAction === 'event_parser') {
        await updateProgress(
          `⏳ Processing your file...\n\n📤 **Phase 1:** Uploading ✓\n🔍 **Phase 2:** Extracting text (OCR) ✓\n🧠 **Phase 2.5:** Indexing ✓\n🤖 **Phase 3:** ${classification ? `Detected: ${classification.document_type} ✓` : 'Manual import ✓'}\n📆 **Phase 4:** Parsing calendar events...`,
          'event_parsing'
        );

        const { data, error } = await supabase.functions.invoke('event-parser', {
          body: { 
            file_id: fileId,
            user_id: user?.id,
            auto_add_to_calendar: true,
            detect_conflicts: true
          }
        });

        if (error) throw error;
        parseResult = data;

      } else {
        await updateProgress(
          '⏳ Processing your file...\n\n📤 **Phase 1:** Uploading ✓\n🔍 **Phase 2:** Extracting text (OCR) ✓\n🧠 **Phase 2.5:** Indexing ✓\n📚 **Phase 3:** Ready for Q&A!',
          'rag_complete'
        );

        const entities = classification?.detected_entities || {};
        const entityList = Object.entries(entities)
          .filter(([_, v]) => (v as number) > 0)
          .map(([k, v]) => `${v} ${k}`)
          .join(', ');

        parseResult = {
          response: `📚 **Document Indexed Successfully!**\n\n✅ Your file **"${file.name}"** has been processed and indexed.\n\n**What I found:**\n• ${ocrResult?.text?.length || 0} characters of text extracted\n${classification ? `• Document type: ${classification.document_type}\n• Detected: ${entityList || 'General content'}` : ''}\n\n💡 **You can now ask me questions about this document!** For example:\n• "What are the main topics covered?"\n• "Summarize this document"\n• "What assignments are mentioned?"\n\nOr if this contains schedule data, use the **Import Schedule** or **Import Events** buttons.`,
          document_type: 'general_document',
          rag_indexed: true
        };
      }

      if (progressMessage) {
        setMessages(prev => prev.filter(m => m.id !== progressMessage.id));
        await supabase.from('chat_messages').delete().eq('id', progressMessage.id);
      }

      const aiMessage = await saveChatMessage(
        parseResult.response,
        false,
        fileId,
        { 
          parsed_data: parseResult.schedule_data || parseResult.parsed_events, 
          conflicts: parseResult.conflicts,
          classification,
          recommended_action: recommendedAction,
          calendar_results: parseResult.calendar_results || parseResult.created_events
        }
      );

      if (aiMessage) {
        setMessages(prev => [...prev, aiMessage]);
        playNotificationSound();
        
        if (parseResult.conflicts?.length > 0) {
          setConflicts(parseResult.conflicts);
        }
      }

      const createdEvents = Array.isArray(parseResult?.created_events)
        ? parseResult.created_events.filter((event: any) => event?.success !== false)
        : [];
      const calendarResults = parseResult?.calendar_results;
      const calendarEventsAdded = calendarResults
        ? ['courses_added', 'classes_added', 'assignments_added', 'exams_added'].some(
            key => Number(calendarResults?.[key] || 0) > 0
          )
        : false;

      if (createdEvents.length > 0 || calendarEventsAdded) {
        await handleFirstVoyageUnlock();
      }

    } catch (error: any) {
      console.error('Error in agentic file processing:', error);
      const errorMessage = await saveChatMessage(
        `I encountered an error processing your file: **${error.message || 'Unknown error'}**\n\nPlease try uploading it again.`,
        false,
        fileId,
        { error: error.message, processing_failed: true }
      );
      
      if (errorMessage) {
        setMessages(prev => [...prev, errorMessage]);
      }
      
      toast({
        title: 'Processing Error',
        description: error.message || 'Failed to process file',
        variant: 'destructive'
      });
    }
  }, [user, saveChatMessage, playNotificationSound, detectConflicts, toast, handleFirstVoyageUnlock]);

  // Chat badge unlock helper (TODO: API -> /api/achievements/award once backend ships)
  const handleChatBadgeUnlock = useCallback(async (nextCount: number) => {
    if (nextCount < MESSAGE_LIMIT) return;
    if (isBadgeUnlocked('adas_apprentice_10_messages')) return;

    const badge = await awardAdaApprenticeBadge();
    if (badge) {
      logger.info('Ada apprentice badge unlocked', {
        badgeId: badge.id,
        conversationId
      });
      setChatBadgeUnlock(badge);
      setShowChatBadgeModal(true);
    }
  }, [MESSAGE_LIMIT, awardAdaApprenticeBadge, isBadgeUnlocked, conversationId]);

  // Import handlers
  const handleImportAsSchedule = useCallback(async () => {
    if (!pendingFile || !user || isProcessing) return;

    setIsProcessing(true);
    const file = pendingFile;
    setPendingFile(null);
    setPendingFileStatus('');

    try {
      const userMessage = await saveChatMessage(
        `📅 Import this file as my schedule: **${file.name}**`,
        true,
        undefined,
        { intent: 'schedule_import', file_name: file.name }
      );
      if (userMessage) {
        setMessages(prev => [...prev, userMessage]);
        setMessageCount(prev => {
          const updated = prev + 1;
          void handleChatBadgeUnlock(updated);
          return updated;
        });
      }

      await handleEnhancedFileUpload(file, 'schedule_parser');
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import file as schedule',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [pendingFile, user, isProcessing, saveChatMessage, handleEnhancedFileUpload, toast, handleChatBadgeUnlock]);

  const handleImportAsEvents = useCallback(async () => {
    if (!pendingFile || !user || isProcessing) return;

    setIsProcessing(true);
    const file = pendingFile;
    setPendingFile(null);
    setPendingFileStatus('');

    try {
      const userMessage = await saveChatMessage(
        `📆 Import events from this file: **${file.name}**`,
        true,
        undefined,
        { intent: 'event_import', file_name: file.name }
      );
      if (userMessage) {
        setMessages(prev => [...prev, userMessage]);
        setMessageCount(prev => {
          const updated = prev + 1;
          void handleChatBadgeUnlock(updated);
          return updated;
        });
      }

      await handleEnhancedFileUpload(file, 'event_parser');
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import file as events',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [pendingFile, user, isProcessing, saveChatMessage, handleEnhancedFileUpload, toast, handleChatBadgeUnlock]);

  // Helper to resolve course ID from name
  const resolveCourseId = useCallback(async (courseName: string): Promise<string | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('courses')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', `%${courseName}%`)
      .eq('is_active', true)
      .limit(1);
    return data?.[0]?.id || null;
  }, [user]);

  // Entity labels for toast messages
  const getEntityLabel = (actionType: AdaActionType): string => {
    const labels: Record<string, string> = {
      CREATE_EVENT: 'Event',
      UPDATE_EVENT: 'Event',
      DELETE_EVENT: 'Event',
      CREATE_ASSIGNMENT: 'Assignment',
      UPDATE_ASSIGNMENT: 'Assignment',
      DELETE_ASSIGNMENT: 'Assignment',
      COMPLETE_ASSIGNMENT: 'Assignment',
      CREATE_EXAM: 'Exam',
      UPDATE_EXAM: 'Exam',
      DELETE_EXAM: 'Exam',
      CREATE_STUDY_SESSION: 'Study Session',
      UPDATE_STUDY_SESSION: 'Study Session',
      DELETE_STUDY_SESSION: 'Study Session',
      CREATE_COURSE: 'Course',
      UPDATE_COURSE: 'Course',
      DELETE_COURSE: 'Course',
      CREATE_CORNELL_NOTES: 'Cornell Notes'
    };
    return labels[actionType] || 'Item';
  };

  // Auto-execute Cornell Notes generation (no confirmation needed)
  const executeCreateCornellNotes = useCallback(async (action: AdaAction) => {
    const topic = action.topic || action.title || 'Untitled';
    const depthLevel = action.depthLevel || 'standard';

    // Show loading message in chat
    const loadingMessage: ChatMessage = {
      id: `loading-cornell-${Date.now()}`,
      message: `📝 **Generating Cornell Notes...**\n\n📚 Topic: **${topic}**\n📄 Depth: ${depthLevel}\n\n_This may take a moment..._`,
      is_user: false,
      created_at: new Date().toISOString(),
      metadata: { loading: true, cornell_notes_generating: true }
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const { data: result, error } = await supabase.functions.invoke('generate-notes-orchestrator', {
        body: {
          topic: action.topic,
          fileContent: action.fileContent,
          fileName: action.fileName,
          filePrompt: action.filePrompt,
          depthLevel
        }
      });

      // Remove loading message
      setMessages(prev => prev.filter(m => m.id !== loadingMessage.id));

      if (error || !result?.success) {
        throw new Error(result?.error || 'Failed to generate Cornell Notes');
      }

      const document = result.data;
      let savedNoteId: string | null = null;
      
      // Save to database if user is authenticated
      if (user) {
        const { data: savedNote, error: saveError } = await supabase
          .from('cornell_notes')
          .insert({
            user_id: user.id,
            title: document.title,
            topic: document.topic,
            document: JSON.parse(JSON.stringify(document)),
            source_type: document.sourceType,
            source_file_name: document.sourceFileName
          })
          .select('id')
          .single();
        
        if (!saveError && savedNote) {
          savedNoteId = savedNote.id;
        }
      }

      // Create link with document ID if available
      const viewLink = savedNoteId 
        ? `/cornell-notes?id=${savedNoteId}` 
        : '/cornell-notes';

      // Show success message with link to view notes
      const successMessage = await saveChatMessage(
        `✅ **Cornell Notes Generated!**\n\n📚 **${document.title}**\n📄 ${document.totalPages} page(s) • ${document.sourceType === 'file' ? 'From file' : 'From topic'}\n\n**Summary Preview:**\n> ${document.summary.slice(0, 200)}${document.summary.length > 200 ? '...' : ''}\n\n👉 [View & Edit Notes](${viewLink})`,
        false,
        undefined,
        { cornell_notes: document, action_completed: true, note_id: savedNoteId }
      );

      if (successMessage) {
        setMessages(prev => [...prev, successMessage]);
        playNotificationSound();
      }

      toast({
        title: '📝 Cornell Notes Ready!',
        description: `Generated ${document.totalPages} page(s) for "${document.title}"`
      });

    } catch (error: any) {
      // Remove loading message on error
      setMessages(prev => prev.filter(m => m.id !== loadingMessage.id));
      
      console.error('Error generating Cornell Notes:', error);
      
      const errorMessage = await saveChatMessage(
        `❌ **Failed to generate Cornell Notes**\n\n${error.message || 'An unexpected error occurred. Please try again.'}\n\n💡 Tip: Try rephrasing your request or using a more specific topic.`,
        false,
        undefined,
        { error: true }
      );

      if (errorMessage) {
        setMessages(prev => [...prev, errorMessage]);
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to generate Cornell Notes',
        variant: 'destructive'
      });
    }
  }, [user, saveChatMessage, playNotificationSound, toast]);

  // Action handlers
  const handleConfirmAction = useCallback(async (actionIndex: number) => {
    if (!user) return;
    
    const pending = pendingActions[actionIndex];
    if (!pending || pending.status !== 'pending') return;

    const action = pending.action;
    const entityLabel = getEntityLabel(action.type);
    const entityName = action.title || action.name || 'item';

    try {
      let resultId: string | null = null;
      let confirmMessage = '';

      switch (action.type) {
        // ========== EVENTS ==========
        case 'CREATE_EVENT': {
          const startDate = new Date(action.start_iso!);
          const endDate = new Date(action.end_iso!);
          const specificDate = startDate.toISOString().split('T')[0];
          const startTime = startDate.toTimeString().slice(0, 5);
          const endTime = endDate.toTimeString().slice(0, 5);

          // Check conflicts for events
          const conflictResult = await detectScheduleConflicts({
            user_id: user.id,
            start_time: startTime,
            end_time: endTime,
            specific_date: specificDate
          });

          if (conflictResult?.conflicts?.length > 0) {
            setPendingActions(prev => prev.map((p, i) => 
              i === actionIndex ? { ...p, conflicts: conflictResult.conflicts } : p
            ));
            toast({
              title: 'Schedule Conflict Detected',
              description: `This overlaps with ${conflictResult.conflicts[0].conflict_title}.`,
              variant: 'destructive'
            });
            return;
          }

          const eventResult = await createScheduleBlock({
            title: action.title!,
            specific_date: specificDate,
            start_time: startTime,
            end_time: endTime,
            location: action.location,
            notes: action.notes,
            is_recurring: false,
            source: 'ada-ai',
            user_id: user.id
          });
          resultId = eventResult.id;
          confirmMessage = `✅ Done! I've added **"${action.title}"** to your calendar on ${specificDate} from ${startTime} to ${endTime}.`;
          break;
        }

        case 'UPDATE_EVENT': {
          if (!action.id) throw new Error('Missing event ID for update');
          const updates: any = {};
          if (action.title) updates.title = action.title;
          if (action.start_iso) {
            const startDate = new Date(action.start_iso);
            updates.specific_date = startDate.toISOString().split('T')[0];
            updates.start_time = startDate.toTimeString().slice(0, 5);
          }
          if (action.end_iso) {
            const endDate = new Date(action.end_iso);
            updates.end_time = endDate.toTimeString().slice(0, 5);
          }
          if (action.location) updates.location = action.location;
          if (action.notes) updates.notes = action.notes;
          
          const { updateScheduleBlock } = await import('@/services/api');
          await updateScheduleBlock(action.id, user.id, updates);
          resultId = action.id;
          confirmMessage = `✅ Updated **"${entityName}"** successfully.`;
          break;
        }

        case 'DELETE_EVENT': {
          if (!action.id) throw new Error('Missing event ID for delete');
          await deleteScheduleBlock(action.id, user.id);
          resultId = action.id;
          confirmMessage = `🗑️ Deleted **"${entityName}"** from your calendar.`;
          break;
        }

        // ========== ASSIGNMENTS ==========
        case 'CREATE_ASSIGNMENT': {
          let courseId = action.course_id;
          
          // Check if courseId is a valid UUID
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId || '');
          
          if (!isValidUUID && courseId) {
            // AI sent a name or placeholder instead of UUID - try to resolve
            console.log('Course ID is not a valid UUID, attempting resolution:', courseId);
            courseId = await resolveCourseId(courseId) || undefined;
          }
          
          if (!courseId) {
            // Try to find any active course as fallback
            const { data: courses } = await supabase
              .from('courses')
              .select('id')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .limit(1);
            courseId = courses?.[0]?.id;
          }
          
          if (!courseId) {
            throw new Error('No course found. Please create a course first.');
          }

          const assignmentResult = await createAssignment({
            user_id: user.id,
            course_id: courseId,
            title: action.title!,
            due_date: action.due_date!,
            description: action.description || action.notes,
            priority: action.priority ?? 2,
            estimated_hours: action.estimated_hours,
            assignment_type: action.assignment_type || 'homework'
          });
          resultId = assignmentResult.id;
          confirmMessage = `✅ Created assignment **"${action.title}"** due ${new Date(action.due_date!).toLocaleDateString()}.`;
          break;
        }

        case 'UPDATE_ASSIGNMENT': {
          if (!action.id) throw new Error('Missing assignment ID for update');
          const updates: any = {};
          if (action.title) updates.title = action.title;
          if (action.due_date) updates.due_date = action.due_date;
          if (action.priority !== undefined) updates.priority = action.priority;
          if (action.description) updates.description = action.description;
          
          await updateAssignment(action.id, user.id, updates);
          resultId = action.id;
          confirmMessage = `✅ Updated assignment **"${entityName}"**.`;
          break;
        }

        case 'DELETE_ASSIGNMENT': {
          if (!action.id) throw new Error('Missing assignment ID for delete');
          await deleteAssignment(action.id, user.id);
          resultId = action.id;
          confirmMessage = `🗑️ Deleted assignment **"${entityName}"**.`;
          break;
        }

        case 'COMPLETE_ASSIGNMENT': {
          if (!action.id) throw new Error('Missing assignment ID for complete');
          await completeAssignment(action.id, user.id);
          resultId = action.id;
          confirmMessage = `✅ Marked **"${entityName}"** as complete!`;
          break;
        }

        // ========== EXAMS ==========
        case 'CREATE_EXAM': {
          let courseId = action.course_id;
          
          // Check if courseId is a valid UUID
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId || '');
          
          if (!isValidUUID && courseId) {
            console.log('Exam course ID is not a valid UUID, attempting resolution:', courseId);
            courseId = await resolveCourseId(courseId) || undefined;
          }
          
          if (!courseId) {
            const { data: courses } = await supabase
              .from('courses')
              .select('id')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .limit(1);
            courseId = courses?.[0]?.id;
          }
          if (!courseId) {
            throw new Error('No course found. Please create a course first.');
          }

          const examResult = await createExam({
            user_id: user.id,
            course_id: courseId,
            title: action.title!,
            exam_date: action.exam_date!,
            duration_minutes: action.duration_minutes || 60,
            location: action.location,
            exam_type: action.exam_type || 'midterm',
            notes: action.notes
          });
          resultId = examResult.id;
          confirmMessage = `✅ Created exam **"${action.title}"** on ${new Date(action.exam_date!).toLocaleDateString()}.`;
          break;
        }

        case 'UPDATE_EXAM': {
          if (!action.id) throw new Error('Missing exam ID for update');
          const updates: any = {};
          if (action.title) updates.title = action.title;
          if (action.exam_date) updates.exam_date = action.exam_date;
          if (action.location) updates.location = action.location;
          if (action.duration_minutes) updates.duration_minutes = action.duration_minutes;
          
          await updateExam(action.id, user.id, updates);
          resultId = action.id;
          confirmMessage = `✅ Updated exam **"${entityName}"**.`;
          break;
        }

        case 'DELETE_EXAM': {
          if (!action.id) throw new Error('Missing exam ID for delete');
          await deleteExam(action.id, user.id);
          resultId = action.id;
          confirmMessage = `🗑️ Deleted exam **"${entityName}"**.`;
          break;
        }

        // ========== STUDY SESSIONS ==========
        case 'CREATE_STUDY_SESSION': {
          let courseId = action.course_id;
          
          // Check if courseId is a valid UUID (optional for study sessions)
          if (courseId) {
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
            if (!isValidUUID) {
              console.log('Study session course ID is not a valid UUID, attempting resolution:', courseId);
              courseId = await resolveCourseId(courseId) || undefined;
            }
          }
          
          const sessionResult = await createStudySession({
            user_id: user.id,
            title: action.title!,
            scheduled_start: action.scheduled_start || action.start_iso!,
            scheduled_end: action.scheduled_end || action.end_iso!,
            course_id: courseId,
            assignment_id: action.assignment_id,
            exam_id: action.exam_id,
            notes: action.notes
          });
          resultId = sessionResult.id;
          confirmMessage = `✅ Created study session **"${action.title}"**.`;
          break;
        }

        case 'UPDATE_STUDY_SESSION': {
          if (!action.id) throw new Error('Missing study session ID for update');
          const updates: any = {};
          if (action.title) updates.title = action.title;
          if (action.scheduled_start) updates.scheduled_start = action.scheduled_start;
          if (action.scheduled_end) updates.scheduled_end = action.scheduled_end;
          if (action.notes) updates.notes = action.notes;
          if (action.status) updates.status = action.status;
          
          await updateStudySession(action.id, user.id, updates);
          resultId = action.id;
          confirmMessage = `✅ Updated study session **"${entityName}"**.`;
          break;
        }

        case 'DELETE_STUDY_SESSION': {
          if (!action.id) throw new Error('Missing study session ID for delete');
          await deleteStudySession(action.id, user.id);
          resultId = action.id;
          confirmMessage = `🗑️ Deleted study session **"${entityName}"**.`;
          break;
        }

        // ========== COURSES ==========
        case 'CREATE_COURSE': {
          const courseResult = await createCourse({
            user_id: user.id,
            name: action.name || action.title!,
            code: action.code,
            credits: action.credits,
            instructor: action.instructor,
            color: action.color,
            target_grade: action.target_grade
          });
          resultId = courseResult.id;
          confirmMessage = `✅ Created course **"${action.name || action.title}"**.`;
          break;
        }

        case 'UPDATE_COURSE': {
          if (!action.id) throw new Error('Missing course ID for update');
          const updates: any = {};
          if (action.name) updates.name = action.name;
          if (action.code) updates.code = action.code;
          if (action.credits) updates.credits = action.credits;
          if (action.instructor) updates.instructor = action.instructor;
          if (action.color) updates.color = action.color;
          if (action.target_grade) updates.target_grade = action.target_grade;
          
          await updateCourse(action.id, user.id, updates);
          resultId = action.id;
          confirmMessage = `✅ Updated course **"${entityName}"**.`;
          break;
        }

        case 'DELETE_COURSE': {
          if (!action.id) throw new Error('Missing course ID for delete');
          await deleteCourse(action.id, user.id);
          resultId = action.id;
          confirmMessage = `🗑️ Deleted course **"${entityName}"**.`;
          break;
        }

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Update pending action status
      setPendingActions(prev => prev.map((p, i) => 
        i === actionIndex ? { ...p, status: 'confirmed', createdBlockId: resultId || undefined } : p
      ));

      // Show success toast with undo for CREATE actions
      const isCreate = action.type.startsWith('CREATE_');
      toast({
        title: `✅ ${entityLabel} ${isCreate ? 'Created' : action.type.startsWith('DELETE_') ? 'Deleted' : action.type === 'COMPLETE_ASSIGNMENT' ? 'Completed' : 'Updated'}`,
        description: `"${entityName}" ${isCreate ? 'added successfully' : 'updated'}`,
        action: isCreate && action.type === 'CREATE_EVENT' && resultId ? (
          <Button variant="outline" size="sm" onClick={() => handleUndoAction(resultId!)}>
            Undo
          </Button>
        ) : undefined
      });

      // Save confirmation message
      await saveChatMessage(confirmMessage, false, undefined, { action_confirmed: true, entity_id: resultId });
      setMessages(prev => [...prev, {
        id: `confirm-${Date.now()}`,
        message: confirmMessage,
        is_user: false,
        created_at: new Date().toISOString(),
        metadata: { action_confirmed: true }
      }]);

      // Award First Voyage badge for first event creation
      if (action.type === 'CREATE_EVENT') {
        await handleFirstVoyageUnlock();
      }

    } catch (error: any) {
      console.error('Error confirming action:', error);
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action.type.toLowerCase().replace('_', ' ')}. Please try again.`,
        variant: 'destructive'
      });
    }
  }, [user, pendingActions, toast, saveChatMessage, handleFirstVoyageUnlock, resolveCourseId]);

  const handleCancelAction = useCallback((actionIndex: number) => {
    setPendingActions(prev => prev.map((p, i) => 
      i === actionIndex ? { ...p, status: 'cancelled' } : p
    ));
    
    toast({
      title: 'Action Cancelled',
      description: 'The event was not added to your calendar.'
    });
  }, [toast]);

  const handleUndoAction = useCallback(async (blockId: string) => {
    if (!user) return;
    
    const success = await deleteScheduleBlock(blockId, user.id);
    if (success) {
      toast({
        title: 'Event Removed',
        description: 'The event has been removed from your calendar.'
      });
    }
  }, [user, toast]);

  // Send message
  const handleSendMessage = useCallback(async (message: string) => {
    if ((!message.trim() && !pendingFile) || !user || isProcessing) return;

    if (messageCount >= MESSAGE_LIMIT) {
      setShowUpgrade(true);
      return;
    }

    const userMessage = message.trim();
    const attachedFile = pendingFile;
    
    setPendingFile(null);
    setIsProcessing(true);

    try {
      let fileId: string | undefined;
      let fileContext = '';
      
      if (attachedFile) {
        const uploadResult = await uploadAndIndexFile(attachedFile);
        if (uploadResult) {
          fileId = uploadResult.fileId;
          fileContext = `[Attached file: ${attachedFile.name}]`;
          
          if (wantsScheduleParsing(userMessage)) {
            await processFileWithAgenticAI(fileId, attachedFile, 'schedule_parser');
            setPendingFileStatus('');
            return;
          }
        }
      }

      const displayMessage = fileContext 
        ? `${fileContext}\n\n${userMessage || 'What can you tell me about this file?'}` 
        : userMessage;
      
      const savedUserMessage = await saveChatMessage(
        displayMessage, 
        true, 
        fileId,
        fileId ? { file_name: attachedFile?.name } : undefined
      );
      
      if (savedUserMessage) {
        const nextCount = messageCount + 1;
        setMessages(prev => [...prev, savedUserMessage]);
        setMessageCount(nextCount);
        await handleChatBadgeUnlock(nextCount);
      }

      const { data: aiResponse, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: userMessage || 'What can you tell me about this file?',
          conversation_id: conversationId,
          just_indexed_file_id: fileId
        }
      });

      if (error) throw error;

      const aiMessage = await saveChatMessage(
        aiResponse.response,
        false,
        fileId,
        aiResponse.metadata
      );

      if (aiMessage) {
        setMessages(prev => [...prev, aiMessage]);
        playNotificationSound();
        
        if (aiResponse.metadata?.has_actions && aiResponse.metadata?.actions?.length > 0) {
          const actions = aiResponse.metadata.actions as AdaAction[];
          
          // Separate Cornell Notes actions (auto-execute) from other actions (need confirmation)
          const cornellNotesActions = actions.filter(a => a.type === 'CREATE_CORNELL_NOTES');
          const otherActions = actions.filter(a => a.type !== 'CREATE_CORNELL_NOTES');
          
          // Auto-execute Cornell Notes actions immediately (no confirmation needed)
          for (const action of cornellNotesActions) {
            await executeCreateCornellNotes(action);
          }
          
          // Add other actions to pending (require user confirmation)
          if (otherActions.length > 0) {
            const newPendingActions: PendingAction[] = otherActions.map((action: AdaAction) => ({
              action,
              status: 'pending' as const,
              conflicts: []
            }));
            setPendingActions(prev => [...prev, ...newPendingActions]);
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setPendingFileStatus('');
    }
  }, [user, isProcessing, messageCount, pendingFile, conversationId, uploadAndIndexFile, wantsScheduleParsing, processFileWithAgenticAI, saveChatMessage, playNotificationSound, toast, handleChatBadgeUnlock, executeCreateCornellNotes]);

  // Voice toggle
  const handleVoiceToggle = useCallback(async () => {
    if (!isSpeechSupported) {
      toast({
        title: 'Voice capture not supported',
        description: 'Try switching to Chrome or Edge.',
        variant: 'destructive'
      });
      return;
    }

    if (isVoiceListening) {
      stopListening();
      return;
    }

    try {
      await startListening();
    } catch (error) {
      toast({
        title: 'Voice capture error',
        description: (error as Error)?.message || 'Could not access microphone.',
        variant: 'destructive'
      });
    }
  }, [isSpeechSupported, isVoiceListening, startListening, stopListening, toast]);

  // Message actions
  const handleCopy = useCallback(async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: 'Copied', description: 'Message copied to clipboard' });
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  }, [toast]);

  const handleReaction = useCallback((messageId: string, reaction: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, reactions: [...(msg.reactions || []), reaction] }
        : msg
    ));
  }, []);

  // Quick suggestion handler
  const handleQuickSuggestion = useCallback((text: string) => {
    inputPanelRef.current?.setValue(text);
    inputPanelRef.current?.focus();
  }, []);

  return (
    <>
      {/* Main container - strict height containment for no-scroll layout */}
      <div 
        className="grid h-full w-full overflow-hidden"
        style={{ 
          gridTemplateRows: 'auto 1fr auto',
          minHeight: 0, // Critical for nested flex/grid
          maxHeight: '100%'
        }}
      >
        {/* Header - ChatGPT style minimal */}
        <AdaChatHeader
          messageCount={messageCount}
          messageLimit={MESSAGE_LIMIT}
          isFullScreen={isFullScreen}
          showAccessibility={showAccessibility}
          accessibilitySettings={accessibilitySettings}
          onFullScreenToggle={onFullScreenToggle}
          onAccessibilityToggle={() => setShowAccessibility(!showAccessibility)}
          onAccessibilityChange={setAccessibilitySettings}
          onHistoryToggle={onHistoryToggle}
          isHistoryOpen={isHistoryOpen}
        />

        {/* Messages area - fills remaining space */}
        <div 
          className="relative overflow-hidden min-h-0"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Enhanced File Upload overlay */}
          {showEnhancedUpload && (
            <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Enhanced File Upload</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowEnhancedUpload(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <EnhancedFileUpload 
                  onFileUpload={handleEnhancedFileUpload}
                  maxFiles={5}
                  maxSizeInMB={10}
                  className="border-2 border-dashed"
                />
              </div>
            </div>
          )}
          
          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-10 flex items-center justify-center">
              <div className="text-center p-6 bg-background/90 rounded-lg shadow-lg">
                <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Drop your file here</p>
                <p className="text-sm text-muted-foreground">Supported: PDF, JPG, PNG, TXT, DOC, DOCX</p>
              </div>
            </div>
          )}

          {/* Messages Panel - isolated with absolute positioning */}
          <AdaMessagesPanel
            messages={messages}
            pendingActions={pendingActions}
            highContrast={accessibilitySettings.highContrast}
            onCopy={handleCopy}
            onReaction={handleReaction}
            onConfirmAction={handleConfirmAction}
            onCancelAction={handleCancelAction}
            onQuickSuggestion={handleQuickSuggestion}
          />
        </div>

        {/* Input area - fixed height */}
        <AdaInputPanel
          ref={inputPanelRef}
          isProcessing={isProcessing}
          pendingFile={pendingFile}
          pendingFileStatus={pendingFileStatus}
          isVoiceListening={isVoiceListening}
          isSpeechSupported={isSpeechSupported}
          voiceInterimTranscript={voiceInterimTranscript}
          hasVoiceDraft={!!voiceFinalChunk}
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          onSend={handleSendMessage}
          onFileSelect={handleFileSelect}
          onRemoveFile={handleRemoveFile}
          onImportAsSchedule={handleImportAsSchedule}
          onImportAsEvents={handleImportAsEvents}
          onVoiceToggle={handleVoiceToggle}
          onEnhancedUpload={() => setShowEnhancedUpload(true)}
          onQuickSuggestion={handleQuickSuggestion}
        />
      </div>

      {/* Conflict Indicator Button */}
      {conflicts.length > 0 && !conflictsDismissed && !showConflictPanel && (
        <Button
          onClick={() => setShowConflictPanel(true)}
          className="fixed bottom-24 right-6 z-50 h-12 w-12 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600 text-white animate-pulse"
          size="icon"
          title="Schedule conflicts detected"
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {conflicts.length}
          </span>
        </Button>
      )}

      {/* Conflicts Panel Modal */}
      {showConflictPanel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Conflict Resolution Center
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowConflictPanel(false);
                    setConflictsDismissed(true);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowConflictPanel(false)}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4">
              <ConflictResolutionPanel 
                onConflictResolved={(conflictId) => {
                  setConflicts(prev => prev.filter(c => c.conflict_id !== conflictId));
                  if (conflicts.length <= 1) {
                    setShowConflictPanel(false);
                  }
                }}
                onRefreshNeeded={() => {
                  window.location.reload();
                }}
                className="border-0 shadow-none"
              />
            </div>
          </div>
        </div>
      )}

      <UpgradeToPremiumDialog 
        open={showUpgrade} 
        onOpenChange={setShowUpgrade}
        feature="ada-ai"
      />

      <AchievementUnlockModal
        badge={chatBadgeUnlock}
        isOpen={showChatBadgeModal}
        onClose={() => {
          setShowChatBadgeModal(false);
          setChatBadgeUnlock(null);
        }}
      />
    </>
  );
}
