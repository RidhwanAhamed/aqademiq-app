import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Tool = {
  name: string;
  description: string;
  requiresConfirmation: boolean;
  execute: (args: any, context: AgentToolContext) => Promise<any>;
};

export type AgentToolContext = {
  supabase: SupabaseClient;
  userId: string;
};

type ToolDeps = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

function toLocalDateAndTime(iso: string): { specificDate: string; hhmm: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO datetime: ${iso}`);
  }
  return {
    specificDate: date.toISOString().split("T")[0],
    hhmm: date.toTimeString().slice(0, 5),
  };
}

export function createToolContext(deps: ToolDeps, userId: string): AgentToolContext {
  const supabase = createClient(deps.supabaseUrl, deps.supabaseServiceRoleKey);
  return { supabase, userId };
}

export const tools: Tool[] = [
  {
    name: "create_event",
    description: "Create a calendar event in schedule_blocks",
    requiresConfirmation: true,
    execute: async (args, context) => {
      const { title, start_iso, end_iso, location, notes, course_id } = args ?? {};

      if (!title || !start_iso || !end_iso) {
        throw new Error("create_event requires title, start_iso, and end_iso");
      }

      const start = toLocalDateAndTime(start_iso);
      const end = toLocalDateAndTime(end_iso);
      const dayOfWeek = new Date(start_iso).getDay();

      const { data, error } = await context.supabase
        .from("schedule_blocks")
        .insert({
          user_id: context.userId,
          title,
          specific_date: start.specificDate,
          day_of_week: dayOfWeek,
          start_time: start.hhmm,
          end_time: end.hhmm,
          location: location ?? null,
          description: notes ?? null,
          is_recurring: false,
          is_active: true,
          course_id: course_id ?? null,
          rotation_group: "ada-ai",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },
  {
    name: "create_assignment",
    description: "Create an assignment record for a course",
    requiresConfirmation: true,
    execute: async (args, context) => {
      const {
        title,
        course_id,
        due_date,
        description,
        priority = 2,
        estimated_hours,
        assignment_type = "homework",
      } = args ?? {};

      if (!title || !course_id || !due_date) {
        throw new Error("create_assignment requires title, course_id, and due_date");
      }

      const { data, error } = await context.supabase
        .from("assignments")
        .insert({
          user_id: context.userId,
          title,
          course_id,
          due_date,
          description: description ?? null,
          priority,
          estimated_hours: estimated_hours ?? null,
          assignment_type,
          is_completed: false,
          completion_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },
  {
    name: "create_study_session",
    description: "Create a study session between two times",
    requiresConfirmation: true,
    execute: async (args, context) => {
      const { title, scheduled_start, scheduled_end, course_id, assignment_id, exam_id, notes } = args ?? {};

      if (!title || !scheduled_start || !scheduled_end) {
        throw new Error("create_study_session requires title, scheduled_start, and scheduled_end");
      }

      const { data, error } = await context.supabase
        .from("study_sessions")
        .insert({
          user_id: context.userId,
          title,
          scheduled_start,
          scheduled_end,
          course_id: course_id ?? null,
          assignment_id: assignment_id ?? null,
          exam_id: exam_id ?? null,
          notes: notes ?? null,
          status: "scheduled",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },
  {
    name: "generate_kernel_notes",
    description: "Generate Cornell-style notes from topic or file content",
    requiresConfirmation: true,
    execute: async (args, context) => {
      const { topic, fileContent, fileName, filePrompt, depthLevel = "standard" } = args ?? {};
      if (!topic && !fileContent) {
        throw new Error("generate_kernel_notes requires topic or fileContent");
      }

      const { data, error } = await context.supabase.functions.invoke("generate-notes-orchestrator", {
        body: {
          topic,
          fileContent,
          fileName,
          filePrompt,
          depthLevel,
        },
      });

      if (error) throw error;
      return data;
    },
  },
  {
    name: "get_calendar",
    description: "Get active calendar events for the current user",
    requiresConfirmation: false,
    execute: async (args, context) => {
      const { from_date, to_date, limit = 100 } = args ?? {};

      let query = context.supabase
        .from("schedule_blocks")
        .select("*")
        .eq("user_id", context.userId)
        .eq("is_active", true)
        .order("specific_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(limit);

      if (from_date) query = query.gte("specific_date", from_date);
      if (to_date) query = query.lte("specific_date", to_date);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  },
];

export function getToolByName(name: string): Tool | undefined {
  return tools.find((tool) => tool.name === name);
}
