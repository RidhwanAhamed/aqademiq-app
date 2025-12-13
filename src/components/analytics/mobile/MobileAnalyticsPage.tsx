import { useState } from "react";
import { MobileAnalyticsHeader } from "./MobileAnalyticsHeader";
import { MobileTimeRangeSelector, TimeRange } from "./MobileTimeRangeSelector";
import { MobileAnalyticsTabs, MobileAnalyticsTab } from "./MobileAnalyticsTabs";
import { MobileActivityTab } from "./MobileActivityTab";
import { MobilePerformanceTab } from "./MobilePerformanceTab";
import { MobileEfficiencyTab } from "./MobileEfficiencyTab";
import { MobileTimeTab } from "./MobileTimeTab";
import { MobilePlanningTab } from "./MobilePlanningTab";
import { MobileTasksTab } from "./MobileTasksTab";

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
  const [activeTab, setActiveTab] = useState<MobileAnalyticsTab>("activity");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  const renderTabContent = () => {
    switch (activeTab) {
      case "activity":
        return <MobileActivityTab studySessions={studySessions} assignments={assignments} courses={courses} timeRange={timeRange} />;
      case "performance":
        return <MobilePerformanceTab assignments={assignments} exams={exams} courses={courses} studySessions={studySessions} timeRange={timeRange} />;
      case "efficiency":
        return <MobileEfficiencyTab studySessions={studySessions} assignments={assignments} courses={courses} timeRange={timeRange} />;
      case "time":
        return <MobileTimeTab studySessions={studySessions} timeRange={timeRange} />;
      case "planning":
        return <MobilePlanningTab assignments={assignments} exams={exams} courses={courses} studySessions={studySessions} timeRange={timeRange} />;
      case "tasks":
        return <MobileTasksTab assignments={assignments} exams={exams} courses={courses} timeRange={timeRange} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <MobileAnalyticsHeader />
      <MobileAnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <MobileTimeRangeSelector value={timeRange} onChange={setTimeRange} />
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
}
