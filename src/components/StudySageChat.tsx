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
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/20">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">StudySage</h3>
            <p className="text-sm text-muted-foreground">Your AI Academic Assistant</p>
          </div>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="p-4 bg-destructive/10 border-b">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="font-medium text-destructive">Schedule Conflicts Detected</span>
          </div>
          <div className="space-y-2">
            {conflicts.map((conflict, index) => (
              <div key={index} className="flex items-center justify-between bg-background rounded p-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{conflict.conflict_title}</span>
                  <Badge variant="outline">{conflict.conflict_type}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => resolveConflict(conflict.conflict_id, 'reschedule')}
                  >
                    Reschedule
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
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

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="font-medium mb-2">Welcome to StudySage!</h4>
              <p className="text-sm text-muted-foreground mb-4">
                I can help you organize your academic schedule. Upload syllabi, timetables, or just tell me about your classes!
              </p>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                <p>✓ Parse PDFs and images of schedules</p>
                <p>✓ Detect scheduling conflicts</p>
                <p>✓ Create recurring assignments</p>
                <p>✓ AI-powered schedule optimization</p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.is_user ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start gap-2 max-w-[80%] ${message.is_user ? 'flex-row-reverse' : ''}`}>
                <div className={`p-2 rounded-full ${message.is_user ? 'bg-primary/20' : 'bg-secondary/20'}`}>
                  {message.is_user ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-3 rounded-lg ${message.is_user 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 opacity-60" />
                    <span className="text-xs opacity-60">
                      {format(new Date(message.created_at), 'HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2">
                <div className="p-2 rounded-full bg-secondary/20">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm">Processing...</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      <Separator />

      {/* Input Area */}
      <div className="p-4">
        <div className="flex gap-2">
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
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your schedule or upload a file..."
            disabled={isProcessing}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isProcessing}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}