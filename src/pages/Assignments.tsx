import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { AddAssignmentDialog } from "@/components/AddAssignmentDialog";
import { AssignmentRow } from "@/components/AssignmentRow";
import { AssignmentFilters, type AssignmentFilters as FiltersType } from "@/components/AssignmentFilters";
import { useAssignments } from "@/hooks/useAssignments";
import { useCourses } from "@/hooks/useCourses";
import { isSameDay, isBefore, startOfToday, format, isAfter, isBefore as isBeforeDate } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Assignments() {
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FiltersType>({
    status: "all",
    courseId: "all",
    search: "",
  });
  
  const { assignments, loading, refetch, updateAssignment, toggleComplete } = useAssignments();
  const { courses } = useCourses();
  const courseMap = useMemo(() => Object.fromEntries(courses.map(c => [c.id, c.name])), [courses]);
  const today = startOfToday();
  
  const ITEMS_PER_PAGE = 10;
  
  // Filter assignments
  const filteredAssignments = useMemo(() => {
    let filtered = assignments;
    
    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(a => 
        filters.status === "completed" ? a.is_completed : !a.is_completed
      );
    }
    
    // Course filter
    if (filters.courseId !== "all") {
      filtered = filtered.filter(a => a.course_id === filters.courseId);
    }
    
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(search) ||
        a.description?.toLowerCase().includes(search) ||
        courseMap[a.course_id]?.toLowerCase().includes(search)
      );
    }
    
    // Date range filters
    if (filters.dueDateFrom) {
      filtered = filtered.filter(a => 
        !isBeforeDate(new Date(a.due_date), filters.dueDateFrom!)
      );
    }
    if (filters.dueDateTo) {
      filtered = filtered.filter(a => 
        !isAfter(new Date(a.due_date), filters.dueDateTo!)
      );
    }
    
    return filtered;
  }, [assignments, filters, courseMap]);
  
  // Pagination
  const totalPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE);
  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  // Stats from all assignments
  const stats = useMemo(() => {
    const dueToday = assignments.filter(a => !a.is_completed && isSameDay(new Date(a.due_date), today)).length;
    const overdue = assignments.filter(a => !a.is_completed && isBefore(new Date(a.due_date), today)).length;
    const completed = assignments.filter(a => a.is_completed).length;
    const inProgress = assignments.length - completed;
    return { dueToday, overdue, inProgress, completed };
  }, [assignments, today]);
  
  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filters]);

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
            <div className="space-y-2">
              {assignments.slice(0, 8).map((a) => (
                <AssignmentRow 
                  key={a.id} 
                  assignment={a} 
                  onUpdate={updateAssignment}
                  onToggleComplete={toggleComplete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <AddAssignmentDialog open={open} onOpenChange={setOpen} onCreated={() => refetch()} />
    </div>
  );
}