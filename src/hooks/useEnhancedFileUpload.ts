import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface EnhancedFileUploadState {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'ocr_completed' | 'parsed' | 'error' | 'success';
  progress: number;
  error?: string;
  ocrText?: string;
  parsedData?: any;
  retryCount: number;
  processingStats?: {
    ocrConfidence?: number;
    documentType?: string;
    processingTime?: number;
  };
}

export function useEnhancedFileUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadStates, setUploadStates] = useState<EnhancedFileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to upload files.',
        variant: 'destructive'
      });
      return null;
    }

    const uploadId = `${Date.now()}-${Math.random()}`;
    const uploadState: EnhancedFileUploadState = {
      id: uploadId,
      file,
      status: 'uploading',
      progress: 0,
      retryCount: 0
    };

    setUploadStates(prev => [...prev, uploadState]);
    setIsUploading(true);

    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 20) {
        setUploadStates(prev => prev.map(state => 
          state.id === uploadId 
            ? { ...state, progress }
            : state
        ));
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('study-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create file record in database
      const { data: fileRecord, error: fileError } = await supabase
        .from('file_uploads')
        .insert([{
          user_id: user.id,
          file_name: file.name,
          file_url: uploadData.path,
          file_type: file.type,
          status: 'uploaded'
        }])
        .select()
        .single();

      if (fileError) throw fileError;

      // Update state to processing
      setUploadStates(prev => prev.map(state => 
        state.id === uploadId 
          ? { ...state, status: 'processing', progress: 100 }
          : state
      ));

      // Process with enhanced AI
      await processWithEnhancedAI(fileRecord.id, file, uploadId);

      return fileRecord.id;

    } catch (error) {
      console.error('Upload error:', error);
      
      setUploadStates(prev => prev.map(state => 
        state.id === uploadId 
          ? { 
              ...state, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed',
              retryCount: state.retryCount + 1
            }
          : state
      ));

      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      });

      return null;
    } finally {
      setIsUploading(false);
    }
  }, [user, toast]);

  const processWithEnhancedAI = async (fileId: string, file: File, uploadId: string) => {
    try {
      // Step 1: Enhanced OCR
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const base64 = await fileToBase64(file);
        
        const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('enhanced-ocr-parser', {
          body: { 
            file_data: base64, 
            file_type: file.type,
            file_id: fileId 
          }
        });

        if (ocrError) throw ocrError;

        setUploadStates(prev => prev.map(state => 
          state.id === uploadId 
            ? { 
                ...state, 
                status: 'ocr_completed', 
                ocrText: ocrResult.text,
                processingStats: {
                  ocrConfidence: ocrResult.confidence
                }
              }
            : state
        ));
      }

      // Step 2: Advanced parsing
      const { data: parseResult, error: parseError } = await supabase.functions.invoke('advanced-schedule-parser', {
        body: { 
          file_id: fileId,
          user_id: user.id,
          enable_conflict_detection: true
        }
      });

      if (parseError) throw parseError;

      // Update final state
      setUploadStates(prev => prev.map(state => 
        state.id === uploadId 
          ? { 
              ...state, 
              status: 'success', 
              parsedData: parseResult.schedule_data,
              processingStats: {
                ...state.processingStats,
                documentType: parseResult.document_type,
                processingTime: parseResult.processing_time
              }
            }
          : state
      ));

    } catch (error) {
      throw new Error(`AI processing failed: ${error.message}`);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const retryUpload = useCallback(async (uploadId: string) => {
    const uploadState = uploadStates.find(state => state.id === uploadId);
    if (!uploadState || uploadState.retryCount >= 3) return;

    // Reset state and retry
    setUploadStates(prev => prev.map(state => 
      state.id === uploadId 
        ? { ...state, status: 'uploading', progress: 0, error: undefined }
        : state
    ));

    await uploadFile(uploadState.file);
  }, [uploadStates, uploadFile]);

  const removeUpload = useCallback((uploadId: string) => {
    setUploadStates(prev => prev.filter(state => state.id !== uploadId));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploadStates(prev => prev.filter(state => state.status !== 'success'));
  }, []);

  return {
    uploadStates,
    isUploading,
    uploadFile,
    retryUpload,
    removeUpload,
    clearCompleted
  };
}