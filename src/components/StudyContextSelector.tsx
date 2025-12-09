import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BookOpen, FileText, GraduationCap, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { Course } from '@/hooks/useCourses';
import type { Assignment } from '@/hooks/useAssignments';

interface Exam {
  id: string;
  title: string;
  course_id: string;
  exam_date: string;
  course?: { name: string; color: string };
}

export interface StudyContext {
  type: 'general' | 'course' | 'assignment' | 'exam';
  courseId?: string;
  assignmentId?: string;
  examId?: string;
  label: string;
}

interface StudyContextSelectorProps {
  studyContext: StudyContext;
  onContextChange: (context: StudyContext) => void;
  courses: Course[];
  assignments: Assignment[];
  exams: Exam[];
  disabled?: boolean;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const contextTypes = [
  { type: 'general' as const, label: 'General', icon: Sparkles },
  { type: 'course' as const, label: 'Course', icon: BookOpen },
  { type: 'assignment' as const, label: 'Assignment', icon: FileText },
  { type: 'exam' as const, label: 'Exam', icon: GraduationCap },
];

export const StudyContextSelector = memo(function StudyContextSelector({
  studyContext,
  onContextChange,
  courses,
  assignments,
  exams,
  disabled = false,
  isCollapsed,
  onCollapsedChange
}: StudyContextSelectorProps) {
  
  const handleTypeChange = (type: StudyContext['type']) => {
    if (type === 'general') {
      onContextChange({ type: 'general', label: 'General Study' });
    } else {
      onContextChange({ ...studyContext, type, courseId: undefined, assignmentId: undefined, examId: undefined, label: '' });
    }
  };

  const handleCourseChange = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    onContextChange({
      type: 'course',
      courseId,
      label: course?.name || 'Course'
    });
  };

  const handleAssignmentChange = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    onContextChange({
      type: 'assignment',
      assignmentId,
      courseId: assignment?.course_id,
      label: assignment?.title || 'Assignment'
    });
  };

  const handleExamChange = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    onContextChange({
      type: 'exam',
      examId,
      courseId: exam?.course_id,
      label: exam?.title || 'Exam'
    });
  };

  // Filter to only show pending assignments
  const pendingAssignments = assignments.filter(a => !a.is_completed);

  // Filter to only show upcoming exams
  const upcomingExams = exams.filter(e => new Date(e.exam_date) >= new Date());

  const getContextIcon = () => {
    const ctx = contextTypes.find(c => c.type === studyContext.type);
    return ctx ? <ctx.icon className="w-4 h-4" /> : null;
  };

  return (
    <Card className="bg-gradient-card">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => onCollapsedChange(!open)}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <div>
                <span className="font-medium text-sm sm:text-base">What are you studying?</span>
                {isCollapsed && studyContext.label && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {getContextIcon()}
                    <span className="ml-1">{studyContext.label}</span>
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* Type Selection - Grid of buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {contextTypes.map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  variant={studyContext.type === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTypeChange(type)}
                  disabled={disabled}
                  className={`h-12 sm:h-10 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                    studyContext.type === type ? 'bg-gradient-primary' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{label}</span>
                </Button>
              ))}
            </div>

            {/* Conditional Selectors */}
            {studyContext.type === 'course' && (
              <Select
                value={studyContext.courseId || ''}
                onValueChange={handleCourseChange}
                disabled={disabled}
              >
                <SelectTrigger className="w-full h-12 sm:h-10">
                  <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.length === 0 ? (
                    <SelectItem value="none" disabled>No courses available</SelectItem>
                  ) : (
                    courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: `var(--${course.color}, hsl(var(--primary)))` }}
                          />
                          {course.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}

            {studyContext.type === 'assignment' && (
              <Select
                value={studyContext.assignmentId || ''}
                onValueChange={handleAssignmentChange}
                disabled={disabled}
              >
                <SelectTrigger className="w-full h-12 sm:h-10">
                  <SelectValue placeholder="Select an assignment..." />
                </SelectTrigger>
                <SelectContent>
                  {pendingAssignments.length === 0 ? (
                    <SelectItem value="none" disabled>No pending assignments</SelectItem>
                  ) : (
                    pendingAssignments.map(assignment => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        <div className="flex flex-col">
                          <span>{assignment.title}</span>
                          <span className="text-xs text-muted-foreground">
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}

            {studyContext.type === 'exam' && (
              <Select
                value={studyContext.examId || ''}
                onValueChange={handleExamChange}
                disabled={disabled}
              >
                <SelectTrigger className="w-full h-12 sm:h-10">
                  <SelectValue placeholder="Select an exam..." />
                </SelectTrigger>
                <SelectContent>
                  {upcomingExams.length === 0 ? (
                    <SelectItem value="none" disabled>No upcoming exams</SelectItem>
                  ) : (
                    upcomingExams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>
                        <div className="flex flex-col">
                          <span>{exam.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {exam.course?.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}

            {/* Disabled notice */}
            {disabled && (
              <p className="text-xs text-muted-foreground text-center">
                Cannot change context while timer is running
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});
