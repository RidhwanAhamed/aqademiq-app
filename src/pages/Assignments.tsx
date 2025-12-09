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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your homework and projects</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto h-12 sm:h-10" 
          onClick={() => setOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Assignment
        </Button>
      </div>

      {/* Quick Stats - 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-1.5 sm:p-2 bg-warning/10 rounded-lg">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Due Today</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.dueToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-1.5 sm:p-2 bg-destructive/10 rounded-lg">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Overdue</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">In Progress</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-1.5 sm:p-2 bg-success/10 rounded-lg">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Completed</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments List - Separated by completion status */}
      {loading ? (
        <Card className="bg-gradient-card">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center py-8 sm:py-12 text-muted-foreground">Loading assignments...</div>
          </CardContent>
        </Card>
      ) : assignments.length === 0 ? (
        <Card className="bg-gradient-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Recent Assignments</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="text-center py-8 sm:py-12 text-muted-foreground px-4">
              <Target className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No assignments yet. Click "Add Assignment".</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Not Completed Assignments */}
          {assignments.filter(a => !a.is_completed).length > 0 && (
            <Card className="bg-gradient-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="divide-y divide-border">
                  {assignments.filter(a => !a.is_completed).map((a) => (
                    <AssignmentRow 
                      key={a.id} 
                      assignment={a} 
                      onUpdate={updateAssignment}
                      onToggleComplete={toggleComplete}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Completed Assignments - with scroll after 5 */}
          {assignments.filter(a => a.is_completed).length > 0 && (
            <Card className="bg-gradient-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                {assignments.filter(a => a.is_completed).length > 5 ? (
                  <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                    <div className="divide-y divide-border">
                      {assignments.filter(a => a.is_completed).map((a) => (
                        <AssignmentRow 
                          key={a.id} 
                          assignment={a} 
                          onUpdate={updateAssignment}
                          onToggleComplete={toggleComplete}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {assignments.filter(a => a.is_completed).map((a) => (
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
          )}
        </div>
      )}
      <AddAssignmentDialog open={open} onOpenChange={setOpen} onCreated={() => refetch()} />
    </div>
  );
}