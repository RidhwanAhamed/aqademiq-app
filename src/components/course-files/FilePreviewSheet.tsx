/**
 * File Preview Sheet Component
 * Displays file preview in a sheet.
 *
 * NOTE: Some browsers/extensions block tokenized signed URLs (ERR_BLOCKED_BY_CLIENT).
 * For reliable previews, we download the file via the user's active Supabase session
 * (Storage download) and render it from a same-origin blob: URL.
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

function DocumentFallback({ file }: { file: CourseFile }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-muted-foreground p-8">
      <FileText className="w-16 h-16 opacity-50" />
      <p className="text-center">Preview not available for this file type</p>
      <p className="text-sm text-center">{file.file_name}</p>
      <p className="text-xs">{file.file_type}</p>
    </div>
  );
}

export function FilePreviewSheet({ file, open, onOpenChange }: FilePreviewSheetProps) {
  const { downloadBlob, downloadFile, isLoading } = useFileAccess();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const previewType = useMemo(() => (file ? getPreviewType(file) : 'unsupported'), [file]);
  const fileName = useMemo(() => (file ? file.display_name || file.file_name : ''), [file]);

  // Cleanup blob URL when file changes / closes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!file || !open) return;

    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setTextContent(null);
    setLoadError(null);

    // Only download blobs for types we can preview.
    if (previewType === 'unsupported') return;

    (async () => {
      const blob = await downloadBlob(file);

      if (previewType === 'text') {
        const text = await blob.text();
        setTextContent(text.length > 200_000 ? text.slice(0, 200_000) + '\n\n… (truncated)' : text);
      }

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    })().catch((err) => {
      const msg = err instanceof Error ? err.message : 'Failed to load file';
      setLoadError(msg);
    });
  }, [file, open, previewType, downloadBlob, retryKey]);

  if (!file) return null;

  const handleOpen = async () => {
    try {
      if (previewUrl) {
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // For unsupported types, try to fetch a blob and let the browser handle it.
      const blob = await downloadBlob(file);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Revoke shortly after; enough time for the tab to load.
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not open file';
      setLoadError(msg);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col border-0">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-4 pr-8">
            <SheetTitle className="truncate">{fileName}</SheetTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={handleOpen} disabled={isLoading}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </Button>
              <Button size="sm" onClick={() => downloadFile(file)} disabled={isLoading}>
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
          {previewType !== 'unsupported' && !previewUrl && !loadError && (
            <LoadingState label="Preparing preview..." />
          )}
          {loadError && (
            <ErrorState
              error={loadError}
              onRetry={() => {
                setLoadError(null);
                setRetryKey((k) => k + 1);
              }}
            />
          )}

          {!loadError && (
            <>
              {previewType === 'image' && previewUrl && (
                <div className="flex items-center justify-center flex-1 p-4">
                  <img
                    src={previewUrl}
                    alt={fileName}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    loading="lazy"
                  />
                </div>
              )}

              {previewType === 'pdf' && (
                <div className="flex-1 min-h-0">
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
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

              {previewType === 'audio' && previewUrl && (
                <div className="flex flex-col gap-3 p-4">
                  <audio controls src={previewUrl} className="w-full" />
                </div>
              )}

              {previewType === 'video' && previewUrl && (
                <div className="flex flex-col gap-3 p-4">
                  <video controls src={previewUrl} className="w-full max-h-[60vh] rounded-lg" />
                </div>
              )}

              {previewType === 'unsupported' && <DocumentFallback file={file} />}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
