// Single page of Cornell Notes
export interface CornellNotePage {
  pageNumber: number;
  keywords: string[];      // 5-8 keywords/questions per page
  notes: string[];         // 6-12 detailed note points per page
}

// Complete multi-page document
export interface CornellNoteDocument {
  title: string;
  date: string;
  topic: string;
  totalPages: number;
  pages: CornellNotePage[];
  summary: string;         // Global summary covering all pages
  sourceType: 'topic' | 'file';
  sourceFileName?: string;
}

// Depth level for generation - controls page count and detail
export type DepthLevel = 'brief' | 'standard' | 'comprehensive';

// Request/Response types for edge function
export interface GenerateNotesRequest {
  topic?: string;
  fileContent?: string;
  fileName?: string;
  filePrompt?: string;     // ChatGPT-style custom instructions
  depthLevel: DepthLevel;
}

export interface GenerateNotesResponse {
  success: boolean;
  data?: CornellNoteDocument;
  error?: string;
}

// Legacy single-page type for backwards compatibility
export interface CornellNote {
  title: string;
  date: string;
  keywords: string[];
  notes: string[];
  summary: string;
}
