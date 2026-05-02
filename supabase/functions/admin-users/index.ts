import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "mohammed.aswath07@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ success: false, message: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return json({ success: false, message: "Invalid session" }, 401);
    }

    const callerEmail = (claimsData.claims.email as string | undefined)?.toLowerCase();
    if (callerEmail !== ADMIN_EMAIL.toLowerCase()) {
      return json({ success: false, message: "Forbidden: admin only" }, 403);
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    // ── LIST ─────────────────────────────────────────────────────────
    if (action === "list") {
      const page = Number(body?.page ?? 1);
      const perPage = Math.min(Number(body?.perPage ?? 100), 200);
      const search = (body?.search ?? "").toString().trim().toLowerCase();

      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return json({ success: false, message: error.message }, 500);

      const ids = data.users.map((u) => u.id);
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, full_name, onboarding_completed, study_streak, timezone")
        .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      let users = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        provider: u.app_metadata?.provider,
        is_admin: u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
        profile: profileMap.get(u.id) ?? null,
      }));

      if (search) {
        users = users.filter(
          (u) =>
            u.email?.toLowerCase().includes(search) ||
            u.profile?.full_name?.toLowerCase().includes(search)
        );
      }

      return json({ success: true, users, page, perPage, total: data.users.length });
    }

    // ── DELETE ───────────────────────────────────────────────────────
    if (action === "delete") {
      const targetId = body?.user_id as string | undefined;
      if (!targetId) return json({ success: false, message: "user_id required" }, 400);

      // Resolve caller's user id to prevent self-delete
      const callerId = claimsData.claims.sub as string;
      if (targetId === callerId) {
        return json({ success: false, message: "Cannot delete your own admin account here." }, 400);
      }

      // Check target is not the admin email
      const { data: targetUser } = await admin.auth.admin.getUserById(targetId);
      if (targetUser?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return json({ success: false, message: "Cannot delete the admin account." }, 400);
      }

      // 1) Purge data atomically
      const { data: deletionResult, error: deletionError } = await admin.rpc(
        "hard_delete_user_data",
        { p_user_id: targetId }
      );
      if (deletionError) {
        return json(
          { success: false, message: `Data deletion failed: ${deletionError.message}` },
          500
        );
      }

      // 2) Purge storage
      const buckets = ["course-files", "file-uploads", "avatars"];
      const storageResults: Record<string, string> = {};
      for (const bucket of buckets) {
        try {
          const { data: files } = await admin.storage
            .from(bucket)
            .list(targetId, { limit: 1000 });
          if (files && files.length > 0) {
            const paths = files.map((f) => `${targetId}/${f.name}`);
            const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
            storageResults[bucket] = rmErr ? `error: ${rmErr.message}` : `deleted ${files.length}`;
          } else {
            storageResults[bucket] = "no files";
          }
        } catch {
          storageResults[bucket] = "skipped";
        }
      }

      // 3) Delete auth user
      const { error: authErr } = await admin.auth.admin.deleteUser(targetId);

      return json({
        success: true,
        message: "User deleted.",
        details: { tables_cleaned: deletionResult, storage: storageResults, auth_deleted: !authErr },
      });
    }

    return json({ success: false, message: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("admin-users error", e);
    return json({ success: false, message: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
