/**
 * useDocumentRAG Hook
 * Purpose: Manage document embeddings and semantic search for Ada AI RAG
 * Future-proof: Supports course-specific document storage
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentEmbedding {
  id: string;
  content: string;
  similarity: number;
  source_type: string;
  file_name?: string;
  course_name?: string;
  course_id?: string;
  file_upload_id?: string;
  metadata?: Record<string, any>;
}

export interface RAGSearchResult {
  results: DocumentEmbedding[];
  query: string;
  total_results: number;
}

export interface GenerateEmbeddingsParams {
  file_upload_id?: string;
  course_id?: string;
  content?: string;
  source_type?: 'upload' | 'syllabus' | 'notes' | 'lecture' | 'textbook';
  metadata?: Record<string, any>;
}

export interface SearchDocumentsParams {
  query: string;
  course_id?: string;
  match_threshold?: number;
  match_count?: number;
  source_types?: string[];
}

export function useDocumentRAG() {
  const [isIndexing, setIsIndexing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchResults, setLastSearchResults] = useState<DocumentEmbedding[]>([]);
  const { toast } = useToast();

  /**
   * Generate and store embeddings for a document
   * Can be triggered after OCR processing or for direct text content
   */
  const generateEmbeddings = useCallback(async (params: GenerateEmbeddingsParams): Promise<boolean> => {
    setIsIndexing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('generate-embeddings', {
        body: params,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Generate embeddings error:', response.error);
        throw new Error(response.error.message || 'Failed to generate embeddings');
      }

      const result = response.data;
      console.log('Embeddings generated:', result);

      toast({
        title: 'Document Indexed',
        description: `Successfully indexed ${result.chunks_processed} chunks for AI search.`,
      });

      return true;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      toast({
        title: 'Indexing Failed',
        description: error instanceof Error ? error.message : 'Failed to index document',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsIndexing(false);
    }
  }, [toast]);

  /**
   * Search documents using semantic similarity
   * Returns relevant document chunks for RAG context
   */
  const searchDocuments = useCallback(async (params: SearchDocumentsParams): Promise<DocumentEmbedding[]> => {
    setIsSearching(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('search-documents', {
        body: {
          query: params.query,
          course_id: params.course_id || null,
          match_threshold: params.match_threshold || 0.7,
          match_count: params.match_count || 5,
          source_types: params.source_types || null,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Search documents error:', response.error);
        throw new Error(response.error.message || 'Search failed');
      }

      const result: RAGSearchResult = response.data;
      console.log('Search results:', result.total_results, 'documents found');
      
      setLastSearchResults(result.results);
      return result.results;
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Build RAG context string from search results
   * Used to enrich AI prompts with relevant document content
   */
  const buildRAGContext = useCallback((results: DocumentEmbedding[]): string => {
    if (results.length === 0) {
      return '';
    }

    const contextParts = results.map((doc, index) => {
      const source = doc.file_name || doc.source_type || 'Document';
      const course = doc.course_name ? ` (${doc.course_name})` : '';
      return `[Source ${index + 1}: ${source}${course}]\n${doc.content}`;
    });

    return `## Relevant Document Context:\n${contextParts.join('\n\n')}`;
  }, []);

  /**
   * Get all indexed documents for the current user
   * Useful for displaying what's in the knowledge base
   */
  const getIndexedDocuments = useCallback(async (): Promise<Array<{
    file_upload_id: string;
    file_name: string;
    course_id?: string;
    course_name?: string;
    source_type: string;
    chunk_count: number;
    created_at: string;
  }>> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return [];
      }

      // Get distinct files with their chunk counts
      const { data, error } = await supabase
        .from('document_embeddings')
        .select('file_upload_id, course_id, source_type, metadata, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching indexed documents:', error);
        return [];
      }

      // Group by file_upload_id
      const groupedDocs = new Map<string, {
        file_upload_id: string;
        course_id?: string;
        source_type: string;
        metadata: any;
        chunk_count: number;
        created_at: string;
      }>();

      data?.forEach((doc: any) => {
        const key = doc.file_upload_id || doc.created_at;
        if (groupedDocs.has(key)) {
          const existing = groupedDocs.get(key)!;
          existing.chunk_count++;
        } else {
          groupedDocs.set(key, {
            file_upload_id: doc.file_upload_id,
            course_id: doc.course_id,
            source_type: doc.source_type,
            metadata: doc.metadata,
            chunk_count: 1,
            created_at: doc.created_at,
          });
        }
      });

      // Fetch file names and course names
      const results = await Promise.all(
        Array.from(groupedDocs.values()).map(async (doc) => {
          let fileName = doc.metadata?.file_name || 'Unknown';
          let courseName = undefined;

          if (doc.file_upload_id) {
            const { data: fileData } = await supabase
              .from('file_uploads')
              .select('file_name')
              .eq('id', doc.file_upload_id)
              .single();
            
            if (fileData) {
              fileName = fileData.file_name;
            }
          }

          if (doc.course_id) {
            const { data: courseData } = await supabase
              .from('courses')
              .select('name')
              .eq('id', doc.course_id)
              .single();
            
            if (courseData) {
              courseName = courseData.name;
            }
          }

          return {
            file_upload_id: doc.file_upload_id,
            file_name: fileName,
            course_id: doc.course_id,
            course_name: courseName,
            source_type: doc.source_type,
            chunk_count: doc.chunk_count,
            created_at: doc.created_at,
          };
        })
      );

      return results;
    } catch (error) {
      console.error('Error getting indexed documents:', error);
      return [];
    }
  }, []);

  /**
   * Delete all embeddings for a specific file
   */
  const deleteDocumentEmbeddings = useCallback(async (fileUploadId: string): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return false;
      }

      const { error } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('file_upload_id', fileUploadId)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error deleting embeddings:', error);
        return false;
      }

      toast({
        title: 'Document Removed',
        description: 'Document removed from AI knowledge base.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting document embeddings:', error);
      return false;
    }
  }, [toast]);

  return {
    // State
    isIndexing,
    isSearching,
    lastSearchResults,
    
    // Actions
    generateEmbeddings,
    searchDocuments,
    buildRAGContext,
    getIndexedDocuments,
    deleteDocumentEmbeddings,
  };
}
