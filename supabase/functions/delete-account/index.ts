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

    // 1. Find all creators owned by this user
    const { data: ownedCreators } = await adminClient
      .from("creators")
      .select("id")
      .eq("user_id", userId);

    const creatorIds = (ownedCreators || []).map((c: any) => c.id);

    // 2. For each owned creator, delete all related data
    if (creatorIds.length > 0) {
      // Nullify user_id on votes linked to these creators (keep vote counts)
      await adminClient.from("votes").update({ user_id: null }).in("creator_id", creatorIds);

      // Delete creator-related records
      await adminClient.from("weekly_highlights").delete().in("creator_id", creatorIds);
      await adminClient.from("rank_history").delete().in("creator_id", creatorIds);
      await adminClient.from("creator_earnings").delete().in("creator_id", creatorIds);
      await adminClient.from("settlement_requests").delete().in("creator_id", creatorIds);
      await adminClient.from("season_rankings").delete().in("creator_id", creatorIds);
      await adminClient.from("chat_messages").delete().in("creator_id", creatorIds);
      await adminClient.from("comments").delete().in("creator_id", creatorIds);

      // For posts: delete post_comments first, then posts
      const { data: posts } = await adminClient
        .from("posts")
        .select("id")
        .in("creator_id", creatorIds);
      const postIds = (posts || []).map((p: any) => p.id);
      if (postIds.length > 0) {
        await adminClient.from("post_comments").delete().in("post_id", postIds);
      }
      await adminClient.from("posts").delete().in("creator_id", creatorIds);

      // Nullify tournament matches (don't delete, keep tournament integrity)
      await adminClient.from("tournament_matches")
        .update({ winner_id: null })
        .in("winner_id", creatorIds);

      // Delete the creators themselves
      await adminClient.from("creators").delete().in("id", creatorIds);
    }

    // 3. Nullify user_id in votes not linked to owned creators
    await adminClient.from("votes").update({ user_id: null }).eq("user_id", userId);

    // 4. Nullify user_id in tournament_votes
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
