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
  LayoutDashboard,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// New DB-driven analytics components
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
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
import { SimulationMode } from "@/components/SimulationMode";
import { WeeklyReportModal } from "@/components/analytics/WeeklyReportModal";

// Mobile-optimized analytics
import { MobileAnalyticsPage } from "@/components/analytics/mobile";

// Mobile abbreviated labels
const mobileLabels: Record<string, string> = {
  "overview": "Overview",
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
        id: "overview",
        title: "Overview",
        icon: LayoutDashboard,
        description: "At a glance summary of your academic performance.",
        content: (
          <AnalyticsOverview
            studySessions={studySessions}
            assignments={assignments}
            exams={exams}
            courses={courses}
          />
        )
      },
      {
        id: "study-activity",
        title: "Study Activity",
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
        title: "Trends",
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
        title: "Efficiency",
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
        title: "Time & Habits",
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
        title: "Planning",
        icon: Layers3,
        description:
          "Balance upcoming tasks with realistic workload distribution before conflicts surface.",
        content: (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
            {/* Top row on smaller widths: optimization + distribution */}
            <div className="order-1 xl:order-2">
              <StudyScheduleOptimization
                studySessions={studySessions}
                assignments={assignments}
                exams={exams}
                courses={courses}
              />
            </div>
            <div className="order-2 xl:order-3">
              <WorkloadDistributionAnalysis
                assignments={assignments}
                exams={exams}
                courses={courses}
              />
            </div>

            {/* Workload Capacity card (SimulationMode) moves below on narrower layouts */}
            <div className="order-3 xl:order-1 lg:col-span-2 xl:col-span-1">
              <SimulationMode className="h-full" />
            </div>
          </div>
        ),
      },
      {
        id: "tasks-compliance",
        title: "Compliance",
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

  const [activeSegment, setActiveSegment] = useState(analyticsSegments[0]?.id ?? "overview");

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

  // Desktop layout with Premium/Opal styling
  return (
    <div className="flex flex-col h-full min-h-screen w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-6 animate-fade-in bg-gradient-to-br from-background via-background to-accent/10">

      {/* Premium Header */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0 mb-6">
        <div className="space-y-1 min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent inline-block">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Detailed insights into your academic journey
          </p>
        </div>
        <div className="flex items-center gap-3">
          <WeeklyReportModal
            studySessions={studySessions}
            assignments={assignments}
            exams={exams}
            courses={courses}
          />
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center backdrop-blur-sm border border-primary/20">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Segmented analytics content */}
      <div className="flex-1 w-full max-w-full flex flex-col space-y-6">
        <Tabs value={activeSegment} onValueChange={setActiveSegment} className="flex flex-col h-full w-full">

          {/* Scrollable Floating Tabs */}
          <div className="relative flex-shrink-0 pb-2 max-w-full sticky top-0 z-20 pt-2 -mt-2">
            <div className="overflow-x-auto scrollbar-none pb-2">
              <TabsList className="inline-flex h-auto gap-2 bg-background/60 backdrop-blur-md p-1.5 rounded-full border border-border/50 shadow-sm min-w-max">
                {analyticsSegments.map((segment) => {
                  const Icon = segment.icon;
                  const isActive = activeSegment === segment.id;
                  return (
                    <TabsTrigger
                      key={segment.id}
                      value={segment.id}
                      className={`
                        flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300
                        ${isActive
                          ? "bg-primary text-primary-foreground shadow-md scale-105"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{segment.title}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </div>

          {analyticsSegments.map((segment) => (
            <TabsContent key={segment.id} value={segment.id} className="flex-1 min-h-0 min-w-0 mt-2 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* For Overview, we don't need a wrapper card, it has its own bento grid */}
              {segment.id === 'overview' ? (
                <div className="h-full">
                  {segment.content}
                </div>
              ) : (
                <section
                  className="h-full space-y-6 bg-card/40 backdrop-blur-sm border border-border/40 rounded-3xl p-6 shadow-sm"
                >
                  <header className="space-y-1">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      {segment.title}
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-3xl">
                      {segment.description}
                    </p>
                  </header>
                  <div className="w-full min-w-0">{segment.content}</div>
                </section>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}