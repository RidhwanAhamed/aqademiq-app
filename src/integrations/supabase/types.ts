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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academic_goals: {
        Row: {
          achieved_at: string | null
          course_id: string | null
          created_at: string
          current_value: number | null
          goal_description: string | null
          goal_title: string
          goal_type: string
          id: string
          is_achieved: boolean | null
          is_active: boolean | null
          priority: number | null
          target_date: string | null
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          course_id?: string | null
          created_at?: string
          current_value?: number | null
          goal_description?: string | null
          goal_title: string
          goal_type: string
          id?: string
          is_achieved?: boolean | null
          is_active?: boolean | null
          priority?: number | null
          target_date?: string | null
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          course_id?: string | null
          created_at?: string
          current_value?: number | null
          goal_description?: string | null
          goal_title?: string
          goal_type?: string
          id?: string
          is_achieved?: boolean | null
          is_active?: boolean | null
          priority?: number | null
          target_date?: string | null
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_goals_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_insights: {
        Row: {
          action_items: Json | null
          confidence_score: number | null
          created_at: string
          expires_at: string | null
          id: string
          insight_description: string
          insight_title: string
          insight_type: string
          is_dismissed: boolean | null
          is_read: boolean | null
          related_assignment_id: string | null
          related_course_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          confidence_score?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          insight_description: string
          insight_title: string
          insight_type: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          related_assignment_id?: string | null
          related_course_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: Json | null
          confidence_score?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          insight_description?: string
          insight_title?: string
          insight_type?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          related_assignment_id?: string | null
          related_course_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_insights_related_assignment_id_fkey"
            columns: ["related_assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_insights_related_course_id_fkey"
            columns: ["related_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_sync_preferences: {
        Row: {
          assignment_buffer_hours: number
          auto_study_sessions: boolean
          break_time_minutes: number
          color_coding_enabled: boolean
          created_at: string
          exam_prep_days: number
          id: string
          reminder_escalation: boolean
          study_session_duration: number
          updated_at: string
          user_id: string
          weekend_study_allowed: boolean
        }
        Insert: {
          assignment_buffer_hours?: number
          auto_study_sessions?: boolean
          break_time_minutes?: number
          color_coding_enabled?: boolean
          created_at?: string
          exam_prep_days?: number
          id?: string
          reminder_escalation?: boolean
          study_session_duration?: number
          updated_at?: string
          user_id: string
          weekend_study_allowed?: boolean
        }
        Update: {
          assignment_buffer_hours?: number
          auto_study_sessions?: boolean
          break_time_minutes?: number
          color_coding_enabled?: boolean
          created_at?: string
          exam_prep_days?: number
          id?: string
          reminder_escalation?: boolean
          study_session_duration?: number
          updated_at?: string
          user_id?: string
          weekend_study_allowed?: boolean
        }
        Relationships: []
      }
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
      ai_token_usage: {
        Row: {
          completion_tokens: number
          created_at: string | null
          function_name: string
          id: string
          prompt_tokens: number
          request_metadata: Json | null
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string | null
          function_name: string
          id?: string
          prompt_tokens?: number
          request_metadata?: Json | null
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string | null
          function_name?: string
          id?: string
          prompt_tokens?: number
          request_metadata?: Json | null
          total_tokens?: number
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
      audit_log: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          idempotency_key: string | null
          metadata: Json | null
          request_id: string | null
          source: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          request_id?: string | null
          source?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          request_id?: string | null
          source?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string | null
          created_at: string
          file_upload_id: string | null
          id: string
          is_user: boolean
          message: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          file_upload_id?: string | null
          id?: string
          is_user?: boolean
          message: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
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
      cornell_notes: {
        Row: {
          created_at: string | null
          document: Json
          id: string
          source_file_name: string | null
          source_type: string
          title: string
          topic: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document: Json
          id?: string
          source_file_name?: string | null
          source_type: string
          title: string
          topic: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document?: Json
          id?: string
          source_file_name?: string | null
          source_type?: string
          title?: string
          topic?: string
          updated_at?: string | null
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
      document_embeddings: {
        Row: {
          chunk_index: number
          content: string
          course_id: string | null
          created_at: string | null
          embedding: string | null
          file_upload_id: string | null
          id: string
          metadata: Json | null
          source_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chunk_index?: number
          content: string
          course_id?: string | null
          created_at?: string | null
          embedding?: string | null
          file_upload_id?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          course_id?: string | null
          created_at?: string | null
          embedding?: string | null
          file_upload_id?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_embeddings_file_upload_id_fkey"
            columns: ["file_upload_id"]
            isOneToOne: false
            referencedRelation: "file_uploads"
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
          course_id: string | null
          created_at: string
          description: string | null
          display_name: string | null
          file_name: string
          file_type: string
          file_url: string | null
          id: string
          ocr_text: string | null
          parsed_data: Json | null
          source_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          file_name: string
          file_type: string
          file_url?: string | null
          id?: string
          ocr_text?: string | null
          parsed_data?: Json | null
          source_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          file_name?: string
          file_type?: string
          file_url?: string | null
          id?: string
          ocr_text?: string | null
          parsed_data?: Json | null
          source_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_channels: {
        Row: {
          calendar_id: string
          channel_id: string
          created_at: string
          expiration: string
          id: string
          is_active: boolean
          resource_id: string
          updated_at: string
          user_id: string
          webhook_url: string
        }
        Insert: {
          calendar_id?: string
          channel_id: string
          created_at?: string
          expiration: string
          id?: string
          is_active?: boolean
          resource_id: string
          updated_at?: string
          user_id: string
          webhook_url: string
        }
        Update: {
          calendar_id?: string
          channel_id?: string
          created_at?: string
          expiration?: string
          id?: string
          is_active?: boolean
          resource_id?: string
          updated_at?: string
          user_id?: string
          webhook_url?: string
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
      google_event_mappings: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          google_calendar_id: string
          google_event_id: string
          google_event_updated: string | null
          id: string
          last_synced_at: string
          local_event_updated: string | null
          sync_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          google_calendar_id?: string
          google_event_id: string
          google_event_updated?: string | null
          id?: string
          last_synced_at?: string
          local_event_updated?: string | null
          sync_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          google_calendar_id?: string
          google_event_id?: string
          google_event_updated?: string | null
          id?: string
          last_synced_at?: string
          local_event_updated?: string | null
          sync_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_sync_tokens: {
        Row: {
          calendar_id: string
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string
          page_token: string | null
          sync_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string
          page_token?: string | null
          sync_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string
          page_token?: string | null
          sync_token?: string
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
      marketplace_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_early_access: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          referral_source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          referral_source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          referral_source?: string | null
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
      oauth_state_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          state_token: string
          used: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          state_token: string
          used?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          state_token?: string
          used?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      performance_analytics: {
        Row: {
          calculation_date: string
          course_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          time_period: string
          user_id: string
        }
        Insert: {
          calculation_date?: string
          course_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          time_period: string
          user_id: string
        }
        Update: {
          calculation_date?: string
          course_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          time_period?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_analytics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
          source: string | null
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
          source?: string | null
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
          source?: string | null
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
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      study_session_analytics: {
        Row: {
          break_duration_minutes: number | null
          course_id: string | null
          created_at: string
          distraction_count: number | null
          effective_study_minutes: number | null
          focus_intervals: Json | null
          id: string
          notes: string | null
          productivity_score: number | null
          session_date: string
          session_id: string | null
          session_rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          break_duration_minutes?: number | null
          course_id?: string | null
          created_at?: string
          distraction_count?: number | null
          effective_study_minutes?: number | null
          focus_intervals?: Json | null
          id?: string
          notes?: string | null
          productivity_score?: number | null
          session_date?: string
          session_id?: string | null
          session_rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          break_duration_minutes?: number | null
          course_id?: string | null
          created_at?: string
          distraction_count?: number | null
          effective_study_minutes?: number | null
          focus_intervals?: Json | null
          id?: string
          notes?: string | null
          productivity_score?: number | null
          session_date?: string
          session_id?: string | null
          session_rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_session_analytics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_session_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_session_templates: {
        Row: {
          auto_schedule: boolean
          break_intervals: Json | null
          course_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          preferred_times: Json | null
          session_type: string
          subject_focus: Json | null
          template_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_schedule?: boolean
          break_intervals?: Json | null
          course_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          preferred_times?: Json | null
          session_type?: string
          subject_focus?: Json | null
          template_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_schedule?: boolean
          break_intervals?: Json | null
          course_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          preferred_times?: Json | null
          session_type?: string
          subject_focus?: Json | null
          template_name?: string
          updated_at?: string
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
      sync_conflicts: {
        Row: {
          conflict_type: string
          created_at: string
          entity_id: string
          entity_type: string
          google_data: Json
          google_event_id: string
          id: string
          local_data: Json
          resolution_preference: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conflict_type: string
          created_at?: string
          entity_id: string
          entity_type: string
          google_data: Json
          google_event_id: string
          id?: string
          local_data: Json
          resolution_preference?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conflict_type?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          google_data?: Json
          google_event_id?: string
          id?: string
          local_data?: Json
          resolution_preference?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_job_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          failed_at: string | null
          id: string
          job_data: Json
          job_type: string
          max_retries: number
          priority: number
          retry_count: number
          scheduled_for: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          job_data?: Json
          job_type: string
          max_retries?: number
          priority?: number
          retry_count?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          job_data?: Json
          job_type?: string
          max_retries?: number
          priority?: number
          retry_count?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_operations: {
        Row: {
          attempts_count: number
          batch_id: string | null
          completed_at: string | null
          conflict_data: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          error_message: string | null
          google_event_id: string | null
          id: string
          last_attempted_at: string | null
          next_retry_at: string | null
          operation_status: string
          operation_type: string
          original_created_at: string | null
          priority: number
          retry_count: number
          sync_direction: string
          sync_type: string
          user_id: string
        }
        Insert: {
          attempts_count?: number
          batch_id?: string | null
          completed_at?: string | null
          conflict_data?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          last_attempted_at?: string | null
          next_retry_at?: string | null
          operation_status?: string
          operation_type: string
          original_created_at?: string | null
          priority?: number
          retry_count?: number
          sync_direction: string
          sync_type?: string
          user_id: string
        }
        Update: {
          attempts_count?: number
          batch_id?: string | null
          completed_at?: string | null
          conflict_data?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          last_attempted_at?: string | null
          next_retry_at?: string | null
          operation_status?: string
          operation_type?: string
          original_created_at?: string | null
          priority?: number
          retry_count?: number
          sync_direction?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: []
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
      audit_profile_access: {
        Args: {
          p_accessed_profile_id: string
          p_action: string
          p_fields_accessed?: Json
          p_user_id: string
        }
        Returns: undefined
      }
      calculate_goal_achievement_probability: {
        Args: { p_goal_id: string }
        Returns: {
          goal_id: string
          probability_percentage: number
          recommended_actions: Json
          risk_level: string
        }[]
      }
      calculate_performance_metrics: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      calculate_user_gpa: { Args: { p_user_id: string }; Returns: number }
      check_operation_rate_limit: {
        Args: {
          p_max_operations?: number
          p_operation_type: string
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_oauth_tokens: { Args: never; Returns: number }
      create_oauth_state_token: {
        Args: {
          p_ip_address?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      decrypt_token: { Args: { p_encrypted_token: string }; Returns: string }
      delete_user_google_tokens: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      detect_performance_risks: {
        Args: { p_user_id: string }
        Returns: {
          affected_courses: string[]
          description: string
          recommended_actions: Json
          risk_type: string
          severity: string
        }[]
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
      email_exists: { Args: { p_email: string }; Returns: boolean }
      encrypt_token: { Args: { p_token: string }; Returns: string }
      forecast_grade_trend: {
        Args: { p_course_id?: string; p_user_id: string }
        Returns: {
          confidence_level: string
          course_id: string
          course_name: string
          current_average: number
          projected_30_days: number
          projected_semester_end: number
          trend_direction: string
        }[]
      }
      generate_recurring_assignments: { Args: never; Returns: undefined }
      generate_revision_tasks_for_exam: {
        Args: { p_exam_id: string; p_user_id: string }
        Returns: undefined
      }
      generate_sync_hash: {
        Args: { entity_data: Json; entity_type: string }
        Returns: string
      }
      get_daily_token_usage: {
        Args: { p_user_id: string }
        Returns: {
          is_limit_exceeded: boolean
          remaining_tokens: number
          resets_at: string
          total_tokens_today: number
        }[]
      }
      get_marketplace_early_access_count: { Args: never; Returns: number }
      get_public_profile: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          full_name: string
          study_streak: number
          user_id: string
        }[]
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
      get_user_google_tokens: {
        Args: { p_user_id: string }
        Returns: {
          access_token: string
          expires_at: string
          refresh_token: string
          scope: string
        }[]
      }
      has_google_tokens: { Args: { p_user_id?: string }; Returns: boolean }
      insert_user_google_tokens: {
        Args: {
          p_access_token: string
          p_expires_at: string
          p_refresh_token: string
          p_scope: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_holiday_period: {
        Args: { p_date: string; p_user_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_ip_address?: unknown
          p_resource_id?: string
          p_resource_type: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      mask_sensitive_data: { Args: { input_text: string }; Returns: string }
      monitor_suspicious_activity: {
        Args: { p_user_id?: string }
        Returns: {
          alert_message: string
          alert_type: string
          event_count: number
          last_occurrence: string
          risk_score: number
        }[]
      }
      revoke_google_tokens: { Args: { p_user_id?: string }; Returns: boolean }
      search_documents: {
        Args: {
          p_course_id?: string
          p_match_count?: number
          p_match_threshold?: number
          p_query_embedding: string
          p_user_id: string
        }
        Returns: {
          content: string
          course_id: string
          file_upload_id: string
          id: string
          metadata: Json
          similarity: number
          source_type: string
        }[]
      }
      should_class_occur_on_date: {
        Args: { p_schedule_id: string; p_target_date: string }
        Returns: boolean
      }
      update_course_progress: {
        Args: { p_course_id: string }
        Returns: undefined
      }
      update_user_google_tokens: {
        Args: {
          p_access_token: string
          p_expires_at?: string
          p_refresh_token?: string
          p_scope?: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_user_study_stats: {
        Args: { p_study_hours: number; p_user_id: string }
        Returns: undefined
      }
      user_has_marketplace_early_access: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      validate_oauth_state:
        | {
            Args: {
              p_max_age_minutes?: number
              p_state_token: string
              p_user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_max_age_minutes?: number
              p_state_token: string
              p_user_id: string
            }
            Returns: boolean
          }
      validate_redirect_uri: {
        Args: { p_allowed_domains?: string[]; p_redirect_uri: string }
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
