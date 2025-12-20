/**
 * useFileAccess Hook
 * 
 * Provides secure file access using signed URLs with caching.
 * Handles URL generation, downloads, and viewing with proper authentication.
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
  downloadFile: (file: CourseFile) => Promise<void>;
  viewFile: (file: CourseFile) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

export function useFileAccess(): UseFileAccessReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Cache signed URLs to avoid redundant API calls
  // URLs are cached until 5 minutes before expiry
  const urlCache = useRef<Map<string, CachedUrl>>(new Map());

  const getSignedUrl = useCallback(async (fileId: string): Promise<string | null> => {
    // Check cache first
    const cached = urlCache.current.get(fileId);
    const now = Date.now();
    
    // Use cached URL if it won't expire in the next 5 minutes
    if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
      console.log('Using cached signed URL for file:', fileId);
      return cached.url;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('get-signed-url', {
        body: { fileId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get signed URL');
      }

      const { signedUrl, expiresIn } = response.data;

      if (!signedUrl) {
        throw new Error('No signed URL returned');
      }

      // Cache the URL
      urlCache.current.set(fileId, {
        url: signedUrl,
        expiresAt: now + (expiresIn * 1000)
      });

      console.log('Signed URL generated and cached for file:', fileId);
      return signedUrl;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get file access';
      console.error('Error getting signed URL:', err);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const downloadFile = useCallback(async (file: CourseFile): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const signedUrl = await getSignedUrl(file.id);

      if (!signedUrl) {
        throw new Error('Could not get download URL');
      }

      // Some browsers ignore the `download` attribute for cross-origin URLs.
      // To make downloads reliable, fetch as a Blob and download via an object URL.
      try {
        const res = await fetch(signedUrl, { method: 'GET' });
        if (!res.ok) {
          throw new Error(`Download failed (${res.status})`);
        }

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = file.display_name || file.file_name;
        link.rel = 'noopener noreferrer';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(objectUrl);
      } catch (blobErr) {
        console.warn('Blob download failed, falling back to opening signed URL:', blobErr);
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }

      toast({
        title: 'Download started',
        description: `Downloading ${file.display_name || file.file_name}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download file';
      console.error('Error downloading file:', err);
      setError(message);

      toast({
        title: 'Download failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [getSignedUrl, toast]);

  const viewFile = useCallback(async (file: CourseFile): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const signedUrl = await getSignedUrl(file.id);
      
      if (!signedUrl) {
        throw new Error('Could not get view URL');
      }

      return signedUrl;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to view file';
      console.error('Error viewing file:', err);
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
    downloadFile,
    viewFile,
    isLoading,
    error,
  };
}
