export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_insights_history: {
        Row: {
          ai_response: Json
          created_at: string
          id: string
          request_payload: Json
          user_id: string
        }
        Insert: {
          ai_response: Json
          created_at?: string
          id?: string
          request_payload: Json
          user_id: string
        }
        Update: {
          ai_response?: Json
          created_at?: string
          id?: string
          request_payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          ai_generated_tasks: Json | null
          assignment_type: string | null
          completion_percentage: number | null
          course_id: string
          created_at: string | null
          description: string | null
          due_date: string
          estimated_hours: number | null
          exam_id: string | null
          grade_points: number | null
          grade_received: string | null
          id: string
          is_completed: boolean | null
          is_recurring: boolean | null
          notes: string | null
          original_due_date: string | null
          parent_assignment_id: string | null
          priority: number | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated_tasks?: Json | null
          assignment_type?: string | null
          completion_percentage?: number | null
          course_id: string
          created_at?: string | null
          description?: string | null
          due_date: string
          estimated_hours?: number | null
          exam_id?: string | null
          grade_points?: number | null
          grade_received?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          original_due_date?: string | null
          parent_assignment_id?: string | null
          priority?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated_tasks?: Json | null
          assignment_type?: string | null
          completion_percentage?: number | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string
          estimated_hours?: number | null
          exam_id?: string | null
          grade_points?: number | null
          grade_received?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          original_due_date?: string | null
          parent_assignment_id?: string | null
          priority?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string | null
          color: string
          created_at: string | null
          credits: number | null
          current_gpa: number | null
          id: string
          instructor: string | null
          is_active: boolean | null
          name: string
          progress_percentage: number | null
          semester_id: string
          target_grade: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          code?: string | null
          color?: string
          created_at?: string | null
          credits?: number | null
          current_gpa?: number | null
          id?: string
          instructor?: string | null
          is_active?: boolean | null
          name: string
          progress_percentage?: number | null
          semester_id: string
          target_grade?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          code?: string | null
          color?: string
          created_at?: string | null
          credits?: number | null
          current_gpa?: number | null
          id?: string
          instructor?: string | null
          is_active?: boolean | null
          name?: string
          progress_percentage?: number | null
          semester_id?: string
          target_grade?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string
          created_at: string | null
          duration_minutes: number | null
          exam_date: string
          exam_type: string | null
          grade_points: number | null
          grade_received: string | null
          id: string
          location: string | null
          notes: string | null
          study_hours_completed: number | null
          study_hours_planned: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          duration_minutes?: number | null
          exam_date: string
          exam_type?: string | null
          grade_points?: number | null
          grade_received?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          study_hours_completed?: number | null
          study_hours_planned?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          exam_date?: string
          exam_type?: string | null
          grade_points?: number | null
          grade_received?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          study_hours_completed?: number | null
          study_hours_planned?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          study_streak: number | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          study_streak?: number | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          study_streak?: number | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          assignment_id: string | null
          created_at: string | null
          exam_id: string | null
          id: string
          is_active: boolean | null
          is_sent: boolean | null
          message: string | null
          remind_at: string
          reminder_type: string
          respect_holidays: boolean | null
          schedule_block_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string | null
          exam_id?: string | null
          id?: string
          is_active?: boolean | null
          is_sent?: boolean | null
          message?: string | null
          remind_at: string
          reminder_type: string
          respect_holidays?: boolean | null
          schedule_block_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string | null
          exam_id?: string | null
          id?: string
          is_active?: boolean | null
          is_sent?: boolean | null
          message?: string | null
          remind_at?: string
          reminder_type?: string
          respect_holidays?: boolean | null
          schedule_block_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_schedule_block_id_fkey"
            columns: ["schedule_block_id"]
            isOneToOne: false
            referencedRelation: "schedule_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_tasks: {
        Row: {
          assignment_id: string | null
          created_at: string | null
          description: string | null
          due_date: string
          estimated_hours: number | null
          exam_id: string
          id: string
          is_completed: boolean | null
          priority: number | null
          task_type: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          estimated_hours?: number | null
          exam_id: string
          id?: string
          is_completed?: boolean | null
          priority?: number | null
          task_type?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          estimated_hours?: number | null
          exam_id?: string
          id?: string
          is_completed?: boolean | null
          priority?: number | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_tasks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_tasks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_blocks: {
        Row: {
          course_id: string | null
          created_at: string | null
          day_of_week: number | null
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          location: string | null
          recurrence_pattern: string | null
          rotation_group: string | null
          rotation_type: string | null
          rotation_weeks: number[] | null
          semester_week_start: number | null
          specific_date: string | null
          start_time: string
          title: string
          updated_at: string | null
          user_id: string
          week_type: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          day_of_week?: number | null
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          recurrence_pattern?: string | null
          rotation_group?: string | null
          rotation_type?: string | null
          rotation_weeks?: number[] | null
          semester_week_start?: number | null
          specific_date?: string | null
          start_time: string
          title: string
          updated_at?: string | null
          user_id: string
          week_type?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          day_of_week?: number | null
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          recurrence_pattern?: string | null
          rotation_group?: string | null
          rotation_type?: string | null
          rotation_weeks?: number[] | null
          semester_week_start?: number | null
          specific_date?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          week_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assignment_id: string | null
          course_id: string | null
          created_at: string | null
          exam_id: string | null
          focus_score: number | null
          id: string
          notes: string | null
          scheduled_end: string
          scheduled_start: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assignment_id?: string | null
          course_id?: string | null
          created_at?: string | null
          exam_id?: string | null
          focus_score?: number | null
          id?: string
          notes?: string | null
          scheduled_end: string
          scheduled_start: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assignment_id?: string | null
          course_id?: string | null
          created_at?: string | null
          exam_id?: string | null
          focus_score?: number | null
          id?: string
          notes?: string | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignment_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          exam_id: string | null
          id: string
          is_completed: boolean | null
          order_index: number | null
          parent_task_id: string | null
          priority: number | null
          task_type: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          exam_id?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
          parent_task_id?: string | null
          priority?: number | null
          task_type?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          exam_id?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
          parent_task_id?: string | null
          priority?: number | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          average_grade_points: number | null
          created_at: string | null
          current_streak: number | null
          id: string
          last_study_date: string | null
          longest_streak: number | null
          total_assignments_completed: number | null
          total_exams_taken: number | null
          total_study_hours: number | null
          updated_at: string | null
          user_id: string
          weekly_study_goal: number | null
        }
        Insert: {
          average_grade_points?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_study_date?: string | null
          longest_streak?: number | null
          total_assignments_completed?: number | null
          total_exams_taken?: number | null
          total_study_hours?: number | null
          updated_at?: string | null
          user_id: string
          weekly_study_goal?: number | null
        }
        Update: {
          average_grade_points?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_study_date?: string | null
          longest_streak?: number | null
          total_assignments_completed?: number | null
          total_exams_taken?: number | null
          total_study_hours?: number | null
          updated_at?: string | null
          user_id?: string
          weekly_study_goal?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_recurring_assignments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_revision_tasks_for_exam: {
        Args: { p_exam_id: string; p_user_id: string }
        Returns: undefined
      }
      is_holiday_period: {
        Args: { p_user_id: string; p_date: string }
        Returns: boolean
      }
      should_class_occur_on_date: {
        Args: { p_schedule_id: string; p_target_date: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
