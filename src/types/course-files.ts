/**
 * Type definitions for course files feature
 */

export type FileSourceType = 'syllabus' | 'lecture' | 'notes' | 'textbook' | 'assignment' | 'other';

export type FileStatus = 
  | 'uploading' 
  | 'uploaded' 
  | 'processing' 
  | 'indexing' 
  | 'indexed' 
  | 'ocr_failed' 
  | 'embedding_failed';

export interface CourseFile {
  id: string;
  user_id: string;
  course_id: string | null;
  file_name: string;
  file_type: string;
  file_url: string | null;
  source_type: FileSourceType;
  display_name: string | null;
  description: string | null;
  status: FileStatus;
  ocr_text: string | null;
  parsed_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Enriched fields from API
  chunk_count?: number;
  is_indexed?: boolean;
}

export interface UploadCourseFileParams {
  course_id: string;
  file_name: string;
  file_type: string;
  file_data: string; // base64 encoded
  source_type: FileSourceType;
  display_name?: string;
  description?: string;
}

export interface UploadCourseFileResponse {
  success: boolean;
  file: {
    id: string;
    file_name: string;
    file_url: string | null;
    source_type: FileSourceType;
    display_name: string | null;
    status: FileStatus;
    course_id: string;
    course_name: string;
  };
  message: string;
}

export interface GetCourseFilesResponse {
  success: boolean;
  files: CourseFile[];
  course: {
    id: string;
    name: string;
  };
}

export interface DeleteCourseFileResponse {
  success: boolean;
  deleted_file_id: string;
  file_name: string;
}

export const FILE_SOURCE_TYPE_LABELS: Record<FileSourceType, string> = {
  syllabus: 'Syllabus',
  lecture: 'Lecture Notes',
  notes: 'Study Notes',
  textbook: 'Textbook',
  assignment: 'Assignment',
  other: 'Other',
};

export const FILE_SOURCE_TYPE_ICONS: Record<FileSourceType, string> = {
  syllabus: '📋',
  lecture: '🎓',
  notes: '📝',
  textbook: '📚',
  assignment: '📄',
  other: '📎',
};

export const FILE_STATUS_LABELS: Record<FileStatus, string> = {
  uploading: 'Uploading...',
  uploaded: 'Uploaded',
  processing: 'Processing...',
  indexing: 'Indexing for AI...',
  indexed: 'Ready for AI',
  ocr_failed: 'OCR Failed',
  embedding_failed: 'Indexing Failed',
};
