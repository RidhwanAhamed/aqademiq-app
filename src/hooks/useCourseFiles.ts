/**
 * Hook for managing course files
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  CourseFile, 
  FileSourceType, 
  FileStatus,
  UploadCourseFileParams,
  GetCourseFilesResponse,
  UploadCourseFileResponse,
  DeleteCourseFileResponse,
} from '@/types/course-files';

interface UseCourseFilesOptions {
  courseId: string;
  autoFetch?: boolean;
}

export function useCourseFiles({ courseId, autoFetch = true }: UseCourseFilesOptions) {
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const { data, error: invokeError } = await supabase.functions.invoke<GetCourseFilesResponse>(
        'get-course-files',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: undefined,
        }
      );

      // For GET requests, we need to use query params - fall back to direct DB query
      const { data: filesData, error: dbError } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      // Get embedding counts
      const fileIds = filesData?.map(f => f.id) || [];
      let embeddingCounts: Record<string, number> = {};

      if (fileIds.length > 0) {
        const { data: embeddings } = await supabase
          .from('document_embeddings')
          .select('file_upload_id')
          .in('file_upload_id', fileIds);

        if (embeddings) {
          embeddingCounts = embeddings.reduce((acc, e) => {
            const id = e.file_upload_id;
            if (id) {
              acc[id] = (acc[id] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);
        }
      }

      const enrichedFiles = (filesData || []).map(file => ({
        ...file,
        source_type: (file.source_type || 'other') as FileSourceType,
        status: file.status as FileStatus,
        chunk_count: embeddingCounts[file.id] || 0,
        is_indexed: (embeddingCounts[file.id] || 0) > 0,
        display_name: file.display_name || file.file_name,
      })) as CourseFile[];

      setFiles(enrichedFiles);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(message);
      console.error('Error fetching course files:', err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  const uploadFile = useCallback(async (
    file: File,
    sourceType: FileSourceType,
    displayName?: string,
    description?: string
  ): Promise<CourseFile | null> => {
    if (!courseId) return null;

    setIsUploading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Convert file to base64
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const params: UploadCourseFileParams = {
        course_id: courseId,
        file_name: file.name,
        file_type: file.type,
        file_data: fileData,
        source_type: sourceType,
        display_name: displayName || file.name,
        description,
      };

      const { data, error: invokeError } = await supabase.functions.invoke<UploadCourseFileResponse>(
        'upload-course-file',
        {
          body: params,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.message || 'Upload failed');

      toast({
        title: 'File uploaded',
        description: `${file.name} is being processed for AI access.`,
      });

      // Refresh files list
      await fetchFiles();

      return data.file as unknown as CourseFile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
      toast({
        title: 'Upload failed',
        description: message,
        variant: 'destructive',
      });
      console.error('Error uploading file:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [courseId, fetchFiles, toast]);

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const { data, error: invokeError } = await supabase.functions.invoke<DeleteCourseFileResponse>(
        'delete-course-file',
        {
          body: { file_id: fileId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error('Delete failed');

      toast({
        title: 'File deleted',
        description: `${data.file_name} has been removed.`,
      });

      // Update local state
      setFiles(prev => prev.filter(f => f.id !== fileId));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      toast({
        title: 'Delete failed',
        description: message,
        variant: 'destructive',
      });
      console.error('Error deleting file:', err);
      return false;
    }
  }, [toast]);

  const reindexFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Get file details
      const file = files.find(f => f.id === fileId);
      if (!file) throw new Error('File not found');

      // Update status to indexing
      await supabase
        .from('file_uploads')
        .update({ status: 'indexing' })
        .eq('id', fileId);

      // Trigger embedding generation
      const { error: invokeError } = await supabase.functions.invoke(
        'generate-embeddings',
        {
          body: {
            file_upload_id: fileId,
            course_id: courseId,
            source_type: file.source_type,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (invokeError) throw invokeError;

      toast({
        title: 'Re-indexing started',
        description: 'The file is being re-processed for AI access.',
      });

      // Refresh files after a delay
      setTimeout(fetchFiles, 2000);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to re-index file';
      toast({
        title: 'Re-index failed',
        description: message,
        variant: 'destructive',
      });
      console.error('Error re-indexing file:', err);
      return false;
    }
  }, [courseId, files, fetchFiles, toast]);

  // Auto-fetch on mount and courseId change
  useEffect(() => {
    if (autoFetch && courseId) {
      fetchFiles();
    }
  }, [autoFetch, courseId, fetchFiles]);

  // Poll for status updates when files are processing
  useEffect(() => {
    const processingFiles = files.filter(f => 
      ['uploading', 'uploaded', 'processing', 'indexing'].includes(f.status)
    );

    if (processingFiles.length > 0) {
      const interval = setInterval(fetchFiles, 5000);
      return () => clearInterval(interval);
    }
  }, [files, fetchFiles]);

  return {
    files,
    isLoading,
    isUploading,
    error,
    fetchFiles,
    uploadFile,
    deleteFile,
    reindexFile,
  };
}
