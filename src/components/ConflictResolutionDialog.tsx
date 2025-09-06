import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, FileText, Merge, ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface ConflictData {
  id: string;
  entity_type: string;
  conflict_type: string;
  local_data: any;
  google_data: any;
  created_at: string;
}

interface ConflictResolutionDialogProps {
  conflict: ConflictData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (conflictId: string, resolution: 'prefer_local' | 'prefer_google' | 'merge', mergedData?: any) => void;
}

export function ConflictResolutionDialog({ 
  conflict, 
  open, 
  onOpenChange, 
  onResolve 
}: ConflictResolutionDialogProps) {
  const [selectedResolution, setSelectedResolution] = useState<'prefer_local' | 'prefer_google' | 'merge' | null>(null);
  const [mergedData, setMergedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('compare');

  if (!conflict) return null;

  const handleResolve = () => {
    if (!selectedResolution) return;
    
    onResolve(
      conflict.id, 
      selectedResolution, 
      selectedResolution === 'merge' ? mergedData : undefined
    );
    
    // Reset state
    setSelectedResolution(null);
    setMergedData(null);
    setActiveTab('compare');
    onOpenChange(false);
  };

  const generateSmartMerge = () => {
    const local = conflict.local_data;
    const google = conflict.google_data;
    
    // Smart merge logic based on field types
    const merged = { ...local };
    
    // Title: Use the longer, more descriptive one
    if (google.summary && google.summary.length > (local.title?.length || 0)) {
      merged.title = google.summary;
    }
    
    // Description: Combine if different
    if (google.description && google.description !== local.description) {
      merged.description = local.description 
        ? `${local.description}\n\n[From Google]: ${google.description}`
        : google.description;
    }
    
    // Location: Prefer Google (usually more accurate)
    if (google.location) {
      merged.location = google.location;
    }
    
    // Time: Use more recent update
    const googleTime = google.start?.dateTime || google.start?.date;
    if (googleTime) {
      if (conflict.entity_type === 'assignment') {
        merged.due_date = googleTime;
      } else if (conflict.entity_type === 'exam') {
        merged.exam_date = googleTime;
      }
    }
    
    setMergedData(merged);
    setSelectedResolution('merge');
  };

  const renderFieldComparison = (label: string, localValue: any, googleValue: any, field: string) => {
    const isDifferent = localValue !== googleValue;
    
    return (
      <div className={`space-y-2 p-3 rounded-lg ${isDifferent ? 'bg-muted' : 'bg-background'}`}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{label}</span>
          {isDifferent && <Badge variant="outline" className="text-xs">Different</Badge>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowLeft className="w-3 h-3" />
              Local Version
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              {localValue ? String(localValue) : <span className="text-muted-foreground italic">Not set</span>}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowRight className="w-3 h-3" />
              Google Version
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
              {googleValue ? String(googleValue) : <span className="text-muted-foreground italic">Not set</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5 text-orange-500" />
            Resolve Sync Conflict
          </DialogTitle>
          <DialogDescription>
            Changes were made to the same {conflict.entity_type.replace('_', ' ')} in both systems. 
            Choose how to resolve this conflict.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compare">Compare Changes</TabsTrigger>
            <TabsTrigger value="resolution">Choose Resolution</TabsTrigger>
            <TabsTrigger value="merge" disabled={!mergedData}>Review Merge</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="compare" className="space-y-4 mt-0">
              <div className="space-y-4">
                {renderFieldComparison(
                  "Title", 
                  conflict.local_data.title || conflict.local_data.name,
                  conflict.google_data.summary,
                  "title"
                )}
                
                {renderFieldComparison(
                  "Description", 
                  conflict.local_data.description,
                  conflict.google_data.description,
                  "description"
                )}
                
                {renderFieldComparison(
                  "Location", 
                  conflict.local_data.location,
                  conflict.google_data.location,
                  "location"
                )}

                {conflict.entity_type === 'assignment' && renderFieldComparison(
                  "Due Date",
                  conflict.local_data.due_date ? format(new Date(conflict.local_data.due_date), 'PPP p') : null,
                  conflict.google_data.start?.dateTime ? format(new Date(conflict.google_data.start.dateTime), 'PPP p') : null,
                  "due_date"
                )}

                {conflict.entity_type === 'exam' && (
                  <>
                    {renderFieldComparison(
                      "Exam Date",
                      conflict.local_data.exam_date ? format(new Date(conflict.local_data.exam_date), 'PPP p') : null,
                      conflict.google_data.start?.dateTime ? format(new Date(conflict.google_data.start.dateTime), 'PPP p') : null,
                      "exam_date"
                    )}
                    
                    {renderFieldComparison(
                      "Duration",
                      conflict.local_data.duration_minutes ? `${conflict.local_data.duration_minutes} minutes` : null,
                      conflict.google_data.end?.dateTime && conflict.google_data.start?.dateTime 
                        ? `${Math.round((new Date(conflict.google_data.end.dateTime).getTime() - new Date(conflict.google_data.start.dateTime).getTime()) / 60000)} minutes`
                        : null,
                      "duration"
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="resolution" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedResolution === 'prefer_local' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-border hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedResolution('prefer_local')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
                      {selectedResolution === 'prefer_local' && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">Keep Local Version</h4>
                      <p className="text-sm text-muted-foreground">
                        Use the version from your local app and update Google Calendar to match.
                      </p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedResolution === 'prefer_google' 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-border hover:border-green-300'
                  }`}
                  onClick={() => setSelectedResolution('prefer_google')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-green-500 flex items-center justify-center">
                      {selectedResolution === 'prefer_google' && (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">Keep Google Version</h4>
                      <p className="text-sm text-muted-foreground">
                        Use the version from Google Calendar and update your local app to match.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Separator />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2">
                    <span className="text-xs text-muted-foreground">or</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg border-2 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Merge className="w-5 h-5 text-orange-600" />
                      <div>
                        <h4 className="font-medium">Smart Merge</h4>
                        <p className="text-sm text-muted-foreground">
                          Automatically combine the best parts of both versions.
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={generateSmartMerge}
                      className="w-full"
                    >
                      Generate Smart Merge
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="merge" className="space-y-4 mt-0">
              {mergedData && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <Merge className="w-4 h-4" />
                    <span className="font-medium">Merged Result</span>
                  </div>
                  
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 space-y-3">
                    <div>
                      <span className="text-sm font-medium">Title:</span>
                      <div className="mt-1 p-2 bg-background rounded border">
                        {mergedData.title || 'No title'}
                      </div>
                    </div>
                    
                    {mergedData.description && (
                      <div>
                        <span className="text-sm font-medium">Description:</span>
                        <div className="mt-1 p-2 bg-background rounded border">
                          {mergedData.description}
                        </div>
                      </div>
                    )}
                    
                    {mergedData.location && (
                      <div>
                        <span className="text-sm font-medium">Location:</span>
                        <div className="mt-1 p-2 bg-background rounded border">
                          {mergedData.location}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <Separator />

        <div className="flex justify-between items-center pt-4">
          <div className="text-xs text-muted-foreground">
            Conflict detected on {format(new Date(conflict.created_at), 'PPP p')}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolve}
              disabled={!selectedResolution}
              className="bg-gradient-primary hover:opacity-90"
            >
              Resolve Conflict
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}