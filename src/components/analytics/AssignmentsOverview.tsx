import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, format, subWeeks } from "date-fns";
import { Target, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface AssignmentsOverviewProps {
  assignments: any[];
  courses: any[];
}

interface DateRange {
  start: Date;
  end: Date;
  preset: string;
}

const presets = [
  {
    label: "Past Week",
    range: () => {
      const now = new Date();
      return { start: subWeeks(now, 1), end: now };
    },
  },
  {
    label: "Past Month",
    range: () => {
      const now = new Date();
      return { start: subWeeks(now, 4), end: now };
    },
  },
  {
    label: "Past 3 Months",
    range: () => {
      const now = new Date();
      return { start: subWeeks(now, 12), end: now };
    },
  },
  {
    label: "All Time",
    range: () => {
      const now = new Date();
      return { start: new Date(2020, 0, 1), end: now };
    },
  },
];

export function AssignmentsOverview({ assignments, courses }: AssignmentsOverviewProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [range, setRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      start: subWeeks(now, 1),
      end: now,
      preset: "Past Week",
    };
  });

  // Filter assignments based on course and date range
  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const dueDate = new Date(assignment.due_date);
      const matchCourse = selectedCourse === "ALL" || assignment.course_id === selectedCourse;
      const matchDate = dueDate >= range.start && dueDate <= range.end;
      return matchCourse && matchDate;
    });
  }, [assignments, selectedCourse, range]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredAssignments.length;
    const completed = filteredAssignments.filter(a => a.is_completed).length;
    const pending = total - completed;
    const overdue = filteredAssignments.filter(a => 
      !a.is_completed && new Date(a.due_date) < new Date()
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, overdue, completionRate };
  }, [filteredAssignments]);

  const handlePresetChange = (preset: typeof presets[0]) => {
    const newRange = preset.range();
    setRange({
      start: newRange.start,
      end: newRange.end,
      preset: preset.label,
    });
  };

  const allCourses = [
    { id: "ALL", name: "All Courses" },
    ...courses.map((course) => ({ id: course.id, name: course.name })),
  ];

  return (
    <Card className="bg-gradient-card w-full min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Assignments Overview
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {format(range.start, "MMM d")} - {format(range.end, "MMM d")}
          </Badge>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
          {/* Course Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Course:</span>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full sm:w-40 h-8 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Presets */}
          <div className="flex gap-1 flex-wrap w-full sm:w-auto">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant={range.preset === preset.label ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetChange(preset)}
                className="text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {/* Total Assignments */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total</span>
            </div>
            <div className="text-3xl font-bold text-primary">
              {stats.total}
            </div>
            <div className="text-xs text-muted-foreground">
              assignments
            </div>
          </div>

          {/* Completed Assignments */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-muted-foreground">Completed</span>
            </div>
            <div className="text-3xl font-bold text-success">
              {stats.completed}
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.completionRate}% completion rate
            </div>
          </div>

          {/* Pending Assignments */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              <span className="text-sm font-medium text-muted-foreground">Pending</span>
            </div>
            <div className="text-3xl font-bold text-warning">
              {stats.pending}
            </div>
            <div className="text-xs text-muted-foreground">
              not completed
            </div>
          </div>

          {/* Overdue Assignments */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="text-sm font-medium text-muted-foreground">Overdue</span>
            </div>
            <div className="text-3xl font-bold text-destructive">
              {stats.overdue}
            </div>
            <div className="text-xs text-muted-foreground">
              past due date
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completion Progress</span>
              <span className="font-medium">{stats.completionRate}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.total === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Assignments Found</p>
            <p className="text-sm">
              No assignments match the selected filters for this period.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

