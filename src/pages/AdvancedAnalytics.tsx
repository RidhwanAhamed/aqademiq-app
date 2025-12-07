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

export default function Analytics() {
  const { courses } = useCourses();
  const { assignments } = useAssignments();
  const { studySessions, loading } = useStudySessions();
  const { exams } = useExams();

  // TODO: API -> /api/* endpoints once real backend is ready.

  const analyticsSegments = useMemo(
    () => [
      {
        id: "study-activity",
        title: "Study Activity & Assignment Health",
        icon: Activity,
        description:
          "Monitor where your focus hours go, which courses need attention, and how assignments trend.",
        content: (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className="space-y-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UpcomingTasks assignments={assignments} exams={exams} courses={courses} />
            <LateSubmissionsChart assignments={assignments} />
          </div>
        ),
      },
    ],
    [assignments, courses, exams, studySessions, loading]
  );

  const [activeSegment, setActiveSegment] = useState(analyticsSegments[0]?.id ?? "");

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="space-y-1 sm:space-y-2 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            Analytics
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm lg:text-base line-clamp-2">
            Database-driven insights from your study activity, assignments, exams, and courses
          </p>
        </div>
        <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
      </div>

      {/* Segmented analytics content */}
      <div className="rounded-3xl border border-border/60 bg-card/70 p-3 sm:p-4 lg:p-6 shadow-lg shadow-black/10">
        <Tabs value={activeSegment} onValueChange={setActiveSegment} className="space-y-4 sm:space-y-6">
          <TabsList className="flex w-full gap-1 sm:gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent rounded-2xl bg-muted/30 p-1.5 sm:p-2">
            {analyticsSegments.map((segment) => {
              const Icon = segment.icon;
              return (
                <TabsTrigger
                  key={segment.id}
                  value={segment.id}
                  className="flex items-center justify-center gap-1 sm:gap-2 rounded-xl px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm lg:text-[0.95rem] font-semibold whitespace-nowrap data-[state=inactive]:text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-inner flex-shrink-0"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline text-center">{segment.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {analyticsSegments.map((segment) => (
            <TabsContent key={segment.id} value={segment.id} className="space-y-4">
              <section
                className="space-y-4 border border-border/60 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 bg-background shadow-xl shadow-black/10 min-h-fit"
                aria-labelledby={`${segment.id}-title`}
              >
                <header className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-8 sm:h-12 w-1 sm:w-1.5 rounded-full bg-primary" aria-hidden="true" />
                    <div>
                      <h2
                        id={`${segment.id}-title`}
                        className="text-lg sm:text-2xl lg:text-4xl font-semibold text-foreground"
                      >
                        {segment.title}
                      </h2>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base">{segment.description}</p>
                </header>
                <div>{segment.content}</div>
              </section>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}