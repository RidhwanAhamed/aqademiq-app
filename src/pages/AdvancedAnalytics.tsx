// README: AdvancedAnalytics displays DB-backed study metrics via GET /api/courses,
// GET /api/assignments, GET /api/study-sessions, and GET /api/exams. Each endpoint should
// return arrays of records with ids, course references, timestamps, and status fields so
// hooks in `src/hooks` can hydrate this page once real APIs replace the mock services.

// Analytics page orchestrates insight segments; backend integration swaps the hooks'
// mock services with TODO API endpoints defined in `src/services/api`.

import { useMemo, useState } from "react";
import { useCourses } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useExams } from "@/hooks/useExams";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  ClipboardCheck,
  Clock3,
  Gauge,
  Layers3,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// New DB-driven analytics components
import { StudyHoursDistribution } from "@/components/analytics/StudyHoursDistribution";
import { AssignmentsOverview } from "@/components/analytics/AssignmentsOverview";
import { AssignmentCompletionRateChart } from "@/components/analytics/AssignmentCompletionRateChart";
import { DailyStudyTimeChart } from "@/components/analytics/DailyStudyTimeChart";
import { StudyStreakProgress } from "@/components/analytics/StudyStreakProgress";
import { UpcomingTasks } from "@/components/analytics/UpcomingTasks";
import { LateSubmissionsChart } from "@/components/analytics/LateSubmissionsChart";

// Additional advanced analytics components (DB-driven)
import { GradeTrendAnalysis } from "@/components/analytics/GradeTrendAnalysis";
import { StudyEfficiencyMetrics } from "@/components/analytics/StudyEfficiencyMetrics";
import { CoursePerformanceComparison } from "@/components/analytics/CoursePerformanceComparison";
import { StudyScheduleOptimization } from "@/components/analytics/StudyScheduleOptimization";
import { WorkloadDistributionAnalysis } from "@/components/analytics/WorkloadDistributionAnalysis";

// Mobile-optimized analytics
import { MobileAnalyticsPage } from "@/components/analytics/mobile";

// Mobile abbreviated labels
const mobileLabels: Record<string, string> = {
  "study-activity": "Activity",
  "performance-trends": "Trends",
  "efficiency": "Efficiency",
  "time-tracking": "Time",
  "planning": "Planning",
  "tasks-compliance": "Tasks",
};

export default function Analytics() {
  const { courses } = useCourses();
  const { assignments } = useAssignments();
  const { studySessions, loading } = useStudySessions();
  const { exams } = useExams();
  const isMobile = useIsMobile();

  const analyticsSegments = useMemo(
    () => [
      {
        id: "study-activity",
        title: "Study Activity & Assignment Health",
        icon: Activity,
        description:
          "Monitor where your focus hours go, which courses need attention, and how assignments trend.",
        content: (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">
            <StudyHoursDistribution studySessions={studySessions} courses={courses} />
            <AssignmentsOverview assignments={assignments} courses={courses} />
          </div>
        ),
      },
      {
        id: "performance-trends",
        title: "Performance Trends",
        icon: Gauge,
        description:
          "Track grades and compare course outcomes so you can act before exams or project deadlines.",
        content: (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">
            <GradeTrendAnalysis assignments={assignments} exams={exams} courses={courses} />
            <CoursePerformanceComparison
              courses={courses}
              assignments={assignments}
              exams={exams}
              studySessions={studySessions}
            />
          </div>
        ),
      },
      {
        id: "efficiency",
        title: "Efficiency & Completion",
        icon: BrainCircuit,
        description:
          "Understand how consistently you are studying and where completion rates drop off.",
        content: (
          <div className="space-y-4 sm:space-y-6">
            <StudyEfficiencyMetrics
              studySessions={studySessions}
              assignments={assignments}
              courses={courses}
            />
            <AssignmentCompletionRateChart assignments={assignments} courses={courses} />
          </div>
        ),
      },
      {
        id: "time-tracking",
        title: "Time Tracking & Habits",
        icon: Clock3,
        description:
          "Visualize your daily cadence and streaks to keep habits intact even during busy weeks.",
        content: (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">
            <DailyStudyTimeChart studySessions={studySessions} />
            <StudyStreakProgress studySessions={studySessions} loading={loading} />
          </div>
        ),
      },
      {
        id: "planning",
        title: "Planning & Workload",
        icon: Layers3,
        description:
          "Balance upcoming tasks with realistic workload distribution before conflicts surface.",
        content: (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">
            <StudyScheduleOptimization
              studySessions={studySessions}
              assignments={assignments}
              exams={exams}
              courses={courses}
            />
            <WorkloadDistributionAnalysis
              assignments={assignments}
              exams={exams}
              courses={courses}
            />
          </div>
        ),
      },
      {
        id: "tasks-compliance",
        title: "Tasks & Compliance",
        icon: ClipboardCheck,
        description:
          "Stay ahead of due dates and reduce penalties from late submissions or missed checkpoints.",
        content: (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">
            <UpcomingTasks assignments={assignments} exams={exams} courses={courses} />
            <LateSubmissionsChart assignments={assignments} />
          </div>
        ),
      },
    ],
    [assignments, courses, exams, studySessions, loading]
  );

  const [activeSegment, setActiveSegment] = useState(analyticsSegments[0]?.id ?? "");

  // Render mobile-optimized layout
  if (isMobile) {
    return (
      <MobileAnalyticsPage
        studySessions={studySessions}
        courses={courses}
        assignments={assignments}
        exams={exams}
      />
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-full min-h-0 w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0 mb-4 sm:mb-6">
        <div className="space-y-1 min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            Analytics
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm lg:text-base line-clamp-2">
            Insights from your study activity, assignments, exams, and courses
          </p>
        </div>
        <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
      </div>

      {/* Segmented analytics content */}
      <div className="flex-1 min-h-0 min-w-0 w-full max-w-full rounded-2xl sm:rounded-3xl border border-border/60 bg-card/70 p-3 sm:p-4 lg:p-6 shadow-lg shadow-black/10 overflow-hidden flex flex-col">
        <Tabs value={activeSegment} onValueChange={setActiveSegment} className="flex flex-col h-full min-h-0 min-w-0">
          {/* Scrollable tabs with gradient fade indicators */}
          <div className="relative flex-shrink-0 pb-2 max-w-full">
            <div className="overflow-x-auto scrollbar-thin">
              <TabsList className="inline-flex gap-1 sm:gap-2 rounded-xl bg-muted/30 p-1 sm:p-1.5 min-w-max">
                {analyticsSegments.map((segment) => {
                  const Icon = segment.icon;
                  return (
                    <TabsTrigger
                      key={segment.id}
                      value={segment.id}
                      className="flex items-center justify-center gap-1 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap data-[state=inactive]:text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-h-[40px] sm:min-h-0"
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                      {/* Mobile: short labels, Desktop: full titles */}
                      <span className="sm:hidden">{mobileLabels[segment.id]}</span>
                      <span className="hidden sm:inline">{segment.title}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            {/* Gradient fade indicators for scroll */}
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-card/70 to-transparent pointer-events-none sm:hidden" />
          </div>

          {analyticsSegments.map((segment) => (
            <TabsContent key={segment.id} value={segment.id} className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden mt-2">
              <section
                className="h-full space-y-3 sm:space-y-4 border border-border/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 lg:p-6 bg-background shadow-md"
                aria-labelledby={`${segment.id}-title`}
              >
                <header className="space-y-1 sm:space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 sm:h-8 w-1 rounded-full bg-primary" aria-hidden="true" />
                    <h2
                      id={`${segment.id}-title`}
                      className="text-sm sm:text-xl lg:text-2xl font-semibold text-foreground"
                    >
                      {segment.title}
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm pl-3 line-clamp-2 sm:line-clamp-none">{segment.description}</p>
                </header>
                <div className="w-full min-w-0">{segment.content}</div>
              </section>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}