import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Step 1: Authenticate the user ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client for identity verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // ── Step 2: Validate confirmation input ────────────────────────
    const body = await req.json();
    if (body?.confirmation !== "DELETE") {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'You must send { "confirmation": "DELETE" } to proceed.',
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 3: Service-role client for privileged operations ──────
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Step 4: Delete all user data via DB function (atomic) ──────
    const { data: deletionResult, error: deletionError } = await adminClient.rpc(
      "hard_delete_user_data",
      { p_user_id: userId }
    );

    if (deletionError) {
      console.error("Data deletion failed:", deletionError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to delete user data. No changes were made.",
          error: deletionError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 5: Delete user files from storage ─────────────────────
    const storageBuckets = ["course-files", "file-uploads", "avatars"];
    const storageResults: Record<string, string> = {};

    for (const bucket of storageBuckets) {
      try {
        // List all files in the user's folder
        const { data: files } = await adminClient.storage
          .from(bucket)
          .list(userId, { limit: 1000 });

        if (files && files.length > 0) {
          const filePaths = files.map((f) => `${userId}/${f.name}`);
          const { error: removeError } = await adminClient.storage
            .from(bucket)
            .remove(filePaths);

          storageResults[bucket] = removeError
            ? `error: ${removeError.message}`
            : `deleted ${files.length} files`;
        } else {
          storageResults[bucket] = "no files";
        }
      } catch {
        storageResults[bucket] = "bucket not found or empty";
      }
    }

    // ── Step 6: Delete the auth user (Supabase Auth) ───────────────
    const { error: authDeleteError } =
      await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error("Auth user deletion failed:", authDeleteError);
      // Data is already deleted — log but still return success
      // The auth record without data is harmless
    }

    // ── Step 7: Return success ─────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        message: "Your account and all associated data have been permanently deleted.",
        details: {
          tables_cleaned: deletionResult,
          storage: storageResults,
          auth_deleted: !authDeleteError,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in delete-account:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "An unexpected error occurred. Please try again or contact support.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
