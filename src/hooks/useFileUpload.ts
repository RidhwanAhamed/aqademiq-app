import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

export interface FileUpload {
  id: string;
  file_name: string;
  file_url?: string;
  file_type: string;
  ocr_text?: string;
  parsed_data?: any;
  status: string;
  created_at: string;
}

export function useFileUpload() {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<FileUpload | null> => {
    if (!user) return null;

    setLoading(true);
    
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('study-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create database record
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

      setUploads(prev => [...prev, fileRecord]);
      
      toast({
        title: 'File Uploaded',
        description: `${file.name} has been uploaded successfully`,
      });

      return fileRecord;

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data } = await supabase.storage
        .from('study-files')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  };

  const updateFileStatus = async (fileId: string, status: string, ocrText?: string, parsedData?: any) => {
    try {
      const { data, error } = await supabase
        .from('file_uploads')
        .update({ 
          status,
          ...(ocrText && { ocr_text: ocrText }),
          ...(parsedData && { parsed_data: parsedData })
        })
        .eq('id', fileId)
        .select()
        .single();

      if (error) throw error;

      setUploads(prev => prev.map(upload => 
        upload.id === fileId ? { ...upload, ...data } : upload
      ));

      return data;
    } catch (error) {
      console.error('Error updating file status:', error);
      return null;
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('file_uploads')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      setUploads(prev => prev.filter(upload => upload.id !== fileId));
      
      toast({
        title: 'File Deleted',
        description: 'File has been deleted successfully',
      });

    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Delete Error',
        description: 'Failed to delete file',
        variant: 'destructive'
      });
    }
  };

  const fetchUserUploads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUploads(data || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    }
  };

  return {
    uploads,
    loading,
    uploadFile,
    getFileUrl,
    updateFileStatus,
    deleteFile,
    fetchUserUploads
  };
}