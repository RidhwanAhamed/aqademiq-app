import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { AddAssignmentDialog } from "@/components/AddAssignmentDialog";
import { AssignmentRow } from "@/components/AssignmentRow";
import { AssignmentFilters, type AssignmentFilters as FiltersType } from "@/components/AssignmentFilters";
import { useAssignments } from "@/hooks/useAssignments";
import { useCourses } from "@/hooks/useCourses";
import { isSameDay, isBefore, startOfToday, isAfter, isBefore as isBeforeDate, compareAsc, compareDesc } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Assignments() {
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FiltersType>({
    status: "all",
    courseId: "all",
    search: "",
    priority: "all",
    assignmentType: "all",
    datePreset: "all",
    sortBy: "due_date",
    sortOrder: "asc",
  });
  
  const { assignments, loading, refetch, updateAssignment, toggleComplete } = useAssignments();
  const { courses } = useCourses();
  const courseMap = useMemo(() => Object.fromEntries(courses.map(c => [c.id, c.name])), [courses]);
  const today = startOfToday();
  
  const ITEMS_PER_PAGE = 15;
  
  // Filter and sort assignments
  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments];
    
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
    
    // Priority filter
    if (filters.priority && filters.priority !== "all") {
      const priorityNum = parseInt(filters.priority);
      filtered = filtered.filter(a => a.priority === priorityNum);
    }
    
    // Assignment type filter
    if (filters.assignmentType && filters.assignmentType !== "all") {
      filtered = filtered.filter(a => a.assignment_type === filters.assignmentType);
    }
    
    // Search filter (search in title, description, notes, and course name)
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(search) ||
        a.description?.toLowerCase().includes(search) ||
        a.notes?.toLowerCase().includes(search) ||
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
    
    // Sort assignments
    const sortBy = filters.sortBy || "due_date";
    const sortOrder = filters.sortOrder || "asc";
    
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "due_date":
          comparison = compareAsc(new Date(a.due_date), new Date(b.due_date));
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "priority":
          comparison = (a.priority || 2) - (b.priority || 2);
          break;
        case "created_at":
          comparison = compareAsc(
            new Date(a.created_at || Date.now()),
            new Date(b.created_at || Date.now())
          );
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === "desc" ? -comparison : comparison;
    });
    
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
    return { dueToday, overdue, inProgress, completed, total: assignments.length };
  }, [assignments, today]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {filteredAssignments.length} of {stats.total} assignments
          </p>
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

      {/* Filters */}
      <AssignmentFilters filters={filters} onFiltersChange={setFilters} />

      {/* Assignments List */}
      <Card className="bg-gradient-card">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl">
              {filters.status === "completed" ? "Completed Assignments" : 
               filters.status === "pending" ? "Pending Assignments" : 
               "All Assignments"}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredAssignments.length} result{filteredAssignments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">Loading assignments...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground px-4">
              <Target className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              {assignments.length === 0 ? (
                <p className="text-sm sm:text-base">No assignments yet. Click "Add Assignment" to get started.</p>
              ) : (
                <p className="text-sm sm:text-base">No assignments match your filters. Try adjusting or clearing filters.</p>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {paginatedAssignments.map((a) => (
                  <AssignmentRow 
                    key={a.id} 
                    assignment={a} 
                    onUpdate={updateAssignment}
                    onToggleComplete={toggleComplete}
                  />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAssignments.length)} of {filteredAssignments.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      <AddAssignmentDialog open={open} onOpenChange={setOpen} onCreated={() => refetch()} />
    </div>
  );
}
