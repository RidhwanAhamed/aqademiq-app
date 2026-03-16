import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subWeeks } from "date-fns";
import { Target, CheckCircle, Clock, AlertTriangle, ArrowUpRight, Rocket, ShieldCheck, Umbrella } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

  // Calculate statistics & Insights
  const stats = useMemo(() => {
    const total = filteredAssignments.length;
    const completed = filteredAssignments.filter(a => a.is_completed).length;
    const pending = total - completed;
    const overdue = filteredAssignments.filter(a =>
      !a.is_completed && new Date(a.due_date) < new Date()
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    let insight = "Clear tasks to unlock free time.";
    let statusColor = "text-muted-foreground";

    if (completionRate > 90) {
      insight = "Mission Accomplished. You are completely on top of your workload.";
      statusColor = "text-emerald-500";
    } else if (completionRate > 70) {
      insight = "Strong velocity. You're clearing major hurdles efficiently.";
      statusColor = "text-blue-500";
    } else if (overdue > 0) {
      insight = "Critical Alert: Overdue tasks are creating backend pressure.";
      statusColor = "text-rose-500";
    } else {
      insight = "Steady pace. Reducing pending tasks will free up your weekend.";
      statusColor = "text-amber-500";
    }

    return { total, completed, pending, overdue, completionRate, insight, statusColor };
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
    <Card className="bg-gradient-to-br from-card/50 to-muted/20 border-border/50 backdrop-blur-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow group">
      <CardHeader className="pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="w-5 h-5 text-primary" />
            Mission Control
          </CardTitle>
          <div className="flex gap-1.5">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant={range.preset === preset.label ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handlePresetChange(preset)}
                className={`h-7 px-3 text-xs rounded-full ${range.preset === preset.label ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Course Filter */}
        <div className="w-full">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full h-8 text-xs sm:text-sm bg-background/50 border-border/40 hover:bg-background/80 transition-colors">
              <SelectValue placeholder="Select Course" />
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
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 pt-2 gap-4">
        {/* Main Status Cards Grid */}
        <div className="grid grid-cols-2 gap-3 flex-1">

          {/* Clearance Rate (Primary Metric) */}
          <div className="col-span-2 relative bg-background/40 border border-border/30 rounded-xl p-4 flex items-center justify-between overflow-hidden">
            <div className="z-10">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">Clearance Rate</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black ${stats.statusColor}`}>{stats.completionRate}%</span>
                <span className="text-sm font-medium text-muted-foreground">velocity</span>
              </div>
            </div>
            <div className="h-16 w-16 rounded-full border-4 border-muted flex items-center justify-center bg-background/50">
              <span className="text-2xl">{stats.completionRate >= 100 ? "Use" : stats.completionRate >= 50 ? "⚡" : "🚧"}</span>
            </div>
            {/* Progress Bar Background */}
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary/50 to-secondary/50 transition-all duration-1000" style={{ width: `${stats.completionRate}%` }} />
          </div>

          {/* Pending / Overdue Visuals */}
          <div className="relative bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex flex-col justify-between group-hover:bg-amber-500/10 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">Queue</span>
              <Clock className="w-3 h-3 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{stats.pending}</p>
            <p className="text-[10px] text-amber-600/70">Tasks Remaining</p>
          </div>

          <div className="relative bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 flex flex-col justify-between group-hover:bg-rose-500/10 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase text-rose-600 tracking-wider">Critical</span>
              <AlertTriangle className="w-3 h-3 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">{stats.overdue}</p>
            <p className="text-[10px] text-rose-600/70">Late Items</p>
          </div>
        </div>

        {/* Insight Footer */}
        <div className="bg-secondary/20 rounded-lg p-3 border border-border/40 flex gap-3 items-center">
          <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Mission Status</p>
            <p className="text-xs text-muted-foreground leading-tight">{stats.insight}</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
