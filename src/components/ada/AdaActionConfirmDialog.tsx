/**
 * AdaActionConfirmDialog - Editable confirmation dialog for Ada AI actions
 * Shows action details with edit capability before execution
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Calendar, Clock, MapPin, CheckCircle, X, Edit2, AlertTriangle } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code?: string;
}

export interface AdaActionData {
  type: string;
  id?: string;
  title?: string;
  name?: string;
  start_iso?: string;
  end_iso?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  due_date?: string;
  exam_date?: string;
  location?: string;
  notes?: string;
  description?: string;
  course_id?: string;
  priority?: number;
  is_completed?: boolean;
  duration_minutes?: number;
  assignment_type?: string;
  exam_type?: string;
  estimated_hours?: number;
}

interface AdaActionConfirmDialogProps {
  open: boolean;
  action: AdaActionData | null;
  courses: Course[];
  onConfirm: (editedAction: AdaActionData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function getActionTitle(type: string): string {
  const titles: Record<string, string> = {
    CREATE_EVENT: 'Create Event',
    UPDATE_EVENT: 'Update Event',
    DELETE_EVENT: 'Delete Event',
    CREATE_ASSIGNMENT: 'Create Assignment',
    UPDATE_ASSIGNMENT: 'Update Assignment',
    DELETE_ASSIGNMENT: 'Delete Assignment',
    COMPLETE_ASSIGNMENT: 'Complete Assignment',
    CREATE_EXAM: 'Schedule Exam',
    UPDATE_EXAM: 'Update Exam',
    DELETE_EXAM: 'Delete Exam',
    CREATE_STUDY_SESSION: 'Schedule Study Session',
    UPDATE_STUDY_SESSION: 'Update Study Session',
    DELETE_STUDY_SESSION: 'Delete Study Session',
    CREATE_COURSE: 'Create Course',
    UPDATE_COURSE: 'Update Course',
    DELETE_COURSE: 'Delete Course',
  };
  return titles[type] || 'Confirm Action';
}

function getActionIcon(type: string) {
  if (type.includes('DELETE')) return <AlertTriangle className="h-5 w-5 text-destructive" />;
  if (type.includes('COMPLETE')) return <CheckCircle className="h-5 w-5 text-green-500" />;
  return <Edit2 className="h-5 w-5 text-primary" />;
}

export function AdaActionConfirmDialog({
  open,
  action,
  courses,
  onConfirm,
  onCancel,
  isLoading = false,
}: AdaActionConfirmDialogProps) {
  const [editedAction, setEditedAction] = useState<AdaActionData | null>(null);

  useEffect(() => {
    if (action) {
      setEditedAction({ ...action });
    }
  }, [action]);

  if (!action || !editedAction) return null;

  const isDelete = action.type.includes('DELETE');
  const isComplete = action.type === 'COMPLETE_ASSIGNMENT';
  const isCreate = action.type.startsWith('CREATE_');
  const isUpdate = action.type.startsWith('UPDATE_');

  const handleFieldChange = (field: keyof AdaActionData, value: any) => {
    setEditedAction(prev => prev ? { ...prev, [field]: value } : null);
  };

  const formatDateTimeForInput = (isoString?: string) => {
    if (!isoString) return '';
    return isoString.slice(0, 16); // YYYY-MM-DDTHH:MM
  };

  const handleConfirm = () => {
    if (editedAction) {
      onConfirm(editedAction);
    }
  };

  const entityName = editedAction.title || editedAction.name || 'this item';

  // Render different content based on action type
  const renderActionContent = () => {
    // Delete/Complete actions - just confirmation, no editing
    if (isDelete || isComplete) {
      return (
        <div className="py-4 text-center">
          <p className="text-muted-foreground">
            {isDelete 
              ? `Are you sure you want to delete "${entityName}"? This action cannot be undone.`
              : `Mark "${entityName}" as complete?`
            }
          </p>
        </div>
      );
    }

    // Create/Update actions - editable form
    return (
      <div className="space-y-4 py-4">
        {/* Title field - always shown */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={editedAction.title || editedAction.name || ''}
            onChange={(e) => handleFieldChange(editedAction.name ? 'name' : 'title', e.target.value)}
            placeholder="Enter title..."
          />
        </div>

        {/* Course selector - for assignments, exams, study sessions */}
        {(action.type.includes('ASSIGNMENT') || action.type.includes('EXAM') || action.type.includes('STUDY_SESSION')) && (
          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            <Select
              value={editedAction.course_id || ''}
              onValueChange={(value) => handleFieldChange('course_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name} {course.code ? `(${course.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date/Time fields - context dependent */}
        {(action.type.includes('EVENT') || action.type.includes('STUDY_SESSION')) && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                type="datetime-local"
                value={formatDateTimeForInput(editedAction.start_iso || editedAction.scheduled_start)}
                onChange={(e) => handleFieldChange(
                  action.type.includes('STUDY_SESSION') ? 'scheduled_start' : 'start_iso',
                  e.target.value ? new Date(e.target.value).toISOString() : ''
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Time</Label>
              <Input
                id="end"
                type="datetime-local"
                value={formatDateTimeForInput(editedAction.end_iso || editedAction.scheduled_end)}
                onChange={(e) => handleFieldChange(
                  action.type.includes('STUDY_SESSION') ? 'scheduled_end' : 'end_iso',
                  e.target.value ? new Date(e.target.value).toISOString() : ''
                )}
              />
            </div>
          </div>
        )}

        {/* Due date - for assignments */}
        {action.type.includes('ASSIGNMENT') && (
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="datetime-local"
              value={formatDateTimeForInput(editedAction.due_date)}
              onChange={(e) => handleFieldChange('due_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
            />
          </div>
        )}

        {/* Exam date - for exams */}
        {action.type.includes('EXAM') && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam_date">Exam Date & Time</Label>
              <Input
                id="exam_date"
                type="datetime-local"
                value={formatDateTimeForInput(editedAction.exam_date)}
                onChange={(e) => handleFieldChange('exam_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={editedAction.duration_minutes || 60}
                onChange={(e) => handleFieldChange('duration_minutes', parseInt(e.target.value) || 60)}
              />
            </div>
          </div>
        )}

        {/* Location - for events and exams */}
        {(action.type.includes('EVENT') || action.type.includes('EXAM')) && (
          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              value={editedAction.location || ''}
              onChange={(e) => handleFieldChange('location', e.target.value)}
              placeholder="Enter location..."
            />
          </div>
        )}

        {/* Priority - for assignments */}
        {action.type.includes('ASSIGNMENT') && (
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={String(editedAction.priority || 2)}
              onValueChange={(value) => handleFieldChange('priority', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">High</SelectItem>
                <SelectItem value="2">Medium</SelectItem>
                <SelectItem value="3">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notes/Description */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={editedAction.notes || editedAction.description || ''}
            onChange={(e) => handleFieldChange(editedAction.description !== undefined ? 'description' : 'notes', e.target.value)}
            placeholder="Add any notes..."
            rows={2}
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getActionIcon(action.type)}
            {getActionTitle(action.type)}
          </DialogTitle>
          <DialogDescription>
            {isDelete 
              ? 'This action cannot be undone.'
              : isComplete
              ? 'Confirm to mark this assignment as done.'
              : 'Review and edit the details below before confirming.'
            }
          </DialogDescription>
        </DialogHeader>

        {renderActionContent()}

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant={isDelete ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>Loading...</>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {isDelete ? 'Delete' : isComplete ? 'Complete' : 'Confirm'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
