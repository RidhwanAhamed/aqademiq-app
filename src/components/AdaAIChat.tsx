// Purpose: Ada AI chat UI + voice transcript capture. TODO: API -> /api/chat/messages & /api/transcripts.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { UpgradeToPremiumDialog } from '@/components/UpgradeToPremiumDialog';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EnhancedFileUpload } from '@/components/EnhancedFileUpload';
import { ConflictResolutionPanel } from '@/components/ConflictResolutionPanel';
import { FileAttachmentChip } from '@/components/FileAttachmentChip';
import { useAdvancedConflictDetection } from '@/hooks/useAdvancedConflictDetection';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { createScheduleBlock, detectScheduleConflicts, deleteScheduleBlock } from '@/services/api';
import { mergeTranscriptWithInput } from '@/utils/voice-cleaner';
import {
  Upload,
  Send,
  Bot,
  User,
  FileText,
  Image,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Clock,
  CalendarPlus,
  Smile,
  ThumbsUp,
  ThumbsDown,
  Heart,
  X,
  Copy,
  RotateCcw,
  Download,
  Settings,
  Accessibility,
  Type,
  Contrast,
  Keyboard,
  Volume2,
  VolumeX,
  Loader2,
  MessageCircle,
  Paperclip,
  Maximize2,
  Minimize2,
  Mic,
  MicOff
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  message: string;
  is_user: boolean;
  created_at: string;
  file_upload_id?: string;
  metadata?: any;
  reactions?: string[];
}

interface FileUpload {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  ocr_text?: string;
  parsed_data?: any;
}

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

// Agentic action types from AI
interface AdaAction {
  type: 'CREATE_EVENT';
  title: string;
  start_iso: string;
  end_iso: string;
  location?: string;
  notes?: string;
}

interface PendingAction {
  action: AdaAction;
  status: 'pending' | 'confirmed' | 'cancelled';
  conflicts?: ScheduleConflict[];
  createdBlockId?: string;
}

interface AdaAIChatProps {
  isFullScreen?: boolean;
  onFullScreenToggle?: () => void;
  selectedConversationId?: string | null;
  onConversationChange?: (id: string) => void;
}

export function AdaAIChat({ 
  isFullScreen = false, 
  onFullScreenToggle,
  selectedConversationId,
  onConversationChange 
}: AdaAIChatProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [showConflictPanel, setShowConflictPanel] = useState(false);
  const [conflictsDismissed, setConflictsDismissed] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [welcomeMessageShown, setWelcomeMessageShown] = useState(false);
  const [showEnhancedUpload, setShowEnhancedUpload] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [lastCreatedBlockId, setLastCreatedBlockId] = useState<string | null>(null);
  const [hasVoiceDraft, setHasVoiceDraft] = useState(false);
  
  // ChatGPT-style pending file attachment
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileStatus, setPendingFileStatus] = useState<string>('');
  
  // Enhanced conflict detection
  const { 
    detectConflicts, 
    loading: isDetecting 
  } = useAdvancedConflictDetection();

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
  
  // Accessibility state
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({
    fontSize: 16,
    highContrast: false,
    soundEnabled: true,
    focusOutlines: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const MESSAGE_LIMIT = 10;

  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!user) return;
      
      try {
        // If explicitly creating a new conversation (null), start fresh
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

        // If a specific conversation is selected, load it
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

        // Initial load - fetch last 50 messages for this user
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
          // New user - create new conversation and show welcome
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
  }, [user, selectedConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  useEffect(() => {
    if (!voiceFinalChunk) return;
    setInputMessage(prev => mergeTranscriptWithInput(prev, voiceFinalChunk.text));
    setHasVoiceDraft(true);
    acknowledgeFinalChunk();
  }, [voiceFinalChunk, acknowledgeFinalChunk]);

  useEffect(() => {
    if (inputMessage.trim().length === 0) {
      setHasVoiceDraft(false);
    }
  }, [inputMessage]);

  useEffect(() => {
    if (!speechError) return;
    toast({
      title: 'Voice capture unavailable',
      description: speechError,
      variant: 'destructive'
    });
  }, [speechError, toast]);

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen && onFullScreenToggle) {
        onFullScreenToggle();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isFullScreen, onFullScreenToggle]);

  useEffect(() => {
    // Apply accessibility settings
    document.documentElement.style.fontSize = `${accessibilitySettings.fontSize}px`;
    document.documentElement.classList.toggle('high-contrast', accessibilitySettings.highContrast);
    document.documentElement.classList.toggle('focus-outlines', accessibilitySettings.focusOutlines);
  }, [accessibilitySettings]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const playNotificationSound = () => {
    if (accessibilitySettings.soundEnabled) {
      // Create a simple beep sound
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
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // ChatGPT-style: attach file, don't process immediately
      setPendingFile(files[0]);
      setPendingFileStatus('');
    }
  };

  // Handle file input change - ChatGPT style (attach, don't process)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setPendingFileStatus('');
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove pending file attachment
  const handleRemovePendingFile = () => {
    setPendingFile(null);
    setPendingFileStatus('');
  };

  // Upload and index file for RAG (without auto schedule parsing)
  const uploadAndIndexFile = async (file: File, userPrompt?: string): Promise<{ fileId: string; ocrText?: string } | null> => {
    if (!user) return null;

    try {
      setPendingFileStatus('Uploading...');
      
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('study-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create file upload record
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

      // Step 1: OCR if needed
      let ocrText = '';
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setPendingFileStatus('Extracting text...');
        
        const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('enhanced-ocr-parser', {
          body: { file_id: fileRecord.id, use_fallback: false }
        });

        if (ocrError || !ocrResult?.success) {
          // Fallback to basic OCR
          const { data: basicOcrResult } = await supabase.functions.invoke('ocr-parser', {
            body: { file_id: fileRecord.id }
          });
          ocrText = basicOcrResult?.text || '';
        } else {
          ocrText = ocrResult?.text || '';
        }
        
        console.log(`OCR completed: ${ocrText.length} characters extracted`);
      }

      // Step 2: Generate embeddings for RAG
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
          console.log('✅ Document indexed for RAG search');
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
  };

  // Check if user wants schedule parsing based on their message
  const wantsScheduleParsing = (message: string): boolean => {
    const scheduleKeywords = [
      'timetable', 'schedule', 'add to calendar', 'import', 
      'parse schedule', 'class schedule', 'classes', 'add classes',
      'import schedule', 'extract schedule', 'calendar'
    ];
    const lowerMessage = message.toLowerCase();
    return scheduleKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  const handleEnhancedFileUpload = async (file: File) => {
    if (!user) return;

    setIsProcessing(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('study-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create file upload record
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

      // Generate signed URL for file access (1 hour expiry)
      const { data: signed } = await supabase.storage
        .from('study-files')
        .createSignedUrl(uploadData.path, 3600);

      // Add user message about file upload with signed URL
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

      // Process file with enhanced AI pipeline (legacy flow with schedule parsing)
      await processFileWithEnhancedAI(fileRecord.id, file);

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
  };

  // Legacy handler for backward compatibility
  const handleFileUpload = async (file?: File) => {
    const targetFile = file || fileInputRef.current?.files?.[0];
    if (!targetFile) return;
    
    await handleEnhancedFileUpload(targetFile);
  };

  const processFileWithEnhancedAI = async (fileId: string, file: File, userPrompt?: string) => {
    try {
      // Show progress: Uploading → OCR → Parsing
      const progressMessage = await saveChatMessage(
        '⏳ Processing your file...\n\n📤 **Phase 1:** Uploading ✓\n🔍 **Phase 2:** Extracting text (OCR)...',
        false,
        fileId,
        { processing: true, phase: 'ocr' }
      );
      
      if (progressMessage) {
        setMessages(prev => [...prev, progressMessage]);
      }

      // Step 1: Enhanced OCR with fallback system (no base64, use file_id)
      let ocrResult;
      
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        // Try enhanced OCR parser first (pass file_id, not base64)
        const { data: enhancedOcrResult, error: enhancedOcrError } = await supabase.functions.invoke('enhanced-ocr-parser', {
          body: { 
            file_id: fileId,
            use_fallback: false 
          }
        });

        if (enhancedOcrError || !enhancedOcrResult?.success) {
          console.log('Enhanced OCR failed, trying basic OCR...');
          // Fallback to basic OCR
          const { data: basicOcrResult, error: basicOcrError } = await supabase.functions.invoke('ocr-parser', {
            body: { 
              file_id: fileId
            }
          });
          
          if (basicOcrError) throw basicOcrError;
          ocrResult = basicOcrResult;
        } else {
          ocrResult = enhancedOcrResult;
        }

        console.log(`OCR completed: ${ocrResult?.text?.length || 0} characters extracted`);
      }

      // Step 2: Index document for RAG (generate embeddings)
      if (ocrResult?.text && ocrResult.text.length > 50) {
        // Update progress message
        if (progressMessage) {
          await supabase
            .from('chat_messages')
            .update({
              message: '⏳ Processing your file...\n\n📤 **Phase 1:** Uploading ✓\n🔍 **Phase 2:** Extracting text (OCR) ✓\n🧠 **Phase 2.5:** Indexing for AI search...',
              metadata: { processing: true, phase: 'indexing' }
            })
            .eq('id', progressMessage.id);
          
          setMessages(prev => prev.map(m => 
            m.id === progressMessage.id 
              ? { ...m, message: '⏳ Processing your file...\n\n📤 **Phase 1:** Uploading ✓\n🔍 **Phase 2:** Extracting text (OCR) ✓\n🧠 **Phase 2.5:** Indexing for AI search...' }
              : m
          ));
        }

        try {
          const { error: embeddingError } = await supabase.functions.invoke('generate-embeddings', {
            body: { 
              file_upload_id: fileId,
              source_type: 'timetable',
              metadata: { 
                file_name: file.name,
                file_type: file.type,
                indexed_at: new Date().toISOString()
              }
            }
          });
          
          if (embeddingError) {
            console.log('Embedding generation failed (non-blocking):', embeddingError);
          } else {
            console.log('✅ Document indexed for RAG search');
          }
        } catch (embError) {
          console.log('Embedding error (non-blocking):', embError);
        }
      }

      // Update progress: OCR complete, now parsing
      if (progressMessage) {
        await supabase
          .from('chat_messages')
          .update({
            message: '⏳ Processing your file...\n\n📤 **Phase 1:** Uploading ✓\n🔍 **Phase 2:** Extracting text (OCR) ✓\n🧠 **Phase 3:** AI parsing...',
            metadata: { processing: true, phase: 'parsing' }
          })
          .eq('id', progressMessage.id);
        
        setMessages(prev => prev.map(m => 
          m.id === progressMessage.id 
            ? { ...m, message: '⏳ Processing your file...\n\n📤 **Phase 1:** Uploading ✓\n🔍 **Phase 2:** Extracting text (OCR) ✓\n🧠 **Phase 3:** AI parsing...' }
            : m
        ));
      }

      // Step 2: Advanced schedule parsing with conflict detection
      const { data: parseResult, error: parseError } = await supabase.functions.invoke('advanced-schedule-parser', {
        body: { 
          file_id: fileId,
          user_id: user.id,
          auto_add_to_calendar: true,
          sync_to_google: false,
          enable_conflict_detection: true,
          enable_workload_balancing: true
        }
      });

      if (parseError) {
        console.error('Advanced parsing error:', parseError);
        throw parseError;
      }

      console.log('Parsing complete:', {
        courses: parseResult.schedule_data?.courses?.length || 0,
        classes: parseResult.schedule_data?.classes?.length || 0,
        assignments: parseResult.schedule_data?.assignments?.length || 0,
        exams: parseResult.schedule_data?.exams?.length || 0,
        conflicts: parseResult.conflicts?.length || 0
      });

      // Step 3: Real-time conflict detection
      if (parseResult.schedule_data) {
        const detectedConflicts = await detectConflicts(parseResult.schedule_data);
        parseResult.conflicts = [...(parseResult.conflicts || []), ...detectedConflicts];
      }

      // Remove progress message and save final AI response with enhanced metadata
      if (progressMessage) {
        setMessages(prev => prev.filter(m => m.id !== progressMessage.id));
        await supabase.from('chat_messages').delete().eq('id', progressMessage.id);
      }

      const aiMessage = await saveChatMessage(
        parseResult.response,
        false,
        fileId,
        { 
          parsed_data: parseResult.schedule_data, 
          conflicts: parseResult.conflicts, 
          suggestions: parseResult.suggestions,
          workload_analysis: parseResult.workload_analysis,
          can_add_to_calendar: !parseResult.calendar_results,
          can_sync_to_google: !parseResult.google_sync_results,
          calendar_results: parseResult.calendar_results,
          google_sync_results: parseResult.google_sync_results,
          processing_stats: {
            ocr_confidence: ocrResult?.confidence || 0,
            document_type: parseResult.document_type,
            processing_time: parseResult.processing_time,
            phases_completed: ['upload', 'ocr', 'parsing']
          }
        }
      );

      if (aiMessage) {
        setMessages(prev => [...prev, aiMessage]);
        playNotificationSound();
        
        // Update conflicts state for resolution panel
        if (parseResult.conflicts && parseResult.conflicts.length > 0) {
          setConflicts(parseResult.conflicts);
        }
      }

      console.log('✅ File processing complete');

    } catch (error) {
      console.error('❌ Error processing file with enhanced AI:', error);
      const errorMessage = await saveChatMessage(
        `I encountered an error processing your file: **${error.message || 'Unknown error'}**\n\nPlease try uploading it again. If the issue persists, the file format may not be supported or the document quality may need improvement.`,
        false,
        fileId,
        { 
          error: error.message, 
          timestamp: new Date().toISOString(),
          processing_failed: true 
        }
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
  };

  // Legacy method for backward compatibility
  const processFileWithAI = processFileWithEnhancedAI;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:image/... prefix
      };
      reader.onerror = error => reject(error);
    });
  };

  const saveChatMessage = async (message: string, isUser: boolean, fileUploadId?: string, metadata?: any) => {
    if (!user) return null;

    // Ensure we have a conversation_id
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
  };

  // Handle action confirmation from AI
  const handleConfirmAction = useCallback(async (actionIndex: number) => {
    if (!user) return;
    
    const pending = pendingActions[actionIndex];
    if (!pending || pending.status !== 'pending') return;

    try {
      const action = pending.action;
      const startDate = new Date(action.start_iso);
      const endDate = new Date(action.end_iso);
      
      // Format for schedule_blocks table
      const specificDate = startDate.toISOString().split('T')[0];
      const startTime = startDate.toTimeString().slice(0, 5);
      const endTime = endDate.toTimeString().slice(0, 5);
      
      // Check for conflicts first
      const { conflicts } = await detectScheduleConflicts({
        start_time: startTime,
        end_time: endTime,
        specific_date: specificDate,
        user_id: user.id
      });

      if (conflicts.length > 0) {
        // Update pending action with conflicts
        setPendingActions(prev => prev.map((p, i) => 
          i === actionIndex ? { ...p, conflicts } : p
        ));
        
        toast({
          title: 'Schedule Conflict Detected',
          description: `This overlaps with ${conflicts[0].conflict_title}. Resolve the conflict to continue.`,
          variant: 'destructive'
        });
        return;
      }

      // Create the schedule block
      const result = await createScheduleBlock({
        title: action.title,
        specific_date: specificDate,
        start_time: startTime,
        end_time: endTime,
        location: action.location,
        notes: action.notes,
        is_recurring: false,
        source: 'ada-ai',
        user_id: user.id
      });

      // Update action status
      setPendingActions(prev => prev.map((p, i) => 
        i === actionIndex ? { ...p, status: 'confirmed', createdBlockId: result.id } : p
      ));
      
      setLastCreatedBlockId(result.id);

      toast({
        title: '✅ Event Created',
        description: `"${action.title}" added to your calendar`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUndoAction(result.id)}
          >
            Undo
          </Button>
        )
      });

      // Save confirmation to chat
      await saveChatMessage(
        `✅ Done! I've added **"${action.title}"** to your calendar on ${specificDate} from ${startTime} to ${endTime}.`,
        false,
        undefined,
        { action_confirmed: true, block_id: result.id }
      );
      
      setMessages(prev => [...prev, {
        id: `confirm-${Date.now()}`,
        message: `✅ Done! I've added **"${action.title}"** to your calendar on ${specificDate} from ${startTime} to ${endTime}.`,
        is_user: false,
        created_at: new Date().toISOString(),
        metadata: { action_confirmed: true }
      }]);

    } catch (error) {
      console.error('Error confirming action:', error);
      toast({
        title: 'Error',
        description: 'Failed to create event. Please try again.',
        variant: 'destructive'
      });
    }
  }, [user, pendingActions, toast]);

  // Handle action cancellation
  const handleCancelAction = useCallback((actionIndex: number) => {
    setPendingActions(prev => prev.map((p, i) => 
      i === actionIndex ? { ...p, status: 'cancelled' } : p
    ));
    
    toast({
      title: 'Action Cancelled',
      description: 'The event was not added to your calendar.'
    });
  }, [toast]);

  // Handle undo for created events
  const handleUndoAction = useCallback(async (blockId: string) => {
    if (!user) return;
    
    const success = await deleteScheduleBlock(blockId, user.id);
    if (success) {
      toast({
        title: 'Event Removed',
        description: 'The event has been removed from your calendar.'
      });
      setLastCreatedBlockId(null);
    }
  }, [user, toast]);

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !pendingFile) || !user || isProcessing) return;

    // Check message limit
    if (messageCount >= MESSAGE_LIMIT) {
      setShowUpgrade(true);
      return;
    }

    const userMessage = inputMessage.trim();
    const attachedFile = pendingFile;
    
    setInputMessage('');
    setPendingFile(null);
    setIsProcessing(true);

    try {
      let fileId: string | undefined;
      let fileContext = '';
      
      // If there's an attached file, upload and index it first
      if (attachedFile) {
        const uploadResult = await uploadAndIndexFile(attachedFile, userMessage);
        if (uploadResult) {
          fileId = uploadResult.fileId;
          fileContext = `[Attached file: ${attachedFile.name}]`;
          
          // Check if user wants schedule parsing
          if (wantsScheduleParsing(userMessage)) {
            // Run schedule parser for timetable imports
            await processFileWithEnhancedAI(fileId, attachedFile, userMessage);
            setPendingFileStatus('');
            return; // processFileWithEnhancedAI handles the full flow
          }
        }
      }

      // Save user message (with file context if applicable)
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
        setMessages(prev => [...prev, savedUserMessage]);
        setMessageCount(prev => prev + 1);
      }

      // Get AI response with conversation context and file info
      const { data: aiResponse, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: userMessage || 'What can you tell me about this file?',
          conversation_id: conversationId,
          just_indexed_file_id: fileId // Pass file ID to boost its relevance in RAG
        }
      });

      if (error) throw error;

      // Save AI response
      const aiMessage = await saveChatMessage(
        aiResponse.response,
        false,
        fileId,
        aiResponse.metadata
      );

      if (aiMessage) {
        setMessages(prev => [...prev, aiMessage]);
        playNotificationSound();
        
        // Check for agentic actions in the response
        if (aiResponse.metadata?.has_actions && aiResponse.metadata?.actions?.length > 0) {
          const newPendingActions: PendingAction[] = aiResponse.metadata.actions.map((action: AdaAction) => ({
            action,
            status: 'pending' as const,
            conflicts: []
          }));
          setPendingActions(prev => [...prev, ...newPendingActions]);
        }
        
        // Legacy: Check if the response contains schedule data that should be added to calendar
        if (aiResponse.metadata?.schedule_data && userMessage.toLowerCase().includes('add to calendar')) {
          await addToCalendar(aiResponse.metadata.schedule_data);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errMsg = (error as any)?.message || 'Failed to send message.';
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setPendingFileStatus('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceToggle = async () => {
    if (!isSpeechSupported) {
      toast({
        title: 'Voice capture not supported',
        description: 'Try switching to Chrome or Edge to enable speech input.',
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
      const message = (error as Error)?.message || 'Could not access microphone.';
      toast({
        title: 'Voice capture error',
        description: message,
        variant: 'destructive'
      });
    }
  };

  const handleVoiceDraftCleared = () => {
    resetTranscript();
    setHasVoiceDraft(false);
  };

  const handleVoiceQuickSend = () => {
    handleSendMessage();
    handleVoiceDraftCleared();
  };

  const addReaction = async (messageId: string, reaction: string) => {
    // Update local state optimistically
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, reactions: [...(msg.reactions || []), reaction] }
        : msg
    ));
  };

  const copyMessage = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: 'Copied',
        description: 'Message copied to clipboard'
      });
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const addToCalendar = async (scheduleData: any) => {
    // Implementation remains the same as original
    try {
      if (!user || !scheduleData) return;

      // Adding parsed schedule data to user's calendar
      
      const { courses = [], classes = [], assignments = [], exams = [] } = scheduleData;
      let addedItems = { courses: 0, assignments: 0, exams: 0, classes: 0 };
      
      // First, add courses and get their IDs
      const courseMap = new Map();
      for (const course of courses) {
        try {
          const { data: existingCourse } = await supabase
            .from('courses')
            .select('id')
            .eq('user_id', user.id)
            .eq('code', course.code)
            .single();

          if (!existingCourse) {
            const { data: newCourse, error } = await supabase
              .from('courses')
              .insert([{
                user_id: user.id,
                name: course.name,
                code: course.code || '',
                semester_id: '', // Will be updated later
                color: course.color || '#3B82F6',
                credits: course.credits || 3,
                instructor: course.instructor || ''
              }])
              .select()
              .single();
            
            if (!error && newCourse) {
              courseMap.set(course.code, newCourse.id);
              addedItems.courses++;
            }
          } else {
            courseMap.set(course.code, existingCourse.id);
          }
        } catch (error) {
          console.error('Error adding course:', error);
        }
      }

      toast({
        title: 'Calendar Updated Successfully! 🎉',
        description: `Added ${addedItems.courses} courses, ${addedItems.classes} classes, ${addedItems.assignments} assignments, ${addedItems.exams} exams`,
      });

      // Send confirmation message
      const confirmationMessage = await saveChatMessage(
        `✅ Perfect! I've successfully added your schedule to the calendar:\n\n📚 ${addedItems.courses} courses\n🕒 ${addedItems.classes} class sessions\n📝 ${addedItems.assignments} assignments\n📖 ${addedItems.exams} exams\n\nYou can now view and manage everything in your Calendar section. Is there anything else you'd like me to help you organize?`,
        false
      );

      if (confirmationMessage) {
        setMessages(prev => [...prev, confirmationMessage]);
      }

    } catch (error) {
      console.error('Error adding to calendar:', error);
      toast({
        title: 'Calendar Error',
        description: 'Failed to add some items to calendar. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const syncToGoogleCalendar = async (scheduleData: any) => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-google-calendar-sync', {
        body: {
          action: 'sync-schedule',
          userId: user.id,
          scheduleData: scheduleData
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Google Calendar Sync Complete! 🔄',
          description: `Synced ${data.results.synced} items to Google Calendar`,
        });

        // Send confirmation message
        const confirmationMessage = await saveChatMessage(
          `🔄 **Google Calendar Sync Complete!**\n\n✅ Successfully synced ${data.results.synced} items:\n• ${data.results.details.classes || 0} class sessions\n• ${data.results.details.assignments || 0} assignments\n• ${data.results.details.exams || 0} exams\n\nYour academic schedule is now available across all your Google Calendar devices!`,
          false
        );

        if (confirmationMessage) {
          setMessages(prev => [...prev, confirmationMessage]);
        }
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error);
      toast({
        title: 'Google Calendar Sync Error',
        description: error.message || 'Failed to sync to Google Calendar. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const MessageBubble = ({ message, isLast }: { message: ChatMessage; isLast: boolean }) => {
    const isUser = message.is_user;
    const hasCalendarData = message.metadata?.can_add_to_calendar;
    
    return (
      <div 
        className={cn(
          "flex gap-3 max-w-full group animate-in slide-in-from-bottom-2 duration-300",
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
            accessibilitySettings.highContrast && (
              isUser 
                ? "bg-black text-white border-white" 
                : "bg-white text-black border-black"
            )
          )}>
            <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // Style headings
                  h1: ({...props}) => <h1 className="text-lg font-bold mb-2 text-foreground" {...props} />,
                  h2: ({...props}) => <h2 className="text-base font-semibold mb-2 text-foreground" {...props} />,
                  h3: ({...props}) => <h3 className="text-sm font-medium mb-1 text-foreground" {...props} />,
                  
                  // Style paragraphs
                  p: ({...props}) => <p className="mb-2 last:mb-0 text-foreground" {...props} />,
                  
                  // Style lists
                  ul: ({...props}) => <ul className="list-disc list-inside mb-2 space-y-1 text-foreground" {...props} />,
                  ol: ({...props}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-foreground" {...props} />,
                  li: ({...props}) => <li className="text-foreground" {...props} />,
                  
                  // Style emphasis
                  strong: ({...props}) => <strong className="font-semibold text-foreground" {...props} />,
                  em: ({...props}) => <em className="italic text-foreground" {...props} />,
                  
                  // Style code blocks and inline code
                  code: ({children, className, ...props}) => {
                    const isInline = !className || !className.includes('language-');
                    return isInline 
                      ? <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground" {...props}>{children}</code>
                      : <code className="block bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto text-foreground" {...props}>{children}</code>;
                  },
                  
                  // Style pre blocks
                  pre: ({...props}) => <pre className="bg-muted p-3 rounded-md overflow-x-auto mb-2" {...props} />,
                  
                  // Style blockquotes
                  blockquote: ({...props}) => <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-2" {...props} />,
                }}
              >
                {message.message}
              </ReactMarkdown>
            </div>
            
            {/* File attachment indicator */}
            {message.file_upload_id && (
              <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                <Paperclip className="w-3 h-3" />
                File attached
              </div>
            )}
            
            {/* Quick actions for AI messages */}
            {!isUser && (
              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => copyMessage(message.message)}
                  aria-label="Copy message"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => addReaction(message.id, '👍')}
                  aria-label="Like message"
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => addReaction(message.id, '❤️')}
                  aria-label="Love message"
                >
                  <Heart className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Enhanced action buttons */}
          {hasCalendarData && (
            <div className="flex flex-wrap gap-2">
              {message.metadata?.can_add_to_calendar && (
                <Button
                  size="sm"
                  onClick={() => addToCalendar(message.metadata.parsed_data)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md"
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Add to Calendar
                </Button>
              )}
              {message.metadata?.can_sync_to_google && (
                <Button
                  size="sm"
                  onClick={() => syncToGoogleCalendar(message.metadata.parsed_data)}
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Sync to Google
                </Button>
              )}
            </div>
          )}
          
          {/* Timestamp */}
          <div className="text-xs text-muted-foreground px-2">
            {format(new Date(message.created_at), 'HH:mm')}
          </div>
          
          {/* Reactions */}
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
  };

  return (
    <>
      <div className="flex flex-col h-full relative">
        {/* Enhanced Header with Accessibility Toggle */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-primary/8 via-primary/5 to-secondary/8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Ada AI Assistant
                  <Badge variant="secondary" className="text-xs">Beta</Badge>
                </h3>
                <p className="text-xs text-muted-foreground">Ready to help organize your academic life</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {onFullScreenToggle && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onFullScreenToggle}
                  className="h-8 w-8 p-0"
                  aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
                >
                  {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAccessibility(!showAccessibility)}
                className="h-8 w-8 p-0"
                aria-label="Accessibility settings"
              >
                <Accessibility className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Message limit indicator */}
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Messages: {messageCount}/{MESSAGE_LIMIT}
            </span>
            <div className="w-32 bg-muted rounded-full h-1">
              <div 
                className="bg-primary h-1 rounded-full transition-all duration-300"
                style={{ width: `${(messageCount / MESSAGE_LIMIT) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Accessibility Panel */}
        {showAccessibility && (
          <div className="px-4 sm:px-6 py-4 border-b bg-muted/30 space-y-4 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Accessibility Settings</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAccessibility(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="font-size" className="text-xs font-medium">Font Size</Label>
                <Slider
                  id="font-size"
                  min={12}
                  max={24}
                  step={2}
                  value={[accessibilitySettings.fontSize]}
                  onValueChange={(value) => 
                    setAccessibilitySettings(prev => ({ ...prev, fontSize: value[0] }))
                  }
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{accessibilitySettings.fontSize}px</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="high-contrast" className="text-xs font-medium">High Contrast</Label>
                  <Switch
                    id="high-contrast"
                    checked={accessibilitySettings.highContrast}
                    onCheckedChange={(checked) => 
                      setAccessibilitySettings(prev => ({ ...prev, highContrast: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="sound-enabled" className="text-xs font-medium">Sound Notifications</Label>
                  <Switch
                    id="sound-enabled"
                    checked={accessibilitySettings.soundEnabled}
                    onCheckedChange={(checked) => 
                      setAccessibilitySettings(prev => ({ ...prev, soundEnabled: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="focus-outlines" className="text-xs font-medium">Focus Outlines</Label>
                  <Switch
                    id="focus-outlines"
                    checked={accessibilitySettings.focusOutlines}
                    onCheckedChange={(checked) => 
                      setAccessibilitySettings(prev => ({ ...prev, focusOutlines: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

          {/* Enhanced Messages Area with Integrated File Upload */}
        <div 
          className="flex-1 overflow-hidden relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Enhanced File Upload Integration */}
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
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowEnhancedUpload(true)}
                  className="mt-2"
                >
                  Use Enhanced Upload
                </Button>
              </div>
            </div>
          )}
          
          <ScrollArea className="h-full">
            <div ref={chatContainerRef} className="p-4 sm:p-6 space-y-4" role="log" aria-live="polite" aria-label="Chat messages">
              {messages.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Welcome to Ada! 👋</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                      I'm here to help you organize your academic life. You can upload schedules, ask questions, 
                      or chat about your study plans. What would you like to work on today?
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-6">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setInputMessage("Help me organize my schedule")}
                      className="text-xs"
                    >
                      Organize Schedule
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setInputMessage("Create a study plan")}
                      className="text-xs"
                    >
                      Study Planning
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs"
                    >
                      Upload File
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <MessageBubble 
                      key={message.id} 
                      message={message} 
                      isLast={index === messages.length - 1}
                    />
                  ))}
                  
                  {/* Pending Actions Confirmation UI */}
                  {pendingActions.filter(p => p.status === 'pending').map((pending, index) => {
                    const action = pending.action;
                    const startDate = new Date(action.start_iso);
                    const endDate = new Date(action.end_iso);
                    const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    
                    return (
                      <div 
                        key={`action-${index}`}
                        className="flex justify-start animate-in slide-in-from-bottom-2 duration-300"
                      >
                        <div className="flex items-start gap-3 max-w-[85%]">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                            <CalendarPlus className="w-4 h-4 text-white" />
                          </div>
                          <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300">
                                  Confirm Action
                                </Badge>
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                Ada wants to create: <strong>{action.title}</strong>
                              </p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3 h-3" />
                                  <span>{dateStr}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  <span>{startTime} - {endTime}</span>
                                </div>
                                {action.location && (
                                  <div className="flex items-center gap-2">
                                    <span>📍</span>
                                    <span>{action.location}</span>
                                  </div>
                                )}
                              </div>
                              
                              {pending.conflicts && pending.conflicts.length > 0 && (
                                <div className="p-2 bg-destructive/10 rounded-md border border-destructive/20">
                                  <div className="flex items-center gap-2 text-destructive text-xs font-medium">
                                    <AlertTriangle className="w-3 h-3" />
                                    Conflict: {pending.conflicts[0].conflict_title}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirmAction(pendingActions.indexOf(pending))}
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelAction(pendingActions.indexOf(pending))}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </div>
                      </div>
                    );
                  })}
                  
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-gradient-to-br from-card to-card/80 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Ada is thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Enhanced Input Area */}
        <div className="border-t bg-background/95 backdrop-blur-sm p-4 sm:p-6">
          {/* Pending File Attachment Chip */}
          {pendingFile && (
            <div className="mb-3">
              <FileAttachmentChip
                file={pendingFile}
                onRemove={handleRemovePendingFile}
                isProcessing={isProcessing && !!pendingFileStatus}
                processingStatus={pendingFileStatus}
              />
            </div>
          )}

          {(isVoiceListening || hasVoiceDraft) && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-foreground">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                  {isVoiceListening ? <Mic className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <span className="font-medium">
                  {isVoiceListening
                    ? voiceInterimTranscript || 'Listening for your instructions…'
                    : 'Transcript ready. Review and send when you are ready.'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hasVoiceDraft && !isVoiceListening && (
                  <Button
                    size="xs"
                    variant="secondary"
                    className="h-7 px-3 text-[11px]"
                    onClick={handleVoiceQuickSend}
                    disabled={!inputMessage.trim() || isProcessing}
                  >
                    Send transcript
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="ghost"
                  className="h-7 px-3 text-[11px]"
                  onClick={isVoiceListening ? stopListening : handleVoiceDraftCleared}
                  disabled={isProcessing}
                >
                  {isVoiceListening ? 'Stop' : 'Clear'}
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={pendingFile 
                  ? "What would you like to know about this file?" 
                  : "Ask Ada anything about your schedule, assignments, or academic planning..."
                }
                className="min-h-[60px] max-h-32 resize-none pr-32 sm:pr-40 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
                disabled={isProcessing}
                rows={2}
                aria-label="Message input"
              />
              
              <div className="absolute bottom-2 right-2">
                {/* Attachment and Enhanced Upload buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleVoiceToggle}
                    className={cn(
                      'h-8 w-8 p-0',
                      isVoiceListening
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                        : 'hover:bg-muted'
                    )}
                    disabled={isProcessing}
                    aria-pressed={isVoiceListening}
                    aria-label={
                      isSpeechSupported
                        ? isVoiceListening
                          ? 'Stop voice capture'
                          : 'Start voice capture'
                        : 'Voice capture not supported'
                    }
                    title={
                      isSpeechSupported
                        ? isVoiceListening
                          ? 'Stop voice capture'
                          : 'Speak your request'
                        : 'Voice capture not supported in this browser'
                    }
                  >
                    {isVoiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-8 p-0 hover:bg-muted"
                    disabled={isProcessing}
                    aria-label="Quick attach file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowEnhancedUpload(true)}
                    className="h-8 px-3 hover:bg-muted"
                    disabled={isProcessing}
                    aria-label="Enhanced file upload"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    <span className="text-xs hidden sm:inline">Enhanced</span>
                  </Button>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={(!inputMessage.trim() && !pendingFile) || isProcessing}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg transition-all duration-200 h-[60px] px-6"
              aria-label="Send message"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">Send</span>
            </Button>
          </div>
          
          {/* File input - uses handleFileSelect for ChatGPT-style attach */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="File upload input"
          />
          
          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setInputMessage("What's my schedule for today?")}
              className="text-xs h-7 px-3 bg-muted/50 hover:bg-muted"
            >
              Today's Schedule
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setInputMessage("Show me upcoming deadlines")}
              className="text-xs h-7 px-3 bg-muted/50 hover:bg-muted"
            >
              Deadlines
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setInputMessage("Help me plan study time")}
              className="text-xs h-7 px-3 bg-muted/50 hover:bg-muted"
            >
              Study Planning
            </Button>
          </div>
        </div>
      </div>

      {/* Conflict Indicator Button - appears in corner when conflicts exist */}
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

      {/* Enhanced Conflicts Panel with Resolution - now as modal overlay */}
      {showConflictPanel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95">
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
    </>
  );
}
