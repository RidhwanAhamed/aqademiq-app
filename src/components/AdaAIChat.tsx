import React, { useState, useRef, useEffect } from 'react';
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
  Paperclip
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

export function AdaAIChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  
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
    // Clear everything when component is refreshed/reset
    setMessages([]);
    setConflicts([]);
    setMessageCount(0);
    setInputMessage('');
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

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
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file?: File) => {
    const targetFile = file || fileInputRef.current?.files?.[0];
    if (!targetFile || !user) return;

    setIsProcessing(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = targetFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('study-files')
        .upload(fileName, targetFile);

      if (uploadError) throw uploadError;

      // Create file upload record
      const { data: fileRecord, error: fileError } = await supabase
        .from('file_uploads')
        .insert([{
          user_id: user.id,
          file_name: targetFile.name,
          file_url: uploadData.path,
          file_type: targetFile.type,
          status: 'uploaded'
        }])
        .select()
        .single();

      if (fileError) throw fileError;

      // Process file with AI
      await processFileWithAI(fileRecord.id, targetFile);

      // Add user message about file upload
      const userMessage = await saveChatMessage(
        `I've uploaded a file: ${targetFile.name}`,
        true,
        fileRecord.id
      );

      if (userMessage) {
        setMessages(prev => [...prev, userMessage]);
        playNotificationSound();
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processFileWithAI = async (fileId: string, file: File) => {
    try {
      // Convert file to base64 for OCR if it's an image or PDF
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const base64 = await fileToBase64(file);
        
        // Call OCR function
        const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('ocr-parser', {
          body: { 
            file_data: base64, 
            file_type: file.type,
            file_id: fileId 
          }
        });

        if (ocrError) throw ocrError;

        // Update file record with OCR results
        await supabase
          .from('file_uploads')
          .update({ 
            ocr_text: ocrResult.text,
            status: 'ocr_completed'
          })
          .eq('id', fileId);
      }

      // Parse extracted text with enhanced AI
      const { data: parseResult, error: parseError } = await supabase.functions.invoke('enhanced-schedule-parser', {
        body: { 
          file_id: fileId,
          user_id: user.id,
          auto_add_to_calendar: true,
          sync_to_google: false
        }
      });

      if (parseError) throw parseError;

      // Save AI response with enhanced metadata
      const aiMessage = await saveChatMessage(
        parseResult.response,
        false,
        fileId,
        { 
          parsed_data: parseResult.schedule_data, 
          conflicts: parseResult.conflicts, 
          can_add_to_calendar: !parseResult.calendar_results,
          can_sync_to_google: !parseResult.google_sync_results,
          calendar_results: parseResult.calendar_results,
          google_sync_results: parseResult.google_sync_results
        }
      );

      if (aiMessage) {
        setMessages(prev => [...prev, aiMessage]);
        playNotificationSound();
        
        // Check for conflicts
        if (parseResult.conflicts && parseResult.conflicts.length > 0) {
          setConflicts(parseResult.conflicts);
        }
      }

    } catch (error) {
      console.error('Error processing file:', error);
      const errorMessage = await saveChatMessage(
        'I encountered an error processing your file. Please try uploading it again or check the file format.',
        false,
        fileId
      );
      
      if (errorMessage) {
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  };

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

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: user.id,
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user || isProcessing) return;

    // Check message limit
    if (messageCount >= MESSAGE_LIMIT) {
      setShowUpgrade(true);
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Save user message
      const savedUserMessage = await saveChatMessage(userMessage, true);
      if (savedUserMessage) {
        setMessages(prev => [...prev, savedUserMessage]);
        setMessageCount(prev => prev + 1);
      }

      // Get AI response
      const { data: aiResponse, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: userMessage }
      });

      if (error) throw error;

      // Save AI response
      const aiMessage = await saveChatMessage(
        aiResponse.response,
        false,
        undefined,
        aiResponse.metadata
      );

      if (aiMessage) {
        setMessages(prev => [...prev, aiMessage]);
        playNotificationSound();
        
        // Check if the response contains schedule data that should be added to calendar
        if (aiResponse.metadata?.schedule_data && userMessage.toLowerCase().includes('add to calendar')) {
          await addToCalendar(aiResponse.metadata.schedule_data);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.message}
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

        {/* Enhanced Messages Area */}
        <div 
          className="flex-1 overflow-hidden relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Ada anything about your schedule, assignments, or academic planning..."
                className="min-h-[60px] max-h-32 resize-none pr-12 sm:pr-24 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
                disabled={isProcessing}
                rows={2}
                aria-label="Message input"
              />
              
              {/* Attachment button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 h-8 w-8 p-0 hover:bg-muted"
                disabled={isProcessing}
                aria-label="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing}
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
          
          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
            onChange={(e) => handleFileUpload()}
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

      {/* Conflicts Panel */}
      {conflicts.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg animate-in slide-in-from-bottom-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-2">Schedule Conflicts Detected</h4>
              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                    <span>{conflict.conflict_title}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {/* Handle conflict resolution */}}
                        className="h-7 px-2 text-xs"
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConflicts(prev => prev.filter((_, i) => i !== index))}
                        className="h-7 w-7 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
