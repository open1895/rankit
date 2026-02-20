import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-runtime",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userId = user.id;

    // 1. Unlink creators from this user (keep creator profiles and all data intact)
    await adminClient.from("creators").update({ user_id: null }).eq("user_id", userId);

    // 2. Nullify user_id in votes (keep vote history)
    await adminClient.from("votes").update({ user_id: null }).eq("user_id", userId);

    // 3. Nullify user_id in tournament_votes (keep vote history)
    await adminClient.from("tournament_votes").update({ user_id: null }).eq("user_id", userId);

    // 5. Delete user data
    await adminClient.from("user_points").delete().eq("user_id", userId);
    await adminClient.from("point_transactions").delete().eq("user_id", userId);
    await adminClient.from("point_purchases").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // 6. Finally delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err: any) {
    console.error("Delete account error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Database error deleting user" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
