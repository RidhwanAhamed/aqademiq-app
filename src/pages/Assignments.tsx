import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { AddAssignmentDialog } from "@/components/AddAssignmentDialog";
import { useAssignments } from "@/hooks/useAssignments";
import { useCourses } from "@/hooks/useCourses";
import { isSameDay, isBefore, startOfToday, format } from "date-fns";

export default function Assignments() {
  const [open, setOpen] = useState(false);
  const { assignments, loading, refetch } = useAssignments();
  const { courses } = useCourses();
  const courseMap = useMemo(() => Object.fromEntries(courses.map(c => [c.id, c.name])), [courses]);
  const today = startOfToday();
  const stats = useMemo(() => {
    const dueToday = assignments.filter(a => !a.is_completed && isSameDay(new Date(a.due_date), today)).length;
    const overdue = assignments.filter(a => !a.is_completed && isBefore(new Date(a.due_date), today)).length;
    const completed = assignments.filter(a => a.is_completed).length;
    const inProgress = assignments.length - completed;
    return { dueToday, overdue, inProgress, completed };
  }, [assignments, today]);
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-muted-foreground">Track your homework and projects</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Assignment
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold">{stats.dueToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Target className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments List */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle>Recent Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No assignments yet. Click “Add Assignment”.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {assignments.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">{a.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Due {format(new Date(a.due_date), "PPP")} • {courseMap[a.course_id] || "Course"}
                    </p>
                  </div>
                  {a.is_completed ? (
                    <span className="text-success text-sm">Completed</span>
                  ) : (
                    <span className="text-warning text-sm">Pending</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <AddAssignmentDialog open={open} onOpenChange={setOpen} onCreated={() => refetch()} />
    </div>
  );
}