import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { EMAIL_CONFIG, generateEmailFooter, generateEmailHeader } from "../_shared/email-config.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EarlyAccessEmailRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: EarlyAccessEmailRequest = await req.json();

    console.log("Sending early access confirmation email to:", email);

    const emailResponse = await resend.emails.send({
      from: EMAIL_CONFIG.senders.noreply,
      to: [email],
      subject: `Welcome to ${EMAIL_CONFIG.branding.appName} Early Access! ${EMAIL_CONFIG.branding.logoEmoji}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          ${generateEmailHeader()}
          
          <div style="background: linear-gradient(135deg, ${EMAIL_CONFIG.branding.gradientStart} 0%, ${EMAIL_CONFIG.branding.gradientEnd} 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
            <h2 style="color: white; font-size: 24px; margin: 0 0 16px 0;">You're on the list! ✨</h2>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Thank you for joining our early access program for the AI-powered academic marketplace.</p>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <h3 style="color: #1a1a1a; font-size: 20px; margin: 0 0 16px 0;">What's coming:</h3>
            <ul style="color: #4a5568; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>AI-powered study materials and resources</li>
              <li>Custom academic templates and tools</li>
              <li>Collaborative study environments</li>
              <li>Smart scheduling and productivity features</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-bottom: 32px;">
            <p style="color: #4a5568; font-size: 14px; margin: 0;">We'll notify you as soon as the marketplace is ready!</p>
          </div>
          
          ${generateEmailFooter(email)}
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Confirmation email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-early-access-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);