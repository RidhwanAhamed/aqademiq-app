import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { useCourses } from "@/hooks/useCourses";

export interface AssignmentFilters {
  status: "all" | "pending" | "completed";
  courseId: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search: string;
}

interface AssignmentFiltersProps {
  filters: AssignmentFilters;
  onFiltersChange: (filters: AssignmentFilters) => void;
}

export function AssignmentFilters({ filters, onFiltersChange }: AssignmentFiltersProps) {
  const { courses } = useCourses();

  const updateFilter = <K extends keyof AssignmentFilters>(
    key: K,
    value: AssignmentFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearDateFilters = () => {
    onFiltersChange({
      ...filters,
      dueDateFrom: undefined,
      dueDateTo: undefined,
    });
  };

  const hasActiveFilters = filters.status !== "all" || 
    filters.courseId !== "all" || 
    filters.dueDateFrom || 
    filters.dueDateTo || 
    filters.search;

  const clearAllFilters = () => {
    onFiltersChange({
      status: "all",
      courseId: "all",
      dueDateFrom: undefined,
      dueDateTo: undefined,
      search: "",
    });
  };

  return (
    <div className="bg-card p-4 rounded-lg border border-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <Input
            placeholder="Search assignments..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div>
          <Select value={filters.status} onValueChange={(value: any) => updateFilter("status", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Course Filter */}
        <div>
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
        </div>

        {/* Date Range */}
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <CalendarIcon className="w-4 h-4 mr-1" />
                {filters.dueDateFrom ? format(filters.dueDateFrom, "MMM d") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dueDateFrom}
                onSelect={(date) => updateFilter("dueDateFrom", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <CalendarIcon className="w-4 h-4 mr-1" />
                {filters.dueDateTo ? format(filters.dueDateTo, "MMM d") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dueDateTo}
                onSelect={(date) => updateFilter("dueDateTo", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(filters.dueDateFrom || filters.dueDateTo) && (
            <Button variant="ghost" size="sm" onClick={clearDateFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}