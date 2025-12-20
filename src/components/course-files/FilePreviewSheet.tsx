/**
 * File Preview Sheet Component
 * Displays file preview in a sheet using secure signed URLs
 */
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { useFileAccess } from '@/hooks/useFileAccess';
import type { CourseFile } from '@/types/course-files';

interface FilePreviewSheetProps {
  file: CourseFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getPreviewType(fileType: string): 'image' | 'pdf' | 'document' | 'unsupported' {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf') return 'pdf';
  if (fileType.includes('document') || fileType === 'text/plain') return 'document';
  return 'unsupported';
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-muted-foreground p-8">
      <Loader2 className="w-12 h-12 animate-spin" />
      <p className="text-center">Loading file preview...</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-muted-foreground p-8">
      <AlertCircle className="w-12 h-12 text-destructive" />
      <p className="text-center text-destructive">{error}</p>
      <Button variant="outline" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}

function ImagePreview({ url, name }: { url: string; name: string }) {
  return (
    <div className="flex items-center justify-center flex-1 p-4">
      <img 
        src={url} 
        alt={name} 
        className="max-w-full max-h-[60vh] object-contain rounded-lg" 
      />
    </div>
  );
}

function PDFPreview({ url, fileName, onOpenExternal }: { url: string; fileName: string; onOpenExternal: () => void }) {
  const [loadError, setLoadError] = useState(false);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-muted-foreground p-8">
        <FileText className="w-16 h-16 opacity-50" />
        <p className="text-center">PDF preview not available in browser</p>
        <Button variant="outline" onClick={onOpenExternal}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in New Tab
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <iframe 
        src={url} 
        className="w-full flex-1 min-h-[60vh] rounded-lg border-0"
        title={`PDF Preview - ${fileName}`}
        onError={() => setLoadError(true)}
      />
    </div>
  );
}

function DocumentFallback({ file, signedUrl }: { file: CourseFile; signedUrl: string | null }) {
  const handleOpenExternal = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-muted-foreground p-8">
      <FileText className="w-16 h-16 opacity-50" />
      <p className="text-center">Preview not available for this file type</p>
      <p className="text-sm text-center">{file.file_name}</p>
      <p className="text-xs">{file.file_type}</p>
      {signedUrl && (
        <Button variant="outline" onClick={handleOpenExternal}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in New Tab
        </Button>
      )}
    </div>
  );
}

export function FilePreviewSheet({ file, open, onOpenChange }: FilePreviewSheetProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { getSignedUrl, downloadFile, isLoading } = useFileAccess();

  useEffect(() => {
    if (file && open) {
      setSignedUrl(null);
      setLoadError(null);
      
      getSignedUrl(file.id)
        .then(url => {
          if (url) {
            setSignedUrl(url);
          } else {
            setLoadError('Could not load file');
          }
        })
        .catch(err => {
          console.error('Error fetching signed URL:', err);
          setLoadError(err.message || 'Failed to load file');
        });
    }
  }, [file, open, getSignedUrl]);

  if (!file) return null;

  const previewType = getPreviewType(file.file_type);
  const fileName = file.display_name || file.file_name;

  const handleDownload = () => {
    downloadFile(file);
  };

  const handleRetry = () => {
    setLoadError(null);
    getSignedUrl(file.id)
      .then(url => {
        if (url) {
          setSignedUrl(url);
        } else {
          setLoadError('Could not load file');
        }
      })
      .catch(err => {
        setLoadError(err.message || 'Failed to load file');
      });
  };

  const handleOpenExternal = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col border-0">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-4 pr-8">
            <SheetTitle className="truncate">{fileName}</SheetTitle>
            <Button 
              size="sm" 
              onClick={handleDownload} 
              className="flex-shrink-0"
              disabled={isLoading || !signedUrl}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col mt-4 min-h-0">
          {isLoading && !signedUrl && <LoadingState />}
          
          {loadError && <ErrorState error={loadError} onRetry={handleRetry} />}
          
          {signedUrl && !loadError && (
            <>
              {previewType === 'image' && (
                <ImagePreview url={signedUrl} name={fileName} />
              )}
              {previewType === 'pdf' && (
                <PDFPreview 
                  url={signedUrl} 
                  fileName={fileName} 
                  onOpenExternal={handleOpenExternal}
                />
              )}
              {(previewType === 'document' || previewType === 'unsupported') && (
                <DocumentFallback file={file} signedUrl={signedUrl} />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
