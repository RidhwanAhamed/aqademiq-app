/**
 * File Preview Sheet Component
 * 
 * SIMPLIFIED ARCHITECTURE:
 * - PDFs: Opens in browser's native viewer via signed URL (sync click, no blob)
 * - Images/Audio/Video: Inline blob preview
 * - Text files: Inline text render
 * - Unsupported: Fallback with download option
 * 
 * This avoids ERR_BLOCKED_BY_CLIENT by:
 * 1. Not using blob URLs for new tabs (extensions block them)
 * 2. Opening URLs synchronously in response to user click
 * 3. Using signed URLs which browsers trust
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CourseFile } from '@/types/course-files';

interface FilePreviewSheetProps {
  file: CourseFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PreviewType = 'image' | 'pdf' | 'text' | 'audio' | 'video' | 'unsupported';

function getPreviewType(file: CourseFile): PreviewType {
  const mime = file.file_type || '';
  const name = (file.file_name || '').toLowerCase();

  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (
    mime.startsWith('text/') ||
    name.endsWith('.md') ||
    name.endsWith('.txt') ||
    name.endsWith('.csv') ||
    name.endsWith('.json')
  )
    return 'text';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';

  return 'unsupported';
}

/** Extract storage path from file_url field */
function extractStoragePath(file: CourseFile): string | null {
  const raw = file.file_url;
  if (!raw) return null;
  if (!raw.startsWith('http')) return raw;

  const markers = [
    '/storage/v1/object/public/study-files/',
    '/storage/v1/object/sign/study-files/',
    '/storage/v1/object/authenticated/study-files/',
  ];

  for (const marker of markers) {
    const parts = raw.split(marker);
    if (parts.length > 1) return parts[1].split('?')[0];
  }
  return null;
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-muted-foreground p-8">
      <Loader2 className="w-12 h-12 animate-spin" />
      <p className="text-center">{label}</p>
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

function DocumentFallback({ file, onDownload, isLoading }: { 
  file: CourseFile; 
  onDownload: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-muted-foreground p-8">
      <FileText className="w-16 h-16 opacity-50" />
      <p className="text-center">Preview not available for this file type</p>
      <p className="text-sm text-center">{file.file_name}</p>
      <p className="text-xs">{file.file_type}</p>
      <Button onClick={onDownload} disabled={isLoading}>
        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        Download File
      </Button>
    </div>
  );
}

/** PDF Preview - uses signed URL for reliable browser viewing */
function PdfPreview({ file }: { file: CourseFile }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSignedUrl = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const path = extractStoragePath(file);
      if (!path) throw new Error('Invalid file path');

      // Get signed URL (valid for 1 hour)
      const { data, error: urlError } = await supabase.storage
        .from('study-files')
        .createSignedUrl(path, 3600);

      if (urlError || !data?.signedUrl) {
        throw new Error(urlError?.message || 'Failed to generate preview URL');
      }

      setSignedUrl(data.signedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  useEffect(() => {
    loadSignedUrl();
  }, [loadSignedUrl]);

  // Sync click handler - opens immediately without async delay
  const handleOpenPdf = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = async () => {
    try {
      const path = extractStoragePath(file);
      if (!path) return;
      
      const { data } = await supabase.storage.from('study-files').download(path);
      if (!data) return;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.display_name || file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (isLoading) {
    return <LoadingState label="Preparing PDF preview..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadSignedUrl} />;
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 p-8">
      <FileText className="w-16 h-16 text-primary opacity-70" />
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground">{file.display_name || file.file_name}</p>
        <p className="text-sm text-muted-foreground">
          Click below to open in your browser's PDF viewer
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleOpenPdf} disabled={!signedUrl}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Open PDF
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
}

export function FilePreviewSheet({ file, open, onOpenChange }: FilePreviewSheetProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const previewType = useMemo(() => (file ? getPreviewType(file) : 'unsupported'), [file]);
  const fileName = file?.display_name || file?.file_name || '';

  // Load blob for non-PDF preview
  useEffect(() => {
    if (!file || !open) return;
    if (previewType === 'pdf' || previewType === 'unsupported') return;

    let cancelled = false;

    const loadPreview = async () => {
      setIsLoading(true);
      setLoadError(null);
      setPreviewUrl(null);
      setTextContent(null);

      try {
        const path = extractStoragePath(file);
        if (!path) throw new Error('Invalid file path');

        const { data, error } = await supabase.storage.from('study-files').download(path);
        if (error || !data) throw new Error(error?.message || 'Download failed');
        if (cancelled) return;

        // For text files, read content
        if (previewType === 'text') {
          const text = await data.text();
          setTextContent(text.length > 200_000 ? text.slice(0, 200_000) + '\n\n… (truncated)' : text);
        }

        const url = URL.createObjectURL(data);
        setPreviewUrl(url);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load preview');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [file, open, previewType]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      setTextContent(null);
      setLoadError(null);
    }
  }, [open]);

  const handleDownload = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const path = extractStoragePath(file);
      if (!path) return;
      
      const { data } = await supabase.storage.from('study-files').download(path);
      if (!data) return;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.display_name || file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!file) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col border-0">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-4 pr-8">
            <SheetTitle className="truncate">{fileName}</SheetTitle>
            {previewType !== 'pdf' && previewType !== 'unsupported' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleOpenInNewTab} 
                  disabled={!previewUrl || isLoading}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </Button>
                <Button size="sm" onClick={handleDownload} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col mt-4 min-h-0">
          {/* PDF: Dedicated component with sync open */}
          {previewType === 'pdf' && <PdfPreview file={file} />}

          {/* Loading state for non-PDF */}
          {previewType !== 'pdf' && previewType !== 'unsupported' && isLoading && (
            <LoadingState label="Loading preview..." />
          )}

          {/* Error state */}
          {loadError && (
            <ErrorState error={loadError} onRetry={() => setLoadError(null)} />
          )}

          {/* Image preview */}
          {previewType === 'image' && previewUrl && !loadError && (
            <div className="flex items-center justify-center flex-1 p-4">
              <img
                src={previewUrl}
                alt={fileName}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
          )}

          {/* Text preview */}
          {previewType === 'text' && textContent !== null && !loadError && (
            <div className="flex-1 min-h-0 rounded-lg border border-border overflow-auto bg-background p-4">
              <pre className="text-sm whitespace-pre-wrap break-words text-foreground">
                {textContent}
              </pre>
            </div>
          )}

          {/* Audio preview */}
          {previewType === 'audio' && previewUrl && !loadError && (
            <div className="flex flex-col gap-3 p-4">
              <audio controls src={previewUrl} className="w-full" />
            </div>
          )}

          {/* Video preview */}
          {previewType === 'video' && previewUrl && !loadError && (
            <div className="flex flex-col gap-3 p-4">
              <video controls src={previewUrl} className="w-full max-h-[60vh] rounded-lg" />
            </div>
          )}

          {/* Unsupported fallback */}
          {previewType === 'unsupported' && (
            <DocumentFallback file={file} onDownload={handleDownload} isLoading={isLoading} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
