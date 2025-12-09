import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, X, ChevronDown, Filter, SlidersHorizontal } from "lucide-react";
import { format, isAfter, isBefore, startOfToday, endOfToday, subDays, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { useCourses } from "@/hooks/useCourses";
import { cn } from "@/lib/utils";

export interface AssignmentFilters {
  status: "all" | "pending" | "completed";
  courseId: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search: string;
  priority?: "all" | "1" | "2" | "3";
  assignmentType?: string;
  datePreset?: string;
  sortBy?: "due_date" | "title" | "priority" | "created_at";
  sortOrder?: "asc" | "desc";
}

interface AssignmentFiltersProps {
  filters: AssignmentFilters;
  onFiltersChange: (filters: AssignmentFilters) => void;
}

const DATE_PRESETS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This Week", value: "this_week" },
  { label: "Next Week", value: "next_week" },
  { label: "This Month", value: "this_month" },
  { label: "Past Due", value: "past_due" },
  { label: "Last 7 Days", value: "last_7_days" },
  { label: "Last 30 Days", value: "last_30_days" },
  { label: "Custom Range", value: "custom" },
];

const ASSIGNMENT_TYPES = [
  { label: "All Types", value: "all" },
  { label: "Homework", value: "homework" },
  { label: "Project", value: "project" },
  { label: "Essay", value: "essay" },
  { label: "Quiz", value: "quiz" },
  { label: "Lab", value: "lab" },
  { label: "Reading", value: "reading" },
  { label: "Presentation", value: "presentation" },
  { label: "Other", value: "other" },
];

const PRIORITY_OPTIONS = [
  { label: "All Priorities", value: "all" },
  { label: "High Priority", value: "1" },
  { label: "Medium Priority", value: "2" },
  { label: "Low Priority", value: "3" },
];

export function AssignmentFilters({ filters, onFiltersChange }: AssignmentFiltersProps) {
  const { courses } = useCourses();
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = <K extends keyof AssignmentFilters>(
    key: K,
    value: AssignmentFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const applyDatePreset = (preset: string) => {
    const today = startOfToday();
    let from: Date | undefined;
    let to: Date | undefined;

    switch (preset) {
      case "all":
        from = undefined;
        to = undefined;
        break;
      case "today":
        from = today;
        to = endOfToday();
        break;
      case "tomorrow":
        from = addDays(today, 1);
        to = addDays(endOfToday(), 1);
        break;
      case "this_week":
        from = startOfWeek(today, { weekStartsOn: 1 });
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "next_week":
        from = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
        to = addDays(endOfWeek(today, { weekStartsOn: 1 }), 7);
        break;
      case "this_month":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case "past_due":
        from = undefined;
        to = subDays(today, 1);
        break;
      case "last_7_days":
        from = subDays(today, 7);
        to = today;
        break;
      case "last_30_days":
        from = subDays(today, 30);
        to = today;
        break;
      case "custom":
        // Keep existing dates for custom
        from = filters.dueDateFrom;
        to = filters.dueDateTo;
        break;
    }

    onFiltersChange({
      ...filters,
      datePreset: preset,
      dueDateFrom: from,
      dueDateTo: to,
    });
  };

  const clearDateFilters = () => {
    onFiltersChange({
      ...filters,
      dueDateFrom: undefined,
      dueDateTo: undefined,
      datePreset: "all",
    });
  };

  const activeFilterCount = [
    filters.status !== "all",
    filters.courseId !== "all",
    filters.dueDateFrom || filters.dueDateTo,
    filters.search,
    filters.priority && filters.priority !== "all",
    filters.assignmentType && filters.assignmentType !== "all",
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  const clearAllFilters = () => {
    onFiltersChange({
      status: "all",
      courseId: "all",
      dueDateFrom: undefined,
      dueDateTo: undefined,
      search: "",
      priority: "all",
      assignmentType: "all",
      datePreset: "all",
      sortBy: "due_date",
      sortOrder: "asc",
    });
  };

  return (
    <div className="bg-card p-3 sm:p-4 rounded-lg border border-border space-y-3 sm:space-y-4">
      {/* Mobile: Collapsible filters */}
      <div className="sm:hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between gap-2">
            <Input
              placeholder="Search by title, description..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="flex-1 h-12"
            />
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="h-12 px-3 flex-shrink-0 relative">
                <Filter className="w-4 h-4 mr-1" />
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                {activeFilterCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="space-y-3 pt-3">
            {/* Status Filter */}
            <Select value={filters.status} onValueChange={(value: any) => updateFilter("status", value)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignments</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Course Filter */}
            <Select value={filters.courseId} onValueChange={(value) => updateFilter("courseId", value)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={filters.priority || "all"} onValueChange={(value) => updateFilter("priority", value as any)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={filters.assignmentType || "all"} onValueChange={(value) => updateFilter("assignmentType", value)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Assignment Type" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Preset */}
            <Select value={filters.datePreset || "all"} onValueChange={applyDatePreset}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Due Date" />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            {filters.datePreset === "custom" && (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 h-12 justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.dueDateFrom ? format(filters.dueDateFrom, "MMM d") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dueDateFrom}
                      onSelect={(date) => updateFilter("dueDateFrom", date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 h-12 justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.dueDateTo ? format(filters.dueDateTo, "MMM d") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dueDateTo}
                      onSelect={(date) => updateFilter("dueDateTo", date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {(filters.dueDateFrom || filters.dueDateTo) && (
                  <Button variant="ghost" size="sm" onClick={clearDateFilters} className="h-12 w-12 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Sort Options */}
            <div className="flex gap-2">
              <Select value={filters.sortBy || "due_date"} onValueChange={(value: any) => updateFilter("sortBy", value)}>
                <SelectTrigger className="flex-1 h-12">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date">Due Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="created_at">Date Created</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.sortOrder || "asc"} onValueChange={(value: any) => updateFilter("sortOrder", value)}>
                <SelectTrigger className="w-28 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Asc</SelectItem>
                  <SelectItem value="desc">Desc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="w-full h-11">
                <X className="w-4 h-4 mr-1" />
                Clear All Filters
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Desktop: Inline filters */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Filters</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs"
            >
              {showAdvanced ? "Less options" : "More options"}
              <ChevronDown className={cn("w-3 h-3 ml-1 transition-transform", showAdvanced && "rotate-180")} />
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Primary Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Search by title, description, course..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>

          {/* Status */}
          <Select value={filters.status} onValueChange={(value: any) => updateFilter("status", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Course */}
          <Select value={filters.courseId} onValueChange={(value) => updateFilter("courseId", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Preset */}
          <Select value={filters.datePreset || "all"} onValueChange={applyDatePreset}>
            <SelectTrigger>
              <SelectValue placeholder="Due Date" />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range Row */}
        {filters.datePreset === "custom" && (
          <div className="flex gap-2 mt-3 max-w-md">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  {filters.dueDateFrom ? format(filters.dueDateFrom, "MMM d, yyyy") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dueDateFrom}
                  onSelect={(date) => updateFilter("dueDateFrom", date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <span className="flex items-center text-muted-foreground">→</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  {filters.dueDateTo ? format(filters.dueDateTo, "MMM d, yyyy") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dueDateTo}
                  onSelect={(date) => updateFilter("dueDateTo", date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {(filters.dueDateFrom || filters.dueDateTo) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Advanced Filters Row */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border">
            {/* Priority */}
            <Select value={filters.priority || "all"} onValueChange={(value) => updateFilter("priority", value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type */}
            <Select value={filters.assignmentType || "all"} onValueChange={(value) => updateFilter("assignmentType", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={filters.sortBy || "due_date"} onValueChange={(value: any) => updateFilter("sortBy", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="created_at">Date Created</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={filters.sortOrder || "asc"} onValueChange={(value: any) => updateFilter("sortOrder", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Active Filter Pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
            {filters.status !== "all" && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter("status", "all")}>
                Status: {filters.status}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
            {filters.courseId !== "all" && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter("courseId", "all")}>
                Course: {courses.find(c => c.id === filters.courseId)?.name || "Unknown"}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
            {filters.priority && filters.priority !== "all" && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter("priority", "all")}>
                Priority: {PRIORITY_OPTIONS.find(p => p.value === filters.priority)?.label}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
            {filters.assignmentType && filters.assignmentType !== "all" && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter("assignmentType", "all")}>
                Type: {filters.assignmentType}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
            {filters.datePreset && filters.datePreset !== "all" && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => applyDatePreset("all")}>
                Date: {DATE_PRESETS.find(d => d.value === filters.datePreset)?.label}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
            {filters.search && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter("search", "")}>
                Search: "{filters.search}"
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
