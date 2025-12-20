/**
 * Course File Upload Component
 * Handles file selection, type selection, and upload
 */
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  X, 
  FileText,
  Loader2,
} from 'lucide-react';
import { useCourseFiles } from '@/hooks/useCourseFiles';
import { 
  FILE_SOURCE_TYPE_LABELS, 
  FILE_SOURCE_TYPE_ICONS,
  type FileSourceType,
} from '@/types/course-files';

interface CourseFileUploadProps {
  courseId: string;
  onClose: () => void;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export function CourseFileUpload({ courseId, onClose }: CourseFileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<FileSourceType>('other');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  
  const { uploadFile, isUploading } = useCourseFiles({ courseId, autoFetch: false });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setDisplayName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension for display name
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  const handleSubmit = async () => {
    if (!selectedFile) return;

    const result = await uploadFile(
      selectedFile,
      sourceType,
      displayName || undefined,
      description || undefined
    );

    if (result) {
      onClose();
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setDisplayName('');
    setDescription('');
    setSourceType('other');
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        {!selectedFile ? (
          /* Dropzone */
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium mb-1">
              {isDragActive ? 'Drop your file here' : 'Drag & drop a file here'}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Word, Text, or Images • Max 20MB
            </p>
          </div>
        ) : (
          /* File selected - show form */
          <div className="space-y-4">
            {/* Selected file preview */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="w-8 h-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearSelection}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* File type selector */}
            <div className="space-y-2">
              <Label htmlFor="source-type">File Type</Label>
              <Select
                value={sourceType}
                onValueChange={(value) => setSourceType(value as FileSourceType)}
                disabled={isUploading}
              >
                <SelectTrigger id="source-type">
                  <SelectValue placeholder="Select file type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FILE_SOURCE_TYPE_LABELS) as FileSourceType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <span>{FILE_SOURCE_TYPE_ICONS[type]}</span>
                        <span>{FILE_SOURCE_TYPE_LABELS[type]}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Display name */}
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name (optional)</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Week 1 Lecture Notes"
                disabled={isUploading}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the file contents..."
                rows={2}
                disabled={isUploading}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isUploading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isUploading || !selectedFile}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Index
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
