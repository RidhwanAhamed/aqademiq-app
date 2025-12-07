import React from 'react';
import { X, FileText, Image, File, Loader2, CalendarPlus, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileAttachmentChipProps {
  file: File;
  onRemove: () => void;
  onImportAsSchedule?: () => void;
  onImportAsEvents?: () => void;
  isProcessing?: boolean;
  processingStatus?: string;
  className?: string;
}

export function FileAttachmentChip({
  file,
  onRemove,
  onImportAsSchedule,
  onImportAsEvents,
  isProcessing = false,
  processingStatus,
  className
}: FileAttachmentChipProps) {
  const getFileIcon = () => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    if (file.type === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const truncateFileName = (name: string, maxLength = 25) => {
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop();
    const baseName = name.slice(0, name.lastIndexOf('.'));
    const truncatedBase = baseName.slice(0, maxLength - (ext?.length || 0) - 4);
    return `${truncatedBase}...${ext}`;
  };

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50",
        isProcessing && "border-primary/50 bg-primary/5",
        className
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-md",
        isProcessing ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
      )}>
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          getFileIcon()
        )}
      </div>
      
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate max-w-[150px]">
          {truncateFileName(file.name)}
        </span>
        <span className="text-xs text-muted-foreground">
          {isProcessing ? processingStatus || 'Processing...' : formatFileSize(file.size)}
        </span>
      </div>

      {!isProcessing && (
        <div className="flex items-center gap-1">
          {onImportAsSchedule && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onImportAsSchedule}
              className="h-6 px-2 text-xs hover:bg-primary/10 hover:text-primary"
              aria-label="Import as schedule"
              title="Import this file as a schedule/timetable"
            >
              <CalendarPlus className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Schedule</span>
            </Button>
          )}
          {onImportAsEvents && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onImportAsEvents}
              className="h-6 px-2 text-xs hover:bg-accent/80 hover:text-accent-foreground"
              aria-label="Import as events"
              title="Import this file as calendar events"
            >
              <CalendarDays className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Events</span>
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={onRemove}
            className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove attachment"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
