import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  message: string;
  is_user: boolean;
  created_at: string;
  file_upload_id?: string;
  metadata?: any;
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

export function StudySageChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error loading chat history:', error);
      return;
    }

    setMessages(data || []);
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
      console.error('Error saving chat message:', error);
      return null;
    }

    return data;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

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

      // Process file with AI
      await processFileWithAI(fileRecord.id, file);

      // Add user message about file upload
      const userMessage = await saveChatMessage(
        `I've uploaded a file: ${file.name}`,
        true,
        fileRecord.id
      );

      if (userMessage) {
        setMessages(prev => [...prev, userMessage]);
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

      // Parse extracted text with AI
      const { data: parseResult, error: parseError } = await supabase.functions.invoke('ai-schedule-parser', {
        body: { file_id: fileId }
      });

      if (parseError) throw parseError;

      // Save AI response
      const aiMessage = await saveChatMessage(
        parseResult.response,
        false,
        fileId,
        { parsed_data: parseResult.schedule_data, conflicts: parseResult.conflicts }
      );

      if (aiMessage) {
        setMessages(prev => [...prev, aiMessage]);
        
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user || isProcessing) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Save user message
      const savedUserMessage = await saveChatMessage(userMessage, true);
      if (savedUserMessage) {
        setMessages(prev => [...prev, savedUserMessage]);
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

  const resolveConflict = async (conflictId: string, action: 'reschedule' | 'ignore') => {
    try {
      const { data, error } = await supabase.functions.invoke('resolve-conflict', {
        body: { conflict_id: conflictId, action }
      });

      if (error) throw error;

      setConflicts(prev => prev.filter(c => c.conflict_id !== conflictId));
      
      toast({
        title: 'Conflict Resolved',
        description: action === 'reschedule' ? 'Event has been rescheduled' : 'Conflict has been ignored',
      });

    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve conflict',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/8 via-primary/5 to-secondary/8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl blur-sm opacity-25"></div>
              <div className="relative p-2.5 bg-gradient-to-br from-primary/90 to-secondary/90 rounded-xl">
                <Bot className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                StudySage
              </h3>
              <p className="text-sm text-muted-foreground font-medium">AI Academic Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/20 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 bg-destructive/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <h4 className="font-semibold text-destructive">Schedule Conflicts Detected</h4>
              <p className="text-xs text-muted-foreground">Review and resolve these conflicts</p>
            </div>
          </div>
          <div className="space-y-3">
            {conflicts.map((conflict, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-background/80 backdrop-blur-sm rounded-lg border">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">{conflict.conflict_title}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{conflict.conflict_type}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs"
                    onClick={() => resolveConflict(conflict.conflict_id, 'reschedule')}
                  >
                    Reschedule
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-xs"
                    onClick={() => resolveConflict(conflict.conflict_id, 'ignore')}
                  >
                    Ignore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Messages Area */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-lg opacity-20 scale-110"></div>
                <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full border-2 border-primary/20">
                  <Bot className="w-12 h-12 text-primary" />
                </div>
              </div>
              <h4 className="text-xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Welcome to StudySage!
              </h4>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                I'm here to help you organize your academic life. Upload your schedules, syllabi, or simply chat about your academic goals.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                {[
                  { icon: FileText, text: "Parse academic documents" },
                  { icon: Calendar, text: "Detect scheduling conflicts" },
                  { icon: CheckCircle, text: "Create recurring tasks" },
                  { icon: Bot, text: "AI-powered optimization" }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <feature.icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.is_user ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start gap-3 max-w-[85%] ${message.is_user ? 'flex-row-reverse' : ''}`}>
                <div className={`p-2 rounded-xl flex-shrink-0 ${
                  message.is_user 
                    ? 'bg-gradient-to-br from-primary to-primary/80' 
                    : 'bg-gradient-to-br from-muted to-muted/60'
                }`}>
                  {message.is_user ? 
                    <User className="w-4 h-4 text-white" /> : 
                    <Bot className="w-4 h-4 text-foreground" />
                  }
                </div>
                <div className={`p-4 rounded-2xl shadow-sm ${
                  message.is_user 
                    ? 'bg-gradient-to-br from-primary to-primary/90 text-white' 
                    : 'bg-gradient-to-br from-muted/80 to-muted/40 backdrop-blur-sm border'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                  <div className="flex items-center gap-1.5 mt-2 opacity-70">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">
                      {format(new Date(message.created_at), 'HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-muted to-muted/60">
                  <Bot className="w-4 h-4 text-foreground animate-pulse" />
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 backdrop-blur-sm border">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Enhanced Input Area */}
      <div className="p-6 border-t bg-gradient-to-r from-muted/30 to-muted/10">
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="shrink-0 h-12 w-12 rounded-xl border-2 hover:border-primary transition-colors duration-200"
          >
            <Upload className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your schedule, upload a file, or describe your academic goals..."
              disabled={isProcessing}
              className="h-12 pr-14 rounded-xl border-2 bg-background/50 backdrop-blur-sm focus:border-primary transition-colors duration-200"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing}
              size="icon"
              className="absolute right-1 top-1 h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-secondary hover:opacity-90 transition-opacity duration-200"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center mt-3 gap-4 text-xs text-muted-foreground">
          <span>Powered by AI</span>
          <span>•</span>
          <span>Secure & Private</span>
          <span>•</span>
          <span>Real-time Processing</span>
        </div>
      </div>
    </div>
  );
}