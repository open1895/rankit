import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { matchup_id, voted_creator_id } = await req.json();
    if (!matchup_id || !voted_creator_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: matchup } = await supabase
      .from("daily_matchups")
      .select("id, creator_a_id, creator_b_id, votes_a, votes_b")
      .eq("id", matchup_id)
      .single();

    if (!matchup) {
      return new Response(JSON.stringify({ error: "Matchup not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (voted_creator_id !== matchup.creator_a_id && voted_creator_id !== matchup.creator_b_id) {
      return new Response(JSON.stringify({ error: "Invalid creator" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await supabase
      .from("daily_matchup_votes")
      .insert({ matchup_id, user_id: userId, voted_creator_id });

    if (insErr) {
      if (insErr.code === "23505") {
        return new Response(JSON.stringify({ error: "already_voted" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw insErr;
    }

    const isA = voted_creator_id === matchup.creator_a_id;
    const updates = isA
      ? { votes_a: matchup.votes_a + 1 }
      : { votes_b: matchup.votes_b + 1 };

    await supabase.from("daily_matchups").update(updates).eq("id", matchup_id);

    return new Response(
      JSON.stringify({ success: true, votes_a: isA ? matchup.votes_a + 1 : matchup.votes_a, votes_b: isA ? matchup.votes_b : matchup.votes_b + 1 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("daily-matchup-vote error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
