import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarIcon, X, ChevronDown, Filter } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);

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
    <div className="bg-card p-3 sm:p-4 rounded-lg border border-border space-y-3 sm:space-y-4">
      {/* Mobile: Collapsible filters */}
      <div className="sm:hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between gap-2">
            <Input
              placeholder="Search assignments..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="flex-1 h-12"
            />
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="h-12 px-3 flex-shrink-0">
                <Filter className="w-4 h-4 mr-1" />
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="space-y-3 pt-3">
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
                  />
                </PopoverContent>
              </Popover>

              {(filters.dueDateFrom || filters.dueDateTo) && (
                <Button variant="ghost" size="sm" onClick={clearDateFilters} className="h-12 w-12 p-0">
                  <X className="w-4 h-4" />
                </Button>
              )}
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
          <h3 className="font-medium">Filters</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Input
              placeholder="Search assignments..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>

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
    </div>
  );
}