import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Calendar, Target, Zap } from "lucide-react";
import { CourseCard } from "./CourseCard";
import { TodayTimeline } from "./TodayTimeline";
import { QuickStats } from "./QuickStats";
import { AddAssignmentDialog } from "./AddAssignmentDialog";

const mockCourses = [
  { id: "1", name: "Calculus II", color: "math", progress: 75, tasks: 3 },
  { id: "2", name: "Physics", color: "science", progress: 60, tasks: 5 },
  { id: "3", name: "English Lit", color: "english", progress: 85, tasks: 2 },
  { id: "4", name: "History", color: "history", progress: 40, tasks: 4 },
];

const mockUpcoming = [
  { title: "Physics Lab Report", due: "Tomorrow", course: "Physics" },
  { title: "Essay Draft", due: "Friday", course: "English Lit" },
  { title: "Problem Set 7", due: "Monday", course: "Calculus II" },
];

export function Dashboard() {
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                StudyFlow AI
              </h1>
              <p className="text-muted-foreground">Your intelligent study companion</p>
            </div>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-primary hover:opacity-90 shadow-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Assignment
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <QuickStats />

            {/* Today's Timeline */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TodayTimeline />
              </CardContent>
            </Card>

            {/* Courses Overview */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Course Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockCourses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Study Streak */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="w-5 h-5 text-warning" />
                  Study Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-warning">7</div>
                  <p className="text-sm text-muted-foreground">days in a row</p>
                  <div className="mt-4 flex justify-center space-x-1">
                    {[...Array(7)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-3 h-3 rounded-full bg-warning"
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockUpcoming.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.course}</p>
                    </div>
                    <span className="text-xs bg-primary-muted text-primary px-2 py-1 rounded-full">
                      {item.due}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="bg-gradient-card shadow-card border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-primary-muted rounded-lg">
                    <p className="text-sm text-primary font-medium">Productivity Tip</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You're most productive between 2-4 PM. Consider scheduling difficult tasks during this time.
                    </p>
                  </div>
                  <div className="p-3 bg-warning-muted rounded-lg">
                    <p className="text-sm text-warning font-medium">Schedule Alert</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your Physics deadline is approaching. Consider breaking it into smaller tasks.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AddAssignmentDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />
    </div>
  );
}