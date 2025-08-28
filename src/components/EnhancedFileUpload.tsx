import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Loader2,
  RefreshCw,
  Eye,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface FileUploadState {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'ocr_completed' | 'parsed' | 'error';
  progress: number;
  error?: string;
  ocrText?: string;
  parsedData?: any;
  retryCount: number;
}

interface EnhancedFileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  onFilePreview?: (file: File) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxSizeInMB?: number;
  supportedFormats?: string[];
  className?: string;
}

const SUPPORTED_FORMATS = {
  'application/pdf': { ext: 'PDF', icon: FileText, color: 'text-red-600', bg: 'bg-red-50', description: 'PDF Documents' },
  'image/jpeg': { ext: 'JPG', icon: Image, color: 'text-blue-600', bg: 'bg-blue-50', description: 'JPEG Images' },
  'image/png': { ext: 'PNG', icon: Image, color: 'text-green-600', bg: 'bg-green-50', description: 'PNG Images' },
  'text/plain': { ext: 'TXT', icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', description: 'Text Files' },
  'application/msword': { ext: 'DOC', icon: File, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Word Documents' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
    ext: 'DOCX', icon: File, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Word Documents' 
  }
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_RETRY_COUNT = 3;

export function EnhancedFileUpload({
  onFileUpload,
  onFilePreview,
  disabled = false,
  maxFiles = 5,
  maxSizeInMB = 10,
  supportedFormats = Object.keys(SUPPORTED_FORMATS),
  className
}: EnhancedFileUploadProps) {
  const { toast } = useToast();
  const [uploadStates, setUploadStates] = useState<FileUploadState[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advanced file validation
  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxSizeInMB * 1024 * 1024) {
      return { isValid: false, error: `File size exceeds ${maxSizeInMB}MB limit` };
    }

    // Check file type
    if (!supportedFormats.includes(file.type)) {
      return { isValid: false, error: `File type ${file.type} is not supported` };
    }

    // Check file name for security
    const fileName = file.name.toLowerCase();
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    if (suspiciousExtensions.some(ext => fileName.endsWith(ext))) {
      return { isValid: false, error: 'File type not allowed for security reasons' };
    }

    // Basic content validation (file signature check would go here)
    return { isValid: true };
  }, [maxSizeInMB, supportedFormats]);

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setIsDragActive(false);

    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      const errorMessage = errors.map((e: any) => e.message).join(', ');
      toast({
        title: 'Upload Error',
        description: `${file.name}: ${errorMessage}`,
        variant: 'destructive'
      });
    });

    // Process accepted files
    for (const file of acceptedFiles.slice(0, maxFiles)) {
      const validation = validateFile(file);
      
      if (!validation.isValid) {
        toast({
          title: 'Validation Error',
          description: `${file.name}: ${validation.error}`,
          variant: 'destructive'
        });
        continue;
      }

      // Check for duplicates
      const isDuplicate = uploadStates.some(state => 
        state.file.name === file.name && 
        state.file.size === file.size &&
        state.status !== 'error'
      );

      if (isDuplicate) {
        toast({
          title: 'Duplicate File',
          description: `${file.name} is already uploaded or being processed`,
          variant: 'destructive'
        });
        continue;
      }

      const uploadState: FileUploadState = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'uploading',
        progress: 0,
        retryCount: 0
      };

      setUploadStates(prev => [...prev, uploadState]);
      
      try {
        await processFileUpload(uploadState);
      } catch (error) {
        console.error('Upload error:', error);
      }
    }
  }, [uploadStates, maxFiles, validateFile, toast]);

  const { getRootProps, getInputProps, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    accept: supportedFormats.reduce((acc, format) => ({ ...acc, [format]: [] }), {}),
    maxFiles,
    maxSize: maxSizeInMB * 1024 * 1024,
    disabled,
    multiple: maxFiles > 1
  });

  const processFileUpload = async (uploadState: FileUploadState) => {
    try {
      // Update progress during upload simulation
      for (let progress = 0; progress <= 100; progress += 20) {
        setUploadStates(prev => prev.map(state => 
          state.id === uploadState.id 
            ? { ...state, progress, status: 'uploading' }
            : state
        ));
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Update to processing status
      setUploadStates(prev => prev.map(state => 
        state.id === uploadState.id 
          ? { ...state, status: 'processing', progress: 100 }
          : state
      ));

      // Call the actual upload function
      await onFileUpload(uploadState.file);

      // Update to completed status
      setUploadStates(prev => prev.map(state => 
        state.id === uploadState.id 
          ? { ...state, status: 'parsed', progress: 100 }
          : state
      ));

      toast({
        title: 'Upload Complete',
        description: `${uploadState.file.name} has been processed successfully`,
      });

    } catch (error) {
      console.error('File processing error:', error);
      
      setUploadStates(prev => prev.map(state => 
        state.id === uploadState.id 
          ? { 
              ...state, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed',
              retryCount: state.retryCount + 1
            }
          : state
      ));

      toast({
        title: 'Processing Error',
        description: `Failed to process ${uploadState.file.name}. ${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: 'destructive'
      });
    }
  };

  const retryUpload = async (uploadState: FileUploadState) => {
    if (uploadState.retryCount >= MAX_RETRY_COUNT) {
      toast({
        title: 'Max Retries Exceeded',
        description: 'Please try uploading a different file or contact support',
        variant: 'destructive'
      });
      return;
    }

    setUploadStates(prev => prev.map(state => 
      state.id === uploadState.id 
        ? { ...state, status: 'uploading', progress: 0, error: undefined }
        : state
    ));

    await processFileUpload(uploadState);
  };

  const removeFile = (uploadId: string) => {
    setUploadStates(prev => prev.filter(state => state.id !== uploadId));
  };

  const previewFile = (file: File) => {
    if (onFilePreview) {
      onFilePreview(file);
    } else {
      // Default preview behavior
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
    }
  };

  const getFileIcon = (file: File) => {
    const format = SUPPORTED_FORMATS[file.type as keyof typeof SUPPORTED_FORMATS];
    return format?.icon || File;
  };

  const getFileInfo = (file: File) => {
    return SUPPORTED_FORMATS[file.type as keyof typeof SUPPORTED_FORMATS] || {
      ext: 'FILE',
      icon: File,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      description: 'Unknown File'
    };
  };

  const dropzoneClass = cn(
    "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300",
    "hover:border-primary/50 hover:bg-primary/5",
    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
    {
      "border-primary bg-primary/10": isDragAccept,
      "border-destructive bg-destructive/10": isDragReject,
      "border-muted-foreground/25": !isDragActive && !isDragAccept && !isDragReject,
      "cursor-not-allowed opacity-50": disabled
    },
    className
  );

  return (
    <div className="space-y-4">
      {/* Enhanced Drag-Drop Zone */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-0">
          <div {...getRootProps()} className={dropzoneClass}>
            <input {...getInputProps()} ref={fileInputRef} />
            
            <div className="flex flex-col items-center gap-4">
              <div className={cn(
                "p-4 rounded-full transition-all duration-300",
                isDragAccept ? "bg-primary/20 text-primary" : 
                isDragReject ? "bg-destructive/20 text-destructive" :
                "bg-muted text-muted-foreground"
              )}>
                <Upload className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">
                  {isDragActive ? (
                    isDragAccept ? "Drop files here" : "File type not supported"
                  ) : "Drag & drop files here"}
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  or <button 
                    type="button" 
                    className="text-primary hover:underline font-medium focus:outline-none focus:underline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                  >
                    browse files
                  </button>
                </p>
                
                <p className="text-xs text-muted-foreground">
                  Supports PDF, JPG, PNG, TXT, DOC, DOCX • Max {maxSizeInMB}MB per file
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Progress */}
      {uploadStates.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <File className="w-4 h-4" />
              Upload Progress ({uploadStates.length})
            </h4>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {uploadStates.map((uploadState) => {
                const fileInfo = getFileInfo(uploadState.file);
                const IconComponent = fileInfo.icon;
                
                return (
                  <div key={uploadState.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn("p-2 rounded", fileInfo.bg)}>
                          <IconComponent className={cn("w-4 h-4", fileInfo.color)} />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{uploadState.file.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{(uploadState.file.size / 1024 / 1024).toFixed(1)}MB</span>
                            <Badge variant="outline" className="text-xs">
                              {fileInfo.ext}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {uploadState.status === 'error' && uploadState.retryCount < MAX_RETRY_COUNT && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryUpload(uploadState)}
                            className="h-7 w-7 p-0"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => previewFile(uploadState.file)}
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadState.id)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    {uploadState.status === 'uploading' && (
                      <Progress value={uploadState.progress} className="h-2" />
                    )}
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {uploadState.status === 'uploading' && (
                        <Badge variant="secondary" className="text-xs">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Uploading {uploadState.progress}%
                        </Badge>
                      )}
                      
                      {uploadState.status === 'processing' && (
                        <Badge variant="secondary" className="text-xs">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Processing with AI
                        </Badge>
                      )}
                      
                      {uploadState.status === 'ocr_completed' && (
                        <Badge variant="secondary" className="text-xs">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Parsing schedule
                        </Badge>
                      )}
                      
                      {uploadState.status === 'parsed' && (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Complete
                        </Badge>
                      )}
                      
                      {uploadState.status === 'error' && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Error {uploadState.retryCount > 0 && `(Retry ${uploadState.retryCount})`}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Error Message */}
                    {uploadState.error && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {uploadState.error}
                          {uploadState.retryCount < MAX_RETRY_COUNT && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => retryUpload(uploadState)}
                              className="h-auto p-0 ml-2 text-xs underline"
                            >
                              Try Again
                            </Button>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supported Formats Info */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Supported File Formats
          </h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(SUPPORTED_FORMATS).map(([mimeType, info]) => (
              <div key={mimeType} className="flex items-center gap-2 p-2 rounded-lg bg-card border">
                <info.icon className={cn("w-4 h-4", info.color)} />
                <span className="text-sm font-medium">{info.ext}</span>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Maximum file size: {maxSizeInMB}MB • Multiple files supported up to {maxFiles} files
          </p>
        </CardContent>
      </Card>
    </div>
  );
}