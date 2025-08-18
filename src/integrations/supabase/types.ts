export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
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
          grade_total: number | null
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
          grade_total?: number | null
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
          grade_total?: number | null
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
      chat_messages: {
        Row: {
          created_at: string
          file_upload_id: string | null
          id: string
          is_user: boolean
          message: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_upload_id?: string | null
          id?: string
          is_user?: boolean
          message: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_upload_id?: string | null
          id?: string
          is_user?: boolean
          message?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string | null
          color: string
          created_at: string | null
          credits: number | null
          current_gpa: number | null
          expected_exams: number | null
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
          expected_exams?: number | null
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
          expected_exams?: number | null
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
      discord_settings: {
        Row: {
          assignment_notifications: boolean
          created_at: string
          exam_notifications: boolean
          id: string
          notifications_enabled: boolean
          reminder_notifications: boolean
          updated_at: string
          user_id: string
          username: string | null
          webhook_url: string | null
        }
        Insert: {
          assignment_notifications?: boolean
          created_at?: string
          exam_notifications?: boolean
          id?: string
          notifications_enabled?: boolean
          reminder_notifications?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
          webhook_url?: string | null
        }
        Update: {
          assignment_notifications?: boolean
          created_at?: string
          exam_notifications?: boolean
          id?: string
          notifications_enabled?: boolean
          reminder_notifications?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
          webhook_url?: string | null
        }
        Relationships: []
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
          grade_total: number | null
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
          grade_total?: number | null
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
          grade_total?: number | null
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
      file_uploads: {
        Row: {
          created_at: string
          file_name: string
          file_type: string
          file_url: string | null
          id: string
          ocr_text: string | null
          parsed_data: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type: string
          file_url?: string | null
          id?: string
          ocr_text?: string | null
          parsed_data?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string
          file_url?: string | null
          id?: string
          ocr_text?: string | null
          parsed_data?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_settings: {
        Row: {
          calendar_id: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          sync_assignments: boolean
          sync_enabled: boolean
          sync_exams: boolean
          sync_schedule_blocks: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          sync_assignments?: boolean
          sync_enabled?: boolean
          sync_exams?: boolean
          sync_schedule_blocks?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          sync_assignments?: boolean
          sync_enabled?: boolean
          sync_exams?: boolean
          sync_schedule_blocks?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string | null
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          scope: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      notification_preferences: {
        Row: {
          assignment_reminders: boolean
          created_at: string
          daily_summary: boolean
          deadline_warnings: boolean
          discord_enabled: boolean
          email_enabled: boolean
          exam_reminders: boolean
          id: string
          in_app_enabled: boolean
          reminder_timing_minutes: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_reminders?: boolean
          created_at?: string
          daily_summary?: boolean
          deadline_warnings?: boolean
          discord_enabled?: boolean
          email_enabled?: boolean
          exam_reminders?: boolean
          id?: string
          in_app_enabled?: boolean
          reminder_timing_minutes?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_reminders?: boolean
          created_at?: string
          daily_summary?: boolean
          deadline_warnings?: boolean
          discord_enabled?: boolean
          email_enabled?: boolean
          exam_reminders?: boolean
          id?: string
          in_app_enabled?: boolean
          reminder_timing_minutes?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          category: string
          created_at: string
          error_message: string | null
          failed_at: string | null
          id: string
          max_retries: number
          message: string
          metadata: Json | null
          retry_count: number
          scheduled_for: string
          sent_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_retries?: number
          message: string
          metadata?: Json | null
          retry_count?: number
          scheduled_for: string
          sent_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_retries?: number
          message?: string
          metadata?: Json | null
          retry_count?: number
          scheduled_for?: string
          sent_at?: string | null
          title?: string
          type?: string
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
          onboarding_completed: boolean | null
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
          onboarding_completed?: boolean | null
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
          onboarding_completed?: boolean | null
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
      rotation_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system_template: boolean | null
          name: string
          rotation_type: string
          rotation_weeks: number[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_template?: boolean | null
          name: string
          rotation_type: string
          rotation_weeks?: number[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_template?: boolean | null
          name?: string
          rotation_type?: string
          rotation_weeks?: number[] | null
        }
        Relationships: []
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
      calculate_user_gpa: {
        Args: { p_user_id: string }
        Returns: number
      }
      detect_schedule_conflicts: {
        Args: {
          p_end_time: string
          p_exclude_id?: string
          p_start_time: string
          p_user_id: string
        }
        Returns: {
          conflict_end: string
          conflict_id: string
          conflict_start: string
          conflict_title: string
          conflict_type: string
        }[]
      }
      generate_recurring_assignments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_revision_tasks_for_exam: {
        Args: { p_exam_id: string; p_user_id: string }
        Returns: undefined
      }
      get_schedule_for_date_range: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          course_color: string
          course_id: string
          course_name: string
          day_of_week: number
          end_time: string
          location: string
          occurs_on: string
          rotation_info: string
          schedule_id: string
          start_time: string
          title: string
        }[]
      }
      is_holiday_period: {
        Args: { p_date: string; p_user_id: string }
        Returns: boolean
      }
      should_class_occur_on_date: {
        Args: { p_schedule_id: string; p_target_date: string }
        Returns: boolean
      }
      update_course_progress: {
        Args: { p_course_id: string }
        Returns: undefined
      }
      update_user_study_stats: {
        Args: { p_study_hours: number; p_user_id: string }
        Returns: undefined
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
