import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, Users, GraduationCap, MapPin } from "lucide-react";

interface QuickStatsProps {
  todayClasses: number;
  weeklyStudyHours: number;
  todayAssignments: number;
  activeHolidaysCount: number;
  upcomingExams: number;
  loading: boolean;
}

export const MemoizedQuickStats = React.memo(({ 
  todayClasses, 
  weeklyStudyHours, 
  todayAssignments, 
  activeHolidaysCount, 
  upcomingExams, 
  loading 
}: QuickStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="bg-gradient-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Classes</p>
              <p className="text-2xl font-bold">{loading ? '...' : todayClasses}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weekly Hours</p>
              <p className="text-2xl font-bold">{loading ? '...' : Math.round(weeklyStudyHours)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Users className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Today</p>
              <p className="text-2xl font-bold">{loading ? '...' : todayAssignments}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <MapPin className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Holidays</p>
              <p className="text-2xl font-bold">{activeHolidaysCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <GraduationCap className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming Exams</p>
              <p className="text-2xl font-bold">{loading ? '...' : upcomingExams}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

MemoizedQuickStats.displayName = 'MemoizedQuickStats';