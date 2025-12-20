/**
 * Course Files Manager Component
 * Main component for managing files uploaded to a course
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileUp, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  Brain,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { useCourseFiles } from '@/hooks/useCourseFiles';
import { CourseFileUpload } from './CourseFileUpload';
import { 
  FILE_SOURCE_TYPE_LABELS, 
  FILE_SOURCE_TYPE_ICONS,
  FILE_STATUS_LABELS,
  type CourseFile,
  type FileStatus,
} from '@/types/course-files';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CourseFilesManagerProps {
  courseId: string;
  courseName: string;
}

function getStatusIcon(status: FileStatus) {
  switch (status) {
    case 'indexed':
      return <CheckCircle className="w-4 h-4 text-success" />;
    case 'ocr_failed':
    case 'embedding_failed':
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    case 'uploading':
    case 'processing':
    case 'indexing':
      return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
    default:
      return <FileText className="w-4 h-4 text-muted-foreground" />;
  }
}

function getStatusVariant(status: FileStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'indexed':
      return 'default';
    case 'ocr_failed':
    case 'embedding_failed':
      return 'destructive';
    case 'uploading':
    case 'processing':
    case 'indexing':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function CourseFilesManager({ courseId, courseName }: CourseFilesManagerProps) {
  const [showUpload, setShowUpload] = useState(false);
  const { 
    files, 
    isLoading, 
    isUploading, 
    fetchFiles, 
    deleteFile, 
    reindexFile 
  } = useCourseFiles({ courseId });

  const indexedCount = files.filter(f => f.is_indexed).length;
  const processingCount = files.filter(f => 
    ['uploading', 'processing', 'indexing'].includes(f.status)
  ).length;

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="w-4 h-4" />
            <span>{indexedCount} files indexed for AI</span>
          </div>
          {processingCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {processingCount} processing
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchFiles()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowUpload(!showUpload)}
          >
            <FileUp className="w-4 h-4 mr-2" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <CourseFileUpload 
          courseId={courseId}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Files List */}
      {isLoading && files.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">No files uploaded</h3>
              <p className="text-sm mb-4">
                Upload your syllabus, lecture notes, or study materials to let Ada AI help you study.
              </p>
              <Button onClick={() => setShowUpload(true)}>
                <FileUp className="w-4 h-4 mr-2" />
                Upload Your First File
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  {/* File Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xl">
                      {FILE_SOURCE_TYPE_ICONS[file.source_type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">
                          {file.display_name || file.file_name}
                        </h4>
                        {getStatusIcon(file.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{FILE_SOURCE_TYPE_LABELS[file.source_type]}</span>
                        <span>•</span>
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        {file.is_indexed && (
                          <>
                            <span>•</span>
                            <span>{file.chunk_count} chunks</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(file.status)}>
                      {FILE_STATUS_LABELS[file.status]}
                    </Badge>
                    
                    {file.file_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(file.file_url!, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}

                    {(file.status === 'ocr_failed' || file.status === 'embedding_failed') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => reindexFile(file.id)}
                        title="Re-index file"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete file?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{file.display_name || file.file_name}" 
                            and remove it from Ada AI's knowledge. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteFile(file.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Info */}
      {files.length > 0 && indexedCount > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">AI-Ready Materials</p>
                <p className="text-muted-foreground">
                  Ask Ada AI questions about your {courseName} materials. She can reference your 
                  uploaded syllabus, notes, and study materials to give you personalized answers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
