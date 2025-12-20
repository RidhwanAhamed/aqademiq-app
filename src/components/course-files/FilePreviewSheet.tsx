/**
 * File Preview Sheet Component
 * Displays file preview in a sheet with download functionality
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image as ImageIcon, FileArchive } from 'lucide-react';
import type { CourseFile } from '@/types/course-files';

interface FilePreviewSheetProps {
  file: CourseFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getPreviewType(fileType: string): 'image' | 'pdf' | 'document' | 'unsupported' {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf') return 'pdf';
  if (fileType.includes('document') || fileType === 'text/plain') return 'document';
  return 'unsupported';
}

function ImagePreview({ url, name }: { url: string; name: string }) {
  return (
    <div className="flex items-center justify-center flex-1 p-4">
      <img 
        src={url} 
        alt={name} 
        className="max-w-full max-h-[60vh] object-contain rounded-lg" 
      />
    </div>
  );
}

function PDFPreview({ url }: { url: string }) {
  return (
    <iframe 
      src={url} 
      className="w-full flex-1 min-h-[60vh] rounded-lg border-0"
      title="PDF Preview"
    />
  );
}

function DocumentFallback({ file }: { file: CourseFile }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-muted-foreground p-8">
      <FileText className="w-16 h-16 opacity-50" />
      <p className="text-center">Preview not available for this file type</p>
      <p className="text-sm text-center">{file.file_name}</p>
      <p className="text-xs">{file.file_type}</p>
    </div>
  );
}

export function FilePreviewSheet({ file, open, onOpenChange }: FilePreviewSheetProps) {
  if (!file) return null;

  const previewType = getPreviewType(file.file_type);
  const fileName = file.display_name || file.file_name;

  const handleDownload = () => {
    if (file.file_url) {
      const link = document.createElement('a');
      link.href = file.file_url;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col border-0">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-4 pr-8">
            <SheetTitle className="truncate">{fileName}</SheetTitle>
            {file.file_url && (
              <Button size="sm" onClick={handleDownload} className="flex-shrink-0">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col mt-4 min-h-0">
          {previewType === 'image' && file.file_url && (
            <ImagePreview url={file.file_url} name={fileName} />
          )}
          {previewType === 'pdf' && file.file_url && (
            <PDFPreview url={file.file_url} />
          )}
          {(previewType === 'document' || previewType === 'unsupported') && (
            <DocumentFallback file={file} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
