import React, { useState } from 'react';
import { FileText, Download, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { InputTabs, CornellDocumentPreview } from '@/components/cornell';
import { generateCornellNotesPDF } from '@/lib/pdf-generator';
import type { CornellNoteDocument, DepthLevel } from '@/types/cornell';

export default function CornellNotes() {
  const [document, setDocument] = useState<CornellNoteDocument | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (data: {
    topic?: string;
    fileContent?: string;
    fileName?: string;
    filePrompt?: string;
    depthLevel: DepthLevel;
  }) => {
    setIsGenerating(true);

    try {

      const response = await fetch(
        `https://thmyddcvpopzjbvmhbur.supabase.co/functions/v1/generate-notes-orchestrator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

        {/* Input Section */}
        {!document && (
          <Card className="p-6 mb-8 bg-card border-border">
            <InputTabs
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </Card>
        )}

        {/* Loading State */}
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
        {document && !isGenerating && (
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
                  onClick={() => setDocument(null)}
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
              onDocumentChange={setDocument}
            />
          </div>
        )}
      </div>
    </div>
  );
}

async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
