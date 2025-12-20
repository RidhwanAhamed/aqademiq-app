import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Plus, Target, Clock, Award, FileText } from 'lucide-react';
import { AddAssignmentDialog } from './AddAssignmentDialog';
import { AddExamDialog } from './AddExamDialog';
import { CourseFilesManager } from './course-files';
import { useAssignments } from '@/hooks/useAssignments';
import { useExams } from '@/hooks/useExams';
import { format } from 'date-fns';

interface Course {
  id: string;
  name: string;
  code?: string;
  color: string;
  credits: number;
  target_grade?: string;
  progress_percentage: number;
  expected_exams?: number;
}

interface CourseDetailsProps {
  course: Course;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function CourseDetails({ course, open, onOpenChange, onEdit }: CourseDetailsProps) {
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { assignments } = useAssignments();
  const { exams } = useExams();

  const courseAssignments = assignments.filter(a => a.course_id === course.id);
  const courseExams = exams.filter(e => e.course_id === course.id);
  const completedAssignments = courseAssignments.filter(a => a.is_completed);
  const completedExams = courseExams.filter(e => e.grade_received);
  
  // Calculate progress based on both assignments and exams (matching database logic)
  const totalItems = courseAssignments.length + courseExams.length;
  const completedItems = completedAssignments.length + completedExams.length;
  const overallProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full bg-${course.color}-500`} />
              {course.name}
              {course.code && <Badge variant="outline">{course.code}</Badge>}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="work">Assignments & Exams</TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Files
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Course Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-warning" />
                      <span className="text-sm font-medium">Target Grade</span>
                    </div>
                    <div className="text-2xl font-bold">{course.target_grade || 'Not set'}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Credits</span>
                    </div>
                    <div className="text-2xl font-bold">{course.credits}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-success" />
                      <span className="text-sm font-medium">Progress</span>
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
                      <Progress value={overallProgress} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {completedItems} of {totalItems} items completed
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowAddAssignment(true)}
                  size="sm"
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Assignment
                </Button>
                <Button 
                  onClick={() => setShowAddExam(true)}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exam
                </Button>
                {onEdit && (
                  <Button 
                    onClick={onEdit}
                    size="sm"
                    variant="outline"
                  >
                    Edit Course
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* Assignments & Exams Tab */}
            <TabsContent value="work" className="space-y-6 mt-6">
              {/* Assignments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Assignments ({courseAssignments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {courseAssignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No assignments yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {courseAssignments.slice(0, 5).map(assignment => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{assignment.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge variant={assignment.is_completed ? "default" : "secondary"}>
                            {assignment.is_completed ? 'Completed' : 'Pending'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Exams */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-warning" />
                    Exams ({courseExams.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {courseExams.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No exams yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {courseExams.slice(0, 5).map(exam => (
                        <div key={exam.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{exam.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(exam.exam_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge variant={exam.grade_received ? "default" : "secondary"}>
                            {exam.grade_received || 'Scheduled'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="mt-6">
              <CourseFilesManager 
                courseId={course.id} 
                courseName={course.name}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AddAssignmentDialog
        open={showAddAssignment}
        onOpenChange={setShowAddAssignment}
        preselectedCourse={course.id}
      />

      <AddExamDialog
        open={showAddExam}
        onOpenChange={setShowAddExam}
        preselectedCourse={course.id}
      />
    </>
  );
}
