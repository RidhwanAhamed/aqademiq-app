import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, File, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File | null, content: string) => void;
  selectedFile: File | null;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function FileUpload({ onFileSelect, selectedFile }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          setError("File is too large. Maximum size is 20MB.");
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setError("Invalid file type. Please upload PDF, DOCX, TXT, or MD files.");
        } else {
          setError("File could not be uploaded.");
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setIsReading(true);
        try {
          const content = await readFileContent(file);
          onFileSelect(file, content);
        } catch (err) {
          setError("Failed to read file content.");
          onFileSelect(null, "");
        } finally {
          setIsReading(false);
        }
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
  });

  const removeFile = () => {
    onFileSelect(null, "");
    setError(null);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileName.endsWith(".docx")) return <FileText className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  if (selectedFile) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg border border-border">
          {getFileIcon(selectedFile.name)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={removeFile}
            className="h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/30",
          isReading && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        <Upload
          className={cn(
            "h-10 w-10 mx-auto mb-3 transition-colors",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )}
        />
        {isReading ? (
          <p className="text-sm text-muted-foreground">Reading file...</p>
        ) : isDragActive ? (
          <p className="text-sm text-primary font-medium">Drop the file here</p>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground mb-1">
              Drag & drop a file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOCX, TXT, or MD • Max 20MB
            </p>
          </>
        )}
      </div>
      
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
