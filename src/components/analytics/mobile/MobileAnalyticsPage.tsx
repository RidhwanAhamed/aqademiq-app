import { useState, useMemo } from "react";
import { Clock, Target, Flame, TrendingUp } from "lucide-react";
import { MobileAnalyticsHeader } from "./MobileAnalyticsHeader";
import { MobileTimeRangeSelector, TimeRange } from "./MobileTimeRangeSelector";
import { MobileHeroCard } from "./MobileHeroCard";
import { MobileAnalyticsSection } from "./MobileAnalyticsSection";
import { MobileStudyDistribution } from "./MobileStudyDistribution";
import { MobileAssignmentsStats } from "./MobileAssignmentsStats";
import { MobileStreakCard } from "./MobileStreakCard";
import { MobileEmptyState } from "./MobileEmptyState";

interface MobileAnalyticsPageProps {
  studySessions: any[];
  courses: any[];
  assignments: any[];
  exams: any[];
}

export function MobileAnalyticsPage({ 
  studySessions, 
  courses, 
  assignments, 
  exams 
}: MobileAnalyticsPageProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  // Check if there's any data to show
  const hasData = useMemo(() => {
    return (
      (studySessions && studySessions.length > 0) ||
      (assignments && assignments.length > 0) ||
      (courses && courses.length > 0)
    );
  }, [studySessions, assignments, courses]);

  if (!hasData) {
    return (
      <div className="flex flex-col h-full bg-background">
        <MobileAnalyticsHeader />
        <MobileEmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <MobileAnalyticsHeader />
      
      <MobileTimeRangeSelector value={timeRange} onChange={setTimeRange} />
      
      <div className="flex-1 overflow-y-auto pb-safe">
        {/* Hero KPI Card */}
        <MobileHeroCard studySessions={studySessions} timeRange={timeRange} />
        
        {/* Collapsible Sections */}
        <MobileAnalyticsSection title="Study Distribution" icon={Clock} defaultOpen>
          <MobileStudyDistribution 
            studySessions={studySessions} 
            courses={courses} 
            timeRange={timeRange} 
          />
        </MobileAnalyticsSection>

        <MobileAnalyticsSection title="Assignments" icon={Target}>
          <MobileAssignmentsStats 
            assignments={assignments} 
            timeRange={timeRange} 
          />
        </MobileAnalyticsSection>

        <MobileAnalyticsSection title="Study Streak" icon={Flame}>
          <MobileStreakCard studySessions={studySessions} />
        </MobileAnalyticsSection>

        {/* Bottom spacing for safe area */}
        <div className="h-4" />
      </div>
    </div>
  );
}
