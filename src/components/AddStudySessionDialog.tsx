import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import { useExams } from "@/hooks/useExams";
import { useUserStats } from "@/hooks/useUserStats";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, BookOpen, Target, Calendar } from "lucide-react";
import { format } from "date-fns";

interface AddStudySessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddStudySessionDialog({ open, onOpenChange }: AddStudySessionDialogProps) {
  const { user } = useAuth();
  const { courses } = useCourses();
  const { assignments } = useAssignments();
  const { exams } = useExams();
  const { updateStudyStreak, refetch } = useUserStats();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    startTime: format(new Date(), "HH:mm"),
    endTime: format(new Date(Date.now() + 60 * 60 * 1000), "HH:mm"), // 1 hour later
    courseId: "",
    assignmentId: "",
    examId: "",
    notes: "",
    associationType: "none" as "none" | "course" | "assignment" | "exam"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Validate times
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.startDate}T${formData.endTime}`);
      
      if (endDateTime <= startDateTime) {
        toast({
          title: "Invalid time range",
          description: "End time must be after start time",
          variant: "destructive"
        });
        return;
      }

      if (startDateTime > new Date()) {
        toast({
          title: "Invalid date",
          description: "Cannot log study sessions in the future",
          variant: "destructive"
        });
        return;
      }

      // Check for overlapping sessions
      const { data: existingSessions, error: checkError } = await supabase
        .from('study_sessions')
        .select('scheduled_start, scheduled_end')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('scheduled_start', `${formData.startDate}T00:00:00`)
        .lte('scheduled_end', `${formData.startDate}T23:59:59`);

      if (checkError) throw checkError;

      const hasOverlap = existingSessions?.some(session => {
        const sessionStart = new Date(session.scheduled_start);
        const sessionEnd = new Date(session.scheduled_end);
        
        return (
          (startDateTime >= sessionStart && startDateTime < sessionEnd) ||
          (endDateTime > sessionStart && endDateTime <= sessionEnd) ||
          (startDateTime <= sessionStart && endDateTime >= sessionEnd)
        );
      });

      if (hasOverlap) {
        toast({
          title: "Session overlap",
          description: "This session overlaps with an existing study session",
          variant: "destructive"
        });
        return;
      }

      // Create study session data
      const sessionData: any = {
        user_id: user.id,
        title: formData.title,
        scheduled_start: startDateTime.toISOString(),
        scheduled_end: endDateTime.toISOString(),
        actual_start: startDateTime.toISOString(),
        actual_end: endDateTime.toISOString(),
        status: 'completed',
        notes: formData.notes || null
      };

      // Add associations based on type
      if (formData.associationType === "course" && formData.courseId) {
        sessionData.course_id = formData.courseId;
      } else if (formData.associationType === "assignment" && formData.assignmentId) {
        sessionData.assignment_id = formData.assignmentId;
      } else if (formData.associationType === "exam" && formData.examId) {
        sessionData.exam_id = formData.examId;
      }

      const { error } = await supabase
        .from('study_sessions')
        .insert(sessionData);

      if (error) throw error;

      // Calculate duration for user stats update
      const durationHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
      
      // Update user stats directly
      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('total_study_hours')
        .eq('user_id', user.id)
        .single();

      await supabase
        .from('user_stats')
        .upsert({
          user_id: user.id,
          total_study_hours: (currentStats?.total_study_hours || 0) + durationHours,
          last_study_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        });
      
      // Update study streak
      await updateStudyStreak();
      
      // Refresh data
      await refetch();

      toast({
        title: "Study session logged!",
        description: `Successfully logged ${((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60)).toFixed(1)} hours of study time`,
      });

      // Reset form
      setFormData({
        title: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        startTime: format(new Date(), "HH:mm"),
        endTime: format(new Date(Date.now() + 60 * 60 * 1000), "HH:mm"),
        courseId: "",
        assignmentId: "",
        examId: "",
        notes: "",
        associationType: "none"
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating study session:', error);
      toast({
        title: "Error",
        description: "Failed to log study session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDuration = () => {
    const start = new Date(`${formData.startDate}T${formData.startTime}`);
    const end = new Date(`${formData.startDate}T${formData.endTime}`);
    if (end <= start) return "0.0";
    return ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1);
  };

  const filteredAssignments = assignments?.filter(a => 
    formData.courseId ? a.course_id === formData.courseId : true
  ) || [];

  const filteredExams = exams?.filter(e => 
    formData.courseId ? e.course_id === formData.courseId : true
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Log Study Session
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Session Title</Label>
              <Input
                id="title"
                placeholder="e.g., Math homework, Physics review"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.startDate}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Duration: {getDuration()} hours</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Associate with (optional)</Label>
              <Select 
                value={formData.associationType} 
                onValueChange={(value: any) => setFormData({ 
                  ...formData, 
                  associationType: value,
                  courseId: "",
                  assignmentId: "",
                  examId: ""
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="course">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Course
                    </div>
                  </SelectItem>
                  <SelectItem value="assignment">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Assignment
                    </div>
                  </SelectItem>
                  <SelectItem value="exam">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Exam
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.associationType === "course" && (
              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                     {courses?.map((course) => (
                       <SelectItem key={course.id} value={course.id}>
                         {course.name}
                       </SelectItem>
                     )) || []}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.associationType === "assignment" && (
              <>
                <div className="space-y-2">
                  <Label>Course (optional filter)</Label>
                  <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value, assignmentId: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All courses</SelectItem>
                       {courses?.map((course) => (
                         <SelectItem key={course.id} value={course.id}>
                           {course.name}
                         </SelectItem>
                       )) || []}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assignment</Label>
                  <Select value={formData.assignmentId} onValueChange={(value) => setFormData({ ...formData, assignmentId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an assignment" />
                    </SelectTrigger>
                    <SelectContent>
                       {filteredAssignments.length > 0 ? (
                         filteredAssignments.map((assignment) => (
                           <SelectItem key={assignment.id} value={assignment.id}>
                             {assignment.title}
                           </SelectItem>
                         ))
                       ) : (
                         <SelectItem value="" disabled>No assignments available</SelectItem>
                       )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formData.associationType === "exam" && (
              <>
                <div className="space-y-2">
                  <Label>Course (optional filter)</Label>
                  <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value, examId: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All courses</SelectItem>
                       {courses?.map((course) => (
                         <SelectItem key={course.id} value={course.id}>
                           {course.name}
                         </SelectItem>
                       )) || []}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Exam</Label>
                  <Select value={formData.examId} onValueChange={(value) => setFormData({ ...formData, examId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an exam" />
                    </SelectTrigger>
                    <SelectContent>
                       {filteredExams.length > 0 ? (
                         filteredExams.map((exam) => (
                           <SelectItem key={exam.id} value={exam.id}>
                             {exam.title}
                           </SelectItem>
                         ))
                       ) : (
                         <SelectItem value="" disabled>No exams available</SelectItem>
                       )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="What did you study? How did it go?"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Logging..." : "Log Study Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}