import React, { useRef, useCallback, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileAttachmentChip } from '@/components/FileAttachmentChip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Send,
  Loader2,
  Paperclip,
  Upload,
  Mic,
  MicOff,
  Camera,
  FileText,
  ChevronDown
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

const QUICK_SUGGESTIONS = [
  { label: "Today", text: "What's my schedule for today?" },
  { label: "Deadlines", text: "Show me upcoming deadlines" },
  { label: "Study", text: "Help me plan study time" },
  { label: "Upload", text: "I want to upload my timetable" },
];

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
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const [hasContent, setHasContent] = useState(false);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);

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
      textareaRef.current.placeholder = voiceInterimTranscript || 'Message Ada...';
    } else if (textareaRef.current) {
      textareaRef.current.placeholder = 'Message Ada...';
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
        "border-t bg-background",
        // Mobile: floating style with rounded corners and shadow
        "sm:bg-background/95 sm:backdrop-blur-sm",
        // Safe area padding for mobile
        "pb-safe"
      )}
      style={{ 
        contain: 'layout style',
        flexShrink: 0
      }}
    >
      {/* Voice listening banner - full width on mobile */}
      {isVoiceListening && (
        <div 
          className={cn(
            "flex items-center gap-3 p-3 bg-destructive/10 border-b border-destructive/20",
            "animate-fade-in"
          )}
          onClick={onVoiceToggle}
          role="button"
          aria-label="Tap to stop listening"
        >
          {/* Voice waveform animation */}
          <div className="flex items-center gap-0.5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-destructive rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.random() * 12}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-destructive font-medium">Listening...</span>
            {voiceInterimTranscript && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                "{voiceInterimTranscript}"
              </p>
            )}
          </div>
          <span className="text-xs text-destructive/70">Tap to stop</span>
        </div>
      )}

      <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
        {/* Pending file attachment - full width on mobile */}
        {pendingFile && (
          <div className="w-full">
            <FileAttachmentChip
              file={pendingFile}
              processingStatus={pendingFileStatus}
              isProcessing={!!pendingFileStatus}
              onRemove={onRemoveFile}
              onImportAsSchedule={onImportAsSchedule}
              onImportAsEvents={onImportAsEvents}
            />
          </div>
        )}

        {/* Main input row - External buttons for better touch targets */}
        <div className="flex items-end gap-2">
          {/* Voice button - large touch target on mobile */}
          <Button
            type="button"
            size="icon"
            variant={isVoiceListening ? "destructive" : "ghost"}
            onClick={onVoiceToggle}
            className={cn(
              "h-11 w-11 flex-shrink-0 touch-target rounded-full",
              isVoiceListening && "animate-pulse"
            )}
            disabled={isProcessing}
            aria-pressed={isVoiceListening}
            aria-label={isVoiceListening ? 'Stop voice capture' : 'Start voice capture'}
          >
            {isVoiceListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Textarea - clean, no internal buttons */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Message Ada..."
              onKeyDown={handleKeyDown}
              onChange={handleChange}
              disabled={isProcessing}
              className={cn(
                "min-h-[44px] max-h-[120px] resize-none text-base",
                "py-3 px-4 pr-12",
                "rounded-2xl border-muted-foreground/20",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                // Mobile: larger touch-friendly input
                "sm:min-h-[48px] sm:text-sm"
              )}
              aria-label="Chat message input"
            />
          </div>

          {/* Attach button - opens sheet on mobile */}
          <Sheet open={attachSheetOpen} onOpenChange={setAttachSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-11 w-11 flex-shrink-0 touch-target rounded-full sm:hidden"
                disabled={isProcessing}
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <div className="py-2 space-y-1">
                <button
                  onClick={() => {
                    cameraInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted rounded-lg transition-colors touch-target"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">Take Photo</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted rounded-lg transition-colors touch-target"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-secondary" />
                  </div>
                  <span className="font-medium">Choose File</span>
                </button>
                <button
                  onClick={() => {
                    setAttachSheetOpen(false);
                    onEnhancedUpload();
                  }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted rounded-lg transition-colors touch-target"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <span className="font-medium">Upload Document</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop attach buttons */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 rounded-full"
              disabled={isProcessing}
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onEnhancedUpload}
              className="h-10 w-10 rounded-full"
              disabled={isProcessing}
              aria-label="Enhanced upload"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </div>

          {/* Send button - prominent, larger on mobile */}
          <Button
            onClick={handleSendClick}
            disabled={!canSend || isProcessing}
            size="icon"
            className={cn(
              "flex-shrink-0 rounded-full shadow-lg",
              "h-12 w-12 sm:h-11 sm:w-11", // Larger on mobile
              "bg-gradient-to-r from-primary to-secondary",
              "hover:from-primary/90 hover:to-secondary/90",
              "active:scale-95 transition-transform",
              "touch-target"
            )}
            aria-label="Send message"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
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
          aria-label="File upload input"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Camera input"
        />
        
        {/* Quick suggestions - horizontal scroll on mobile */}
        <div 
          ref={suggestionsRef}
          className={cn(
            "flex gap-2 overflow-x-auto scrollbar-none",
            "-mx-2 px-2 sm:mx-0 sm:px-0", // Full bleed on mobile
            "pb-1" // Extra padding for scroll indicator
          )}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {QUICK_SUGGESTIONS.map((suggestion) => (
            <Button 
              key={suggestion.label}
              type="button"
              size="sm" 
              variant="outline" 
              onClick={() => onQuickSuggestion(suggestion.text)}
              className={cn(
                "flex-shrink-0 rounded-full",
                "h-8 px-4 text-xs",
                "border-muted-foreground/20 bg-muted/50",
                "hover:bg-muted hover:border-muted-foreground/30",
                "active:scale-95 transition-transform",
                "touch-manipulation"
              )}
            >
              {suggestion.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
});