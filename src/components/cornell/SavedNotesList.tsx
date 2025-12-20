import React from 'react';
import { FileText, Calendar, Download, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { generateCornellNotesPDF } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';
import type { CornellNoteDocument } from '@/types/cornell';

interface SavedNote {
  id: string;
  title: string;
  topic: string;
  document: CornellNoteDocument;
  source_type: string;
  source_file_name?: string;
  created_at: string;
}

interface SavedNotesListProps {
  notes: SavedNote[];
  isLoading: boolean;
  onSelect: (note: SavedNote) => void;
  onDelete: (id: string) => void;
}

export function SavedNotesList({ notes, isLoading, onSelect, onDelete }: SavedNotesListProps) {
  const { toast } = useToast();

  const handleDownload = (note: SavedNote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      generateCornellNotesPDF(note.document);
      toast({
        title: 'PDF Downloaded',
        description: `${note.title} saved as PDF`,
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <Card className="p-8 text-center bg-muted/30">
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="font-medium text-foreground mb-1">No saved notes yet</h3>
        <p className="text-sm text-muted-foreground">
          Generate your first Cornell Notes to see them here
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <Card
          key={note.id}
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
          onClick={() => onSelect(note)}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">{note.title}</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(note.created_at).toLocaleDateString()}</span>
                <span className="text-muted-foreground/50">•</span>
                <span>{note.document.totalPages} page{note.document.totalPages > 1 ? 's' : ''}</span>
              </div>
              {note.source_file_name && (
                <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                  From: {note.source_file_name}
                </p>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => handleDownload(note, e)}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => handleDelete(note.id, e)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
