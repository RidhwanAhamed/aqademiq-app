import { useCourses } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useExams } from "@/hooks/useExams";
import { BarChart3 } from "lucide-react";

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

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Database-driven insights from your study activity, assignments, exams, and courses
          </p>
        </div>
        <BarChart3 className="w-8 h-8 text-primary" />
      </div>

      {/* DB Analytics Content */}
      <div className="space-y-6">
          {/* Basic Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Study Hours Distribution */}
            <StudyHoursDistribution 
              studySessions={studySessions} 
              courses={courses} 
            />
            
            {/* Assignments Overview */}
            <AssignmentsOverview 
              assignments={assignments} 
              courses={courses} 
            />
          </div>

          {/* Performance Analysis Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grade Trend Analysis */}
            <GradeTrendAnalysis 
              assignments={assignments} 
              exams={exams} 
              courses={courses} 
            />
            
            {/* Course Performance Comparison */}
            <CoursePerformanceComparison 
              courses={courses} 
              assignments={assignments} 
              exams={exams} 
              studySessions={studySessions} 
            />
          </div>

          {/* Study Efficiency & Trends Row */}
          <div className="space-y-6">
            {/* Study Efficiency Metrics */}
            <StudyEfficiencyMetrics 
              studySessions={studySessions} 
              assignments={assignments} 
              courses={courses} 
            />
            
            {/* Assignment Completion Rate Chart */}
            <AssignmentCompletionRateChart 
              assignments={assignments} 
              courses={courses} 
            />
          </div>

          {/* Time-based Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Study Time Chart */}
            <DailyStudyTimeChart 
              studySessions={studySessions} 
            />
            
            {/* Study Streak Progress */}
            <StudyStreakProgress 
              studySessions={studySessions}
              loading={loading}
            />
          </div>

          {/* Schedule & Workload Analysis Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Study Schedule Optimization */}
            <StudyScheduleOptimization 
              studySessions={studySessions} 
              assignments={assignments} 
              exams={exams} 
              courses={courses} 
            />
            
            {/* Workload Distribution Analysis */}
            <WorkloadDistributionAnalysis 
              assignments={assignments} 
              exams={exams} 
              courses={courses} 
            />
          </div>

          {/* Tasks & Submissions Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Tasks */}
            <UpcomingTasks 
              assignments={assignments} 
              exams={exams} 
              courses={courses} 
            />
            
            {/* Late Submissions Chart */}
            <LateSubmissionsChart 
              assignments={assignments} 
            />
          </div>
      </div>
    </div>
  );
}