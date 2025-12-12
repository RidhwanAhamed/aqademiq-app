import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { EMAIL_CONFIG } from "../_shared/email-config.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
    
    let user = null;
    
    // Check if it's an internal call using service role key
    const token = authHeader.replace('Bearer ', '');
    if (token === supabaseServiceKey) {
      // Internal service call - skip user validation but still validate userId
      console.log('Internal service call detected');
    } else {
      // Verify JWT and get user for external calls
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !authUser) {
        console.error('Authentication error:', authError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid authentication token' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      user = authUser;
    }

    const { action, userId, data } = await req.json();

    // Verify the user can only send emails for themselves (unless it's an internal call)
    if (user && userId !== user.id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized: Cannot send emails for other users' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Email notification action:', action, 'for authenticated user:', userId);

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', userId)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User email not found' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let emailHtml = '';
    let subject = '';

    switch (action) {
      case 'send-assignment-reminder': {
        const { assignment } = data;
        subject = `📚 Assignment Reminder: ${assignment.title}`;
        emailHtml = createAssignmentReminderEmail(assignment, profile.full_name);
        break;
      }

      case 'send-exam-reminder': {
        const { exam } = data;
        subject = `🎯 Exam Reminder: ${exam.title}`;
        emailHtml = createExamReminderEmail(exam, profile.full_name);
        break;
      }

      case 'send-deadline-warning': {
        const { item, timeRemaining } = data;
        subject = `⚠️ Urgent: ${item.title} Due Soon!`;
        emailHtml = createDeadlineWarningEmail(item, timeRemaining, profile.full_name);
        break;
      }

      case 'send-daily-summary': {
        const { todayItems, upcomingItems } = data;
        subject = `📅 Your Daily Academic Summary`;
        emailHtml = createDailySummaryEmail(todayItems, upcomingItems, profile.full_name);
        break;
      }

      case 'send-notification': {
        const { type, title, message, metadata = {} } = data;
        subject = title;
        emailHtml = createGeneralNotificationEmail(type, title, message, metadata, profile.full_name);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Send email via Resend using verified domain
    const emailResponse = await resend.emails.send({
      from: EMAIL_CONFIG.senders.notifications,
      to: [profile.email],
      subject,
      html: emailHtml,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in send-notification-email function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createAssignmentReminderEmail(assignment: any, userName: string): string {
  const dueDate = new Date(assignment.due_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #1a1a1a; font-size: 32px; font-weight: bold; margin: 0;">🎓 Aqademiq</h1>
      </div>
      
      <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
        <h2 style="color: white; font-size: 24px; margin: 0 0 16px 0;">Assignment Reminder</h2>
        <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Hi ${userName}, don't forget about your upcoming assignment!</p>
      </div>
      
      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h3 style="color: #1a1a1a; font-size: 20px; margin: 0 0 16px 0;">${assignment.title}</h3>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-weight: 500;">Course:</span>
            <span style="color: #1a1a1a;">${assignment.course_name || 'Unknown Course'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-weight: 500;">Due Date:</span>
            <span style="color: #1a1a1a; font-weight: 600;">${dueDate}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="color: #64748b; font-weight: 500;">Estimated Time:</span>
            <span style="color: #1a1a1a;">${assignment.estimated_hours} hours</span>
          </div>
        </div>
      </div>
      
      ${assignment.description ? `
        <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin-bottom: 32px; border-radius: 0 8px 8px 0;">
          <p style="color: #0369a1; margin: 0; font-style: italic;">"${assignment.description}"</p>
        </div>
      ` : ''}
      
      <div style="text-align: center; margin-bottom: 32px;">
        <p style="color: #4a5568; font-size: 14px; margin: 0;">Plan your time wisely and stay on track!</p>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This reminder was sent by Aqademiq Academic Planner.<br>
          Manage your notification preferences in your account settings.
        </p>
      </div>
    </div>
  `;
}

function createExamReminderEmail(exam: any, userName: string): string {
  const examDate = new Date(exam.exam_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #1a1a1a; font-size: 32px; font-weight: bold; margin: 0;">🎓 Aqademiq</h1>
      </div>
      
      <div style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
        <h2 style="color: white; font-size: 24px; margin: 0 0 16px 0;">Exam Reminder</h2>
        <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Hi ${userName}, your exam is coming up!</p>
      </div>
      
      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h3 style="color: #1a1a1a; font-size: 20px; margin: 0 0 16px 0;">${exam.title}</h3>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-weight: 500;">Course:</span>
            <span style="color: #1a1a1a;">${exam.course_name || 'Unknown Course'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-weight: 500;">Exam Date:</span>
            <span style="color: #1a1a1a; font-weight: 600;">${examDate}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-weight: 500;">Duration:</span>
            <span style="color: #1a1a1a;">${exam.duration_minutes} minutes</span>
          </div>
          ${exam.location ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: #64748b; font-weight: 500;">Location:</span>
              <span style="color: #1a1a1a;">${exam.location}</span>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 32px; border-radius: 0 8px 8px 0;">
        <p style="color: #92400e; margin: 0; font-weight: 500;">💡 Pro tip: Review your notes, get a good night's sleep, and arrive early!</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <p style="color: #4a5568; font-size: 14px; margin: 0;">Good luck with your exam!</p>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This reminder was sent by Aqademiq Academic Planner.<br>
          Manage your notification preferences in your account settings.
        </p>
      </div>
    </div>
  `;
}

function createDeadlineWarningEmail(item: any, timeRemaining: string, userName: string): string {
  const isAssignment = item.due_date;
  const dueDate = new Date(item.due_date || item.exam_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #1a1a1a; font-size: 32px; font-weight: bold; margin: 0;">🎓 Aqademiq</h1>
      </div>
      
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h2 style="color: white; font-size: 24px; margin: 0 0 16px 0;">Urgent Deadline Warning</h2>
        <p style="color: rgba(255, 255, 255, 0.9); font-size: 18px; margin: 0; font-weight: 600;">${timeRemaining} remaining!</p>
      </div>
      
      <div style="background: #fef2f2; border: 2px solid #fca5a5; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h3 style="color: #dc2626; font-size: 20px; margin: 0 0 16px 0;">⏰ ${item.title}</h3>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fecaca;">
            <span style="color: #991b1b; font-weight: 500;">Course:</span>
            <span style="color: #dc2626; font-weight: 600;">${item.course_name || 'Unknown Course'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="color: #991b1b; font-weight: 500;">${isAssignment ? 'Due Date:' : 'Exam Date:'}</span>
            <span style="color: #dc2626; font-weight: 600;">${dueDate}</span>
          </div>
        </div>
      </div>
      
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 32px; border-radius: 0 8px 8px 0;">
        <h4 style="color: #1e40af; margin: 0 0 12px 0;">Quick Action Steps:</h4>
        <ul style="color: #1e3a8a; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Break down remaining tasks into smaller chunks</li>
          <li>Eliminate distractions and focus</li>
          <li>Ask for help if needed - reach out to classmates or instructors</li>
          <li>Set a timer and work in focused intervals</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <p style="color: #dc2626; font-size: 16px; margin: 0; font-weight: 600;">You've got this, ${userName}! 💪</p>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This urgent reminder was sent by Aqademiq Academic Planner.<br>
          Manage your notification preferences in your account settings.
        </p>
      </div>
    </div>
  `;
}

function createDailySummaryEmail(todayItems: any[], upcomingItems: any[], userName: string): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #1a1a1a; font-size: 32px; font-weight: bold; margin: 0;">🎓 Aqademiq</h1>
      </div>
      
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
        <h2 style="color: white; font-size: 24px; margin: 0 0 16px 0;">Daily Academic Summary</h2>
        <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Good morning, ${userName}! Here's your overview for ${today}</p>
      </div>
      
      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #1a1a1a; font-size: 20px; margin: 0 0 16px 0;">📋 Today's Tasks</h3>
        ${todayItems.length > 0 ? `
          <ul style="margin: 0; padding-left: 20px; color: #4a5568;">
            ${todayItems.map(item => `
              <li style="margin-bottom: 8px; line-height: 1.5;">
                <strong>${item.title}</strong>
                <br><span style="color: #64748b; font-size: 14px;">${item.courses?.name || item.course_name || 'Unknown Course'}</span>
              </li>
            `).join('')}
          </ul>
        ` : `
          <p style="color: #64748b; margin: 0; font-style: italic;">No tasks scheduled for today. Great time to get ahead on upcoming work!</p>
        `}
      </div>
      
      <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h3 style="color: #1a1a1a; font-size: 20px; margin: 0 0 16px 0;">📈 Coming Up This Week</h3>
        ${upcomingItems.length > 0 ? `
          <ul style="margin: 0; padding-left: 20px; color: #4a5568;">
            ${upcomingItems.slice(0, 5).map(item => {
              const date = new Date(item.due_date || item.exam_date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              });
              return `
                <li style="margin-bottom: 8px; line-height: 1.5;">
                  <strong>${item.title}</strong> - <span style="color: #0ea5e9; font-weight: 600;">${date}</span>
                  <br><span style="color: #64748b; font-size: 14px;">${item.courses?.name || item.course_name || 'Unknown Course'}</span>
                </li>
              `;
            }).join('')}
          </ul>
        ` : `
          <p style="color: #64748b; margin: 0; font-style: italic;">Nothing scheduled this week. Perfect time to work ahead or take a well-deserved break!</p>
        `}
      </div>
      
      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 32px; border-radius: 0 8px 8px 0;">
        <p style="color: #15803d; margin: 0; font-weight: 500;">💡 Tip of the day: Use the Pomodoro technique - work for 25 minutes, then take a 5-minute break!</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <p style="color: #4a5568; font-size: 14px; margin: 0;">Have a productive day, ${userName}! 🌟</p>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This daily summary was sent by Aqademiq Academic Planner.<br>
          Manage your notification preferences in your account settings.
        </p>
      </div>
    </div>
  `;
}

function createGeneralNotificationEmail(type: string, title: string, message: string, metadata: any, userName: string): string {
  const colorMap: { [key: string]: string } = {
    assignment: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)',
    exam: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
    reminder: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    info: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  };

  const emojiMap: { [key: string]: string } = {
    assignment: '📚',
    exam: '🎯',
    reminder: '⏰',
    success: '✅',
    info: 'ℹ️',
  };

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #1a1a1a; font-size: 32px; font-weight: bold; margin: 0;">🎓 Aqademiq</h1>
      </div>
      
      <div style="background: ${colorMap[type] || colorMap.info}; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; margin-bottom: 16px;">${emojiMap[type] || emojiMap.info}</div>
        <h2 style="color: white; font-size: 24px; margin: 0 0 16px 0;">${title}</h2>
        <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Hi ${userName}!</p>
      </div>
      
      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0;">${message}</p>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This notification was sent by Aqademiq Academic Planner.<br>
          Manage your notification preferences in your account settings.
        </p>
      </div>
    </div>
  `;
}