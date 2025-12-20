/**
 * useFileAccess Hook
 *
 * Provides secure file access for private Supabase Storage files.
 *
 * IMPORTANT:
 * - Prefer session-authenticated Storage downloads (no tokenized signed URL in the browser)
 *   to avoid browser/extension blocking like ERR_BLOCKED_BY_CLIENT.
 * - Signed URLs are kept only as a fallback.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CourseFile } from '@/types/course-files';

interface CachedUrl {
  url: string;
  expiresAt: number;
}

interface UseFileAccessReturn {
  getSignedUrl: (fileId: string) => Promise<string | null>;
  downloadBlob: (file: CourseFile) => Promise<Blob>;
  downloadFile: (file: CourseFile) => Promise<void>;
  viewFile: (file: CourseFile) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

function extractStoragePathFromFileUrl(file: CourseFile): string | null {
  const raw = file.file_url;
  if (!raw) return null;

  // Many code paths store the plain storage path (userId/courseId/filename)
  if (!raw.startsWith('http')) return raw;

  const candidates = [
    '/storage/v1/object/public/study-files/',
    '/storage/v1/object/sign/study-files/',
    '/storage/v1/object/authenticated/study-files/',
  ];

  for (const marker of candidates) {
    const parts = raw.split(marker);
    if (parts.length > 1) {
      return parts[1].split('?')[0];
    }
  }

  return null;
}

async function ensureBlobContentType(blob: Blob, desiredType?: string): Promise<Blob> {
  const type = desiredType || blob.type;
  if (!type) return blob;

  // Some fetch/download APIs return application/octet-stream or empty type,
  // which prevents inline PDF preview in some browsers.
  if (!blob.type || blob.type === 'application/octet-stream') {
    const buf = await blob.arrayBuffer();
    return new Blob([buf], { type });
  }

  return blob;
}

export function useFileAccess(): UseFileAccessReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Cache signed URLs to avoid redundant API calls (fallback only)
  const urlCache = useRef<Map<string, CachedUrl>>(new Map());

  const getSignedUrl = useCallback(async (fileId: string): Promise<string | null> => {
    const cached = urlCache.current.get(fileId);
    const now = Date.now();

    if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
      return cached.url;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('get-signed-url', {
        body: { fileId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get signed URL');
      }

      const { signedUrl, expiresIn } = response.data;
      if (!signedUrl) throw new Error('No signed URL returned');

      urlCache.current.set(fileId, {
        url: signedUrl,
        expiresAt: now + (Number(expiresIn ?? 3600) * 1000),
      });

      return signedUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get file access';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const downloadBlob = useCallback(async (file: CourseFile): Promise<Blob> => {
    setError(null);

    const path = extractStoragePathFromFileUrl(file);
    if (!path) throw new Error('Missing file path');

    // Session-authenticated download (no token in URL)
    const { data, error: dlError } = await supabase.storage
      .from('study-files')
      .download(path);

    if (dlError || !data) {
      throw new Error(dlError?.message || 'Failed to download file');
    }

    return ensureBlobContentType(data, file.file_type);
  }, []);

  const downloadFile = useCallback(async (file: CourseFile): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      let blob: Blob | null = null;

      // Prefer Storage download first (avoids signed-url blocking)
      try {
        blob = await downloadBlob(file);
      } catch (storageErr) {
        // Fallback to signed URL only if needed
        const signedUrl = await getSignedUrl(file.id);
        if (!signedUrl) throw storageErr;

        const res = await fetch(signedUrl, { method: 'GET' });
        if (!res.ok) throw new Error(`Download failed (${res.status})`);
        blob = await ensureBlobContentType(await res.blob(), file.file_type);
      }

      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.display_name || file.file_name;
      link.rel = 'noopener noreferrer';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(objectUrl);

      toast({
        title: 'Download started',
        description: `Downloading ${file.display_name || file.file_name}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download file';
      setError(message);
      toast({
        title: 'Download failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [downloadBlob, getSignedUrl, toast]);

  const viewFile = useCallback(async (file: CourseFile): Promise<string | null> => {
    // Kept for compatibility: returns a signed URL (may be blocked in some browsers).
    setIsLoading(true);
    setError(null);

    try {
      const signedUrl = await getSignedUrl(file.id);
      if (!signedUrl) throw new Error('Could not get view URL');
      return signedUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to view file';
      setError(message);
      toast({
        title: 'View failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getSignedUrl, toast]);

  return {
    getSignedUrl,
    downloadBlob,
    downloadFile,
    viewFile,
    isLoading,
    error,
  };
}

