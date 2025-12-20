/**
 * File Preview Sheet Component
 * Displays file preview in a sheet using secure signed URLs.
 * 
 * NOTE: Some storage providers set headers that prevent embedding remote PDFs in iframes.
 * To avoid the "This content is blocked" iframe error, PDFs are fetched as a Blob and
 * rendered via a same-origin blob: URL.
 */

import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useFileAccess } from '@/hooks/useFileAccess';
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
  if (mime.startsWith('text/') || name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.json')) return 'text';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';

  return 'unsupported';
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
  const { getSignedUrl, downloadFile, isLoading } = useFileAccess();

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const previewType = useMemo(() => (file ? getPreviewType(file) : 'unsupported'), [file]);
  const fileName = useMemo(() => (file ? (file.display_name || file.file_name) : ''), [file]);

  // Cleanup blob URL when file changes / closes
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  useEffect(() => {
    if (!file || !open) return;

    setSignedUrl(null);
    setPdfBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setTextContent(null);
    setLoadError(null);

    (async () => {
      const url = await getSignedUrl(file.id);
      if (!url) {
        setLoadError('Could not load file');
        return;
      }

      setSignedUrl(url);

      // For PDFs we avoid embedding the remote URL directly (iframe blocked issue)
      if (previewType === 'pdf') {
        try {
          const res = await fetch(url, { method: 'GET' });
          if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`);
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(blobUrl);
        } catch (e) {
          console.error('PDF blob fetch failed:', e);
          setLoadError('PDF preview is blocked in the browser. Use “Open in New Tab”.');
        }
      }

      if (previewType === 'text') {
        try {
          const res = await fetch(url, { method: 'GET' });
          if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
          const text = await res.text();
          // cap preview length for performance
          setTextContent(text.length > 200_000 ? text.slice(0, 200_000) + '\n\n… (truncated)' : text);
        } catch (e) {
          console.error('Text fetch failed:', e);
          setLoadError('Could not preview this text file. Use “Open in New Tab”.');
        }
      }
    })().catch((err) => {
      console.error('Preview init failed:', err);
      setLoadError(err?.message || 'Failed to load file');
    });
  }, [file, open, getSignedUrl, previewType]);

  if (!file) return null;

  const handleOpenExternal = () => {
    if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col border-0">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-4 pr-8">
            <SheetTitle className="truncate">{fileName}</SheetTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenExternal}
                disabled={!signedUrl}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </Button>
              <Button
                size="sm"
                onClick={() => downloadFile(file)}
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
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col mt-4 min-h-0">
          {!signedUrl && !loadError && <LoadingState label="Preparing secure preview..." />}
          {loadError && <ErrorState error={loadError} onRetry={() => setSignedUrl(null)} />}

          {signedUrl && !loadError && (
            <>
              {previewType === 'image' && (
                <div className="flex items-center justify-center flex-1 p-4">
                  <img
                    src={signedUrl}
                    alt={fileName}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    loading="lazy"
                  />
                </div>
              )}

              {previewType === 'pdf' && (
                <div className="flex-1 min-h-0">
                  {pdfBlobUrl ? (
                    <iframe
                      src={pdfBlobUrl}
                      className="w-full h-full min-h-[60vh] rounded-lg border-0"
                      title={`PDF Preview - ${fileName}`}
                    />
                  ) : (
                    <LoadingState label="Loading PDF..." />
                  )}
                </div>
              )}

              {previewType === 'text' && (
                <div className="flex-1 min-h-0 rounded-lg border border-border overflow-auto bg-background p-4">
                  <pre className="text-sm whitespace-pre-wrap break-words text-foreground">
                    {textContent ?? 'Loading...'}
                  </pre>
                </div>
              )}

              {previewType === 'audio' && (
                <div className="flex flex-col gap-3 p-4">
                  <audio controls src={signedUrl} className="w-full" />
                  <p className="text-xs text-muted-foreground">If playback fails, use “Open in New Tab”.</p>
                </div>
              )}

              {previewType === 'video' && (
                <div className="flex flex-col gap-3 p-4">
                  <video controls src={signedUrl} className="w-full max-h-[60vh] rounded-lg" />
                  <p className="text-xs text-muted-foreground">If playback fails, use “Open in New Tab”.</p>
                </div>
              )}

              {previewType === 'unsupported' && (
                <DocumentFallback file={file} signedUrl={signedUrl} />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
