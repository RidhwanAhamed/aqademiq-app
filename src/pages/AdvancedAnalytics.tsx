import { useCourses } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useExams } from "@/hooks/useExams";
import { useState, useMemo } from "react";
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
  Sparkles,
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
import { AdaInsightsSection } from "@/components/analytics/AdaInsightsSection";

// Mobile-optimized analytics
import { MobileAnalyticsPage } from "@/components/analytics/mobile";

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
        id: "ada-insights",
        title: "Ada Insights",
        icon: Sparkles,
        description:
          "Ada's real-time productivity insights — focus, execution, peak hours, and stress prevention.",
        content: (
          <AdaInsightsSection />
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

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Database-driven insights from your study activity, assignments, exams, and courses
          </p>
        </div>
        <div className="flex items-center gap-3">
          <WeeklyReportModal />
          <BarChart3 className="w-8 h-8 text-primary" />
        </div>
      </div>

      {/* DB Analytics Content */}
      <div className="space-y-6">
        <Tabs value={activeSegment} onValueChange={setActiveSegment} className="w-full flex flex-col min-h-0">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-2xl bg-muted/50 p-1.5 text-muted-foreground border border-border/40 w-full overflow-x-auto overflow-y-hidden no-scrollbar">
            {analyticsSegments.map((segment) => (
              <TabsTrigger
                key={segment.id}
                value={segment.id}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50 gap-2"
              >
                <segment.icon className="w-4 h-4" />
                <span>{segment.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {analyticsSegments.map((segment) => (
            <TabsContent key={segment.id} value={segment.id} className="flex-1 min-h-0 min-w-0 mt-2 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Overview and Ada Insights get full-bleed layout (no wrapper card) */}
              {(segment.id === 'overview' || segment.id === 'ada-insights') ? (
                <div className="h-full">
                  {segment.content}
                </div>
              ) : (
                <section
                  className="h-full space-y-6 bg-card/40 backdrop-blur-sm border border-border/40 rounded-3xl p-6 shadow-sm"
                >
                  <header className="space-y-1">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      <segment.icon className="w-5 h-5 text-primary/70" />
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