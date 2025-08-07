import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, GraduationCap, Award, Calendar } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import { AddCourseDialog } from "@/components/AddCourseDialog";
import { AddSemesterDialog } from "@/components/AddSemesterDialog";
import { useCourses, useSemesters } from "@/hooks/useCourses";
import { toast } from "@/hooks/use-toast";

export default function Courses() {
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddSemester, setShowAddSemester] = useState(false);
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Courses</h1>
          <p className="text-muted-foreground">Manage your academic courses</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAddSemester(true)}
            className="hidden sm:flex"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Add Semester
          </Button>
          <Button 
            onClick={() => setShowAddCourse(true)}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Course
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Courses</p>
                <p className="text-2xl font-bold">{activeCourses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Award className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <p className="text-2xl font-bold">{averageProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <GraduationCap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold">{totalCredits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No semesters state */}
      {semesters.length === 0 && (
        <Card className="bg-gradient-card">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Semesters Yet</h3>
            <p className="text-muted-foreground mb-4">
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
          <CardHeader>
            <CardTitle>Your Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {activeCourses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Courses Yet</h3>
                <p className="text-muted-foreground mb-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCourses.map((course) => (
                  <CourseCard 
                    key={course.id} 
                    course={course}
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
      <AddSemesterDialog 
        open={showAddSemester} 
        onOpenChange={setShowAddSemester} 
      />
    </div>
  );
}