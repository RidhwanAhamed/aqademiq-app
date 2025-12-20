import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Plus, Edit2 } from "lucide-react";
import { EditableText } from "./EditableText";
import type { CornellNoteDocument, CornellNotePage } from "@/types/cornell";

interface CornellDocumentPreviewProps {
  document: CornellNoteDocument;
  onDocumentChange: (document: CornellNoteDocument) => void;
}

export function CornellDocumentPreview({
  document,
  onDocumentChange,
}: CornellDocumentPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const page = document.pages[currentPage];

  const updatePage = (pageIndex: number, updates: Partial<CornellNotePage>) => {
    const newPages = [...document.pages];
    newPages[pageIndex] = { ...newPages[pageIndex], ...updates };
    onDocumentChange({ ...document, pages: newPages });
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...page.keywords];
    newKeywords[index] = value;
    updatePage(currentPage, { keywords: newKeywords });
  };

  const deleteKeyword = (index: number) => {
    const newKeywords = page.keywords.filter((_, i) => i !== index);
    updatePage(currentPage, { keywords: newKeywords });
  };

  const addKeyword = () => {
    const newKeywords = [...page.keywords, "New keyword"];
    updatePage(currentPage, { keywords: newKeywords });
  };

  const updateNote = (index: number, value: string) => {
    const newNotes = [...page.notes];
    newNotes[index] = value;
    updatePage(currentPage, { notes: newNotes });
  };

  const deleteNote = (index: number) => {
    const newNotes = page.notes.filter((_, i) => i !== index);
    updatePage(currentPage, { notes: newNotes });
  };

  const addNote = () => {
    const newNotes = [...page.notes, "New note"];
    updatePage(currentPage, { notes: newNotes });
  };

  const updateSummary = (value: string) => {
    onDocumentChange({ ...document, summary: value });
  };

  const updateTitle = (value: string) => {
    onDocumentChange({ ...document, title: value });
  };

  return (
    <Card className="border-2">
      <CardHeader className="border-b bg-accent/30 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">
              <EditableText
                value={document.title}
                onSave={updateTitle}
                className="inline"
              />
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {document.date} • {document.sourceType === 'file' ? `From: ${document.sourceFileName}` : document.topic}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[80px] text-center">
              Page {currentPage + 1} of {document.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(document.totalPages - 1, p + 1))}
              disabled={currentPage === document.totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Edit2 className="h-3 w-3" /> Click any text to edit
        </p>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
          {/* Keywords Column */}
          <div className="p-4 bg-accent/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Keywords & Questions
              </h3>
              <Button variant="ghost" size="sm" onClick={addKeyword}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <ScrollArea className="h-[300px]">
              <ul className="space-y-2">
                {page.keywords.map((keyword, index) => (
                  <li
                    key={index}
                    className="pl-2 border-l-2 border-primary/50"
                  >
                    <EditableText
                      value={keyword}
                      onSave={(value) => updateKeyword(index, value)}
                      onDelete={() => deleteKeyword(index)}
                    />
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          {/* Notes Column */}
          <div className="md:col-span-2 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Notes
              </h3>
              <Button variant="ghost" size="sm" onClick={addNote}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <ScrollArea className="h-[300px]">
              <ul className="space-y-3">
                {page.notes.map((note, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary font-bold text-sm mt-2">•</span>
                    <div className="flex-1">
                      <EditableText
                        value={note}
                        onSave={(value) => updateNote(index, value)}
                        onDelete={() => deleteNote(index)}
                        isMultiline
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        </div>

        {/* Summary Section */}
        <div className="border-t p-4 bg-primary/5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Summary
          </h3>
          <EditableText
            value={document.summary}
            onSave={updateSummary}
            isMultiline
          />
        </div>
      </CardContent>
    </Card>
  );
}
