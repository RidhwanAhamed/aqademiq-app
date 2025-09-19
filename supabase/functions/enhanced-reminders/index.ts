import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the JWT token from the request header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing authorization header' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create authenticated client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid authentication token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, userId } = await req.json();

    // Verify the user can only perform actions for themselves
    if (userId && userId !== user.id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized: Cannot perform actions for other users' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use authenticated user's ID if not provided
    const targetUserId = userId || user.id;

    console.log('Enhanced reminders action:', action, 'for authenticated user:', targetUserId);

    switch (action) {
      case 'generate-reminders': {
        await generateRemindersForUser(supabase, targetUserId);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'process-queue': {
        // Only allow system/admin users to process the entire queue
        if (userId && userId !== user.id) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Unauthorized: Cannot process notification queue for other users' 
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        await processNotificationQueue(supabase);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-daily-summary': {
        await sendDailySummaryToUser(supabase, targetUserId);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'cleanup-old-notifications': {
        // Clean up user's own notifications older than 30 days
        const { error } = await supabase
          .from('notification_queue')
          .delete()
          .eq('user_id', targetUserId)
          .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in enhanced-reminders function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateRemindersForUser(supabase: any, userId: string) {
  console.log('Generating reminders for user:', userId);
  
  // Get user's notification preferences
  const { data: preferences, error: prefError } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (prefError) {
    console.error('Error fetching preferences:', prefError);
    return;
  }

  if (!preferences) {
    // Create default preferences for new users
    await supabase
      .from('notification_preferences')
      .insert({
        user_id: userId,
        email_enabled: true,
        discord_enabled: false,
        in_app_enabled: true,
        assignment_reminders: true,
        exam_reminders: true,
        deadline_warnings: true,
        daily_summary: false,
        reminder_timing_minutes: [15, 60, 1440], // 15 min, 1 hour, 1 day
      });
    return;
  }

  const reminderTimes = preferences.reminder_timing_minutes || [15, 60, 1440];
  const now = new Date();
  const futureLimit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead

  // Generate reminders for upcoming assignments
  if (preferences.assignment_reminders) {
    const { data: assignments } = await supabase
      .from('assignments')
      .select(`
        *,
        courses(name, color)
      `)
      .eq('user_id', userId)
      .eq('is_completed', false)
      .gte('due_date', now.toISOString())
      .lte('due_date', futureLimit.toISOString());

    for (const assignment of assignments || []) {
      for (const minutesBefore of reminderTimes) {
        const reminderTime = new Date(new Date(assignment.due_date).getTime() - minutesBefore * 60 * 1000);
        
        if (reminderTime > now) {
          await scheduleNotification(supabase, {
            user_id: userId,
            type: 'assignment_reminder',
            title: `Assignment Due Soon: ${assignment.title}`,
            message: `Your assignment "${assignment.title}" for ${assignment.courses?.name || 'Unknown Course'} is due in ${formatDuration(minutesBefore)}.`,
            metadata: {
              assignment_id: assignment.id,
              course_name: assignment.courses?.name,
              due_date: assignment.due_date,
              estimated_hours: assignment.estimated_hours,
            },
            scheduled_for: reminderTime,
            preferences,
          });
        }
      }
    }
  }

  // Generate reminders for upcoming exams
  if (preferences.exam_reminders) {
    const { data: exams } = await supabase
      .from('exams')
      .select(`
        *,
        courses(name, color)
      `)
      .eq('user_id', userId)
      .gte('exam_date', now.toISOString())
      .lte('exam_date', futureLimit.toISOString());

    for (const exam of exams || []) {
      for (const minutesBefore of reminderTimes) {
        const reminderTime = new Date(new Date(exam.exam_date).getTime() - minutesBefore * 60 * 1000);
        
        if (reminderTime > now) {
          await scheduleNotification(supabase, {
            user_id: userId,
            type: 'exam_reminder',
            title: `Exam Reminder: ${exam.title}`,
            message: `Your ${exam.exam_type} exam "${exam.title}" for ${exam.courses?.name || 'Unknown Course'} is in ${formatDuration(minutesBefore)}.`,
            metadata: {
              exam_id: exam.id,
              course_name: exam.courses?.name,
              exam_date: exam.exam_date,
              location: exam.location,
              duration_minutes: exam.duration_minutes,
            },
            scheduled_for: reminderTime,
            preferences,
          });
        }
      }
    }
  }

  console.log('Reminders generated successfully for user:', userId);
}

async function scheduleNotification(supabase: any, params: {
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: any;
  scheduled_for: Date;
  preferences: any;
}) {
  const { user_id, type, title, message, metadata, scheduled_for, preferences } = params;

  // Schedule notifications based on user preferences
  const notificationsToSchedule = [];

  if (preferences.email_enabled) {
    notificationsToSchedule.push({
      user_id,
      type: 'email',
      category: type,
      title,
      message,
      metadata,
      scheduled_for: scheduled_for.toISOString(),
    });
  }

  // Discord functionality removed - email only notification system

  if (preferences.in_app_enabled) {
    notificationsToSchedule.push({
      user_id,
      type: 'in_app',
      category: type,
      title,
      message,
      metadata,
      scheduled_for: scheduled_for.toISOString(),
    });
  }

  if (notificationsToSchedule.length > 0) {
    const { error } = await supabase
      .from('notification_queue')
      .insert(notificationsToSchedule);

    if (error) {
      console.error('Error scheduling notifications:', error);
    }
  }
}

async function processNotificationQueue(supabase: any) {
  console.log('Processing notification queue...');
  
  const now = new Date();
  
  // Get notifications that are ready to be sent
  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select('*')
    .lte('scheduled_for', now.toISOString())
    .is('sent_at', null)
    .lt('retry_count', supabase.raw('max_retries'))
    .order('scheduled_for', { ascending: true })
    .limit(50); // Process in batches

  if (error) {
    console.error('Error fetching notifications:', error);
    return;
  }

  for (const notification of notifications || []) {
    try {
      let success = false;
      
      switch (notification.type) {
        case 'email':
          success = await sendEmailNotification(supabase, notification);
          break;
        case 'in_app':
          success = await sendInAppNotification(supabase, notification);
          break;
        default:
          console.log('Unknown notification type:', notification.type);
          success = false;
      }

      if (success) {
        // Mark as sent
        await supabase
          .from('notification_queue')
          .update({ sent_at: now.toISOString() })
          .eq('id', notification.id);
      } else {
        // Increment retry count
        await supabase
          .from('notification_queue')
          .update({ 
            retry_count: notification.retry_count + 1,
            failed_at: now.toISOString(),
            error_message: 'Failed to send notification'
          })
          .eq('id', notification.id);
      }
    } catch (error) {
      console.error('Error processing notification:', notification.id, error);
      
      // Mark as failed and increment retry count
      await supabase
        .from('notification_queue')
        .update({ 
          retry_count: notification.retry_count + 1,
          failed_at: now.toISOString(),
          error_message: error.message
        })
        .eq('id', notification.id);
    }
  }

  console.log(`Processed ${notifications?.length || 0} notifications`);
}

// Discord notifications removed - using email-only system

async function sendEmailNotification(supabase: any, notification: any): Promise<boolean> {
  try {
    let action = 'send-notification';
    let data: any = {
      type: notification.category,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
    };

    // Use specific actions for better email formatting
    if (notification.category === 'assignment_reminder') {
      action = 'send-assignment-reminder';
      data = { assignment: notification.metadata };
    } else if (notification.category === 'exam_reminder') {
      action = 'send-exam-reminder';
      data = { exam: notification.metadata };
    } else if (notification.category === 'deadline_warning') {
      action = 'send-deadline-warning';
      data = { 
        item: notification.metadata,
        timeRemaining: notification.metadata.time_remaining || 'Soon'
      };
    }

    const response = await supabase.functions.invoke('send-notification-email', {
      body: {
        action,
        userId: notification.user_id,
        data,
      }
    });

    const result = await response.json();
    return response.ok && result?.success;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

async function sendInAppNotification(supabase: any, notification: any): Promise<boolean> {
  // TODO: Implement in-app notifications using real-time subscriptions
  console.log('In-app notification (not implemented):', notification.title);
  return true; // Placeholder success
}

async function sendDailySummaryToUser(supabase: any, userId: string) {
  console.log('Sending daily summary to user:', userId);
  
  // Get user's notification preferences
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!preferences?.daily_summary) {
    console.log('Daily summary disabled for user:', userId);
    return;
  }

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get today's items
  const [todayAssignments, todayExams] = await Promise.all([
    supabase
      .from('assignments')
      .select('*, courses(name)')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString()),
    supabase
      .from('exams')
      .select('*, courses(name)')
      .eq('user_id', userId)
      .gte('exam_date', today.toISOString())
      .lt('exam_date', tomorrow.toISOString())
  ]);

  // Get upcoming items
  const [upcomingAssignments, upcomingExams] = await Promise.all([
    supabase
      .from('assignments')
      .select('*, courses(name)')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .gte('due_date', tomorrow.toISOString())
      .lt('due_date', nextWeek.toISOString())
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('exams')
      .select('*, courses(name)')
      .eq('user_id', userId)
      .gte('exam_date', tomorrow.toISOString())
      .lt('exam_date', nextWeek.toISOString())
      .order('exam_date', { ascending: true })
      .limit(5)
  ]);

  const todayItems = [
    ...(todayAssignments.data || []),
    ...(todayExams.data || [])
  ];

  const upcomingItems = [
    ...(upcomingAssignments.data || []),
    ...(upcomingExams.data || [])
  ];

  // Send email summary if enabled
  if (preferences.email_enabled) {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        action: 'send-daily-summary',
        userId,
        data: {
          todayItems,
          upcomingItems,
        }
      })
    });

    if (!response.ok) {
      console.error('Failed to send daily summary email:', await response.text());
    }
  }

  console.log('Daily summary sent to user:', userId);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(minutes / 1440);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
}