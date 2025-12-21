/**
 * useFileAccess Hook (Simplified)
 *
 * Provides file download functionality for course files.
 * Preview logic has been moved to FilePreviewSheet for simplicity.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CourseFile } from '@/types/course-files';

interface UseFileAccessReturn {
  downloadFile: (file: CourseFile) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

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

export function useFileAccess(): UseFileAccessReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const downloadFile = useCallback(async (file: CourseFile): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const path = extractStoragePath(file);
      if (!path) throw new Error('Invalid file path');

      const { data, error: dlError } = await supabase.storage
        .from('study-files')
        .download(path);

      if (dlError || !data) {
        throw new Error(dlError?.message || 'Download failed');
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.display_name || file.file_name;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

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
  }, [toast]);

  return {
    downloadFile,
    isLoading,
    error,
  };
}
