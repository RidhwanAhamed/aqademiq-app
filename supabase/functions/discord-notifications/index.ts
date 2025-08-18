import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, userId, data } = await req.json();

    console.log('Discord notification action:', action, 'for user:', userId);

    switch (action) {
      case 'send-notification': {
        const { type, title, message, metadata = {} } = data;
        
        // Get user's Discord settings
        const { data: discordSettings, error: settingsError } = await supabase
          .from('discord_settings')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (settingsError || !discordSettings?.webhook_url || !discordSettings.notifications_enabled) {
          console.log('Discord not configured for user:', userId);
          return new Response(JSON.stringify({ success: false, reason: 'Discord not configured' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create Discord embed based on notification type
        const embed = createDiscordEmbed(type, title, message, metadata);
        
        const discordMessage: DiscordMessage = {
          username: discordSettings.username || 'Aqademiq',
          avatar_url: 'https://your-domain.com/logo.png', // Update with actual logo URL
          embeds: [embed],
        };

        // Send to Discord
        const response = await fetch(discordSettings.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordMessage),
        });

        if (response.ok) {
          console.log('Discord notification sent successfully');
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const errorText = await response.text();
          console.error('Discord webhook failed:', errorText);
          throw new Error(`Discord webhook failed: ${response.status}`);
        }
      }

      case 'test-webhook': {
        const { webhookUrl } = data;
        
        const testMessage: DiscordMessage = {
          username: 'Aqademiq',
          embeds: [{
            title: '🎉 Discord Integration Test',
            description: 'Your Discord webhook is working perfectly! You\'ll now receive academic notifications here.',
            color: 0x00D4AA, // Teal color
            footer: {
              text: 'Aqademiq - AI Academic Planning'
            },
            timestamp: new Date().toISOString(),
          }],
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testMessage),
        });

        if (response.ok) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const errorText = await response.text();
          console.error('Discord webhook test failed:', errorText);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Webhook test failed: ${response.status}` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'send-assignment-reminder': {
        const { assignment } = data;
        
        const embed: DiscordEmbed = {
          title: '📚 Assignment Reminder',
          description: assignment.title,
          color: 0xFF6B6B, // Red color for urgency
          fields: [
            {
              name: 'Course',
              value: assignment.course_name || 'Unknown Course',
              inline: true,
            },
            {
              name: 'Due Date',
              value: new Date(assignment.due_date).toLocaleString(),
              inline: true,
            },
            {
              name: 'Estimated Time',
              value: `${assignment.estimated_hours} hours`,
              inline: true,
            },
          ],
          footer: {
            text: 'Aqademiq Academic Planner'
          },
          timestamp: new Date().toISOString(),
        };

        return await sendNotificationToUser(supabase, userId, {
          username: 'Aqademiq',
          embeds: [embed],
        });
      }

      case 'send-exam-reminder': {
        const { exam } = data;
        
        const embed: DiscordEmbed = {
          title: '🎯 Exam Reminder',
          description: exam.title,
          color: 0x9B59B6, // Purple color for exams
          fields: [
            {
              name: 'Course',
              value: exam.course_name || 'Unknown Course',
              inline: true,
            },
            {
              name: 'Exam Date',
              value: new Date(exam.exam_date).toLocaleString(),
              inline: true,
            },
            {
              name: 'Duration',
              value: `${exam.duration_minutes} minutes`,
              inline: true,
            },
            {
              name: 'Location',
              value: exam.location || 'TBD',
              inline: false,
            },
          ],
          footer: {
            text: 'Aqademiq Academic Planner'
          },
          timestamp: new Date().toISOString(),
        };

        return await sendNotificationToUser(supabase, userId, {
          username: 'Aqademiq',
          embeds: [embed],
        });
      }

      case 'send-daily-summary': {
        const { todayItems, upcomingItems } = data;
        
        const embed: DiscordEmbed = {
          title: '📅 Daily Academic Summary',
          description: 'Here\'s your academic overview for today',
          color: 0x3498DB, // Blue color for info
          fields: [
            {
              name: 'Today\'s Tasks',
              value: todayItems.length > 0 
                ? todayItems.map((item: any) => `• ${item.title}`).join('\n')
                : 'No tasks scheduled for today',
              inline: false,
            },
            {
              name: 'Upcoming This Week',
              value: upcomingItems.length > 0 
                ? upcomingItems.slice(0, 5).map((item: any) => 
                    `• ${item.title} (${new Date(item.due_date || item.exam_date).toLocaleDateString()})`
                  ).join('\n')
                : 'Nothing upcoming this week',
              inline: false,
            },
          ],
          footer: {
            text: 'Aqademiq Academic Planner'
          },
          timestamp: new Date().toISOString(),
        };

        return await sendNotificationToUser(supabase, userId, {
          username: 'Aqademiq',
          embeds: [embed],
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in discord-notifications function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createDiscordEmbed(type: string, title: string, message: string, metadata: any): DiscordEmbed {
  const colorMap: { [key: string]: number } = {
    assignment: 0xFF6B6B, // Red
    exam: 0x9B59B6,       // Purple
    reminder: 0xF39C12,   // Orange
    success: 0x27AE60,    // Green
    info: 0x3498DB,       // Blue
  };

  return {
    title: `${getEmojiForType(type)} ${title}`,
    description: message,
    color: colorMap[type] || 0x95A5A6, // Default gray
    footer: {
      text: 'Aqademiq Academic Planner'
    },
    timestamp: new Date().toISOString(),
  };
}

function getEmojiForType(type: string): string {
  const emojiMap: { [key: string]: string } = {
    assignment: '📚',
    exam: '🎯',
    reminder: '⏰',
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
  };
  return emojiMap[type] || '📋';
}

async function sendNotificationToUser(supabase: any, userId: string, message: DiscordMessage) {
  try {
    // Get user's Discord settings
    const { data: discordSettings, error: settingsError } = await supabase
      .from('discord_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError || !discordSettings?.webhook_url || !discordSettings.notifications_enabled) {
      return new Response(JSON.stringify({ success: false, reason: 'Discord not configured' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send to Discord
    const response = await fetch(discordSettings.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      const errorText = await response.text();
      console.error('Discord webhook failed:', errorText);
      throw new Error(`Discord webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}