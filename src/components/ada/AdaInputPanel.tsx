import React, { useRef, useCallback, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileAttachmentChip } from '@/components/FileAttachmentChip';
import { cn } from '@/lib/utils';
import {
  Send,
  Loader2,
  Paperclip,
  Upload,
  Mic,
  MicOff
} from 'lucide-react';

interface AdaInputPanelProps {
  isProcessing: boolean;
  pendingFile: File | null;
  pendingFileStatus: string;
  isVoiceListening: boolean;
  isSpeechSupported: boolean;
  voiceInterimTranscript: string;
  hasVoiceDraft: boolean;
  onSend: (message: string) => void;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
  onImportAsSchedule: () => void;
  onImportAsEvents: () => void;
  onVoiceToggle: () => void;
  onEnhancedUpload: () => void;
  onQuickSuggestion: (text: string) => void;
}

export interface AdaInputPanelRef {
  focus: () => void;
  setValue: (value: string) => void;
  getValue: () => string;
}

export const AdaInputPanel = forwardRef<AdaInputPanelRef, AdaInputPanelProps>(function AdaInputPanel({
  isProcessing,
  pendingFile,
  pendingFileStatus,
  isVoiceListening,
  isSpeechSupported,
  voiceInterimTranscript,
  hasVoiceDraft,
  onSend,
  onFileSelect,
  onRemoveFile,
  onImportAsSchedule,
  onImportAsEvents,
  onVoiceToggle,
  onEnhancedUpload,
  onQuickSuggestion
}, ref) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef('');
  
  // For send button state only - minimal state updates
  const [hasContent, setHasContent] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    setValue: (value: string) => {
      valueRef.current = value;
      if (textareaRef.current) {
        textareaRef.current.value = value;
      }
      setHasContent(value.trim().length > 0);
    },
    getValue: () => valueRef.current
  }));

  // Handle voice transcript updates
  useEffect(() => {
    if (voiceInterimTranscript && textareaRef.current) {
      const currentValue = valueRef.current;
      // Show interim transcript as placeholder-style preview
      textareaRef.current.placeholder = voiceInterimTranscript || 'Type your message...';
    } else if (textareaRef.current) {
      textareaRef.current.placeholder = 'Type your message...';
    }
  }, [voiceInterimTranscript]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const value = valueRef.current.trim();
      if (value || pendingFile) {
        onSend(value);
        valueRef.current = '';
        if (textareaRef.current) {
          textareaRef.current.value = '';
        }
        setHasContent(false);
      }
    }
  }, [onSend, pendingFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    valueRef.current = e.target.value;
    const hasText = e.target.value.trim().length > 0;
    // Only update state if it changed - prevents unnecessary re-renders
    setHasContent(prev => prev !== hasText ? hasText : prev);
  }, []);

  const handleSendClick = useCallback(() => {
    const value = valueRef.current.trim();
    if (value || pendingFile) {
      onSend(value);
      valueRef.current = '';
      if (textareaRef.current) {
        textareaRef.current.value = '';
      }
      setHasContent(false);
    }
  }, [onSend, pendingFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect]);

  const canSend = hasContent || !!pendingFile;

  return (
    <div 
      className="border-t bg-background/95 backdrop-blur-sm"
      style={{ 
        contain: 'layout style',
        flexShrink: 0
      }}
    >
      <div className="p-3 sm:p-4 space-y-3">
        {/* Voice listening indicator */}
        {isVoiceListening && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            <span className="text-xs text-destructive font-medium">Listening...</span>
            {voiceInterimTranscript && (
              <span className="text-xs text-muted-foreground italic truncate flex-1">
                "{voiceInterimTranscript}"
              </span>
            )}
          </div>
        )}

        {/* Pending file attachment */}
        {pendingFile && (
          <FileAttachmentChip
            file={pendingFile}
            processingStatus={pendingFileStatus}
            isProcessing={!!pendingFileStatus}
            onRemove={onRemoveFile}
            onImportAsSchedule={onImportAsSchedule}
            onImportAsEvents={onImportAsEvents}
          />
        )}

        {/* Main input row */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Type your message..."
              onKeyDown={handleKeyDown}
              onChange={handleChange}
              disabled={isProcessing}
              className="min-h-[60px] max-h-[150px] resize-none pr-24 text-sm"
              aria-label="Chat message input"
            />
            
            {/* Action buttons inside textarea */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onVoiceToggle}
                className={cn(
                  'h-8 w-8 p-0',
                  isVoiceListening
                    ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                    : 'hover:bg-muted'
                )}
                disabled={isProcessing}
                aria-pressed={isVoiceListening}
                aria-label={isVoiceListening ? 'Stop voice capture' : 'Start voice capture'}
              >
                {isVoiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 p-0 hover:bg-muted"
                disabled={isProcessing}
                aria-label="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onEnhancedUpload}
                className="h-8 px-2 hover:bg-muted"
                disabled={isProcessing}
                aria-label="Enhanced upload"
              >
                <Upload className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <Button
            onClick={handleSendClick}
            disabled={!canSend || isProcessing}
            className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg h-[60px] px-6"
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
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
          aria-label="File upload input"
        />
        
        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            type="button"
            size="sm" 
            variant="ghost" 
            onClick={() => onQuickSuggestion("What's my schedule for today?")}
            className="text-xs h-7 px-3 bg-muted/50 hover:bg-muted"
          >
            Today's Schedule
          </Button>
          <Button 
            type="button"
            size="sm" 
            variant="ghost" 
            onClick={() => onQuickSuggestion("Show me upcoming deadlines")}
            className="text-xs h-7 px-3 bg-muted/50 hover:bg-muted"
          >
            Deadlines
          </Button>
          <Button 
            type="button"
            size="sm" 
            variant="ghost" 
            onClick={() => onQuickSuggestion("Help me plan study time")}
            className="text-xs h-7 px-3 bg-muted/50 hover:bg-muted"
          >
            Study Planning
          </Button>
        </div>
      </div>
    </div>
  );
});
