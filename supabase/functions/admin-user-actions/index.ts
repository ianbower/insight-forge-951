import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ActionRequest {
  action: "delete" | "suspend" | "unsuspend" | "reset_password";
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create client with user's token to verify they have admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Verify admin access using the security function
    const { data: canManage, error: accessError } = await userClient.rpc("can_manage_users", {
      _user_id: user.id,
    });

    if (accessError || !canManage) {
      throw new Error("You don't have permission to manage users");
    }

    const { action, userId }: ActionRequest = await req.json();

    if (!action || !userId) {
      throw new Error("Missing action or userId");
    }

    // Prevent self-actions
    if (userId === user.id) {
      throw new Error("You cannot perform this action on your own account");
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let result: { success: boolean; message: string };

    switch (action) {
      case "delete": {
        // Delete user from auth (this will cascade to profiles via trigger)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;
        
        // Also clean up user_roles
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        
        result = { success: true, message: "User deleted successfully" };
        break;
      }

      case "suspend": {
        // Ban the user (suspend indefinitely)
        const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: "876000h", // ~100 years
        });
        if (banError) throw banError;
        result = { success: true, message: "User suspended successfully" };
        break;
      }

      case "unsuspend": {
        // Remove the ban
        const { error: unbanError } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });
        if (unbanError) throw unbanError;
        result = { success: true, message: "User reactivated successfully" };
        break;
      }

      case "reset_password": {
        // Get user email first
        const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(userId);
        if (getUserError || !userData.user) throw getUserError || new Error("User not found");

        // Generate password reset link and send email
        const { error: resetError } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: userData.user.email!,
          options: {
            redirectTo: `${req.headers.get("origin") || supabaseUrl}/auth?reset=true`,
          },
        });
        
        if (resetError) throw resetError;
        result = { success: true, message: "Password reset email sent" };
        break;
      }

      default:
        throw new Error("Invalid action");
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Admin user action error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "An error occurred" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
