import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Trophy, Clock, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface AcademicGoal {
  id: string;
  course_id: string;
  goal_type: string;
  goal_title: string;
  goal_description: string;
  target_value: number;
  current_value: number;
  target_date: string;
  is_achieved: boolean;
  achieved_at: string | null;
  priority: number;
  is_active: boolean;
}

interface AcademicGoalsPanelProps {
  goals: AcademicGoal[];
  courses: Array<{ id: string; name: string; color: string }>;
  onCreateGoal: (goalData: Partial<AcademicGoal>) => void;
  onUpdateGoal: (goalId: string, updates: Partial<AcademicGoal>) => void;
}

export function AcademicGoalsPanel({ goals, courses, onCreateGoal, onUpdateGoal }: AcademicGoalsPanelProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_title: '',
    goal_description: '',
    goal_type: 'gpa_target',
    course_id: '',
    target_value: 0,
    target_date: '',
    priority: 2
  });

  const handleCreateGoal = () => {
    onCreateGoal(newGoal);
    setNewGoal({
      goal_title: '',
      goal_description: '',
      goal_type: 'gpa_target',
      course_id: '',
      target_value: 0,
      target_date: '',
      priority: 2
    });
    setIsCreateDialogOpen(false);
  };

  const getProgressPercentage = (goal: AcademicGoal) => {
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1: return <Badge variant="destructive">High</Badge>;
      case 2: return <Badge variant="secondary">Medium</Badge>;
      case 3: return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="secondary">Medium</Badge>;
    }
  };

  const getGoalTypeIcon = (goalType: string) => {
    switch (goalType) {
      case 'gpa_target': return <Target className="w-4 h-4" />;
      case 'study_hours': return <Clock className="w-4 h-4" />;
      case 'assignment_completion': return <Trophy className="w-4 h-4" />;
      case 'exam_score': return <AlertTriangle className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const isGoalOverdue = (goal: AcademicGoal) => {
    return new Date(goal.target_date) < new Date() && !goal.is_achieved;
  };

  const activeGoals = goals.filter(goal => goal.is_active && !goal.is_achieved);
  const achievedGoals = goals.filter(goal => goal.is_achieved);

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Academic Goals</h3>
          <p className="text-sm text-muted-foreground">
            Track your progress towards academic objectives
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Academic Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal_title">Goal Title</Label>
                <Input
                  id="goal_title"
                  value={newGoal.goal_title}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, goal_title: e.target.value }))}
                  placeholder="e.g., Achieve 3.5 GPA this semester"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="goal_description">Description</Label>
                <Textarea
                  id="goal_description"
                  value={newGoal.goal_description}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, goal_description: e.target.value }))}
                  placeholder="Optional description of your goal..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal_type">Goal Type</Label>
                  <Select value={newGoal.goal_type} onValueChange={(value) => setNewGoal(prev => ({ ...prev, goal_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpa_target">GPA Target</SelectItem>
                      <SelectItem value="study_hours">Study Hours</SelectItem>
                      <SelectItem value="assignment_completion">Assignment Completion</SelectItem>
                      <SelectItem value="exam_score">Exam Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course_id">Course</Label>
                  <Select value={newGoal.course_id} onValueChange={(value) => setNewGoal(prev => ({ ...prev, course_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_value">Target Value</Label>
                  <Input
                    id="target_value"
                    type="number"
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target_value: parseFloat(e.target.value) }))}
                    placeholder="e.g., 3.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_date">Target Date</Label>
                  <Input
                    id="target_date"
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={newGoal.priority.toString()} onValueChange={(value) => setNewGoal(prev => ({ ...prev, priority: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">High Priority</SelectItem>
                    <SelectItem value="2">Medium Priority</SelectItem>
                    <SelectItem value="3">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateGoal} className="w-full bg-gradient-primary hover:opacity-90">
                Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Goals */}
      <div className="space-y-4">
        <h4 className="font-medium">Active Goals ({activeGoals.length})</h4>
        {activeGoals.length === 0 ? (
          <Card className="bg-gradient-card">
            <CardContent className="p-6 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active goals yet. Create your first goal to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeGoals.map(goal => {
              const course = courses.find(c => c.id === goal.course_id);
              const progress = getProgressPercentage(goal);
              const isOverdue = isGoalOverdue(goal);
              
              return (
                <Card key={goal.id} className={`bg-gradient-card ${isOverdue ? 'border-destructive/50' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getGoalTypeIcon(goal.goal_type)}
                        <div>
                          <CardTitle className="text-base">{goal.goal_title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {course?.name || 'General'} • Target: {goal.target_date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(goal.priority)}
                        {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {goal.goal_description && (
                        <p className="text-sm text-muted-foreground">{goal.goal_description}</p>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{goal.current_value} / {goal.target_value}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {progress.toFixed(1)}% complete
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Achieved Goals */}
      {achievedGoals.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Achieved Goals ({achievedGoals.length})
          </h4>
          <div className="grid gap-4">
            {achievedGoals.slice(0, 3).map(goal => {
              const course = courses.find(c => c.id === goal.course_id);
              
              return (
                <Card key={goal.id} className="bg-gradient-card border-success/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-success" />
                        <div>
                          <p className="font-medium">{goal.goal_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {course?.name || 'General'} • Achieved {goal.achieved_at ? new Date(goal.achieved_at).toLocaleDateString() : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-success text-success-foreground">
                        Completed
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}