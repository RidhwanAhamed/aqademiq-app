import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, Download, Sparkles, Loader2, Plus, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { InputTabs, CornellDocumentPreview } from '@/components/cornell';
import { SavedNotesList } from '@/components/cornell/SavedNotesList';
import { generateCornellNotesPDF } from '@/lib/pdf-generator';
import type { CornellNoteDocument, DepthLevel } from '@/types/cornell';

interface SavedNote {
  id: string;
  title: string;
  topic: string;
  document: CornellNoteDocument;
  source_type: string;
  source_file_name?: string;
  created_at: string;
}

export default function CornellNotes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [document, setDocument] = useState<CornellNoteDocument | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingNote, setIsLoadingNote] = useState(false);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('generate');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);

  // Load note by ID from URL params
  useEffect(() => {
    const noteId = searchParams.get('id');
    if (noteId && user) {
      loadNoteById(noteId);
    }
  }, [searchParams, user]);

  // Load saved notes list
  useEffect(() => {
    if (user) {
      loadSavedNotes();
    }
  }, [user]);

  const loadNoteById = async (noteId: string) => {
    if (!user) return;
    
    setIsLoadingNote(true);
    try {
      const { data, error } = await supabase
        .from('cornell_notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        // Parse document from JSON if needed
        const doc = typeof data.document === 'string' 
          ? JSON.parse(data.document) 
          : data.document as unknown as CornellNoteDocument;
        
        setDocument(doc);
        setCurrentNoteId(data.id);
        setActiveTab('generate'); // Switch to preview
      }
    } catch (error) {
      console.error('Error loading note:', error);
      toast({
        title: 'Failed to load note',
        description: 'The note could not be found',
        variant: 'destructive',
      });
      // Clear the invalid ID from URL
      setSearchParams({});
    } finally {
      setIsLoadingNote(false);
    }
  };

  const loadSavedNotes = async () => {
    if (!user) return;
    
    setIsLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from('cornell_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notes: SavedNote[] = (data || []).map((note) => ({
        id: note.id,
        title: note.title,
        topic: note.topic,
        document: typeof note.document === 'string' 
          ? JSON.parse(note.document) 
          : note.document as unknown as CornellNoteDocument,
        source_type: note.source_type,
        source_file_name: note.source_file_name,
        created_at: note.created_at!,
      }));

      setSavedNotes(notes);
    } catch (error) {
      console.error('Error loading saved notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleGenerate = async (data: {
    topic?: string;
    fileContent?: string;
    fileName?: string;
    filePrompt?: string;
    depthLevel: DepthLevel;
  }) => {
    setIsGenerating(true);
    setCurrentNoteId(null);

    try {
      const response = await fetch(
        `https://thmyddcvpopzjbvmhbur.supabase.co/functions/v1/generate-notes-orchestrator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user ? { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } : {}),
          },
          body: JSON.stringify({
            topic: data.topic,
            fileContent: data.fileContent,
            fileName: data.fileName,
            filePrompt: data.filePrompt,
            depthLevel: data.depthLevel,
          }),
        }
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate notes');
      }

      setDocument(result.data);
      
      // Save to database if user is authenticated
      if (user) {
        const { data: savedNote, error: saveError } = await supabase
          .from('cornell_notes')
          .insert({
            user_id: user.id,
            title: result.data.title,
            topic: result.data.topic,
            document: JSON.parse(JSON.stringify(result.data)),
            source_type: result.data.sourceType,
            source_file_name: result.data.sourceFileName,
          })
          .select()
          .single();

        if (saveError) {
          console.error('Error saving note:', saveError);
        } else if (savedNote) {
          setCurrentNoteId(savedNote.id);
          // Update URL with new note ID
          setSearchParams({ id: savedNote.id });
          // Refresh saved notes list
          loadSavedNotes();
        }
      }

      toast({
        title: 'Notes Generated',
        description: `Created ${result.data.totalPages} page(s) of Cornell Notes`,
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!document) return;
    
    try {
      generateCornellNotesPDF(document);
      toast({
        title: 'PDF Downloaded',
        description: 'Your Cornell Notes have been saved as a PDF',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  const handleSelectNote = (note: SavedNote) => {
    setDocument(note.document);
    setCurrentNoteId(note.id);
    setSearchParams({ id: note.id });
    setActiveTab('generate');
  };

  const handleDeleteNote = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cornell_notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // If we're viewing this note, clear it
      if (currentNoteId === id) {
        setDocument(null);
        setCurrentNoteId(null);
        setSearchParams({});
      }

      // Refresh list
      loadSavedNotes();

      toast({
        title: 'Note Deleted',
        description: 'The note has been removed',
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Delete Failed',
        description: 'Could not delete the note',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateNew = () => {
    setDocument(null);
    setCurrentNoteId(null);
    setSearchParams({});
  };

  // Handle document updates (for inline editing)
  const handleDocumentChange = useCallback(async (updatedDoc: CornellNoteDocument) => {
    setDocument(updatedDoc);
    
    // Auto-save if we have a note ID
    if (currentNoteId && user) {
      try {
        await supabase
          .from('cornell_notes')
          .update({ 
            document: JSON.parse(JSON.stringify(updatedDoc)),
            title: updatedDoc.title,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentNoteId)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, [currentNoteId, user]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Cornell Notes Generator
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transform any topic or document into structured, multi-page Cornell Notes.
            Perfect for studying, review, and retention.
          </p>
        </div>

        {/* Loading state for initial note load */}
        {isLoadingNote && (
          <Card className="p-12 text-center bg-card border-border mb-8">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Loading Your Notes
            </h3>
            <p className="text-muted-foreground">
              Please wait...
            </p>
          </Card>
        )}

        {/* Main Content */}
        {!isLoadingNote && !document && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Generate New
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                My Notes {savedNotes.length > 0 && `(${savedNotes.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate">
              <Card className="p-6 bg-card border-border">
                <InputTabs
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                />
              </Card>
            </TabsContent>

            <TabsContent value="saved">
              <SavedNotesList
                notes={savedNotes}
                isLoading={isLoadingNotes}
                onSelect={handleSelectNote}
                onDelete={handleDeleteNote}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Loading State for Generation */}
        {isGenerating && (
          <Card className="p-12 text-center bg-card border-border">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Generating Your Cornell Notes
            </h3>
            <p className="text-muted-foreground">
              AI is analyzing your content and creating structured notes...
            </p>
          </Card>
        )}

        {/* Preview Section */}
        {document && !isGenerating && !isLoadingNote && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-foreground">{document.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {document.totalPages} page{document.totalPages > 1 ? 's' : ''} • 
                    {document.sourceType === 'file' ? ` From: ${document.sourceFileName}` : ' Topic-based'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleGenerateNew}
                >
                  Generate New
                </Button>
                <Button onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Document Preview with Inline Editing */}
            <CornellDocumentPreview
              document={document}
              onDocumentChange={handleDocumentChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
