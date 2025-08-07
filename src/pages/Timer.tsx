import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";

export default function Timer() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Study Timer</h1>
          <p className="text-muted-foreground">Focus with Pomodoro technique</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timer */}
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-center">Pomodoro Timer</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="text-6xl font-mono font-bold text-primary">
              25:00
            </div>
            <div className="text-lg text-muted-foreground">
              Focus Session
            </div>
            <div className="flex justify-center space-x-4">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90">
                <Play className="w-5 h-5 mr-2" />
                Start
              </Button>
              <Button size="lg" variant="outline">
                <Pause className="w-5 h-5 mr-2" />
                Pause
              </Button>
              <Button size="lg" variant="outline">
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle>Today's Focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Sessions Completed</span>
              <span className="font-bold text-2xl">4</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Focus Time</span>
              <span className="font-bold text-2xl">2h 30m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Focus Score</span>
              <span className="font-bold text-2xl text-success">9/10</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Study Sessions */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Pomodoro timer will be implemented in Section 7</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}