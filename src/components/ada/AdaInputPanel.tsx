import React, { useRef, useCallback, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileAttachmentChip } from '@/components/FileAttachmentChip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import {
  Send,
  Loader2,
  Plus,
  Mic,
  MicOff,
  Camera,
  FileText,
  Upload
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef('');
  
  const [hasContent, setHasContent] = useState(false);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  
  // iOS keyboard height detection
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  // Scroll input into view when keyboard appears
  const handleFocus = useCallback(() => {
    if (isKeyboardVisible) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isKeyboardVisible]);

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
      textareaRef.current.placeholder = voiceInterimTranscript || 'Ask Ada';
    } else if (textareaRef.current) {
      textareaRef.current.placeholder = 'Ask Ada';
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
      setAttachSheetOpen(false);
    }
    if (e.target) {
      e.target.value = '';
    }
  }, [onFileSelect]);

  const canSend = hasContent || !!pendingFile;

  return (
    <div 
      className={cn(
        "bg-background border-t border-border/50",
        isKeyboardVisible && "fixed left-0 right-0 z-50"
      )}
      style={{ 
        contain: 'layout style',
        flexShrink: 0,
        bottom: isKeyboardVisible ? `${keyboardHeight}px` : undefined,
        paddingBottom: isKeyboardVisible 
          ? '8px' 
          : 'max(env(safe-area-inset-bottom, 8px), 8px)',
        transition: 'bottom 0.25s ease-out'
      }}
    >
      {/* Voice listening indicator - ChatGPT style banner */}
      {isVoiceListening && (
        <div 
          className="flex items-center justify-center gap-3 py-3 bg-destructive/10 border-b border-destructive/20"
          onClick={onVoiceToggle}
          role="button"
        >
          <div className="flex items-center gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-destructive rounded-full"
                style={{
                  height: `${8 + Math.sin(Date.now() / 200 + i) * 8}px`,
                  animation: `pulse 0.5s ease-in-out ${i * 0.1}s infinite alternate`
                }}
              />
            ))}
          </div>
          <span className="text-sm text-destructive font-medium">Listening... Tap to stop</span>
        </div>
      )}

      <div className="p-3 space-y-2">
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

        {/* ChatGPT-style input row: + button | input | mic | send */}
        <div className="flex items-end gap-2">
          {/* Plus/Attach button */}
          <Sheet open={attachSheetOpen} onOpenChange={setAttachSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-11 w-11 flex-shrink-0 rounded-full bg-muted/50 hover:bg-muted touch-target"
                disabled={isProcessing}
                aria-label="Attach"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-2xl">
              <div className="py-4 space-y-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted rounded-xl transition-colors touch-target"
                >
                  <div className="w-11 h-11 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="font-medium">Take Photo</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted rounded-xl transition-colors touch-target"
                >
                  <div className="w-11 h-11 rounded-full bg-green-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="font-medium">Choose File</span>
                </button>
                <button
                  onClick={() => {
                    setAttachSheetOpen(false);
                    onEnhancedUpload();
                  }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted rounded-xl transition-colors touch-target"
                >
                  <div className="w-11 h-11 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-purple-500" />
                  </div>
                  <span className="font-medium">Upload Document</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Input field - clean rounded style */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Ask Ada"
              onKeyDown={handleKeyDown}
              onChange={handleChange}
              onFocus={handleFocus}
              disabled={isProcessing}
              className={cn(
                "min-h-[44px] max-h-[120px] resize-none",
                "py-3 px-4 text-base",
                "rounded-3xl bg-muted/50 border-0",
                "focus:ring-1 focus:ring-primary/30",
                "placeholder:text-muted-foreground/70"
              )}
              aria-label="Chat message input"
            />
          </div>

          {/* Voice button */}
          <Button
            type="button"
            size="icon"
            variant={isVoiceListening ? "destructive" : "ghost"}
            onClick={onVoiceToggle}
            className={cn(
              "h-11 w-11 flex-shrink-0 rounded-full touch-target",
              !isVoiceListening && "bg-muted/50 hover:bg-muted"
            )}
            disabled={isProcessing}
            aria-label={isVoiceListening ? 'Stop listening' : 'Voice input'}
          >
            {isVoiceListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* Send button - prominent when has content */}
          <Button
            onClick={handleSendClick}
            disabled={!canSend || isProcessing}
            size="icon"
            className={cn(
              "h-11 w-11 flex-shrink-0 rounded-full touch-target",
              "transition-all duration-200",
              canSend 
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" 
                : "bg-muted/50 text-muted-foreground"
            )}
            aria-label="Send message"
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
});