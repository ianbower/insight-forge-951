import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function validateAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return { userId: data.user.id };
}

interface SendEmailRequest {
  instanceId: string;
  recipientIds?: string[];
  baseUrl: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const auth = await validateAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { instanceId, recipientIds, baseUrl }: SendEmailRequest = await req.json();

    if (!instanceId) {
      return new Response(
        JSON.stringify({ error: "Instance ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch instance details
    const { data: instance, error: instanceError } = await supabase
      .from("assessment_instances")
      .select("*, assessment_template:assessment_templates(name)")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      console.error("Instance not found:", instanceError);
      return new Response(
        JSON.stringify({ error: "Assessment instance not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recipients
    let query = supabase
      .from("assessment_recipients")
      .select("*")
      .eq("assessment_instance_id", instanceId);

    if (recipientIds && recipientIds.length > 0) {
      query = query.in("id", recipientIds);
    } else {
      query = query.eq("status", "pending");
    }

    const { data: recipients, error: recipientsError } = await query;

    if (recipientsError || !recipients || recipients.length === 0) {
      console.error("No recipients found:", recipientsError);
      return new Response(
        JSON.stringify({ error: "No recipients found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending emails to ${recipients.length} recipients`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const recipient of recipients) {
      try {
        const assessmentUrl = `${baseUrl}/assess/${recipient.token}`;
        const greeting = recipient.name ? `Hello ${recipient.name},` : "Hello,";
        
        const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Assessment Invitation</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">${greeting}</p>
    <p style="font-size: 16px;">You've been invited to complete the following assessment:</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${instance.name}</h2>
      ${instance.description ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">${instance.description}</p>` : ""}
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">Based on: ${instance.assessment_template?.name || "Assessment Template"}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${assessmentUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Start Assessment</a>
    </div>
    <p style="font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link: <a href="${assessmentUrl}" style="color: #667eea;">${assessmentUrl}</a></p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated message. Please do not reply directly.</p>
  </div>
</body>
</html>`;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Assessment Portal <onboarding@resend.dev>",
            to: [recipient.email],
            subject: `You've been invited to complete: ${instance.name}`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        console.log(`Email sent to ${recipient.email}`);
        results.sent++;

        // Update recipient record
        await supabase
          .from("assessment_recipients")
          .update({ invited_at: new Date().toISOString() })
          .eq("id", recipient.id);

      } catch (emailError: any) {
        console.error(`Failed to send email to ${recipient.email}:`, emailError);
        results.failed++;
        results.errors.push(`${recipient.email}: ${emailError.message}`);
      }
    }

    console.log("Email sending complete:", results);

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-assessment-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
