import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, GraduationCap, Award, Calendar } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import { AddCourseDialog } from "@/components/AddCourseDialog";
import { EditCourseDialog } from "@/components/EditCourseDialog";
import { AddSemesterDialog } from "@/components/AddSemesterDialog";
import { useCourses, useSemesters, Course } from "@/hooks/useCourses";
import { toast } from "@/hooks/use-toast";

export default function Courses() {
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const { courses, loading, deleteCourse } = useCourses();
  const { semesters } = useSemesters();

  const handleDeleteCourse = async (courseId: string) => {
    const success = await deleteCourse(courseId);
    if (success) {
      toast({
        title: "Course deleted",
        description: "The course has been removed from your list.",
      });
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
  };

  // Calculate stats
  const activeCourses = courses.filter(course => course.is_active);
  const totalCredits = activeCourses.reduce((sum, course) => sum + course.credits, 0);
  const averageProgress = activeCourses.length > 0 
    ? Math.round(activeCourses.reduce((sum, course) => sum + course.progress_percentage, 0) / activeCourses.length)
    : 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Courses</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your academic courses</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setShowAddSemester(true)}
            className="flex-1 sm:flex-none text-sm"
            size="sm"
          >
            <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Add </span>Semester
          </Button>
          <Button 
            onClick={() => setShowAddCourse(true)}
            className="bg-gradient-primary hover:opacity-90 flex-1 sm:flex-none"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Add </span>Course
          </Button>
        </div>
      </div>

      {/* Quick Stats - 3 column grid on mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-gradient-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-center sm:space-x-3 text-center sm:text-left">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg mb-1 sm:mb-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Courses</p>
                <p className="text-lg sm:text-2xl font-bold">{activeCourses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-center sm:space-x-3 text-center sm:text-left">
              <div className="p-1.5 sm:p-2 bg-success/10 rounded-lg mb-1 sm:mb-0">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Progress</p>
                <p className="text-lg sm:text-2xl font-bold">{averageProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-center sm:space-x-3 text-center sm:text-left">
              <div className="p-1.5 sm:p-2 bg-accent/10 rounded-lg mb-1 sm:mb-0">
                <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Credits</p>
                <p className="text-lg sm:text-2xl font-bold">{totalCredits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No semesters state */}
      {semesters.length === 0 && (
        <Card className="bg-gradient-card">
          <CardContent className="p-6 sm:p-8 text-center">
            <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-base sm:text-lg font-medium mb-2">No Semesters Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first semester to start adding courses.
            </p>
            <Button 
              onClick={() => setShowAddSemester(true)}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Semester
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Courses Grid */}
      {semesters.length > 0 && (
        <Card className="bg-gradient-card">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">Your Courses</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {activeCourses.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-base sm:text-lg font-medium mb-2">No Courses Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first course to get started.
                </p>
                <Button 
                  onClick={() => setShowAddCourse(true)}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Course
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {activeCourses.map((course) => (
                  <CourseCard 
                    key={course.id} 
                    course={course}
                    onEdit={handleEditCourse}
                    onDelete={handleDeleteCourse}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AddCourseDialog 
        open={showAddCourse} 
        onOpenChange={setShowAddCourse} 
      />
      <EditCourseDialog
        open={!!editingCourse}
        onOpenChange={(open) => !open && setEditingCourse(null)}
        course={editingCourse}
      />
      <AddSemesterDialog 
        open={showAddSemester} 
        onOpenChange={setShowAddSemester} 
      />
    </div>
  );
}